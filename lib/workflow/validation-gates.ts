// lib/workflow/validation-gates.ts
// Helpers pour les verrous Mohamed (admin) avant actions critiques.
import 'server-only'
// Spec « Parcours Réglementaire AMANA » V2 / V3.

import { createClient } from '@supabase/supabase-js'
import { sendEmail, emailValidationRequired } from '@/lib/email'

export type GateType =
  | 'kyc_validation'           // V1 — validation KYC complet
  | 'profil_risque_validation' // V2 — validation profil risque + bilan patrimonial
  | 'lm_send'                  // V3 — validation LM avant signature
  | 'ra_recommandations'       // V4 — validation recommandations RA (sections 7-10)
  | 'ra_synthese'              // V5 — validation synthèse RA (texte libre)
  | 'ra_frais_exante'          // V6 — validation frais ex ante (art. 24 §4 MIF II)
  | 'ra_bulletin_send'         // V7 — validation bulletins de souscription
  | 'bilan_annuel_validation'  // V8 — validation bilan annuel + re-recommandations (art. 25 MIF II)
  | 'preco_validation'         // Préconisation — après génération PDF (post V3)
  | 'zakat_validation'         // Zakat — après génération PDF (post V3)
  | 'succession_validation'    // Succession — après génération PDF (post V3)

export interface GateStatus {
  exists: boolean
  decision: 'pending' | 'approved' | 'rejected' | null
  decided_at: string | null
  decided_by: string | null
  comment: string | null
}

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function getGateStatus(
  dossierId: string,
  gateType: GateType,
): Promise<GateStatus> {
  const { data } = await admin()
    .from('validation_gates')
    .select('decision, decided_at, decided_by, comment')
    .eq('dossier_id', dossierId)
    .eq('gate_type', gateType)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data) {
    return {
      exists: false,
      decision: null,
      decided_at: null,
      decided_by: null,
      comment: null,
    }
  }

  return {
    exists: true,
    decision: data.decision as GateStatus['decision'],
    decided_at: data.decided_at,
    decided_by: data.decided_by,
    comment: data.comment,
  }
}

export async function isGateApproved(
  dossierId: string,
  gateType: GateType,
): Promise<boolean> {
  const status = await getGateStatus(dossierId, gateType)
  return status.decision === 'approved'
}

export async function requireApprovedGate(
  dossierId: string,
  gateType: GateType,
): Promise<{ ok: true } | { ok: false; reason: string; status: GateStatus }> {
  const status = await getGateStatus(dossierId, gateType)
  if (status.decision === 'approved') return { ok: true }

  const reason =
    status.decision === 'rejected'
      ? `Validation administrateur refusée pour ${gateType}.`
      : status.decision === 'pending'
        ? `En attente de validation administrateur pour ${gateType}.`
        : `Aucune validation administrateur enregistrée pour ${gateType}.`

  return { ok: false, reason, status }
}

/** Gate admin liée à un type de document (génération ou envoi Yousign). */
export const GATE_BY_DOCUMENT_TYPE: Partial<
  Record<
    | 'lm'
    | 'ra'
    | 'bilan'
    | 'profil_risque'
    | 'preco'
    | 'zakat'
    | 'succession'
    | 'bulletin',
    GateType
  >
> = {
  lm: 'lm_send',
  ra: 'ra_recommandations',
  bilan: 'profil_risque_validation',
  profil_risque: 'profil_risque_validation',
  preco: 'preco_validation',
  zakat: 'zakat_validation',
  succession: 'succession_validation',
  bulletin: 'ra_bulletin_send',
}

/** Types dont la gate est créée en pending dès la génération du PDF (admin / wizard). */
export const GATE_ON_DOCUMENT_GENERATED = new Set<keyof typeof GATE_BY_DOCUMENT_TYPE>([
  'lm',
  'ra',
  'bilan',
  'profil_risque',
  'preco',
  'zakat',
  'succession',
  'bulletin',
])

export function gateTypeForDocument(
  documentType: string,
): GateType | undefined {
  if (!(documentType in GATE_BY_DOCUMENT_TYPE)) return undefined
  return GATE_BY_DOCUMENT_TYPE[
    documentType as keyof typeof GATE_BY_DOCUMENT_TYPE
  ]
}

/** Après génération PDF : remet la gate en pending si ce type en a une. */
export async function applyGateAfterDocumentGenerated(
  dossierId: string,
  documentType: string,
): Promise<void> {
  if (!GATE_ON_DOCUMENT_GENERATED.has(documentType as keyof typeof GATE_BY_DOCUMENT_TYPE)) return
  const gateType = gateTypeForDocument(documentType)
  if (!gateType) return
  await setGatePendingAfterDocumentGeneration(dossierId, gateType)
}

export const GATE_LABEL_FR: Record<GateType, string> = {
  kyc_validation: 'Validation KYC',
  profil_risque_validation: 'Validation Bilan patrimonial',
  lm_send: 'Validation Lettre de mission',
  ra_recommandations: 'Validation Rapport d\'adéquation',
  ra_synthese: 'Validation synthèse RA',
  ra_frais_exante: 'Validation frais ex ante',
  ra_bulletin_send: 'Validation bulletin',
  bilan_annuel_validation: 'Validation bilan annuel',
  preco_validation: 'Validation Préconisation',
  zakat_validation: 'Validation Zakat',
  succession_validation: 'Validation Succession',
}

/**
 * Après génération LM / RA / Bilan : créer ou remettre la gate en pending
 * (re-génération après approbation → nouvelle validation requise).
 */
async function notifyAdminGatePending(dossierId: string, gateType: GateType): Promise<void> {
  const adminEmail = process.env.AMANA_ADMIN_EMAIL
  if (!adminEmail) return
  const sb = admin()
  const { data: dossier } = await sb
    .from('dossiers')
    .select('prenom, nom')
    .eq('id', dossierId)
    .maybeSingle()
  const dossierNom =
    [dossier?.prenom, dossier?.nom].filter(Boolean).join(' ') || dossierId
  const gateName = GATE_LABEL_FR[gateType] ?? gateType
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  await sendEmail({
    to: adminEmail,
    ...emailValidationRequired(gateName, dossierNom, `${baseUrl}/admin/validations`),
  })
}

export async function setGatePendingAfterDocumentGeneration(
  dossierId: string,
  gateType: GateType,
): Promise<void> {
  const sb = admin()
  const now = new Date().toISOString()

  const { data: existing } = await sb
    .from('validation_gates')
    .select('id, decision')
    .eq('dossier_id', dossierId)
    .eq('gate_type', gateType)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing) {
    await sb
      .from('validation_gates')
      .update({
        decision: 'pending',
        decided_at: null,
        decided_by: null,
        comment: null,
        updated_at: now,
      })
      .eq('id', existing.id)
    void notifyAdminGatePending(dossierId, gateType).catch(err =>
      console.error('[validation-gates] notify admin', err),
    )
    return
  }

  const { error } = await sb.from('validation_gates').insert({
    dossier_id: dossierId,
    gate_type: gateType,
    decision: 'pending',
    updated_at: now,
  })
  if (error) throw new Error(error.message)
  void notifyAdminGatePending(dossierId, gateType).catch(err =>
    console.error('[validation-gates] notify admin', err),
  )
}

/**
 * Crée les gates manquantes pour chaque type de document déjà généré
 * (rattrapage si génération antérieure à la création automatique des verrous).
 */
export async function ensureGatesForGeneratedDocuments(
  dossierId?: string,
): Promise<number> {
  const sb = admin()
  let query = sb
    .from('documents')
    .select('dossier_id, type')
    .in('type', [...GATE_ON_DOCUMENT_GENERATED])

  if (dossierId) query = query.eq('dossier_id', dossierId)

  const { data: docs, error } = await query
  if (error) throw new Error(error.message)

  const pairs = new Map<string, Set<string>>()
  for (const row of docs ?? []) {
    if (!GATE_ON_DOCUMENT_GENERATED.has(row.type as keyof typeof GATE_BY_DOCUMENT_TYPE)) continue
    const set = pairs.get(row.dossier_id) ?? new Set()
    set.add(row.type)
    pairs.set(row.dossier_id, set)
  }

  let synced = 0
  for (const [id, types] of pairs) {
    for (const docType of types) {
      const gateType = gateTypeForDocument(docType)
      if (!gateType) continue
      const status = await getGateStatus(id, gateType)
      if (status.decision === 'approved') continue
      await setGatePendingAfterDocumentGeneration(id, gateType)
      synced++
    }
  }
  return synced
}

/**
 * Même logique que requireApprovedGate, mais si le client a plusieurs dossiers
 * (même email_client) — ex. re-onboarding — une gate approuvée sur l'un des
 * dossiers frères suffit. Évite le 423 lorsque l'admin a validé sur un UUID
 * et que les documents sont rattachés à un autre dossier du même client.
 */
export async function requireApprovedGateSameClientEmail(
  dossierId: string,
  gateType: GateType,
): Promise<{ ok: true } | { ok: false; reason: string; status: GateStatus }> {
  const primary = await requireApprovedGate(dossierId, gateType)
  if (primary.ok) return primary

  const sb = admin()
  const { data: row } = await sb
    .from('dossiers')
    .select('email_client')
    .eq('id', dossierId)
    .maybeSingle()
  const email = row?.email_client?.trim()
  if (!email) return primary

  const { data: siblings } = await sb
    .from('dossiers')
    .select('id')
    .eq('email_client', email)

  for (const s of siblings ?? []) {
    if (s.id === dossierId) continue
    const check = await requireApprovedGate(s.id, gateType)
    if (check.ok) return { ok: true }
  }

  return primary
}
