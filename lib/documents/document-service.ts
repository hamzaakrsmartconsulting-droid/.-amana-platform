// lib/documents/document-service.ts
// Sprint Agents IA v10a · 29 avril 2026
// Helper serveur CRUD pour les documents générés.

import { createServerClient } from '@supabase/ssr'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('[document-service] Variables Supabase service role manquantes')
  return createServiceClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export type DocumentType = 'der' | 'lm' | 'ra' | 'bilan' | 'preco' | 'succession' | 'zakat' | 'lcbft' | 'ppe_annexe' | 'bulletin' | 'kyc_fiche' | 'profil_risque'
export type DocumentStatus = 'draft' | 'sent' | 'signed' | 'archived'

export type AmanaDocument = {
  id: string
  conseiller_id: string
  dossier_id: string | null
  type: DocumentType
  filename: string
  storage_path: string
  status: DocumentStatus
  yousign_id: string | null
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
  signed_at: string | null
}

async function getSupabaseServer() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {},
      },
    }
  )
}

/**
 * Crée une entrée document en DB (après upload Storage réussi).
 */
export async function createDocumentRecord(params: {
  conseillerId: string
  dossierId: string | null
  type: DocumentType
  filename: string
  storagePath: string
  metadata?: Record<string, unknown>
}): Promise<{ ok: true; doc: AmanaDocument } | { ok: false; error: string }> {
  const supabase = await getSupabaseServer()
  const { data, error } = await supabase
    .from('documents')
    .insert({
      conseiller_id: params.conseillerId,
      dossier_id: params.dossierId,
      type: params.type,
      filename: params.filename,
      storage_path: params.storagePath,
      status: 'draft',
      metadata: params.metadata ?? null,
    })
    .select('*')
    .single()
  if (error || !data) {
    console.error('[document-service] erreur création', error)
    return { ok: false, error: error?.message ?? 'Erreur création' }
  }
  return { ok: true, doc: data as AmanaDocument }
}

/**
 * Liste les documents d'un dossier (ou tous ceux d'un conseiller si dossierId omis).
 */
export async function listDocuments(params: {
  conseillerId: string
  dossierId?: string
}): Promise<AmanaDocument[]> {
  const supabase = await getSupabaseServer()
  let query = supabase
    .from('documents')
    .select('*')
    .eq('conseiller_id', params.conseillerId)
    .order('created_at', { ascending: false })

  if (params.dossierId) {
    query = query.eq('dossier_id', params.dossierId)
  }

  const { data, error } = await query
  if (error) {
    console.error('[document-service] erreur listing', error)
    return []
  }
  return (data ?? []) as AmanaDocument[]
}

/**
 * Récupère un document par son ID.
 */
export async function getDocument(id: string): Promise<AmanaDocument | null> {
  const supabase = await getSupabaseServer()
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error || !data) return null
  return data as AmanaDocument
}

/**
 * Génère une URL signée Storage pour télécharger le document.
 */
export async function getSignedUrl(
  storagePath: string,
  ttlSeconds: number = 600
): Promise<string | null> {
  const supabase = await getSupabaseServer()
  const { data, error } = await supabase.storage
    .from('amana-documents')
    .createSignedUrl(storagePath, ttlSeconds)
  if (error) {
    console.error('[document-service] erreur signed URL', error)
    return null
  }
  return data?.signedUrl ?? null
}

/**
 * Upload un buffer PDF dans Storage et crée l'entrée DB.
 */
export async function uploadAndRegisterDocument(params: {
  conseillerId: string
  dossierId: string | null
  type: DocumentType
  pdfBuffer: Buffer
  filename: string
  metadata?: Record<string, unknown>
}): Promise<{ ok: true; doc: AmanaDocument } | { ok: false; error: string }> {
  const supabase = await getSupabaseServer()
  const timestamp = Date.now()
  const safeFilename = params.filename.replace(/[^a-zA-Z0-9_.-]/g, '_')
  const storagePath = `${params.conseillerId}/${params.type}_${timestamp}_${safeFilename}`

  const { error: uploadErr } = await supabase.storage
    .from('amana-documents')
    .upload(storagePath, params.pdfBuffer, {
      contentType: 'application/pdf',
      upsert: false,
    })

  if (uploadErr) {
    console.error('[document-service] upload échec', uploadErr)
    return { ok: false, error: uploadErr.message }
  }

  return createDocumentRecord({
    conseillerId: params.conseillerId,
    dossierId: params.dossierId,
    type: params.type,
    filename: params.filename,
    storagePath,
    metadata: params.metadata,
  })
}

/**
 * Version service-role de uploadAndRegisterDocument.
 * À utiliser dans les contextes sans session utilisateur (workflows background, hooks, cron).
 */
export async function uploadAndRegisterDocumentAdmin(params: {
  conseillerId: string
  dossierId: string | null
  type: DocumentType
  pdfBuffer: Buffer
  filename: string
  metadata?: Record<string, unknown>
}): Promise<{ ok: true; doc: AmanaDocument } | { ok: false; error: string }> {
  const supabase = getServiceClient()
  const timestamp = Date.now()
  const safeFilename = params.filename.replace(/[^a-zA-Z0-9_.-]/g, '_')
  const storagePath = `${params.conseillerId}/${params.type}_${timestamp}_${safeFilename}`

  const { error: uploadErr } = await supabase.storage
    .from('amana-documents')
    .upload(storagePath, params.pdfBuffer, {
      contentType: 'application/pdf',
      upsert: false,
    })

  if (uploadErr) {
    console.error('[document-service] upload admin échec', uploadErr)
    return { ok: false, error: uploadErr.message }
  }

  const { data, error } = await supabase
    .from('documents')
    .insert({
      conseiller_id: params.conseillerId,
      dossier_id: params.dossierId,
      type: params.type,
      filename: params.filename,
      storage_path: storagePath,
      status: 'draft',
      metadata: params.metadata ?? null,
    })
    .select('*')
    .single()

  if (error || !data) {
    console.error('[document-service] erreur création admin', error)
    return { ok: false, error: error?.message ?? 'Erreur création document' }
  }
  return { ok: true, doc: data as AmanaDocument }
}
