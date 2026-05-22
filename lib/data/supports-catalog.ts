// lib/data/supports-catalog.ts
// Sprint Agents IA v11a · 30 avril 2026
//
// Catalogue des supports sharia-compliant disponibles sur les enveloppes AMANA.
// Source : transmission Mohamed Mosbahi 30/04/2026.
//
// IMPORTANT — Distinction enveloppes :
//   - Vie Plus (Suravenir) : enveloppe Assurance-Vie (AV)
//     → fiscalité avantageuse (abattement 4 600 € / 9 200 € après 8 ans, PFU 7,5%)
//   - Intencial (Apicil)   : enveloppe Compte-Titres Ordinaire (CTO)
//     → fiscalité PFU 30% (12,8% IR + 17,2% PS) sur dividendes/plus-values
//
// Même ISIN peut donc figurer sur les deux enveloppes (cas LU0806931092 HSBC
// Islamic Global Equity), mais la recommandation de support n'est pas neutre :
// le choix d'enveloppe dépend de l'horizon, de la tranche marginale d'imposition
// et de l'objectif (transmission AV >> CTO).
//
// Comgest Growth Europe S Acc EUR (IE00B4ZJ4634) RETIRÉ du catalogue le
// 30/04/2026 : non labellisé sharia, sortie validée par Mohamed.

export type StatutSharia = 'halal' | 'a_verifier'

export type Devise = 'EUR' | 'USD' | 'multiple' | 'unspecified'

export type TypeSupport =
  | 'obligataire_sukuk'
  | 'actions_monde'
  | 'actions_etf_emergents'
  | 'actions_etf_japon'
  | 'actions_etf_europe'
  | 'actions_etf_usa'
  | 'actions_etf_monde'
  | 'scpi'

export type Enveloppe = 'av_vie_plus' | 'cto_intencial' | 'hors_enveloppe'

export const ENVELOPPE_LABEL: Record<Enveloppe, string> = {
  av_vie_plus: 'Vie Plus (AV Suravenir)',
  cto_intencial: 'Intencial (CTO Apicil)',
  hors_enveloppe: 'Hors enveloppe',
}

export type SupportCatalogEntry = {
  nom: string
  isin: string
  type: TypeSupport
  devise: Devise
  enveloppes: Enveloppe[]
  statut_sharia: StatutSharia
  notes?: string
}

export const SUPPORTS_CATALOG: SupportCatalogEntry[] = [
  // ----- Vie Plus (AV Suravenir) -----
  {
    nom: 'Franklin Global Sukuk Fund',
    isin: 'LU0923115975',
    type: 'obligataire_sukuk',
    devise: 'unspecified',
    enveloppes: ['av_vie_plus'],
    statut_sharia: 'halal',
  },
  {
    nom: 'HSBC Islamic Global Equity',
    isin: 'LU0806931092',
    type: 'actions_monde',
    devise: 'EUR',
    enveloppes: ['av_vie_plus', 'cto_intencial'],
    statut_sharia: 'halal',
    notes:
      'Disponible AV Vie Plus ET CTO Intencial — même fonds sous-jacent, fiscalité différente selon l\'enveloppe choisie.',
  },
  {
    nom: 'HSBC MSCI Emerging Markets Islamic',
    isin: 'IE0009BC6K22',
    type: 'actions_etf_emergents',
    devise: 'unspecified',
    enveloppes: ['av_vie_plus'],
    statut_sharia: 'halal',
  },
  {
    nom: 'BNPP Islamic Hilal Income EUR',
    isin: 'LU2374587298',
    type: 'obligataire_sukuk',
    devise: 'EUR',
    enveloppes: ['av_vie_plus'],
    statut_sharia: 'halal',
  },
  {
    nom: 'HSBC MSCI Japan Islamic SCR ETF',
    isin: 'IE0001XCFC82',
    type: 'actions_etf_japon',
    devise: 'unspecified',
    enveloppes: ['av_vie_plus'],
    statut_sharia: 'halal',
  },
  {
    nom: 'HSBC MSCI Europe Islamic SCR ETF',
    isin: 'IE000AGFZM58',
    type: 'actions_etf_europe',
    devise: 'unspecified',
    enveloppes: ['av_vie_plus'],
    statut_sharia: 'halal',
  },

  // ----- Intencial (CTO Apicil) -----
  {
    nom: 'HSBC Islamic Global Equity Index A Distribution',
    isin: 'LU0110459103',
    type: 'actions_monde',
    devise: 'USD',
    enveloppes: ['cto_intencial'],
    statut_sharia: 'halal',
  },
  {
    nom: 'HSBC Islamic Global Equity Index AC',
    isin: 'LU0466842654',
    type: 'actions_monde',
    devise: 'USD',
    enveloppes: ['cto_intencial'],
    statut_sharia: 'halal',
  },
  {
    nom: 'BNP Paribas Islamic Hilal Income Classic Cap',
    isin: 'LU1150255971',
    type: 'obligataire_sukuk',
    devise: 'USD',
    enveloppes: ['cto_intencial'],
    statut_sharia: 'halal',
  },
  {
    nom: 'iShares MSCI USA Islamic UCITS ETF USD Dist',
    isin: 'IE00B296QM64',
    type: 'actions_etf_usa',
    devise: 'USD',
    enveloppes: ['cto_intencial'],
    statut_sharia: 'halal',
  },
  {
    nom: 'iShares MSCI EM Islamic UCITS ETF',
    isin: 'IE00B27YCP72',
    type: 'actions_etf_emergents',
    devise: 'USD',
    enveloppes: ['cto_intencial'],
    statut_sharia: 'halal',
  },
  {
    nom: 'iShares MSCI World Islamic UCITS ETF',
    isin: 'IE00B27YCN58',
    type: 'actions_etf_monde',
    devise: 'USD',
    enveloppes: ['cto_intencial'],
    statut_sharia: 'halal',
  },

  // ----- Hors enveloppe -----
  {
    nom: 'SCPI Norma Capital NCap Éducation Santé',
    isin: '',
    type: 'scpi',
    devise: 'EUR',
    enveloppes: ['hors_enveloppe'],
    statut_sharia: 'halal',
    notes:
      'SCPI ISR compatible finance islamique, validée en interne, non affichée publiquement comme telle par Norma Capital.',
  },
]

// =====================================================================
// Helpers
// =====================================================================
export function listSupportsByEnveloppe(env: Enveloppe) {
  return SUPPORTS_CATALOG.filter((s) => s.enveloppes.includes(env))
}

export function findSupportByIsin(isin: string) {
  return SUPPORTS_CATALOG.find(
    (s) => s.isin && s.isin.toLowerCase() === isin.toLowerCase()
  )
}

export function listEnveloppes(): Enveloppe[] {
  return ['av_vie_plus', 'cto_intencial', 'hors_enveloppe']
}
