// lib/agents/mawsim/tools.ts
// Sprint Agents IA v13 · 30 avril 2026
//
// Définitions des 7 outils Mawsim pour le tool use Anthropic.

import type Anthropic from '@anthropic-ai/sdk'

export type MawsimTool = Anthropic.Tool

const EVENT_TYPE_ENUM = [
  'table_ronde',
  'stand',
  'conference',
  'webinaire',
  'salon',
  'rdv_partenaire',
  'autre',
] as const

const EVENT_STATUT_ENUM = [
  'prepa',
  'j_minus_7',
  'j_minus_1',
  'en_cours',
  'fait',
  'annule',
] as const

const ACTION_STATUT_ENUM = ['todo', 'in_progress', 'done', 'blocked'] as const

const ACTION_CATEGORIE_ENUM = [
  'logistique',
  'contenu',
  'contacts',
  'comm_pre',
  'comm_post',
  'suivi',
  'autre',
] as const

const CONTACT_ROLE_ENUM = [
  'intervenant',
  'partenaire',
  'journaliste',
  'prospect',
  'equipe',
  'autre',
] as const

export const MAWSIM_TOOLS: MawsimTool[] = [
  {
    name: 'list_events',
    description:
      "Liste les événements du conseiller, avec filtres optionnels par statut, type, ou seulement les événements futurs. Retourne nom, type, date, lieu, statut.",
    input_schema: {
      type: 'object',
      properties: {
        statut: {
          type: 'array',
          items: { type: 'string', enum: [...EVENT_STATUT_ENUM] },
          description: 'Filtre par un ou plusieurs statuts',
        },
        type: {
          type: 'array',
          items: { type: 'string', enum: [...EVENT_TYPE_ENUM] },
          description: 'Filtre par un ou plusieurs types',
        },
        futur_only: {
          type: 'boolean',
          description: 'Si true, ne retourne que les événements de date_debut >= aujourd\'hui',
        },
      },
    },
  },
  {
    name: 'get_event',
    description:
      "Détails complets d'un événement : informations + liste des actions de prep + liste des contacts associés. Utiliser pour faire un point d'avancement.",
    input_schema: {
      type: 'object',
      properties: {
        event_id: { type: 'string', description: 'UUID de l\'événement' },
      },
      required: ['event_id'],
    },
  },
  {
    name: 'create_event',
    description:
      "Crée un nouvel événement. Statut par défaut 'prepa'. Le conseiller_id est injecté côté serveur depuis la session.",
    input_schema: {
      type: 'object',
      properties: {
        nom: { type: 'string' },
        type: { type: 'string', enum: [...EVENT_TYPE_ENUM] },
        date_debut: {
          type: 'string',
          description: 'Date ISO 8601 avec timezone (ex: 2026-05-23T09:00:00+02:00)',
        },
        date_fin: {
          type: 'string',
          description: 'Date ISO 8601 (optionnel, peut être null pour les événements ponctuels)',
        },
        lieu: { type: 'string' },
        description: { type: 'string' },
        statut: { type: 'string', enum: [...EVENT_STATUT_ENUM] },
        audience_cible: { type: 'string' },
        objectifs: { type: 'string' },
        kpi_attendu: { type: 'string' },
        budget_estime_eur: { type: 'number' },
      },
      required: ['nom', 'type', 'date_debut'],
    },
  },
  {
    name: 'update_event',
    description:
      "Met à jour un événement existant. Fournir UNIQUEMENT les champs à modifier. Cas d'usage : changer le statut (prepa → j_minus_7), corriger une date, ajouter un bilan post.",
    input_schema: {
      type: 'object',
      properties: {
        event_id: { type: 'string' },
        patch: {
          type: 'object',
          additionalProperties: true,
          description: 'Objet contenant les champs à modifier (nom, type, date_debut, statut, lieu, description, audience_cible, objectifs, kpi_attendu, budget_estime_eur, budget_reel_eur, bilan_post_event)',
        },
      },
      required: ['event_id', 'patch'],
    },
  },
  {
    name: 'upsert_event_action',
    description:
      "Crée ou met à jour une action de prep pour un événement. Si `id` est fourni, c'est une mise à jour ; sinon c'est une création. Catégories disponibles : logistique, contenu, contacts, comm_pre, comm_post, suivi, autre.",
    input_schema: {
      type: 'object',
      properties: {
        event_id: { type: 'string' },
        id: { type: 'string', description: 'UUID de l\'action existante (omettre pour créer)' },
        titre: { type: 'string' },
        description: { type: 'string' },
        due_date: { type: 'string', description: 'Date ISO YYYY-MM-DD' },
        statut: { type: 'string', enum: [...ACTION_STATUT_ENUM] },
        categorie: { type: 'string', enum: [...ACTION_CATEGORIE_ENUM] },
        assigne_a: { type: 'string', description: 'Nom de la personne assignée (Mohamed, mandataire, partenaire externe)' },
        notes: { type: 'string' },
      },
      required: ['event_id', 'titre'],
    },
  },
  {
    name: 'mark_action_done',
    description:
      "Marque une action comme 'done'. Raccourci pour update_event_action avec statut='done'. Renseigne automatiquement done_at = now().",
    input_schema: {
      type: 'object',
      properties: {
        action_id: { type: 'string' },
      },
      required: ['action_id'],
    },
  },
  {
    name: 'upsert_event_contact',
    description:
      "Ajoute ou met à jour un contact associé à un événement (intervenant, partenaire, journaliste, prospect, équipe). Si `id` est fourni, c'est une mise à jour.",
    input_schema: {
      type: 'object',
      properties: {
        event_id: { type: 'string' },
        id: { type: 'string', description: 'UUID du contact existant (omettre pour créer)' },
        role: { type: 'string', enum: [...CONTACT_ROLE_ENUM] },
        nom: { type: 'string' },
        email: { type: 'string' },
        phone: { type: 'string' },
        organisation: { type: 'string' },
        notes: { type: 'string' },
      },
      required: ['event_id', 'role', 'nom'],
    },
  },
]

export const MAWSIM_TOOL_NAMES = MAWSIM_TOOLS.map((t) => t.name) as Array<
  (typeof MAWSIM_TOOLS)[number]['name']
>
