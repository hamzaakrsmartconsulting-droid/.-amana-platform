// lib/onboarding/objectifs.ts — codes et libellés objectifs funnel /onboard

export const ONBOARDING_OBJECTIF_OPTIONS = [
  { value: 'preparer_retraite', label: 'Préparer ma retraite' },
  { value: 'transmettre_patrimoine', label: 'Transmettre à mes proches' },
  { value: 'optimiser_fiscalite', label: 'Optimiser ma fiscalité' },
  { value: 'epargner_projet', label: 'Épargner pour un projet' },
  { value: 'investir_immo', label: 'Investir en immobilier' },
  { value: 'gerer_heritage', label: 'Gérer un héritage reçu' },
  { value: 'autre', label: 'Autre' },
] as const

export type OnboardingObjectifCode = (typeof ONBOARDING_OBJECTIF_OPTIONS)[number]['value']

const VALID_CODES = new Set<string>(ONBOARDING_OBJECTIF_OPTIONS.map((o) => o.value))

export function isOnboardingObjectifCode(v: string): v is OnboardingObjectifCode {
  return VALID_CODES.has(v)
}

export function objectifLabel(code: string): string {
  return ONBOARDING_OBJECTIF_OPTIONS.find((o) => o.value === code)?.label ?? code
}

export type Step1ObjectifsInput = {
  objectifs_principaux: string[]
  objectif_autre_precision?: string
}

/** Valide et normalise les objectifs étape 1. */
export function normalizeStep1Objectifs(
  data: Step1ObjectifsInput
): { ok: true; codes: OnboardingObjectifCode[]; autrePrecision: string | null } | { ok: false; error: string } {
  const raw = data.objectifs_principaux ?? []
  if (!Array.isArray(raw) || raw.length === 0) {
    return { ok: false, error: 'Sélectionnez au moins un objectif.' }
  }
  const codes: OnboardingObjectifCode[] = []
  for (const v of raw) {
    if (typeof v !== 'string' || !isOnboardingObjectifCode(v)) {
      return { ok: false, error: 'Objectif invalide.' }
    }
    if (!codes.includes(v)) codes.push(v)
  }
  const autrePrecision = (data.objectif_autre_precision ?? '').trim()
  if (codes.includes('autre') && autrePrecision.length < 2) {
    return { ok: false, error: 'Précisez votre objectif lorsque vous choisissez « Autre ».' }
  }
  return {
    ok: true,
    codes,
    autrePrecision: codes.includes('autre') ? autrePrecision : null,
  }
}

/** Premier code (compat colonne objectif_principal / KYC). */
export function primaryObjectifCode(codes: OnboardingObjectifCode[]): OnboardingObjectifCode | null {
  return codes[0] ?? null
}

/** Libellés lisibles pour notes dossier / facts. */
export function formatObjectifsSummary(
  codes: string[] | null | undefined,
  autrePrecision: string | null | undefined
): string {
  const list = codes ?? []
  if (list.length === 0) return ''
  const parts = list.map((c) => {
    if (c === 'autre' && autrePrecision?.trim()) {
      return `Autre : ${autrePrecision.trim()}`
    }
    return objectifLabel(c)
  })
  return parts.join(' ; ')
}
