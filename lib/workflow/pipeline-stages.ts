// lib/workflow/pipeline-stages.ts
// Types + matrice de transitions — sans dépendance serveur (importable côté client).

export type PipelineStage =
  | 'nouveau'
  | 'criblage'
  | 'kyc_attente'
  | 'kyc_complet'
  | 'der_envoye'
  | 'der_signe'
  | 'lm_envoyee'
  | 'lm_signee'
  | 'bilan_genere'
  | 'souscription'
  | 'actif'
  | 'suivi'
  | 'bloque'
  | 'archive'

export const PIPELINE_STAGES_ORDER: PipelineStage[] = [
  'nouveau',
  'criblage',
  'kyc_attente',
  'kyc_complet',
  'der_envoye',
  'der_signe',
  'lm_envoyee',
  'lm_signee',
  'bilan_genere',
  'souscription',
  'actif',
  'suivi',
]

export const PIPELINE_STAGE_LABEL: Record<PipelineStage, string> = {
  nouveau: 'Nouveau',
  criblage: 'Criblage',
  kyc_attente: 'KYC en attente',
  kyc_complet: 'KYC complet',
  der_envoye: 'DER envoyé',
  der_signe: 'DER signé',
  lm_envoyee: 'LM / RA / KYC / Bilan / relevé frais',
  lm_signee: 'LM signée',
  bilan_genere: 'Bilan & Préco',
  souscription: 'Souscription',
  actif: 'Actif',
  suivi: 'Suivi',
  bloque: 'Bloqué',
  archive: 'Archivé',
}

const ALLOWED_TRANSITIONS: Record<PipelineStage, PipelineStage[]> = {
  nouveau: ['criblage', 'bloque', 'archive'],
  criblage: ['kyc_attente', 'nouveau', 'bloque', 'archive'],
  kyc_attente: ['kyc_complet', 'criblage', 'bloque', 'archive'],
  kyc_complet: ['der_envoye', 'lm_envoyee', 'kyc_attente', 'bloque', 'archive'],
  der_envoye: ['der_signe', 'lm_signee', 'bilan_genere', 'souscription', 'kyc_complet', 'bloque', 'archive'],
  der_signe: ['lm_envoyee', 'lm_signee', 'souscription', 'bloque', 'archive'],
  lm_envoyee: ['lm_signee', 'bilan_genere', 'souscription', 'der_signe', 'bloque', 'archive'],
  lm_signee: ['bilan_genere', 'souscription', 'bloque', 'archive'],
  bilan_genere: ['souscription', 'bloque', 'archive'],
  souscription: ['actif', 'bilan_genere', 'bloque', 'archive'],
  actif: ['suivi', 'bloque', 'archive'],
  suivi: ['actif', 'bloque', 'archive'],
  bloque: PIPELINE_STAGES_ORDER,
  archive: [],
}

export function isTransitionAllowed(
  from: PipelineStage,
  to: PipelineStage,
): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false
}

/** Cibles proposées dans le Kanban admin (hors bloqué / archivé). */
export function getManualPipelineTargets(from: PipelineStage): PipelineStage[] {
  return (ALLOWED_TRANSITIONS[from] ?? []).filter(
    (t) => t !== from && t !== 'bloque' && t !== 'archive',
  )
}
