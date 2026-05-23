// app/api/webhooks/yousign/route.ts — v2
// Sprint Agents IA v21 · 30 avril 2026
//
// Évolution v2 (vs v1 sprint v16) : appel automatique de
// triggerPostDocumentSigned quand l'événement est signature_request.signed.
// La transition de stage est automatique (pour Mass surtout).
//
// REMPLACE app/api/webhooks/yousign/route.ts du sprint v16.

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { verifyWebhookSignature } from '@/lib/yousign/yousign-service'
import {
  applyPostYousignSignedWorkflow,
  isMultiDocSubscriptionPack,
} from '@/lib/workflow/yousign-signed-handler'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error('Variables Supabase service role manquantes')
  }
  return createServiceClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

type YousignWebhookEvent = {
  event_id: string
  event_name: string
  event_time: string
  data: {
    signature_request?: { id: string; name: string; status: string }
    signer?: {
      id: string
      info: { email: string; first_name: string; last_name: string }
      status: string
    }
  }
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const signatureHeader = request.headers.get('x-yousign-signature-256')

  const valid = verifyWebhookSignature({ rawBody, signatureHeader })
  if (!valid) {
    console.warn('[yousign webhook] signature HMAC invalide')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let event: YousignWebhookEvent
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const sigReqId = event.data?.signature_request?.id
  if (!sigReqId) {
    console.warn('[yousign webhook] event sans signature_request.id', event)
    return NextResponse.json({ ok: true, ignored: true })
  }

  const supabase = serviceClient()

  const { data: docs, error: docErr } = await supabase
    .from('documents')
    .select('id, conseiller_id, dossier_id, type, filename, storage_path, project_id')
    .eq('yousign_signature_request_id', sigReqId)

  if (docErr || !docs || docs.length === 0) {
    console.warn('[yousign webhook] aucun document pour signature_request', sigReqId)
    return NextResponse.json({ ok: true, doc_not_found: true })
  }

  const docTypes = docs.map(d => d.type)
  const isSubscriptionPack = isMultiDocSubscriptionPack(docTypes)
  const doc = docs[0]

  const SIGNED_EVENTS = new Set([
    'signature_request.signed',
    'signature_request.done',
    'signer.done',
    'signer.signed',
  ])
  const eventNameMap: Record<string, string> = {
    'signature_request.activated': 'signature_request.activated',
    'signature_request.signed': 'signature_request.signed',
    'signature_request.done': 'signature_request.signed',
    'signer.done': 'signature_request.signed',
    'signer.signed': 'signature_request.signed',
    'signature_request.declined': 'signature_request.declined',
    'signature_request.expired': 'signature_request.expired',
    'signature_request.cancelled': 'signature_request.cancelled',
    'signer.declined': 'signer.declined',
    'signer.error': 'signer.error',
  }
  const mappedEventName = eventNameMap[event.event_name] ?? 'other'
  const isSigned = SIGNED_EVENTS.has(event.event_name)

  await supabase.from('yousign_signatures').insert({
    document_id: doc.id,
    conseiller_id: doc.conseiller_id,
    event_name: mappedEventName,
    signature_request_id: sigReqId,
    signer_email: event.data?.signer?.info?.email ?? null,
    signer_name: event.data?.signer?.info
      ? `${event.data.signer.info.first_name} ${event.data.signer.info.last_name}`
      : null,
    raw_payload: event as never,
  })

  let newStatus: string | null = null
  const now = new Date().toISOString()
  const updatePayload: Record<string, unknown> = {}

  if (isSigned) {
    newStatus = 'signed'
    updatePayload.yousign_signed_at = now
  } else {
    switch (event.event_name) {
      case 'signature_request.declined':
      case 'signer.declined':
        newStatus = 'declined'
        break
      case 'signature_request.expired':
        newStatus = 'expired'
        break
      case 'signature_request.cancelled':
        newStatus = 'cancelled'
        break
    }
  }

  if (newStatus) {
    updatePayload.yousign_status = newStatus
    await supabase
      .from('documents')
      .update(updatePayload)
      .eq('yousign_signature_request_id', sigReqId)
  }

  let workflowResult: { pack: boolean; dossier_id: string | null } | null = null
  if (isSigned) {
    try {
      workflowResult = await applyPostYousignSignedWorkflow({
        supabase,
        docs,
        sigReqId,
        now,
      })
    } catch (err) {
      console.error('[yousign webhook] post-sign workflow error', err)
    }
  }

  await supabase.from('audit_logs').insert({
    user_id: doc.conseiller_id,
    action: `document.yousign.${mappedEventName}`,
    entity_type: 'document',
    entity_id: doc.id,
    metadata: {
      signature_request_id: sigReqId,
      event_id: event.event_id,
      event_time: event.event_time,
      new_status: newStatus,
      is_subscription_pack: isSubscriptionPack,
      docs_in_pack: docTypes,
      workflow: workflowResult,
    },
  })

  return NextResponse.json({
    ok: true,
    event: mappedEventName,
    doc_id: doc.id,
    is_subscription_pack: isSubscriptionPack,
    workflow: workflowResult,
  })
}
