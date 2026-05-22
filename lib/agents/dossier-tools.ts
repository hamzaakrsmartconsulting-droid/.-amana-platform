// lib/agents/dossier-tools.ts
// Sprint Agents IA v6 · 29 avril 2026
// Tools que les agents (Mizan, Amîn) peuvent appeler pour gérer les dossiers.

import type Anthropic from '@anthropic-ai/sdk'

export const CREATE_DOSSIER_TOOL: Anthropic.Tool = {
  name: 'create_dossier',
  description: `Crée un nouveau dossier client/prospect dans AMANA. À appeler quand le conseiller (Mohamed Mosbahi) annonce qu'il commence à travailler sur un client/prospect précis (ex: "On travaille pour Ahmed Benali", "Nouveau dossier pour Mme Khadija Ousmane").

Une fois créé, le dossier devient automatiquement le dossier actif (cookie côté navigateur). Tous les facts saved ensuite seront associés à ce silo.

À utiliser même si l'info est partielle (juste le prénom suffit pour démarrer, on complétera ensuite).`,
  input_schema: {
    type: 'object',
    properties: {
      nom: {
        type: 'string',
        description: 'Nom de famille du client/prospect (ex: "Benali"). Si non précisé, mettre "À confirmer".',
      },
      prenom: {
        type: 'string',
        description: 'Prénom du client/prospect (ex: "Ahmed"). Obligatoire pour identifier le dossier.',
      },
      email_client: {
        type: 'string',
        description: 'Email du client si donné (optionnel).',
      },
      telephone: {
        type: 'string',
        description: 'Téléphone du client si donné (optionnel).',
      },
      statut: {
        type: 'string',
        enum: ['prospect', 'actif'],
        description: 'Statut initial du dossier. "prospect" = pas encore client, en cours de qualification. "actif" = client AMANA en cours de mission.',
      },
      offre_amana_cible: {
        type: 'string',
        enum: ['mass', 'patrimoniale', 'premium'],
        description: 'Offre AMANA cible si déjà identifiée (optionnel). mass = digitale 0% frais, patrimoniale = conseiller dédié 2.5%, premium = sur-mesure 1.5% + forfait.',
      },
    },
    required: ['nom', 'prenom'],
  },
}

export const SWITCH_DOSSIER_TOOL: Anthropic.Tool = {
  name: 'switch_dossier',
  description: `Bascule sur un dossier existant. À appeler quand le conseiller annonce qu'il reprend le travail sur un dossier précédent (ex: "On reprend le dossier de Khadija", "Reviens sur le dossier Benali", "Je passe sur le dossier de M. Diop").

Si plusieurs dossiers correspondent au nom, lister les correspondances et demander précision plutôt que de switcher arbitrairement.`,
  input_schema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Texte de recherche : prénom, nom, ou prénom+nom. Ex: "Ahmed", "Benali", "Khadija O".',
      },
    },
    required: ['query'],
  },
}

export const SWITCH_TO_SANDBOX_TOOL: Anthropic.Tool = {
  name: 'switch_to_sandbox',
  description: `Bascule en mode bac à sable (pas de dossier client). À appeler quand le conseiller veut poser une question méta, tester un comportement, ou explorer un sujet sans contaminer la mémoire d'un dossier client (ex: "On bascule en bac à sable", "Je teste juste", "Question hors dossier").

Les facts saved en bac à sable ne pollueront aucun dossier client réel.`,
  input_schema: {
    type: 'object',
    properties: {
      reason: {
        type: 'string',
        description: 'Raison du basculement (optionnel, pour audit).',
      },
    },
  },
}

export const LIST_DOSSIERS_TOOL: Anthropic.Tool = {
  name: 'list_dossiers',
  description: `Liste les dossiers existants du conseiller. À appeler si le conseiller demande explicitement "Quels dossiers ai-je en cours ?" ou si tu n'es pas sûr de l'identité d'un dossier mentionné.`,
  input_schema: {
    type: 'object',
    properties: {
      include_archived: {
        type: 'boolean',
        description: 'Inclure les dossiers archivés (par défaut : non).',
      },
    },
  },
}

// Toutes les tools de gestion de dossier, à injecter dans les agents qui doivent
// pouvoir orchestrer la mémoire (Mizan et Amîn).
export const DOSSIER_TOOLS: Anthropic.Tool[] = [
  CREATE_DOSSIER_TOOL,
  SWITCH_DOSSIER_TOOL,
  SWITCH_TO_SANDBOX_TOOL,
  LIST_DOSSIERS_TOOL,
]
