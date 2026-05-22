// lib/documents/document-inputs-service.ts
// Sprint Agents IA v10c · 30 avril 2026
//
// Service d'accès à la table `document_inputs` :
//   - getDocumentInputs() : lit les inputs d'un (dossier × type)
//   - upsertDocumentInputs() : crée ou met à jour la ligne (form save)
//   - markReady() : passe le statut à 'ready' une fois la validation côté UI OK
//   - deleteDocumentInputs() : RGPD ou réinitialisation
//
// Toutes les opérations passent par le client Supabase server-side ; les RLS
// (cf. migration 20260430_document_inputs.sql) garantissent l'isolement par
// conseiller_id et l'accès admin.

import { createClient } from '@/lib/supabase/server'
import type { DerInputs, LmInputs, RaInputs } from '@/lib/documents/generate-pdf'

export type DocumentType =
  | 'der'
  | 'lm'
  | 'ra'
  | 'bilan'
  | 'preco'
  | 'succession'
  | 'zakat'
  | 'bulletin'
  | 'profil_risque'
  | 'kyc_fiche'

export type DocumentInputsRow = {
  id: string
  dossier_id: string
  conseiller_id: string
  document_type: DocumentType
  inputs: Record<string, unknown>
  status: 'draft' | 'ready'
  created_at: string
  updated_at: string
}

// Map type → shape attendu côté client
export type InputsByType = {
  der:           DerInputs
  lm:            LmInputs
  ra:            RaInputs
  bilan:         Record<string, unknown>
  preco:         Record<string, unknown>
  succession:    Record<string, unknown>
  zakat:         Record<string, unknown>
  bulletin:      Record<string, unknown>
  profil_risque: Record<string, unknown>
  kyc_fiche:     Record<string, unknown>
}

// =====================================================================
// READ
// =====================================================================
export async function getDocumentInputs<T extends DocumentType>(
  dossierId: string,
  documentType: T
): Promise<DocumentInputsRow | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('document_inputs')
    .select('*')
    .eq('dossier_id', dossierId)
    .eq('document_type', documentType)
    .maybeSingle()

  if (error) {
    console.error('[document-inputs] getDocumentInputs error', error)
    return null
  }
  return (data as DocumentInputsRow) ?? null
}

// =====================================================================
// UPSERT
// =====================================================================
export async function upsertDocumentInputs<T extends DocumentType>(params: {
  conseillerId: string
  dossierId: string
  documentType: T
  inputs: InputsByType[T]
  status?: 'draft' | 'ready'
}): Promise<{ ok: true; row: DocumentInputsRow } | { ok: false; error: string }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('document_inputs')
    .upsert(
      {
        conseiller_id: params.conseillerId,
        dossier_id: params.dossierId,
        document_type: params.documentType,
        inputs: params.inputs ?? {},
        status: params.status ?? 'draft',
      },
      { onConflict: 'dossier_id,document_type' }
    )
    .select('*')
    .single()

  if (error) {
    console.error('[document-inputs] upsertDocumentInputs error', error)
    return { ok: false, error: error.message }
  }
  return { ok: true, row: data as DocumentInputsRow }
}

// =====================================================================
// MARK READY
// =====================================================================
export async function markReady(params: {
  dossierId: string
  documentType: DocumentType
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('document_inputs')
    .update({ status: 'ready' })
    .eq('dossier_id', params.dossierId)
    .eq('document_type', params.documentType)

  if (error) {
    console.error('[document-inputs] markReady error', error)
    return { ok: false, error: error.message }
  }
  return { ok: true }
}

// =====================================================================
// DELETE (RGPD ou réinitialisation manuelle)
// =====================================================================
export async function deleteDocumentInputs(params: {
  dossierId: string
  documentType: DocumentType
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('document_inputs')
    .delete()
    .eq('dossier_id', params.dossierId)
    .eq('document_type', params.documentType)

  if (error) {
    console.error('[document-inputs] deleteDocumentInputs error', error)
    return { ok: false, error: error.message }
  }
  return { ok: true }
}

// =====================================================================
// Liste tous les inputs d'un dossier (utile pour la page admin)
// =====================================================================
export async function listDocumentInputsForDossier(
  dossierId: string
): Promise<DocumentInputsRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('document_inputs')
    .select('*')
    .eq('dossier_id', dossierId)
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('[document-inputs] listDocumentInputsForDossier error', error)
    return []
  }
  return (data ?? []) as DocumentInputsRow[]
}
