// app/api/dossiers/[id]/auto-pack-sign/route.ts
// Sprint Agents IA v22 · 17 mai 2026
//
// Génère DER + LM + RA en une seule procédure Yousign → 1 email au client.
// Remplace la chaîne auto-der → auto-lm → auto-ra pour l'offre Mass.
//
// Prérequis : pipeline_stage = 'kyc_complet', offre = 'mass'
// Résultat  : 3 documents liés au même yousign_signature_request_id,
//             stage → der_envoye, email AMANA + 1 email Yousign au client.

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import {
  generateDerForDossierAdmin,
  generateLmForDossierAdmin,
  generateRaForDossierAdmin,
} from '@/lib/documents/generate-pdf'
import { upsertDocumentInputs } from '@/lib/documents/document-inputs-service'
import { sendRegulatoryPackForSignature } from '@/lib/yousign/yousign-service'
import { transitionDossierStageService } from '@/lib/workflow/workflow-service'
import { sendEmail, emailPackReglementairePretASigner } from '@/lib/email'

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

const OBJECTIF_LABEL: Record<string, string> = {
  preparer_retraite: 'préparer la retraite',
  transmettre_patrimoine: 'transmettre le patrimoine aux proches',
  optimiser_fiscalite: 'optimiser la fiscalité',
  epargner_projet: 'épargner pour un projet',
  investir_immo: 'investir en immobilier',
  gerer_heritage: 'gérer un héritage reçu',
  autre: 'développer une stratégie patrimoniale globale',
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

  // skip_email=true → ne pas envoyer l'email AMANA (l'appelant l'enverra lui-même)
  let skipEmail = false
  try {
    const body = await request.json().catch(() => ({}))
    if (body.skip_email === true) skipEmail = true
  } catch { /* non bloquant */ }

  const supabase = svc()

  const { data: dossier } = await supabase
    .from('dossiers')
    .select('id, conseiller_id, prenom, nom, email_client, offre_amana_cible, pipeline_stage')
    .eq('id', dossierId)
    .maybeSingle()

  if (!dossier) {
    return NextResponse.json({ ok: false, error: 'Dossier introuvable' }, { status: 404 })
  }
  if (dossier.offre_amana_cible !== 'mass') {
    return NextResponse.json(
      { ok: false, error: 'auto-pack-sign réservé à l\'offre Mass' },
      { status: 400 }
    )
  }
  if (dossier.pipeline_stage !== 'kyc_complet') {
    return NextResponse.json(
      { ok: false, error: `Stage incompatible : ${dossier.pipeline_stage} (attendu kyc_complet)` },
      { status: 400 }
    )
  }
  if (!dossier.email_client) {
    return NextResponse.json(
      { ok: false, error: 'Email client absent — pack non envoyable' },
      { status: 400 }
    )
  }

  // ──────────────────────────────────────────────
  // Charger KYC + facts pour pré-remplir LM et RA
  // ──────────────────────────────────────────────
  const { data: facts } = await supabase
    .from('client_facts')
    .select('fact_key, fact_value')
    .eq('dossier_id', dossierId)
  const fm: Record<string, string> = {}
  for (const f of facts ?? []) fm[f.fact_key] = f.fact_value

  const { data: kyc } = await supabase
    .from('kyc')
    .select('patrimoine_net_eur, revenus_annuels_eur, capacite_epargne_mensuelle_eur, situation_familiale')
    .eq('dossier_id', dossierId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const objectifLabel =
    OBJECTIF_LABEL[fm.objectif_principal ?? 'autre'] ??
    'développer une stratégie patrimoniale globale'
  const horizon = fm.horizon_placement_annees ?? '10'
  const profil = fm.profil_risque ?? 'équilibré'
  const patrimoineNet = kyc?.patrimoine_net_eur ?? 0

  // ──────────────────────────────────────────────
  // 1. Générer DER
  // ──────────────────────────────────────────────
  const derResult = await generateDerForDossierAdmin(dossier.conseiller_id, dossierId)
  if (!derResult.ok) {
    return NextResponse.json(
      { ok: false, error: `Génération DER échouée : ${derResult.error}` },
      { status: 500 }
    )
  }

  // ──────────────────────────────────────────────
  // 2. Générer LM
  // ──────────────────────────────────────────────
  const lmInputs = {
    objectifs_client: `Mission AMANA Mass : ${objectifLabel} dans une logique 100% conforme aux principes de la finance islamique (filtrage AAOIFI, Sakina Consulting). Horizon ${horizon} ans, profil de risque ${profil}.`,
    duree_mission: '12 mois renouvelable par tacite reconduction',
    honoraires_estimes:
      '0% de frais de conseil — rémunération AMANA par rétrocessions des produits sharia-compliant souscrits',
    perimetre_specifique:
      'Allocation cible recommandée par AMANA, supports halal exclusivement issus du catalogue agréé (AV Vie Plus + CTO Intencial). SCPI sur option.',
  }
  await upsertDocumentInputs({
    conseillerId: dossier.conseiller_id,
    dossierId,
    documentType: 'lm',
    inputs: lmInputs as never,
    status: 'ready',
  })
  const lmResult = await generateLmForDossierAdmin(dossier.conseiller_id, dossierId, lmInputs)
  if (!lmResult.ok) {
    return NextResponse.json(
      { ok: false, error: `Génération LM échouée : ${lmResult.error}` },
      { status: 500 }
    )
  }

  // ──────────────────────────────────────────────
  // 3. Générer RA (skeleton avec données KYC)
  // ──────────────────────────────────────────────
  const raInputs = {
    bilan_mizan_resume: [
      `${dossier.prenom} ${dossier.nom}${kyc?.situation_familiale ? `, ${kyc.situation_familiale}` : ''}.`,
      patrimoineNet ? `Patrimoine net estimé : ${Number(patrimoineNet).toLocaleString('fr-FR')} €.` : '',
      kyc?.revenus_annuels_eur ? `Revenus annuels : ${Number(kyc.revenus_annuels_eur).toLocaleString('fr-FR')} €.` : '',
      kyc?.capacite_epargne_mensuelle_eur ? `Capacité d'épargne mensuelle : ${Number(kyc.capacite_epargne_mensuelle_eur).toLocaleString('fr-FR')} €/mois.` : '',
      `Objectif principal : ${objectifLabel}. Horizon : ${horizon} an(s). Profil de risque : ${profil}.`,
    ].filter(Boolean).join(' '),
    allocation_cible: [
      {
        classe: 'Assurance-vie islamique (AV Vie Plus)',
        pourcentage: '60',
        montant_eur: patrimoineNet ? String(Math.round(Number(patrimoineNet) * 0.6)) : '',
        supports: 'Unités de compte sharia-compliant, filtrage AAOIFI',
      },
      {
        classe: 'Compte-titres halal (CTO Intencial)',
        pourcentage: '30',
        montant_eur: patrimoineNet ? String(Math.round(Number(patrimoineNet) * 0.3)) : '',
        supports: 'Actions islamiques, ETF sharia, REIT halal',
      },
      {
        classe: 'Liquidités / fonds monétaire halal',
        pourcentage: '10',
        montant_eur: patrimoineNet ? String(Math.round(Number(patrimoineNet) * 0.1)) : '',
        supports: 'Épargne de précaution, sans intérêts',
      },
    ],
    justification_adequation: `Allocation recommandée adaptée au profil ${profil} du client, horizon ${horizon} ans. Conforme aux filtres AAOIFI et validée par Sakina Consulting. Aucun élément haram (obligations conventionnelles, actions secteurs exclus). Répartition équilibrée entre performance long terme (AV islamique) et diversification boursière halal (CTO).`,
    capacite_financiere: kyc?.capacite_epargne_mensuelle_eur
      ? `Capacité d'épargne mensuelle disponible : ${Number(kyc.capacite_epargne_mensuelle_eur).toLocaleString('fr-FR')} €/mois`
      : 'À compléter lors de l\'entretien',
    connaissances_investissement: fm.profil_risque
      ? `Profil évalué : ${fm.profil_risque} — niveau de connaissance adapté à l'offre Mass`
      : 'Profil investisseur évalué lors du KYC',
  }
  await upsertDocumentInputs({
    conseillerId: dossier.conseiller_id,
    dossierId,
    documentType: 'ra',
    inputs: raInputs as never,
    status: 'ready',
  })
  const raResult = await generateRaForDossierAdmin(dossier.conseiller_id, dossierId, raInputs)
  if (!raResult.ok) {
    return NextResponse.json(
      { ok: false, error: `Génération RA échouée : ${raResult.error}` },
      { status: 500 }
    )
  }

  // ──────────────────────────────────────────────
  // 4. Télécharger les 3 PDFs depuis Storage
  // ──────────────────────────────────────────────
  const [derBlob, lmBlob, raBlob] = await Promise.all([
    supabase.storage.from('amana-documents').download(derResult.doc.storage_path),
    supabase.storage.from('amana-documents').download(lmResult.doc.storage_path),
    supabase.storage.from('amana-documents').download(raResult.doc.storage_path),
  ])

  if (!derBlob.data || !lmBlob.data || !raBlob.data) {
    return NextResponse.json(
      { ok: false, error: 'Un ou plusieurs PDFs introuvables en Storage' },
      { status: 500 }
    )
  }

  const signerFirstName = (dossier.prenom ?? '').trim().replace(/[^a-zA-ZÀ-ÿ\s'-]/g, '') || 'Client'
  const signerLastName  = (dossier.nom   ?? '').trim().replace(/[^a-zA-ZÀ-ÿ\s'-]/g, '') || 'AMANA'

  // ──────────────────────────────────────────────
  // 5. Envoyer les 3 docs en 1 seule procédure Yousign
  // ──────────────────────────────────────────────
  let packResp
  try {
    packResp = await sendRegulatoryPackForSignature({
      documents: [
        {
          pdfBuffer: Buffer.from(await derBlob.data.arrayBuffer()),
          filename: derResult.doc.filename,
          type: 'der',
        },
        {
          pdfBuffer: Buffer.from(await lmBlob.data.arrayBuffer()),
          filename: lmResult.doc.filename,
          type: 'lm',
        },
        {
          pdfBuffer: Buffer.from(await raBlob.data.arrayBuffer()),
          filename: raResult.doc.filename,
          type: 'ra',
        },
      ],
      signer: {
        email: dossier.email_client,
        first_name: signerFirstName,
        last_name:  signerLastName,
      },
      packName: `Pack Réglementaire AMANA — ${signerFirstName} ${signerLastName}`,
    })
  } catch (err) {
    console.error('[auto-pack-sign] yousign error', err)
    return NextResponse.json(
      { ok: false, error: `Erreur Yousign : ${err instanceof Error ? err.message : 'inconnue'}` },
      { status: 502 }
    )
  }

  const now = new Date().toISOString()
  const sigReqId = packResp.signature_request_id

  // ──────────────────────────────────────────────
  // 6. Mettre à jour les 3 documents avec le même signature_request_id
  // ──────────────────────────────────────────────
  const docUpdates = [
    { id: derResult.doc.id, type: 'der' },
    { id: lmResult.doc.id,  type: 'lm'  },
    { id: raResult.doc.id,  type: 'ra'  },
  ]
  await Promise.all(
    docUpdates.map(d =>
      supabase.from('documents').update({
        yousign_status: 'pending',
        yousign_signature_request_id: sigReqId,
        yousign_id: sigReqId,
        yousign_sent_at: now,
        yousign_signer_email: packResp.signer_email,
        yousign_signer_name: `${signerFirstName} ${signerLastName}`,
        // Stocker le type de pack pour identifier dans le webhook
        metadata: { pack_type: 'regulatory_pack', pack_signature_request_id: sigReqId },
      }).eq('id', d.id)
    )
  )

  // ──────────────────────────────────────────────
  // 7. Insérer dans signature_requests (entrée unique pour le pack)
  // ──────────────────────────────────────────────
  try {
    const { data: clientAuth } = await supabase.auth.admin.listUsers()
    const clientUserId = clientAuth?.users?.find(u => u.email === dossier.email_client)?.id ?? null
    await supabase.from('signature_requests').insert({
      project_id:    null,
      user_id:       clientUserId,
      conseiller_id: dossier.conseiller_id,
      provider:      'yousign',
      provider_id:   sigReqId,
      provider_url:  packResp.signing_url,
      statut:        'envoye',
      document_nom:  `Pack Réglementaire (DER + LM + RA) — ${signerFirstName} ${signerLastName}`,
      metadata: {
        pack_type:      'regulatory_pack',
        document_ids:   [derResult.doc.id, lmResult.doc.id, raResult.doc.id],
        document_types: ['der', 'lm', 'ra'],
        dossier_id:     dossierId,
        via:            'auto-pack-sign',
      },
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    })
  } catch (srErr) {
    console.error('[auto-pack-sign] signature_requests insert error', srErr)
  }

  // ──────────────────────────────────────────────
  // 8. Email AMANA (sauf si skip_email=true — l'appelant envoie un email combiné)
  // ──────────────────────────────────────────────
  if (packResp.signing_url && !skipEmail) {
    void sendEmail({
      to: dossier.email_client!,
      ...emailPackReglementairePretASigner(
        dossier.prenom ?? 'cher client',
        packResp.signing_url,
      ),
    }).catch(err => console.error('[auto-pack-sign] email error', err))
  }

  // ──────────────────────────────────────────────
  // 9. Transition kyc_complet → der_envoye (pack envoyé)
  // ──────────────────────────────────────────────
  await transitionDossierStageService({
    dossierId,
    toStage: 'der_envoye',
    triggeredBy: 'background_job',
    triggerContext: {
      via: 'auto-pack-sign',
      pack_type: 'regulatory_pack',
      signature_request_id: sigReqId,
    },
    notes: 'Pack réglementaire (DER+LM+RA) généré + envoyé en 1 procédure Yousign',
  })

  // ──────────────────────────────────────────────
  // 10. Audit
  // ──────────────────────────────────────────────
  await supabase.from('audit_logs').insert({
    user_id: dossier.conseiller_id,
    action: 'document.auto_pack_sign.sent',
    entity_type: 'dossier',
    entity_id: dossierId,
    metadata: {
      pack_type: 'regulatory_pack',
      document_ids: [derResult.doc.id, lmResult.doc.id, raResult.doc.id],
      signature_request_id: sigReqId,
      offre: 'mass',
      timestamp: now,
    },
  })

  return NextResponse.json({
    ok: true,
    pack_type: 'regulatory_pack',
    signature_request_id: sigReqId,
    signing_url: packResp.signing_url,
    signer_email: packResp.signer_email,
    document_ids: {
      der: derResult.doc.id,
      lm:  lmResult.doc.id,
      ra:  raResult.doc.id,
    },
    next_stage: 'der_envoye',
    email_skipped: skipEmail,
  })
}
