/**
 * Normalise un numéro pour l'API Yousign (E.164).
 * Retourne undefined si le format reste invalide (Yousign rejette les faux numéros type 3333333333).
 */
export function normalizePhoneForYousign(raw?: string | null): string | undefined {
  if (!raw?.trim()) return undefined

  const cleaned = raw.replace(/[^\d+]/g, '')
  if (!cleaned) return undefined

  let e164: string | undefined

  if (cleaned.startsWith('+')) {
    e164 = cleaned
  } else if (cleaned.startsWith('00')) {
    e164 = `+${cleaned.slice(2)}`
  } else if (/^0[1-9]\d{8}$/.test(cleaned)) {
    // 06 12 34 56 78 → +33612345678
    e164 = `+33${cleaned.slice(1)}`
  } else if (/^33[1-9]\d{8}$/.test(cleaned)) {
    // 33612345678 → +33612345678
    e164 = `+${cleaned}`
  } else if (/^[67]\d{8}$/.test(cleaned)) {
    // 612345678 (sans 0) → +33612345678
    e164 = `+33${cleaned}`
  } else {
    // Ex. 3333333333, 12345 — ambigu ou invalide
    return undefined
  }

  return isValidYousignE164(e164) ? e164 : undefined
}

/** Contrôle E.164 + règles France (+33 + 9 chiffres, 1er chiffre 1–9). */
export function isValidYousignE164(e164: string): boolean {
  if (!/^\+\d{7,15}$/.test(e164)) return false

  if (e164.startsWith('+33')) {
    const national = e164.slice(3).replace(/^0+/, '')
    if (!/^[1-9]\d{8}$/.test(national)) return false
    // Numéros manifestement faux (répétition) — Yousign les refuse souvent
    if (/^(\d)\1{5,}$/.test(national)) return false
    return true
  }

  return true
}

export const YOUSIGN_PHONE_HINT =
  'Téléphone invalide pour Yousign. Utilisez un mobile français valide (ex. 06 12 34 56 78 ou +33 6 12 34 56 78).'
