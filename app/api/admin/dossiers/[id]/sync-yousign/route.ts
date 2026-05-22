// app/api/admin/dossiers/[id]/sync-yousign/route.ts
// Récupère le statut Yousign pour les procédures en attente et applique
// le workflow (signature + souscription) si la procédure est terminée côté Yousign.

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { getSignatureRequest } from '@/lib/yousign/yousign-service'
import {
  applyPostYousignSignedWorkflow,
  isYousignProcedureCompleted,
  markDocumentsSigned,
  storeSignedPdfForProcedure,
  type YousignDocRow,
} from '@/lib/workflow/yousign-signed-handler'

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
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id: dossierId } = await context.params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Réservé aux admins' }, { status: 403 })
  }

  const admin = svc()

  const { data: pendingDocs, error: docsErr } = await admin
    .from('documents')
    .select('id, conseiller_id, dossier_id, type, filename, storage_path, yousign_signature_request_id, yousign_status')
    .eq('dossier_id', dossierId)
    .eq('yousign_status', 'pending')
    .not('yousign_signature_request_id', 'is', null)

  if (docsErr) {
    return NextResponse.json({ error: docsErr.message }, { status: 500 })
  }

  if (!pendingDocs?.length) {
    return NextResponse.json({
      ok: true,
      synced: 0,
      message: 'Aucune procédure Yousign en attente sur ce dossier',
    })
  }

  const bySigReq = new Map<string, typeof pendingDocs>()
  for (const doc of pendingDocs) {
    const sid = doc.yousign_signature_request_id as string
    const list = bySigReq.get(sid) ?? []
    list.push(doc)
    bySigReq.set(sid, list)
  }

  const results: Array<{
    signature_request_id: string
    yousign_status: string
    applied: boolean
    signed_updated: boolean
    workflow_ok: boolean
    doc_types: string[]
    error?: string
  }> = []

  const now = new Date().toISOString()

  for (const [sigReqId, docs] of bySigReq) {
    let remoteStatus = 'unknown'
    try {
      const remote = await getSignatureRequest(sigReqId)
      remoteStatus = remote.status

      if (!isYousignProcedureCompleted(remote)) {
        results.push({
          signature_request_id: sigReqId,
          yousign_status: remoteStatus,
          applied: false,
          signed_updated: false,
          workflow_ok: false,
          doc_types: docs.map(d => d.type),
        })
        continue
      }

      const docRows = docs as YousignDocRow[]
      await markDocumentsSigned(admin, sigReqId, now)
      await storeSignedPdfForProcedure(admin, sigReqId, docRows)

      let workflowOk = true
      let workflowError: string | undefined
      try {
        const wf = await applyPostYousignSignedWorkflow({
          supabase: admin,
          docs: docRows,
          sigReqId,
          now,
        })
        if (!wf.dossier_id) workflowOk = false
      } catch (err) {
        workflowOk = false
        workflowError = err instanceof Error ? err.message : 'Erreur workflow'
        console.error('[sync-yousign] workflow', sigReqId, err)
      }

      results.push({
        signature_request_id: sigReqId,
        yousign_status: 'done',
        applied: true,
        signed_updated: true,
        workflow_ok: workflowOk,
        doc_types: docs.map(d => d.type),
        error: workflowError,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur Yousign'
      results.push({
        signature_request_id: sigReqId,
        yousign_status: remoteStatus,
        applied: false,
        signed_updated: false,
        workflow_ok: false,
        doc_types: docs.map(d => d.type),
        error: msg,
      })
      console.error('[sync-yousign] getSignatureRequest', sigReqId, msg)
    }
  }

  await admin.from('audit_logs').insert({
    user_id: user.id,
    action: 'dossier.sync_yousign',
    entity_type: 'dossier',
    entity_id: dossierId,
    metadata: { results },
  })

  const applied = results.filter(r => r.signed_updated).length

  return NextResponse.json({
    ok: true,
    synced: applied,
    results,
    message:
      applied > 0
        ? `${applied} procédure(s) marquée(s) signée(s)${results.some(r => r.signed_updated && !r.workflow_ok) ? ' (pipeline : vérifier manuellement)' : ''}`
        : results.length > 0
          ? `Yousign : ${results.map(r => `${r.yousign_status}${r.error ? ` — ${r.error}` : ''}`).join(' ; ')}`
          : 'Aucune procédure Yousign en attente sur ce dossier',
  })
}
