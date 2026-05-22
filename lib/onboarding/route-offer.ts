// lib/onboarding/route-offer.ts
// Sprint Agents IA v18 · 30 avril 2026
//
// Logique d'aiguillage automatique Mass / Patrimoniale / Premium en fonction
// de la situation déclarée par le prospect dans le funnel public.
//
// Règles :
//
// PREMIUM si :
//   - Patrimoine net ≥ 500 k€
//   OU
//   - Complexité élevée : ≥ 2 indicateurs de complexité parmi
//       parts société, SCI, expat, succession active, > 2 immeubles, entrepreneur
//   OU
//   - succession active explicitement (toujours Premium)
//
// PATRIMONIALE si (et pas Premium) :
//   - 100 k€ ≤ patrimoine net < 500 k€
//   OU
//   - 1 seul indicateur de complexité
//   OU
//   - capacite_pertes='elevee' avec patrimoine ≥ 50 k€
//
// MASS si (par défaut) :
//   - Tout le reste : patrimoine net < 100 k€ et 0 indicateur de complexité
//
// L'aiguillage donne aussi un "score" indicatif (transparence côté admin).

export type OffreAmana = 'mass' | 'patrimoniale' | 'premium'

export type RouteOfferInput = {
  patrimoine_net_eur?: number
  capacite_pertes?: 'faible' | 'moyenne' | 'elevee'
  detient_parts_societe?: boolean
  detient_sci?: boolean
  expatrie_ou_non_resident?: boolean
  succession_active?: boolean
  plus_de_deux_immeubles?: boolean
  entrepreneur_ou_liberal?: boolean
}

export type RouteOfferOutput = {
  offre: OffreAmana
  score: {
    patrimoine_eur: number
    complexity_count: number
    complexity_indicators: string[]
    rule_triggered: string
  }
  recommendation_message: string
}

const COMPLEXITY_FIELDS: Array<{ key: keyof RouteOfferInput; label: string }> = [
  { key: 'detient_parts_societe', label: 'détient parts de société (SARL/SAS)' },
  { key: 'detient_sci', label: 'détient une SCI' },
  { key: 'expatrie_ou_non_resident', label: 'expatrié ou non-résident fiscal France' },
  { key: 'succession_active', label: 'succession active en cours' },
  { key: 'plus_de_deux_immeubles', label: 'plus de 2 biens immobiliers' },
  { key: 'entrepreneur_ou_liberal', label: 'entrepreneur ou profession libérale' },
]

export function routeToOffer(input: RouteOfferInput): RouteOfferOutput {
  const patrimoine = input.patrimoine_net_eur ?? 0

  const indicators: string[] = []
  for (const field of COMPLEXITY_FIELDS) {
    if (input[field.key]) indicators.push(field.label)
  }
  const complexityCount = indicators.length

  // Règle Premium
  if (patrimoine >= 500_000) {
    return {
      offre: 'premium',
      score: {
        patrimoine_eur: patrimoine,
        complexity_count: complexityCount,
        complexity_indicators: indicators,
        rule_triggered: 'patrimoine ≥ 500 k€',
      },
      recommendation_message:
        "Votre patrimoine et votre situation justifient un accompagnement sur-mesure (offre Premium). Un échange direct avec Mohamed est nécessaire avant tout conseil personnalisé.",
    }
  }
  if (input.succession_active) {
    return {
      offre: 'premium',
      score: {
        patrimoine_eur: patrimoine,
        complexity_count: complexityCount,
        complexity_indicators: indicators,
        rule_triggered: 'succession active',
      },
      recommendation_message:
        "Une succession en cours requiert un accompagnement personnalisé (offre Premium). Un échange avec Mohamed et un notaire est recommandé avant toute décision patrimoniale.",
    }
  }
  if (complexityCount >= 2) {
    return {
      offre: 'premium',
      score: {
        patrimoine_eur: patrimoine,
        complexity_count: complexityCount,
        complexity_indicators: indicators,
        rule_triggered: `${complexityCount} indicateurs de complexité`,
      },
      recommendation_message: `Votre situation comporte plusieurs spécificités (${indicators.join(', ')}) qui justifient un accompagnement Premium. Mohamed prend ces dossiers en main personnellement.`,
    }
  }

  // Règle Patrimoniale
  if (patrimoine >= 100_000) {
    return {
      offre: 'patrimoniale',
      score: {
        patrimoine_eur: patrimoine,
        complexity_count: complexityCount,
        complexity_indicators: indicators,
        rule_triggered: '100 k€ ≤ patrimoine < 500 k€',
      },
      recommendation_message:
        "Vous bénéficiez d'un accompagnement Patrimoniale : tunnel digital + un rdv visio avec Mohamed pour valider votre stratégie avant la signature.",
    }
  }
  if (complexityCount === 1) {
    return {
      offre: 'patrimoniale',
      score: {
        patrimoine_eur: patrimoine,
        complexity_count: complexityCount,
        complexity_indicators: indicators,
        rule_triggered: '1 indicateur de complexité',
      },
      recommendation_message: `Votre situation comporte une spécificité (${indicators[0]}) qui mérite un échange visio avec Mohamed avant signature (offre Patrimoniale).`,
    }
  }
  if (input.capacite_pertes === 'elevee' && patrimoine >= 50_000) {
    return {
      offre: 'patrimoniale',
      score: {
        patrimoine_eur: patrimoine,
        complexity_count: complexityCount,
        complexity_indicators: indicators,
        rule_triggered: 'capacité pertes élevée + patrimoine ≥ 50 k€',
      },
      recommendation_message:
        "Compte tenu de votre capacité à supporter des pertes et de votre patrimoine, un échange visio avec Mohamed est inclus dans votre parcours (offre Patrimoniale).",
    }
  }

  // Par défaut : Mass
  return {
    offre: 'mass',
    score: {
      patrimoine_eur: patrimoine,
      complexity_count: complexityCount,
      complexity_indicators: indicators,
      rule_triggered: 'défaut Mass',
    },
    recommendation_message:
      "Vous êtes éligible à l'offre Mass : un parcours 100% digital, sans rdv obligatoire, avec un suivi automatisé par AMANA. Vous pouvez à tout moment demander un échange si vous le souhaitez.",
  }
}
