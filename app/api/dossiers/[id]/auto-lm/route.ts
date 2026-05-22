// app/api/dossiers/[id]/auto-lm/route.ts
// Sprint Agents IA v21 · 30 avril 2026
//
// Route appelée depuis triggerPostDocumentSigned quand DER signé pour Mass.
// Génère la LM (avec inputs auto-pré-remplis selon les facts du dossier)
// puis l'envoie automatiquement en signature Yousign.

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { generateLmForDossierAdmin } from '@/lib/documents/generate-pdf'
import { upsertDocumentInputs } from '@/lib/documents/document-inputs-service'
import { sendDocumentForSignature } from '@/lib/yousign/yousign-service'
import { transitionDossierStageService } from '@/lib/workflow/workflow-service'
import { sendEmail, emailDocumentPretASigner } from '@/lib/email'

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
      { ok: false, error: 'auto-LM réservé à l\'offre Mass' },
      { status: 400 }
    )
  }
  if (dossier.pipeline_stage !== 'der_signe') {
    return NextResponse.json(
      {
        ok: false,
        error: `Stage incompatible : ${dossier.pipeline_stage} (attendu der_signe)`,
      },
      { status: 400 }
    )
  }
  if (!dossier.email_client) {
    return NextResponse.json(
      { ok: false, error: 'Email client absent — LM non envoyable' },
      { status: 400 }
    )
  }

  // 1. Charger les facts pour pré-remplir les inputs LM
  const { data: facts } = await supabase
    .from('client_facts')
    .select('fact_key, fact_value')
    .eq('dossier_id', dossierId)
  const factsMap: Record<string, string> = {}
  for (const f of facts ?? []) factsMap[f.fact_key] = f.fact_value

  const objectifLabel =
    OBJECTIF_LABEL[factsMap.objectif_principal ?? 'autre'] ??
    'développer une stratégie patrimoniale globale'

  // 2. Générer les inputs LM pré-remplis (Mass = template standardisé)
  const lmInputs = {
    objectifs_client: `Mission AMANA Mass : ${objectifLabel} dans une logique 100% conforme aux principes de la finance islamique (filtrage AAOIFI, Sakina Consulting). Horizon ${factsMap.horizon_placement_annees ?? '10'} ans, profil de risque ${factsMap.profil_risque ?? 'moyen'}.`,
    duree_mission: '12 mois renouvelable par tacite reconduction',
    honoraires_estimes:
      "0% de frais de conseil — rémunération AMANA par rétrocessions des produits sharia-compliant souscrits",
    perimetre_specifique:
      "Allocation cible recommandée par AMANA, supports halal exclusivement issus du catalogue agréé (AV Vie Plus + CTO Intencial). SCPI sur option.",
  }

  // Sauvegarder les inputs en base
  await upsertDocumentInputs({
    conseillerId: dossier.conseiller_id,
    dossierId,
    documentType: 'lm',
    inputs: lmInputs as never,
    status: 'ready',
  })

  // 3. Générer le PDF LM (service role — pas de session utilisateur dans ce contexte)
  const genResult = await generateLmForDossierAdmin(
    dossier.conseiller_id,
    dossierId,
    lmInputs
  )
  if (!genResult.ok) {
    return NextResponse.json(
      { ok: false, error: `Génération LM échouée : ${genResult.error}` },
      { status: 500 }
    )
  }
  const documentId = genResult.doc.id

  // 4. Récupérer le PDF
  const { data: pdfBlob } = await supabase.storage
    .from('amana-documents')
    .download(genResult.doc.storage_path)
  if (!pdfBlob) {
    return NextResponse.json(
      { ok: false, error: 'PDF LM introuvable en Storage' },
      { status: 500 }
    )
  }
  const pdfBuffer = Buffer.from(await pdfBlob.arrayBuffer())

  // 5. Envoyer en signature
  const signerFirstName = (dossier.prenom ?? '').trim().replace(/[^a-zA-ZÀ-ÿ\s'-]/g, '') || 'Client'
  const signerLastName  = (dossier.nom   ?? '').trim().replace(/[^a-zA-ZÀ-ÿ\s'-]/g, '') || 'AMANA'
  let yousignResp
  try {
    yousignResp = await sendDocumentForSignature({
      pdfBuffer,
      filename: genResult.doc.filename,
      documentDisplayName: `AMANA Lettre de mission — ${signerFirstName} ${signerLastName}`,
      signer: {
        email: dossier.email_client,
        first_name: signerFirstName,
        last_name: signerLastName,
      },
    })
  } catch (err) {
    console.error('[auto-lm] yousign error', err)
    return NextResponse.json(
      {
        ok: false,
        error: `Erreur envoi Yousign : ${err instanceof Error ? err.message : 'inconnue'}`,
      },
      { status: 502 }
    )
  }

  const now = new Date().toISOString()
  await supabase
    .from('documents')
    .update({
      yousign_status: 'pending',
      yousign_signature_request_id: yousignResp.signature_request_id,
      yousign_id: yousignResp.signature_request_id,
      yousign_sent_at: now,
      yousign_signer_email: yousignResp.signer_email,
      yousign_signer_name: `${dossier.prenom} ${dossier.nom}`,
    })
    .eq('id', documentId)

  // 5b. Insérer dans signature_requests pour que le webhook envoie la confirmation
  try {
    const { data: clientAuth } = await supabase.auth.admin.listUsers()
    const clientUserId = clientAuth?.users?.find(u => u.email === dossier.email_client)?.id ?? null
    await supabase.from('signature_requests').insert({
      project_id:    null,
      user_id:       clientUserId,
      conseiller_id: dossier.conseiller_id,
      provider:      'yousign',
      provider_id:   yousignResp.signature_request_id,
      provider_url:  yousignResp.signing_url,
      statut:        'envoye',
      document_nom:  `Lettre de Mission — ${dossier.prenom} ${dossier.nom}`,
      metadata: {
        document_id:   documentId,
        document_type: 'lm',
        dossier_id:    dossierId,
        via:           'auto-lm',
      },
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    })
  } catch (srErr) {
    console.error('[auto-lm] signature_requests insert error', srErr)
    // Non bloquant
  }

  // 5c. Envoyer email AMANA "Votre LM est prête à signer"
  void sendEmail({
    to: dossier.email_client!,
    ...emailDocumentPretASigner(
      dossier.prenom ?? 'cher client',
      'Lettre de Mission AMANA',
      yousignResp.signing_url ?? undefined,
    ),
  }).catch(err => console.error('[auto-lm] emailDocumentPretASigner error', err))

  // 6. Transition der_signe → lm_envoyee
  await transitionDossierStageService({
    dossierId,
    toStage: 'lm_envoyee',
    triggeredBy: 'background_job',
    triggerContext: {
      via: 'auto-lm',
      signature_request_id: yousignResp.signature_request_id,
    },
    notes: 'LM générée + envoyée Yousign automatiquement (offre Mass)',
  })

  // 7. Audit
  await supabase.from('audit_logs').insert({
    user_id: dossier.conseiller_id,
    action: 'document.auto_lm.sent',
    entity_type: 'document',
    entity_id: documentId,
    metadata: {
      dossier_id: dossierId,
      offre: 'mass',
      signature_request_id: yousignResp.signature_request_id,
      timestamp: now,
    },
  })

  return NextResponse.json({
    ok: true,
    document_id: documentId,
    signature_request_id: yousignResp.signature_request_id,
    next_stage: 'lm_envoyee',
  })
}
