// lib/agents/sajl/tools.ts
// Sprint Agents IA v12 · 30 avril 2026
//
// Définitions des 5 outils Sajl pour le tool use Anthropic.
// Schémas alignés sur les API existantes :
//   - GET/POST /api/dossiers/[id]/document-inputs (sprint v10c)
//   - POST /api/documents/generate (sprint v11c, supports les 7 types)
//   - GET /api/dossiers/[id]/documents (à confirmer côté repo)

import type Anthropic from '@anthropic-ai/sdk'

export type SajlTool = Anthropic.Tool

const DOCUMENT_TYPES_ENUM = [
  'der',
  'lm',
  'ra',
  'bilan',
  'preco',
  'zakat',
  'succession',
] as const

export const SAJL_TOOLS: SajlTool[] = [
  {
    name: 'list_document_inputs',
    description:
      "Liste les inputs document_inputs déjà saisis pour un dossier (tous types confondus), avec leur statut (draft / ready) et la date de dernière mise à jour. À utiliser pour avoir une vue d'ensemble de l'avancement de la chaîne documentaire d'un client.",
    input_schema: {
      type: 'object',
      properties: {
        dossier_id: {
          type: 'string',
          description: 'UUID du dossier client (généralement injecté depuis le contexte session).',
        },
      },
      required: ['dossier_id'],
    },
  },
  {
    name: 'get_document_inputs',
    description:
      "Récupère les inputs déjà saisis pour un couple (dossier × type de document). Retourne null si rien n'a encore été saisi pour ce type. À utiliser avant d'éditer un brouillon, pour afficher ce qui existe ou pour reprendre un travail interrompu.",
    input_schema: {
      type: 'object',
      properties: {
        dossier_id: {
          type: 'string',
          description: 'UUID du dossier client.',
        },
        document_type: {
          type: 'string',
          enum: [...DOCUMENT_TYPES_ENUM],
          description: 'Type du document (der, lm, ra, bilan, preco, zakat, succession).',
        },
      },
      required: ['dossier_id', 'document_type'],
    },
  },
  {
    name: 'update_document_inputs',
    description:
      "Crée ou met à jour (UPSERT) les inputs d'un document pour un dossier. Le payload `inputs` doit respecter le schéma du type de document (cf. règles de validation listées dans le system prompt). Le statut peut être 'draft' (par défaut, sauvegarde intermédiaire) ou 'ready' (annonce que les champs requis sont complets — la validation finale a lieu côté generate_document de toute façon). En cas de mise à jour partielle, fournir UNIQUEMENT les champs à modifier ; les champs absents conservent leur valeur précédente côté template, mais l'opération est un remplacement complet du JSONB côté base — donc fournir l'intégralité des inputs souhaités.",
    input_schema: {
      type: 'object',
      properties: {
        dossier_id: {
          type: 'string',
          description: 'UUID du dossier client.',
        },
        document_type: {
          type: 'string',
          enum: [...DOCUMENT_TYPES_ENUM],
          description: 'Type du document.',
        },
        inputs: {
          type: 'object',
          description:
            "Objet JSON contenant les inputs du document. Le schéma dépend du document_type. Voir les règles d'inputs requis dans le system prompt.",
          additionalProperties: true,
        },
        status: {
          type: 'string',
          enum: ['draft', 'ready'],
          description: "Statut du brouillon. 'draft' par défaut.",
        },
      },
      required: ['dossier_id', 'document_type', 'inputs'],
    },
  },
  {
    name: 'generate_document',
    description:
      "Déclenche la génération du PDF officiel pour un document. La validation des inputs requis a lieu côté serveur : si des champs manquent, l'API renvoie un statut 422 avec une liste détaillée des champs manquants (clé `missingInputs: true`). Dans ce cas, lister les champs manquants à l'utilisateur et l'aider à compléter via update_document_inputs avant de retenter. En cas de succès, le retour contient l'objet document AmanaDocument (id, type, filename, storage_path, ...). Pour récupérer un lien de téléchargement, utiliser ensuite list_dossier_documents.",
    input_schema: {
      type: 'object',
      properties: {
        dossier_id: {
          type: 'string',
          description: 'UUID du dossier client.',
        },
        document_type: {
          type: 'string',
          enum: [...DOCUMENT_TYPES_ENUM],
          description: 'Type du document à générer.',
        },
      },
      required: ['dossier_id', 'document_type'],
    },
  },
  {
    name: 'list_dossier_documents',
    description:
      'Liste les PDFs déjà générés pour un dossier (les 7 types confondus) avec leur id, filename, storage_path, type, date de création, et un lien de téléchargement signé valide ~10 minutes. À utiliser pour montrer au conseiller ce qui existe déjà et lui fournir les liens directs.',
    input_schema: {
      type: 'object',
      properties: {
        dossier_id: {
          type: 'string',
          description: 'UUID du dossier client.',
        },
      },
      required: ['dossier_id'],
    },
  },
]

export const SAJL_TOOL_NAMES = SAJL_TOOLS.map((t) => t.name) as Array<
  (typeof SAJL_TOOLS)[number]['name']
>
