// lib/agents/raqib/tools.ts — v2
// Sprint Agents IA v15 · 30 avril 2026
//
// Évolution v2 (vs v1 sprint v14) :
//   + 2 outils pour le pré-criblage semi-manuel :
//     - pre_screen_lookup : génère URLs de recherche + checklist pour
//       Mohamed (listes UE sanctions, OFAC, recherches Google PEP/negative news)
//     - record_pre_screen_decision : Mohamed valide ou ajuste la décision,
//       Raqîb enregistre dans compliance_checks
//
// Le criblage reste manuel pour la décision finale (Mohamed regarde les liens
// et décide), mais Raqîb prépare et synthétise — ce qui ramène le temps de
// 5-10 min/dossier à 2-3 min/dossier.
//
// REMPLACE lib/agents/raqib/tools.ts v1.

import type Anthropic from '@anthropic-ai/sdk'

export type RaqibTool = Anthropic.Tool

const SEVERITY_ENUM = ['info', 'warning', 'critical'] as const
const ALERT_STATUT_ENUM = ['open', 'in_progress', 'resolved', 'ignored'] as const
const ALERT_CATEGORY_ENUM = [
  'lcb_ft', 'criblage', 'documentaire', 'echeance', 'autre',
] as const

const CHECK_TYPE_ENUM = [
  'pep', 'sanctions', 'embargos', 'source_funds', 'beneficial_owner', 'autre',
] as const

const CHECK_RESULT_ENUM = ['clean', 'flagged', 'manual_review', 'pending'] as const

export const RAQIB_TOOLS: RaqibTool[] = [
  // ============================================================
  // OUTILS HÉRITÉS V1 (sprint v14)
  // ============================================================
  {
    name: 'list_alerts',
    description:
      'Liste les alertes de conformité avec filtres optionnels.',
    input_schema: {
      type: 'object',
      properties: {
        severity: { type: 'array', items: { type: 'string', enum: [...SEVERITY_ENUM] } },
        statut: { type: 'array', items: { type: 'string', enum: [...ALERT_STATUT_ENUM] } },
        category: { type: 'array', items: { type: 'string', enum: [...ALERT_CATEGORY_ENUM] } },
        dossier_id: { type: 'string' },
      },
    },
  },
  {
    name: 'create_alert',
    description: 'Crée une nouvelle alerte de conformité.',
    input_schema: {
      type: 'object',
      properties: {
        dossier_id: { type: 'string' },
        severity: { type: 'string', enum: [...SEVERITY_ENUM] },
        category: { type: 'string', enum: [...ALERT_CATEGORY_ENUM] },
        titre: { type: 'string' },
        description: { type: 'string' },
        due_date: { type: 'string' },
      },
      required: ['severity', 'category', 'titre'],
    },
  },
  {
    name: 'resolve_alert',
    description: "Clôt une alerte avec note de résolution.",
    input_schema: {
      type: 'object',
      properties: {
        alert_id: { type: 'string' },
        resolution_notes: { type: 'string' },
        statut: { type: 'string', enum: ['resolved', 'ignored'] },
      },
      required: ['alert_id'],
    },
  },
  {
    name: 'list_compliance_checks',
    description: 'Liste les criblages effectués pour un dossier.',
    input_schema: {
      type: 'object',
      properties: { dossier_id: { type: 'string' } },
      required: ['dossier_id'],
    },
  },
  {
    name: 'record_compliance_check',
    description:
      "Enregistre un criblage effectué pour un dossier client. À utiliser pour saisir manuellement un résultat sans pré-criblage assisté. Pour le workflow assisté, préférer pre_screen_lookup + record_pre_screen_decision.",
    input_schema: {
      type: 'object',
      properties: {
        dossier_id: { type: 'string' },
        check_type: { type: 'string', enum: [...CHECK_TYPE_ENUM] },
        result: { type: 'string', enum: [...CHECK_RESULT_ENUM] },
        evidence: { type: 'string' },
        source: { type: 'string' },
        expires_at: { type: 'string' },
        notes: { type: 'string' },
      },
      required: ['dossier_id', 'check_type', 'result'],
    },
  },
  {
    name: 'audit_dossier_compliance',
    description: "Audit complet d'un dossier (documents + criblages + alertes + score).",
    input_schema: {
      type: 'object',
      properties: { dossier_id: { type: 'string' } },
      required: ['dossier_id'],
    },
  },
  // ============================================================
  // OUTILS NOUVEAUX V2 (pré-criblage semi-manuel)
  // ============================================================
  {
    name: 'pre_screen_lookup',
    description:
      "Prépare un pré-criblage assisté pour un nouveau dossier client. Retourne : (a) une checklist de 4 vérifications (PEP, sanctions UE, sanctions OFAC, recherches negative news), (b) les URLs publiques officielles à consulter pour chaque vérification, (c) les requêtes Google suggérées pour la recherche PEP et negative news, (d) un template de rapport à compléter, (e) les éléments d'identité disponibles dans le dossier. Mohamed clique sur les liens, fait sa lecture, puis appelle record_pre_screen_decision pour acter la décision.",
    input_schema: {
      type: 'object',
      properties: {
        dossier_id: {
          type: 'string',
          description: 'UUID du dossier client',
        },
        // Champs optionnels pour enrichir la recherche si pas dispo dans le dossier
        date_naissance: {
          type: 'string',
          description: "Date de naissance du client (format libre, ex: 15/03/1985)",
        },
        nationalite: {
          type: 'string',
          description: "Nationalité ou nationalités du client (ex: française, franco-marocaine)",
        },
        contexte_pro: {
          type: 'string',
          description: "Contexte professionnel utile pour le screening (ex: dirigeant SARL, fonctionnaire, retraité)",
        },
      },
      required: ['dossier_id'],
    },
  },
  {
    name: 'record_pre_screen_decision',
    description:
      "Enregistre la décision de criblage prise par Mohamed après consultation des sources fournies par pre_screen_lookup. Crée AUTOMATIQUEMENT 4 lignes dans compliance_checks (pep, sanctions, embargos, source_funds) avec le résultat global appliqué à chacun. Si tu veux un résultat différent par check_type, utiliser plutôt record_compliance_check 4 fois.",
    input_schema: {
      type: 'object',
      properties: {
        dossier_id: { type: 'string' },
        decision_globale: {
          type: 'string',
          enum: ['clean', 'flagged', 'manual_review'],
          description:
            "Décision globale : clean = rien à signaler / manual_review = doute, à approfondir / flagged = problème identifié (déclencher procédure)",
        },
        sources_consultees: {
          type: 'string',
          description:
            "Texte libre : quelles sources Mohamed a consultées (ex: 'Liste consolidée UE sanctions 30/04/2026, OFAC search 30/04/2026, Google news prénom+nom 5 dernières années'). À sauvegarder dans evidence pour traçabilité audit.",
        },
        notes: {
          type: 'string',
          description: 'Notes libres (commentaire de Mohamed sur sa décision)',
        },
        validity_months: {
          type: 'number',
          description:
            "Durée de validité de la décision en mois (défaut : 12). Au-delà, le criblage doit être refait.",
        },
      },
      required: ['dossier_id', 'decision_globale', 'sources_consultees'],
    },
  },
]

export const RAQIB_TOOL_NAMES = RAQIB_TOOLS.map((t) => t.name) as Array<
  (typeof RAQIB_TOOLS)[number]['name']
>
