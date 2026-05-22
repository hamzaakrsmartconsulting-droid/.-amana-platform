// app/api/documents/[id]/sign/route.ts
// Sprint Agents IA v16 · 30 avril 2026
//
// Endpoint pour envoyer un document existant en signature électronique
// via Yousign.
//
// POST /api/documents/[id]/sign
// Body: { signer_email, signer_first_name, signer_last_name, signer_phone? }
// Response: { ok: true, signature_request_id, signed_url? } ou { ok: false, error }

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { normalizePhoneForYousign } from '@/lib/yousign/phone'
import { sendDocumentForSignature } from '@/lib/yousign/yousign-service'
import { requireApprovedGateSameClientEmail, type GateType } from '@/lib/workflow/validation-gates'
import { sendEmail, emailDocumentPretASigner } from '@/lib/email'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function getAuthUser() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {},
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return { userId: user.id, supabase }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: documentId } = await context.params
  const auth = await getAuthUser()
  if (!auth) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  let body: {
    signer_email?: string
    signer_first_name?: string
    signer_last_name?: string
    signer_phone?: string
    expiration_days?: number
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON invalide' }, { status: 400 })
  }

  if (!body.signer_email || !body.signer_first_name || !body.signer_last_name) {
    return NextResponse.json(
      { error: 'signer_email, signer_first_name et signer_last_name sont requis' },
      { status: 400 }
    )
  }

  // 1. Récupérer le document + vérifier appartenance conseiller
  const { data: doc, error: docErr } = await auth.supabase
    .from('documents')
    .select('id, conseiller_id, dossier_id, type, filename, storage_path, yousign_status')
    .eq('id', documentId)
    .maybeSingle()

  if (docErr || !doc) {
    return NextResponse.json({ error: 'Document introuvable' }, { status: 404 })
  }
  if (doc.conseiller_id !== auth.userId) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  // 2. Refuser si déjà envoyé / signé
  if (doc.yousign_status && ['pending', 'signed'].includes(doc.yousign_status)) {
    return NextResponse.json(
      {
        error: `Ce document est déjà ${doc.yousign_status === 'signed' ? 'signé' : 'en attente de signature'}.`,
      },
      { status: 409 }
    )
  }

  // 3. Refuser si type non signable (RA / Bilan / Préco / Zakat / Succession ne sont pas signables côté client)
  const SIGNABLE_TYPES = ['der', 'lm', 'bulletin']
  if (!SIGNABLE_TYPES.includes(doc.type)) {
    return NextResponse.json(
      {
        error: `Le type ${doc.type} n'est pas envoyé en signature électronique. Types signables : ${SIGNABLE_TYPES.join(', ')}.`,
      },
      { status: 400 }
    )
  }

  // 3bis. Verrou « Mohamed » : certains types nécessitent une gate admin avant signature.
  const GATE_BY_TYPE: Record<string, GateType | undefined> = {
    lm: 'lm_send',
    bulletin: 'ra_bulletin_send',
  }
  const gateType = GATE_BY_TYPE[doc.type]
  if (gateType && doc.dossier_id) {
    const gateCheck = await requireApprovedGateSameClientEmail(doc.dossier_id, gateType)
    if (!gateCheck.ok) {
      return NextResponse.json(
        {
          error: gateCheck.reason,
          gate_type: gateType,
          gate_status: gateCheck.status,
        },
        { status: 423 } // 423 Locked
      )
    }
  } else if (gateType && !doc.dossier_id) {
    return NextResponse.json(
      {
        error:
          'Document non rattaché à un dossier — impossible de vérifier le verrou de validation administrateur.',
      },
      { status: 409 }
    )
  }

  // 4. Télécharger le PDF depuis Storage (service role pour bypass RLS storage)
  const svcForDownload = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
  const { data: pdfBlob, error: dlErr } = await svcForDownload.storage
    .from('amana-documents')
    .download(doc.storage_path)
  if (dlErr || !pdfBlob) {
    console.error('[sign] download error', dlErr)
    return NextResponse.json(
      { error: 'Impossible de télécharger le PDF depuis Storage' },
      { status: 500 }
    )
  }
  const pdfBuffer = Buffer.from(await pdfBlob.arrayBuffer())

  // 5. Appeler Yousign
  // Yousign : uniquement lettres, espaces, tirets autorisés dans first/last name
  const sanitizeSignerName = (s: string) =>
    s.replace(/[^a-zA-ZÀ-ÿ\s\-']/g, '').trim().replace(/\s+/g, ' ') || 'Client'

  const yousignPhone = normalizePhoneForYousign(body.signer_phone)

  let yousignResp
  try {
    yousignResp = await sendDocumentForSignature({
      pdfBuffer,
      filename: doc.filename,
      documentDisplayName: `AMANA ${doc.type.toUpperCase()} ${(doc.filename ?? '').trim()}`.trim(),
      signer: {
        email: body.signer_email,
        first_name: sanitizeSignerName(body.signer_first_name),
        last_name: sanitizeSignerName(body.signer_last_name),
        phone_number: yousignPhone,
      },
      expiration_days: body.expiration_days,
    })
  } catch (err) {
    console.error('[sign] yousign error', err)
    return NextResponse.json(
      {
        error: `Erreur Yousign : ${err instanceof Error ? err.message : 'inconnue'}`,
      },
      { status: 502 }
    )
  }

  // 6. Mettre à jour le document avec les infos Yousign
  const now = new Date().toISOString()
  const { error: upErr } = await auth.supabase
    .from('documents')
    .update({
      yousign_status: 'pending',
      yousign_signature_request_id: yousignResp.signature_request_id,
      yousign_id: yousignResp.signature_request_id, // legacy field aussi alimenté
      yousign_sent_at: now,
      yousign_signer_email: yousignResp.signer_email,
      yousign_signer_name: `${body.signer_first_name} ${body.signer_last_name}`,
    })
    .eq('id', documentId)

  if (upErr) {
    console.error('[sign] update doc error', upErr)
    return NextResponse.json(
      { error: 'Document Yousign envoyé mais MAJ base échouée — vérifier manuellement' },
      { status: 500 }
    )
  }

  // 7. Insérer dans signature_requests pour que le webhook puisse envoyer la confirmation
  try {
    const svc = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    )
    // Récupérer user_id du client depuis le dossier
    let clientUserId: string | null = null
    if (doc.dossier_id) {
      const { data: doss } = await svc
        .from('dossiers')
        .select('prenom, nom, email_client')
        .eq('id', doc.dossier_id)
        .maybeSingle()

      if (doss?.email_client) {
        const { data: userMatch } = await svc.auth.admin.listUsers()
        clientUserId = userMatch?.users?.find(u => u.email === doss.email_client)?.id ?? null
      }
    }
    await svc.from('signature_requests').insert({
      project_id:    null,
      user_id:       clientUserId,
      conseiller_id: auth.userId,
      provider:      'yousign',
      provider_id:   yousignResp.signature_request_id,
      provider_url:  yousignResp.signing_url,
      statut:        'envoye',
      document_nom:  doc.filename ?? `${doc.type.toUpperCase()} AMANA`,
      metadata: {
        document_id: documentId,
        document_type: doc.type,
        dossier_id: doc.dossier_id,
        signer_email: body.signer_email,
      },
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    })
  } catch (srErr) {
    console.error('[sign] signature_requests insert error', srErr)
    // Non bloquant — ne pas faire échouer la réponse
  }

  // 8. Notifier le client par email AMANA (en complément de l'email Yousign)
  if (body.signer_email) {
    const docLabel = doc.type === 'lm' ? 'Lettre de Mission' : doc.type === 'der' ? 'Document d\'Entrée en Relation' : doc.filename ?? doc.type.toUpperCase()
    // Récupérer prénom du client pour personnaliser
    let prenomClient = 'cher client'
    if (doc.dossier_id) {
      const svc2 = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false, autoRefreshToken: false } },
      )
      const { data: doss } = await svc2.from('dossiers').select('prenom').eq('id', doc.dossier_id).maybeSingle()
      if (doss?.prenom) prenomClient = doss.prenom
    }
    void sendEmail({
      to: body.signer_email,
      ...emailDocumentPretASigner(prenomClient, docLabel, yousignResp.signing_url ?? undefined),
    }).catch(err => console.error('[sign] emailDocumentPretASigner error', err))
  }

  // 9. Audit log
  await auth.supabase.from('audit_logs').insert({
    user_id: auth.userId,
    action: 'document.sent_for_signature',
    entity_type: 'document',
    entity_id: documentId,
    metadata: {
      type: doc.type,
      dossier_id: doc.dossier_id,
      filename: doc.filename,
      signer_email: body.signer_email,
      signature_request_id: yousignResp.signature_request_id,
      timestamp: now,
    },
    ip_address:
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      null,
    user_agent: request.headers.get('user-agent') ?? null,
  })

  return NextResponse.json({
    ok: true,
    signature_request_id: yousignResp.signature_request_id,
    signer_email: yousignResp.signer_email,
    yousign_status: 'pending',
  })
}
