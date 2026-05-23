// lib/workflow/project-pipeline-stages.ts
//
// Pipeline pour les souscriptions complémentaires (post-actif).
// Une ligne `projects` = une souscription produit, avec son propre cycle de vie.
// Indépendant du pipeline `dossiers` (entrée en relation client).

export type ProjectStage =
  | 'nouveau'
  | 'docs_a_generer'
  | 'lm_ra_envoyes'
  | 'signes'
  | 'souscription'
  | 'actif'
  | 'suivi'
  | 'bloque'
  | 'archive'

export const PROJECT_STAGES_ORDER: ProjectStage[] = [
  'nouveau',
  'docs_a_generer',
  'lm_ra_envoyes',
  'signes',
  'souscription',
  'actif',
  'suivi',
]

export const PROJECT_STAGE_LABEL: Record<ProjectStage, string> = {
  nouveau:        'Nouveau',
  docs_a_generer: 'LM / RA / Bilan à générer',
  lm_ra_envoyes:  'LM / RA / Bilan envoyés',
  signes:         'Signé',
  souscription:   'Souscription',
  actif:          'Actif',
  suivi:          'Suivi',
  bloque:         'Bloqué',
  archive:        'Archivé',
}

export const PROJECT_STAGE_COLOR: Record<ProjectStage, string> = {
  nouveau:        '#9ca3af',
  docs_a_generer: '#f59e0b',
  lm_ra_envoyes:  '#8b5cf6',
  signes:         '#06b6d4',
  souscription:   '#f43f5e',
  actif:          '#16a34a',
  suivi:          '#84cc16',
  bloque:         '#dc2626',
  archive:        '#6b7280',
}

const ALLOWED_TRANSITIONS: Record<ProjectStage, ProjectStage[]> = {
  nouveau:        ['docs_a_generer', 'bloque', 'archive'],
  docs_a_generer: ['lm_ra_envoyes', 'nouveau', 'bloque', 'archive'],
  lm_ra_envoyes:  ['signes', 'docs_a_generer', 'bloque', 'archive'],
  signes:         ['souscription', 'lm_ra_envoyes', 'bloque', 'archive'],
  souscription:   ['actif', 'signes', 'bloque', 'archive'],
  actif:          ['suivi', 'souscription', 'bloque', 'archive'],
  suivi:          ['actif', 'bloque', 'archive'],
  bloque:         PROJECT_STAGES_ORDER,
  archive:        [],
}

export function isProjectTransitionAllowed(
  from: ProjectStage,
  to: ProjectStage,
): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false
}

/**
 * Stages où aucune cible manuelle n'est proposée (transitions automatiques uniquement).
 * Aujourd'hui : aucun — toutes les étapes sont aussi déplaçables manuellement par l'admin.
 */
const AUTOMATED_STAGES: ProjectStage[] = []

/** Cibles proposées dans le Kanban admin (hors bloqué/archive/automatiques). */
export function getProjectManualTargets(from: ProjectStage): ProjectStage[] {
  if (AUTOMATED_STAGES.includes(from)) return []
  return (ALLOWED_TRANSITIONS[from] ?? []).filter(
    (t) => t !== from && t !== 'bloque' && t !== 'archive',
  )
}
