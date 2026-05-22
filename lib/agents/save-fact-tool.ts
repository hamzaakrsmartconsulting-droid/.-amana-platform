// lib/agents/save-fact-tool.ts
// Sprint Agents IA v5 · 28 avril 2026
// Tool definition save_client_fact à injecter dans tous les agents pour qu'ils
// puissent persister automatiquement les informations client pertinentes.

import type Anthropic from '@anthropic-ai/sdk'

export const SAVE_FACT_TOOL: Anthropic.Tool = {
  name: 'save_client_fact',
  description: `Sauvegarde un fait persistant sur le client dans la mémoire long-terme AMANA. Cette mémoire est partagée par tous les agents AMANA (Mizan, Tartîb, Tahara, Zakiya, Sakan, Wirth, Amîn).

À utiliser quand le client donne une information factuelle utile pour les futures conversations :
- Données identité/famille : âge, situation familiale, nombre d'enfants, régime matrimonial
- Données financières : revenus annuels, charges, patrimoine total ou par classe d'actif
- Profil : profil de risque, objectif principal (retraite, transmission, hajj, acquisition RP), horizon de placement
- Configuration AMANA : offre cible (mass/patrimoniale/premium), KYC statut
- Sensibilité Sharia (stricte/standard/souple)

Convention de naming : utiliser le snake_case et le suffixe _eur pour les montants en euros (ex: revenus_annuels_eur, patrimoine_total_eur).

Ne pas appeler ce tool pour :
- Des questions méta du client ("comment ça marche ?")
- Des hypothèses non confirmées ("peut-être que je ferai X")
- Des informations déjà présentes dans le profil connu (cf. début du system prompt)

Si tu corriges une valeur existante (ex: le client dit qu'il a 36 ans alors que son profil indique 35), appelle quand même save_client_fact avec la nouvelle valeur — l'upsert remplacera l'ancienne.`,
  input_schema: {
    type: 'object',
    properties: {
      key: {
        type: 'string',
        description:
          "Nom du fait à sauvegarder, en snake_case. Privilégier les conventions : age, situation_familiale, nb_enfants, revenus_annuels_eur, charges_annuelles_eur, patrimoine_total_eur, liquidites_eur, rp_valeur_eur, profil_risque, objectif_principal, horizon_placement_annees, offre_amana_cible, sensibilite_sharia.",
      },
      value: {
        type: 'string',
        description:
          "Valeur du fait, en string. Pour un nombre, le passer en string (ex: '35'). Pour une enum, utiliser une valeur claire (ex: 'marie', 'celibataire'). Pour un montant en euros, mettre le nombre brut sans symbole (ex: '80000').",
      },
    },
    required: ['key', 'value'],
  },
}

// Wrapper utilitaire : enrichit un system prompt avec les facts du client.
// Usage dans une route API agent :
//   const factsBlock = await loadClientFactsForPrompt(userId)
//   const enrichedPrompt = enrichSystemPrompt(BASE_SYSTEM_PROMPT, factsBlock)
//   stream = anthropic.messages.stream({ system: enrichedPrompt, ... })
export function enrichSystemPrompt(
  baseSystemPrompt: string,
  factsBlock: string
): string {
  if (!factsBlock || !factsBlock.trim()) {
    return baseSystemPrompt
  }
  return `${factsBlock}\n\n---\n\n${baseSystemPrompt}`
}
