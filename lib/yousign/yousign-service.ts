// lib/yousign/yousign-service.ts
// Sprint Agents IA v16 · 30 avril 2026
//
// Client API Yousign pour AMANA Patrimoine.
// API v3 (https://developers.yousign.com/reference/oas-v3).
//
// Workflow standard pour AMANA :
//   1. Generate PDF (existant) → on a un PDF en Storage Supabase
//   2. createSignatureRequest({ name, signers: [{ email, first_name, last_name }] })
//   3. uploadDocument(signatureRequestId, pdfBuffer, filename)
//   4. activateSignatureRequest(signatureRequestId) → email envoyé au signataire
//   5. Webhook → événements signature_request.signed
//   6. downloadSignedDocument(signatureRequestId) → récupérer le PDF signé final
//
// Sandbox API : https://api-sandbox.yousign.app
// Production API : https://api.yousign.app

import { normalizePhoneForYousign } from './phone'

const YOUSIGN_API_KEY = process.env.YOUSIGN_API_KEY
const YOUSIGN_BASE_URL =
  process.env.YOUSIGN_BASE_URL || 'https://api-sandbox.yousign.app'
// En prod, remplacer par https://api.yousign.app

if (!YOUSIGN_API_KEY) {
  console.warn('[yousign] YOUSIGN_API_KEY manquant — les appels échoueront')
}

export type YousignSignatureRequest = {
  id: string
  name: string
  status: 'draft' | 'ongoing' | 'done' | 'declined' | 'expired' | 'canceled' | 'approval'
  ordered_signers: boolean
  delivery_mode: 'email' | 'none'
  created_at: string
  expiration_date: string | null
}

export type YousignSigner = {
  id: string
  info: {
    first_name: string
    last_name: string
    email: string
    phone_number?: string
    locale?: 'fr' | 'en'
  }
  status: 'initiated' | 'declined' | 'notified' | 'processing' | 'consent_given' | 'signed' | 'error'
  signature_link?: string
}

// =====================================================================
// HTTP helper
// =====================================================================
type YousignFetchInit = Omit<RequestInit, 'body'> & {
  body?: BodyInit | Record<string, unknown> | null
}

async function yousignFetch<T>(
  path: string,
  init?: YousignFetchInit
): Promise<T> {
  const url = `${YOUSIGN_BASE_URL}${path}`
  const headers: Record<string, string> = {
    Authorization: `Bearer ${YOUSIGN_API_KEY}`,
    Accept: 'application/json',
    ...((init?.headers as Record<string, string>) ?? {}),
  }

  let body: BodyInit | null | undefined
  if (init?.body && typeof init.body === 'object' && !(init.body instanceof FormData)
      && !(init.body instanceof Blob) && !(init.body instanceof ArrayBuffer)
      && !(init.body instanceof URLSearchParams)) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(init.body)
  } else {
    body = init?.body as BodyInit | null | undefined
  }

  const fetchInit: RequestInit = {
    ...init,
    headers,
    body,
  } as RequestInit

  const res = await fetch(url, fetchInit)
  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Yousign ${res.status} ${res.statusText} on ${path}: ${errText}`)
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

// =====================================================================
// 1. Créer une procédure de signature
// =====================================================================
export async function createSignatureRequest(params: {
  name: string
  delivery_mode?: 'email' | 'none'
  expiration_days?: number
  custom_experience_id?: string
}): Promise<YousignSignatureRequest> {
  const expiration_date = new Date()
  expiration_date.setDate(expiration_date.getDate() + (params.expiration_days ?? 30))
  // Yousign v3 attend le format YYYY-MM-DD uniquement (pas ISO complet)
  const expirationDateStr = expiration_date.toISOString().split('T')[0]

  return await yousignFetch<YousignSignatureRequest>('/v3/signature_requests', {
    method: 'POST',
    body: {
      name: params.name,
      delivery_mode: params.delivery_mode ?? 'email',
      expiration_date: expirationDateStr,
      ...(params.custom_experience_id ? { custom_experience_id: params.custom_experience_id } : {}),
    },
  })
}

// =====================================================================
// 2. Uploader un document PDF dans la procédure
// =====================================================================
export async function uploadDocument(params: {
  signatureRequestId: string
  pdfBuffer: Buffer
  filename: string
  nature?: 'signable_document' | 'attachment'
}): Promise<{ id: string; filename: string }> {
  const formData = new FormData()
  const blob = new Blob([new Uint8Array(params.pdfBuffer)], { type: 'application/pdf' })
  formData.append('file', blob, params.filename)
  formData.append('nature', params.nature ?? 'signable_document')

  return await yousignFetch<{ id: string; filename: string }>(
    `/v3/signature_requests/${params.signatureRequestId}/documents`,
    {
      method: 'POST',
      body: formData,
    }
  )
}

// =====================================================================
// 3. Ajouter un signataire à la procédure
// =====================================================================
export async function addSigner(params: {
  signatureRequestId: string
  email: string
  first_name: string
  last_name: string
  phone_number?: string
  locale?: 'fr' | 'en'
  signature_level?: 'electronic_signature' | 'advanced_electronic_signature'
  signature_authentication_mode?: 'no_otp' | 'otp_email' | 'otp_sms'
}): Promise<YousignSigner> {
  const info: Record<string, unknown> = {
    first_name: params.first_name,
    last_name: params.last_name,
    email: params.email,
    locale: params.locale ?? 'fr',
  }
  // Yousign exige E.164 valide — ignorer si non normalisable
  const phone = normalizePhoneForYousign(params.phone_number)
  const body = {
    info,
    signature_level: params.signature_level ?? 'electronic_signature',
    signature_authentication_mode:
      params.signature_authentication_mode ?? 'no_otp',
  }
  if (phone) {
    info.phone_number = phone
  }

  try {
    return await yousignFetch<YousignSigner>(
      `/v3/signature_requests/${params.signatureRequestId}/signers`,
      { method: 'POST', body },
    )
  } catch (err) {
    // Secours : renvoyer sans téléphone si Yousign rejette le numéro
    const msg = err instanceof Error ? err.message : ''
    if (phone && msg.includes('phone_number')) {
      delete info.phone_number
      console.warn('[yousign] phone_number rejeté, nouvel essai sans téléphone')
      return await yousignFetch<YousignSigner>(
        `/v3/signature_requests/${params.signatureRequestId}/signers`,
        { method: 'POST', body },
      )
    }
    throw err
  }
}

// =====================================================================
// 4. Activer la procédure (envoie l'email au signataire si delivery_mode=email)
// =====================================================================
export async function activateSignatureRequest(
  signatureRequestId: string
): Promise<YousignSignatureRequest> {
  return await yousignFetch<YousignSignatureRequest>(
    `/v3/signature_requests/${signatureRequestId}/activate`,
    { method: 'POST' }
  )
}

// =====================================================================
// 5. Récupérer une signature_request (statut, signataires, etc.)
// =====================================================================
export async function getSignatureRequest(
  signatureRequestId: string
): Promise<YousignSignatureRequest & { signers: YousignSigner[] }> {
  return await yousignFetch(`/v3/signature_requests/${signatureRequestId}`)
}

// =====================================================================
// 6. Récupérer le PDF signé final
// =====================================================================
export async function downloadSignedDocument(
  signatureRequestId: string
): Promise<Buffer> {
  const url = `${YOUSIGN_BASE_URL}/v3/signature_requests/${signatureRequestId}/documents/download`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${YOUSIGN_API_KEY}` },
  })
  if (!res.ok) {
    throw new Error(`Yousign download failed: ${res.status} ${res.statusText}`)
  }
  const arrayBuffer = await res.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

// =====================================================================
// 7. Annuler / décliner une procédure
// =====================================================================
export async function cancelSignatureRequest(
  signatureRequestId: string,
  reason?: string
): Promise<YousignSignatureRequest> {
  return await yousignFetch<YousignSignatureRequest>(
    `/v3/signature_requests/${signatureRequestId}/cancel`,
    {
      method: 'POST',
      body: { reason: reason ?? 'Cancelled by AMANA' },
    }
  )
}

// =====================================================================
// 7b. Ajouter un champ de signature sur un document (requis par Yousign v3)
// =====================================================================
export async function addSignatureField(params: {
  signatureRequestId: string
  documentId: string
  signerId: string
  page?: number
  x?: number
  y?: number
  width?: number
  height?: number
}): Promise<{ id: string }> {
  return await yousignFetch<{ id: string }>(
    `/v3/signature_requests/${params.signatureRequestId}/documents/${params.documentId}/fields`,
    {
      method: 'POST',
      body: {
        type: 'signature',
        signer_id: params.signerId,
        page: params.page ?? 1,
        x: params.x ?? 60,
        y: params.y ?? 700,
        width: params.width ?? 200,
        height: params.height ?? 80,
      },
    }
  )
}

// =====================================================================
// 8. Workflow tout-en-un : envoi DER/LM en signature en 1 appel
// =====================================================================
/**
 * Helper de haut niveau : crée la procédure, upload le PDF, ajoute le signataire,
 * place un champ de signature, active. Retourne l'ID de la procédure.
 *
 * Utilisé par le bouton "Envoyer en signature" depuis l'admin AMANA.
 */
export async function sendDocumentForSignature(params: {
  pdfBuffer: Buffer
  filename: string
  documentDisplayName: string
  signer: {
    email: string
    first_name: string
    last_name: string
    phone_number?: string
  }
  expiration_days?: number
}): Promise<{
  signature_request_id: string
  signer_id: string
  signer_status: string
  signer_email: string
  signing_url: string | null
}> {
  // Mode mock pour les environnements de dev/test sans accès Yousign
  if (process.env.DEV_MOCK_YOUSIGN === '1') {
    const mockId = `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    console.info(`[yousign MOCK] sendDocumentForSignature → ${mockId}`)
    return {
      signature_request_id: mockId,
      signer_id: `mock-signer-${mockId}`,
      signer_status: 'initiated',
      signer_email: params.signer.email,
      signing_url: `http://localhost:3000/mock-sign?id=${mockId}`,
    }
  }

  // Yousign interdit les espaces en début/fin de name
  const safeName = params.documentDisplayName.trim().replace(/\s+/g, ' ') || 'Document AMANA'

  const sigReq = await createSignatureRequest({
    name: safeName,
    delivery_mode: 'email',
    expiration_days: params.expiration_days,
  })

  const uploadedDoc = await uploadDocument({
    signatureRequestId: sigReq.id,
    pdfBuffer: params.pdfBuffer,
    filename: params.filename,
  })

  const signer = await addSigner({
    signatureRequestId: sigReq.id,
    email: params.signer.email,
    first_name: params.signer.first_name,
    last_name: params.signer.last_name,
    phone_number: params.signer.phone_number,
  })

  // Yousign v3 exige au moins un champ de signature par signataire avant activation
  await addSignatureField({
    signatureRequestId: sigReq.id,
    documentId: uploadedDoc.id,
    signerId: signer.id,
    page: 1,
    x: 60,
    y: 700,
    width: 200,
    height: 80,
  })

  // Activer la procédure → Yousign envoie son propre email d'invitation
  await activateSignatureRequest(sigReq.id)

  // Récupérer le signing_url depuis la procédure activée
  let signingUrl: string | null = signer.signature_link ?? null
  if (!signingUrl) {
    try {
      const activated = await getSignatureRequest(sigReq.id)
      signingUrl = activated.signers?.find(s => s.id === signer.id)?.signature_link ?? null
    } catch { /* non bloquant */ }
  }

  return {
    signature_request_id: sigReq.id,
    signer_id: signer.id,
    signer_status: signer.status,
    signer_email: signer.info.email,
    signing_url: signingUrl,
  }
}

// =====================================================================
// 9. Workflow multi-documents : DER + LM + RA en 1 seule procédure Yousign
// =====================================================================
/**
 * Envoie DER + LM + RA dans une seule procédure Yousign.
 * → 1 seul email Yousign au client.
 * → 1 seul signing_url pour signer les 3 documents en une session.
 *
 * Retourne : signature_request_id (commun aux 3 docs), signer_id, signing_url,
 * ainsi que les yousign_document_id de chaque document (pour la DB).
 */
export async function sendRegulatoryPackForSignature(params: {
  documents: Array<{
    pdfBuffer: Buffer
    filename: string
    type: 'der' | 'lm' | 'ra'
  }>
  signer: {
    email: string
    first_name: string
    last_name: string
    phone_number?: string
  }
  packName: string
  expiration_days?: number
}): Promise<{
  signature_request_id: string
  signer_id: string
  signer_email: string
  signing_url: string | null
  uploaded_documents: Array<{ type: string; yousign_document_id: string }>
}> {
  // Mode mock dev
  if (process.env.DEV_MOCK_YOUSIGN === '1') {
    const mockId = `mock-pack-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    console.info(`[yousign MOCK] sendRegulatoryPackForSignature → ${mockId}`)
    return {
      signature_request_id: mockId,
      signer_id: `mock-signer-${mockId}`,
      signer_email: params.signer.email,
      signing_url: `http://localhost:3000/mock-sign?id=${mockId}`,
      uploaded_documents: params.documents.map(d => ({
        type: d.type,
        yousign_document_id: `mock-doc-${d.type}-${mockId}`,
      })),
    }
  }

  const safeName = params.packName.trim().replace(/\s+/g, ' ') || 'Pack Réglementaire AMANA'

  // 1. Créer la procédure
  const sigReq = await createSignatureRequest({
    name: safeName,
    delivery_mode: 'email',
    expiration_days: params.expiration_days ?? 30,
  })

  // 2. Uploader chaque PDF
  const uploadedDocuments: Array<{ type: string; yousign_document_id: string }> = []
  for (const doc of params.documents) {
    const uploaded = await uploadDocument({
      signatureRequestId: sigReq.id,
      pdfBuffer: doc.pdfBuffer,
      filename: doc.filename,
      nature: 'signable_document',
    })
    uploadedDocuments.push({ type: doc.type, yousign_document_id: uploaded.id })
  }

  // 3. Ajouter le signataire (unique)
  const signer = await addSigner({
    signatureRequestId: sigReq.id,
    email: params.signer.email,
    first_name: params.signer.first_name,
    last_name: params.signer.last_name,
    phone_number: params.signer.phone_number,
  })

  // 4. Ajouter un champ de signature sur chaque document
  for (const uploaded of uploadedDocuments) {
    await addSignatureField({
      signatureRequestId: sigReq.id,
      documentId: uploaded.yousign_document_id,
      signerId: signer.id,
      page: 1,
      x: 60,
      y: 700,
      width: 200,
      height: 80,
    })
  }

  // 5. Activer → Yousign envoie 1 email au client
  await activateSignatureRequest(sigReq.id)

  // 6. Récupérer le signing_url
  let signingUrl: string | null = signer.signature_link ?? null
  if (!signingUrl) {
    try {
      const activated = await getSignatureRequest(sigReq.id)
      signingUrl = activated.signers?.find(s => s.id === signer.id)?.signature_link ?? null
    } catch { /* non bloquant */ }
  }

  return {
    signature_request_id: sigReq.id,
    signer_id: signer.id,
    signer_email: signer.info.email,
    signing_url: signingUrl,
    uploaded_documents: uploadedDocuments,
  }
}

// =====================================================================
// 10. Validation HMAC du webhook (sécurité)
// =====================================================================
import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Vérifie la signature HMAC d'un webhook Yousign.
 * Header attendu : X-Yousign-Signature-256 = sha256=<hexdigest>
 * Le secret est défini côté Yousign et stocké dans YOUSIGN_WEBHOOK_SECRET.
 */
export function verifyWebhookSignature(params: {
  rawBody: string
  signatureHeader: string | null
}): boolean {
  const secret = process.env.YOUSIGN_WEBHOOK_SECRET
  if (!secret) {
    console.error('[yousign] YOUSIGN_WEBHOOK_SECRET manquant — vérification HMAC impossible')
    return false
  }
  if (!params.signatureHeader) return false
  const cleanedSignature = params.signatureHeader.replace(/^sha256=/, '')

  const computed = createHmac('sha256', secret).update(params.rawBody).digest('hex')

  try {
    const a = Buffer.from(cleanedSignature, 'hex')
    const b = Buffer.from(computed, 'hex')
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}
