// app/api/dossiers/[id]/auto-bulletin/route.ts
// Déclenché après approbation V7 (ra_bulletin_send) par Mohamed.
// Génère le bulletin de souscription puis l'envoie en signature Yousign.
// Le webhook bulletin signé transitionnera le dossier vers "actif".

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { generateBulletinSouscriptionForDossier } from '@/lib/documents/generate-pdf'
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

  if (!dossier.email_client) {
    return NextResponse.json(
      { ok: false, error: 'Email client absent — Bulletin non envoyable' },
      { status: 400 }
    )
  }

  // Charger les inputs bulletin (remplis par Mohamed via agent Sajl ou formulaire)
  const { data: inputsRow } = await supabase
    .from('document_inputs')
    .select('inputs')
    .eq('dossier_id', dossierId)
    .eq('document_type', 'bulletin')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Inputs par défaut si aucun n'a été renseigné
  const bulletinInputs = (inputsRow?.inputs ?? {
    produit: 'Contrat AMANA Patrimoine',
    assureur: 'Assureur partenaire AMANA',
    objectif_gestion: 'Croissance halal long terme',
  })

  // Générer le bulletin
  const genResult = await generateBulletinSouscriptionForDossier(
    dossier.conseiller_id,
    dossierId,
    bulletinInputs,
  )

  if (!genResult.ok) {
    return NextResponse.json(
      { ok: false, error: `Génération Bulletin échouée : ${genResult.error}` },
      { status: 500 }
    )
  }
  const documentId = genResult.doc.id

  // Récupérer le PDF depuis Storage
  const { data: pdfBlob } = await supabase.storage
    .from('amana-documents')
    .download(genResult.doc.storage_path)

  if (!pdfBlob) {
    return NextResponse.json(
      { ok: false, error: 'PDF Bulletin introuvable en Storage' },
      { status: 500 }
    )
  }
  const pdfBuffer = Buffer.from(await pdfBlob.arrayBuffer())

  // Envoyer en signature Yousign
  const signerFirstName = (dossier.prenom ?? '').trim().replace(/[^a-zA-ZÀ-ÿ\s'-]/g, '') || 'Client'
  const signerLastName  = (dossier.nom   ?? '').trim().replace(/[^a-zA-ZÀ-ÿ\s'-]/g, '') || 'AMANA'

  let yousignResp
  try {
    yousignResp = await sendDocumentForSignature({
      pdfBuffer,
      filename: genResult.doc.filename,
      documentDisplayName: `AMANA Bulletin de souscription — ${signerFirstName} ${signerLastName}`,
      signer: {
        email: dossier.email_client,
        first_name: signerFirstName,
        last_name: signerLastName,
      },
    })
  } catch (err) {
    console.error('[auto-bulletin] yousign error', err)
    return NextResponse.json(
      { ok: false, error: `Erreur envoi Yousign : ${err instanceof Error ? err.message : 'inconnue'}` },
      { status: 502 }
    )
  }

  const now = new Date().toISOString()

  // MAJ document avec infos Yousign
  await supabase
    .from('documents')
    .update({
      yousign_status: 'pending',
      yousign_signature_request_id: yousignResp.signature_request_id,
      yousign_id: yousignResp.signature_request_id,
      yousign_sent_at: now,
      yousign_signer_email: yousignResp.signer_email,
      yousign_signer_name: `${signerFirstName} ${signerLastName}`,
    })
    .eq('id', documentId)

  // Insérer dans signature_requests
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
      document_nom:  `Bulletin de souscription — ${signerFirstName} ${signerLastName}`,
      metadata: {
        document_id:   documentId,
        document_type: 'bulletin',
        dossier_id:    dossierId,
        via:           'auto-bulletin',
      },
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    })
  } catch (srErr) {
    console.error('[auto-bulletin] signature_requests insert error', srErr)
  }

  // Email client "Votre bulletin est prêt à signer"
  void sendEmail({
    to: dossier.email_client!,
    ...emailDocumentPretASigner(
      dossier.prenom ?? 'cher client',
      'Bulletin de souscription AMANA',
      yousignResp.signing_url ?? undefined,
    ),
  }).catch(err => console.error('[auto-bulletin] emailDocumentPretASigner error', err))

  // Transition vers souscription
  await transitionDossierStageService({
    dossierId,
    toStage: 'souscription',
    triggeredBy: 'background_job',
    triggerContext: { via: 'auto-bulletin', signature_request_id: yousignResp.signature_request_id },
    notes: 'Bulletin généré + envoyé Yousign — en attente signature client',
  }).catch(err => console.error('[auto-bulletin] transition souscription error', err))

  // Audit
  await supabase.from('audit_logs').insert({
    user_id: dossier.conseiller_id,
    action: 'document.auto_bulletin.sent',
    entity_type: 'document',
    entity_id: documentId,
    metadata: {
      dossier_id: dossierId,
      signature_request_id: yousignResp.signature_request_id,
      timestamp: now,
    },
  })

  return NextResponse.json({
    ok: true,
    document_id: documentId,
    signature_request_id: yousignResp.signature_request_id,
    signing_url: yousignResp.signing_url,
    next_stage: 'souscription',
  })
}
