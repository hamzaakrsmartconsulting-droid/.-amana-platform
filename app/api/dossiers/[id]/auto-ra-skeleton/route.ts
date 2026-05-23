// app/api/dossiers/[id]/auto-ra-skeleton/route.ts
// Déclenché après signature LM (webhook Yousign, via triggerPostDocumentSigned).
// PRÉ-REMPLIT les inputs RA sections 1-6 à partir des données KYC/onboarding
// et crée la gate V4 (ra_recommandations) en pending pour Mohamed (sections 7-10).
// Le PDF RA est généré plus tard par auto-ra après approbation V6.

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { sendEmail, emailValidationRequired } from '@/lib/email'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function svc() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Service role manquant')
  return createServiceClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: dossierId } = await context.params

  const secret = request.headers.get('x-amana-internal-secret')
  const expected = process.env.AMANA_INTERNAL_SECRET
  if (!expected || secret !== expected) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
  }

  const supabase = svc()

  const { data: dossier } = await supabase
    .from('dossiers')
    .select('id, conseiller_id, prenom, nom, email_client, offre_amana_cible, pipeline_stage')
    .eq('id', dossierId)
    .maybeSingle()

  if (!dossier) {
    return NextResponse.json({ ok: false, error: 'Dossier introuvable' }, { status: 404 })
  }

  const allowedStages = ['lm_signee', 'souscription']
  if (!allowedStages.includes(dossier.pipeline_stage ?? '')) {
    return NextResponse.json(
      {
        ok: false,
        error: `Stage incompatible : ${dossier.pipeline_stage} (attendu ${allowedStages.join(' ou ')})`,
      },
      { status: 400 },
    )
  }

  // Charger KYC + onboarding session pour pré-remplir les sections 1-6 du RA
  const { data: kyc } = await supabase
    .from('kyc')
    .select('*')
    .eq('dossier_id', dossierId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data: onb } = await supabase
    .from('onboarding_sessions')
    .select('*')
    .eq('email', dossier.email_client ?? '')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data: facts } = await supabase
    .from('client_facts')
    .select('fact_key, fact_value')
    .eq('dossier_id', dossierId)
  const factsMap: Record<string, string> = {}
  for (const f of (facts ?? [])) factsMap[f.fact_key] = f.fact_value

  // Sections 1-6 auto (données objectives)
  const patrimoineNet = kyc?.patrimoine_net_eur ?? onb?.patrimoine_net_eur ?? 0
  const revenus = kyc?.revenus_annuels_eur ?? onb?.revenus_annuels_eur ?? 0
  const profil = factsMap.profil_risque ?? 'moyen'
  const horizon = factsMap.horizon_placement_annees ?? onb?.horizon_annees ?? '10'
  const objectif = onb?.objectif_principal ?? factsMap.objectif_principal ?? 'stratégie patrimoniale globale'
  const situation = kyc?.situation_familiale ?? onb?.situation_familiale ?? ''

  const bilanMizanResume = [
    `${dossier.prenom} ${dossier.nom}`,
    situation ? `Situation familiale : ${situation}.` : '',
    patrimoineNet ? `Patrimoine net déclaré : ${Number(patrimoineNet).toLocaleString('fr-FR')} €.` : '',
    revenus ? `Revenus annuels : ${Number(revenus).toLocaleString('fr-FR')} €.` : '',
    `Profil de risque retenu : ${profil}. Horizon : ${horizon} an(s).`,
    `Objectif principal : ${objectif}.`,
    `— Sections 7-10 à compléter par le conseiller (recommandations, allocation, synthèse, frais).`,
  ].filter(Boolean).join(' ')

  // Pré-remplir les inputs RA (sections 1-6 auto, sections 7-10 en placeholder)
  const raInputsDraft = {
    bilan_mizan_resume: bilanMizanResume,
    allocation_cible: [
      {
        classe: 'À définir par le conseiller lors de la recommandation',
        pourcentage: '100',
        produit: 'Produit halal à sélectionner',
        isin: '',
        assureur: '',
        commentaire: 'À compléter — validation V4 requise',
      },
    ],
    justification_adequation: `L'allocation proposée devra être justifiée au regard du profil ${profil} et de l'horizon ${horizon} an(s) — à compléter lors de la validation V4.`,
    // Champs à remplir par Mohamed
    synthese_conseil: `Synthèse à rédiger par le conseiller — validation V5 requise.`,
    frais_entree_pct: 0,
    frais_courants_annuels_pct: 0,
  }

  // Upsert dans document_inputs (draft — sera mis à jour par Mohamed via V4/V5/V6)
  await supabase
    .from('document_inputs')
    .upsert(
      {
        conseiller_id: dossier.conseiller_id,
        dossier_id: dossierId,
        document_type: 'ra',
        inputs: raInputsDraft,
        status: 'draft',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'dossier_id,document_type' },
    )

  // V4 uniquement — V5/V6 créées après approbation V4/V5 (page Validations)
  const now = new Date().toISOString()
  const gateType = 'ra_recommandations' as const
  await supabase.from('validation_gates').delete()
    .eq('dossier_id', dossierId).eq('gate_type', gateType)

  const { error: gateErr } = await supabase
    .from('validation_gates')
    .insert({
      dossier_id: dossierId,
      gate_type: gateType,
      decision: 'pending',
      decided_at: null,
      comment: null,
      updated_at: now,
    })
  if (gateErr) {
    console.error(`[auto-ra-skeleton] gate insert error (${gateType}):`, gateErr.message)
  }

  // Notifier Mohamed : V4 est la première étape
  const adminEmail = process.env.AMANA_ADMIN_EMAIL
  if (adminEmail) {
    const dossierNom = [dossier.prenom, dossier.nom].filter(Boolean).join(' ') || dossierId
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://amana-patrimoine.fr'
    void sendEmail({
      to: adminEmail,
      ...emailValidationRequired(
        'V4 — Validation recommandations RA (sections 7-10)',
        dossierNom,
        `${baseUrl}/admin/validations`,
      ),
    }).catch(err => console.error('[auto-ra-skeleton] email admin error', err))
  }

  await supabase.from('audit_logs').insert({
    user_id: dossier.conseiller_id,
    action: 'document.auto_ra_skeleton.prefilled',
    entity_type: 'dossier',
    entity_id: dossierId,
    metadata: {
      dossier_id: dossierId,
      gates_created: [gateType],
      timestamp: now,
      fields_prefilled: Object.keys(raInputsDraft),
    },
  })

  return NextResponse.json({
    ok: true,
    gates_created: [gateType],
    inputs_prefilled: true,
    message: 'Inputs RA sections 1-6 pré-remplis. Gates V4/V5/V6 créées en attente de validation Mohamed.',
  })
}
