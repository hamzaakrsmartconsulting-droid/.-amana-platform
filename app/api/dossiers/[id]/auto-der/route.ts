// app/api/dossiers/[id]/auto-der/route.ts
// Sprint Agents IA v21 · 30 avril 2026
//
// Route APPELÉE PAR LES HOOKS d'auto-trigger après validation KYC pour Mass.
// Génère le DER puis l'envoie automatiquement en signature Yousign.
//
// Sécurisation : cette route est censée être appelée en interne (depuis
// triggerPostKycValidated). On ne la protège PAS par auth utilisateur, mais
// on exige un secret partagé via header X-AMANA-Internal-Secret. Cela
// permet aux hooks background de l'appeler sans contexte utilisateur.

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { generateDerForDossierAdmin } from '@/lib/documents/generate-pdf'
import { sendDocumentForSignature } from '@/lib/yousign/yousign-service'
import { transitionDossierStageService } from '@/lib/workflow/workflow-service'

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

  // Vérifier secret interne
  const secret = request.headers.get('x-amana-internal-secret')
  const expected = process.env.AMANA_INTERNAL_SECRET
  if (!expected || secret !== expected) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
  }

  const supabase = svc()

  // 1. Charger le dossier
  const { data: dossier, error: dossErr } = await supabase
    .from('dossiers')
    .select('id, conseiller_id, prenom, nom, email_client, offre_amana_cible, pipeline_stage')
    .eq('id', dossierId)
    .maybeSingle()
  if (dossErr || !dossier) {
    return NextResponse.json({ ok: false, error: 'Dossier introuvable' }, { status: 404 })
  }

  // 2. Vérifier conditions : offre Mass, stage kyc_complet, email présent
  if (dossier.offre_amana_cible !== 'mass') {
    return NextResponse.json(
      { ok: false, error: 'auto-DER réservé à l\'offre Mass' },
      { status: 400 }
    )
  }
  if (dossier.pipeline_stage !== 'kyc_complet') {
    return NextResponse.json(
      {
        ok: false,
        error: `Stage incompatible : ${dossier.pipeline_stage} (attendu kyc_complet)`,
      },
      { status: 400 }
    )
  }
  if (!dossier.email_client) {
    return NextResponse.json(
      { ok: false, error: 'Email client absent — DER non envoyable' },
      { status: 400 }
    )
  }

  // 3. Générer le DER (service role pour éviter RLS en contexte background)
  const genResult = await generateDerForDossierAdmin(dossier.conseiller_id, dossierId)
  if (!genResult.ok) {
    return NextResponse.json(
      { ok: false, error: `Génération DER échouée : ${genResult.error}` },
      { status: 500 }
    )
  }
  const documentId = genResult.doc.id

  // 4. Récupérer le PDF depuis Storage pour l'envoyer en signature
  const { data: pdfBlob } = await supabase.storage
    .from('amana-documents')
    .download(genResult.doc.storage_path)
  if (!pdfBlob) {
    return NextResponse.json(
      { ok: false, error: 'PDF DER introuvable en Storage' },
      { status: 500 }
    )
  }
  const pdfBuffer = Buffer.from(await pdfBlob.arrayBuffer())

  // 5. Envoyer en signature Yousign
  let yousignResp
  try {
    yousignResp = await sendDocumentForSignature({
      pdfBuffer,
      filename: genResult.doc.filename,
      documentDisplayName: `AMANA DER — ${dossier.prenom} ${dossier.nom}`,
      signer: {
        email: dossier.email_client,
        first_name: dossier.prenom,
        last_name: dossier.nom,
      },
    })
  } catch (err) {
    console.error('[auto-der] yousign error', err)
    return NextResponse.json(
      {
        ok: false,
        error: `Erreur envoi Yousign : ${err instanceof Error ? err.message : 'inconnue'}`,
      },
      { status: 502 }
    )
  }

  // 6. MAJ document avec infos Yousign
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

  // 7. Transition kyc_complet → der_envoye
  await transitionDossierStageService({
    dossierId,
    toStage: 'der_envoye',
    triggeredBy: 'background_job',
    triggerContext: {
      via: 'auto-der',
      signature_request_id: yousignResp.signature_request_id,
    },
    notes: 'DER généré + envoyé Yousign automatiquement (offre Mass)',
  })

  // 8. Audit
  await supabase.from('audit_logs').insert({
    user_id: dossier.conseiller_id,
    action: 'document.auto_der.sent',
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
    next_stage: 'der_envoye',
  })
}
