// lib/workflow/yousign-signed-handler.ts
// Logique post-signature Yousign (webhook + sync admin).

import type { SupabaseClient } from '@supabase/supabase-js'
import { downloadSignedDocument } from '@/lib/yousign/yousign-service'
import { triggerPostDocumentSigned } from '@/lib/workflow/auto-trigger'
import { transitionDossierStageService } from '@/lib/workflow/workflow-service'

export type YousignDocRow = {
  id: string
  conseiller_id: string
  dossier_id: string
  type: string
  filename: string
  storage_path: string
}

/** Pack signé en une procédure → passage souscription (sans bulletin V7). */
export function isMultiDocSubscriptionPack(docTypes: string[]): boolean {
  const types = new Set(docTypes)
  if (types.has('der') && types.has('lm') && types.has('ra')) return true
  if (types.has('lm') && types.has('ra')) return true
  return false
}

/** Procédure Yousign terminée côté API (webhook manqué en local). */
export function isYousignProcedureCompleted(remote: {
  status: string
  signers?: Array<{ status: string }>
}): boolean {
  if (remote.status === 'done') return true
  const signers = remote.signers ?? []
  return signers.length > 0 && signers.every(s => s.status === 'signed')
}

export async function storeSignedPdfForProcedure(
  supabase: SupabaseClient,
  sigReqId: string,
  docs: YousignDocRow[],
): Promise<void> {
  if (docs.length === 0) return
  const primary = docs[0]
  try {
    const signedBuffer = await downloadSignedDocument(sigReqId)
    const signedPath = primary.storage_path.replace(/\.pdf$/i, '_signed.pdf')
    await supabase.storage.from('amana-documents').upload(signedPath, signedBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    })
    const docIds = docs.map(d => d.id)
    await supabase
      .from('documents')
      .update({ yousign_signed_url: signedPath })
      .in('id', docIds)
  } catch (err) {
    console.error('[yousign-signed-handler] download signed doc error', err)
  }
}

export async function markDocumentsSigned(
  supabase: SupabaseClient,
  sigReqId: string,
  now: string,
): Promise<void> {
  await supabase
    .from('documents')
    .update({
      yousign_status: 'signed',
      yousign_signed_at: now,
    })
    .eq('yousign_signature_request_id', sigReqId)
}

/**
 * Transitions pipeline après signature complète d'une procédure.
 * L'email de bienvenue souscription est envoyé par transitionDossierStageService.
 */
export async function applyPostYousignSignedWorkflow(params: {
  supabase: SupabaseClient
  docs: YousignDocRow[]
  sigReqId: string
  now?: string
}): Promise<{ pack: boolean; dossier_id: string | null }> {
  const { supabase, docs, sigReqId } = params
  const now = params.now ?? new Date().toISOString()
  const docTypes = docs.map(d => d.type)
  const primary = docs[0]
  const dossierId = primary?.dossier_id ?? null

  if (!dossierId) {
    return { pack: false, dossier_id: null }
  }

  await markDocumentsSigned(supabase, sigReqId, now)
  await storeSignedPdfForProcedure(supabase, sigReqId, docs)

  if (isMultiDocSubscriptionPack(docTypes)) {
    await transitionDossierStageService({
      dossierId,
      toStage: 'souscription',
      triggeredBy: 'webhook_yousign',
      triggerContext: { pack_type: 'lm_ra_pack', docs_signed: docTypes },
      notes:
        docTypes.includes('der')
          ? 'Pack réglementaire DER+LM+RA signé — dossier en souscription'
          : 'LM + RA signés (procédure Yousign) — dossier en souscription',
    })

    console.info('[yousign-signed-handler] Pack signé → souscription', dossierId, docTypes)
    return { pack: true, dossier_id: dossierId }
  }

  const types = new Set(docTypes)

  if (types.has('lm') && !types.has('ra')) {
    const hookResult = await triggerPostDocumentSigned({
      dossierId,
      documentType: 'lm',
    })
    if (!hookResult.ok) {
      console.warn('[yousign-signed-handler] LM hook errors:', hookResult.errors)
    }
  }

  if (types.has('ra') && !types.has('lm')) {
    await transitionDossierStageService({
      dossierId,
      toStage: 'souscription',
      triggeredBy: 'webhook_yousign',
      triggerContext: { document_type: 'ra' },
      notes: 'RA signé — dossier en souscription',
    })
  }

  if (types.has('der') && !types.has('lm')) {
    const hookResult = await triggerPostDocumentSigned({
      dossierId,
      documentType: 'der',
    })
    if (!hookResult.ok) {
      console.warn('[yousign-signed-handler] DER hook errors:', hookResult.errors)
    }
  }

  if (types.has('bulletin')) {
    const hookResult = await triggerPostDocumentSigned({
      dossierId,
      documentType: 'bulletin',
    })
    if (!hookResult.ok) {
      console.warn('[yousign-signed-handler] bulletin hook errors:', hookResult.errors)
    }
  }

  return { pack: false, dossier_id: dossierId }
}
