# AGENTS.md — Catalogue des agents IA AMANA

État au 30/04/2026 — 14 agents en production sur les 19 cible. Stack :
Anthropic SDK + tool use loop + RLS Supabase + audit logs.

Chaque agent a :
- un **prompt système** dans `lib/agents/<agent>-system-prompt.ts`
  (ou `lib/agents/<agent>/system-prompt.ts` si tools associés)
- un **endpoint API** dans `app/api/agents/<agent>/route.ts`
- éventuellement des **tools** dans `lib/agents/<agent>/tools.ts`

Convention nom de variable : `<AGENT>_SYSTEM_PROMPT`. Modèle par défaut :
`claude-sonnet-4-6` (override via `ANTHROPIC_MODEL`). Iter max tool use
loop : 10 (`MAX_ITERATIONS = 10`).

## Famille 1 — Conseil patrimoine (6 agents)

| Agent | Rôle | Endpoint | Status |
|-------|------|----------|--------|
| **Mizan** | Bilan patrimonial — analyse situation client, calcule ratios, identifie axes d'amélioration | `/api/agents/mizan` | ✅ prod |
| **Wirth** | Mirath — calcul de la part héréditaire selon les règles islamiques (sourate An-Nisa) | `/api/agents/wirth` | ✅ prod |
| **Tartîb** | Allocation d'actifs — propose une répartition cible selon profil et univers de produits halal | `/api/agents/tartib` | ✅ prod |
| **Tahara** | Purification haram — quantifie et propose les modalités de purification du patrimoine | `/api/agents/tahara` | ✅ prod |
| **Zakiya** | Zakat — calcul, calendrier annuel, suivi des bénéficiaires | `/api/agents/zakiya` | ✅ prod |
| **Sakan** | Immobilier — financements mourabaha, ijara, simulations | `/api/agents/sakan` | ✅ prod |

## Famille 2 — Orchestration & client (4 agents)

| Agent | Rôle | Endpoint | Status |
|-------|------|----------|--------|
| **Amîn** | Orchestrateur principal — route les questions vers les agents spécialistes via tool use, gère la mémoire client (`save_client_fact`) | `/api/agents/amin` | ✅ prod |
| **Wasîla** | CRM — relances client, suivi des actions, alertes échéances | `/api/agents/wasila` | ✅ prod |
| **Jamâ'a** | Onboarding assisté — guide le prospect dans le funnel, recueille KYC progressif | `/api/agents/jamaa` | ✅ prod |
| **Sajl** | Documents & reporting — génère DER, LM, RA et 4 autres documents officiels | `/api/agents/sajl` | ✅ prod |

## Famille 3 — Conformité & événements (4 agents)

| Agent | Rôle | Endpoint | Status |
|-------|------|----------|--------|
| **Raqîb** | Conformité ORIAS — criblage PEP/sanctions, alertes documentaires, échéances | `/api/agents/raqib` | ✅ prod (avec tools) |
| **Mawsim** | Événements RP — pilote tables rondes, stands, salons, génère checklists | `/api/agents/mawsim` | ✅ prod (avec tools) |
| **Khabar** | Communication — réseaux sociaux, blog, newsletters | — | 🔴 backlog post-Lyon |
| **Suq** | Acquisition — landing pages, A/B tests | — | 🔴 backlog post-Lyon |

## Tools partagés

Définis dans `lib/agents/dossier-tools.ts` + handlers dans
`lib/agents/dossier-tool-handlers.ts`, exposés à plusieurs agents :

- `get_dossier_context` — récupère le dossier actif + facts
- `save_client_fact` — persiste un fait client (key/value + confidence + source)
- `set_active_dossier` — change le dossier actif
- `list_dossiers_for_client` — liste les dossiers d'un client
- `get_recent_documents` — derniers PDFs générés sur le dossier

Tools spécifiques à Raqîb : `pre_screen_lookup` (PEP/sanctions), `create_alert`.
Tools spécifiques à Mawsim : `create_event`, `add_action`, `add_contact`.
Tools spécifiques à Sajl : `generate_document`, `list_pending_inputs`.

## Flux de tool use

L'orchestrateur Amîn implémente le pattern tool use loop :

```
1. user message → Anthropic API avec tools[] définis
2. réponse contient tool_use blocks
3. exécution des tools côté serveur (handlers)
4. retour des tool_result blocks à l'API
5. boucle jusqu'à text-only response ou MAX_ITERATIONS
```

Chaque appel Anthropic est tracé dans `audit_logs` avec `entity_type='agent'`,
`entity_id=<agent_name>`, `metadata={ tokens, model, iterations }`.

## Mémoire client

Persistance via la table `client_facts` (RLS isolé par `conseiller_id`).
Chaque fact : `fact_key`, `fact_value`, `source_agent`, `confidence`.
Lecture par tous les agents via `get_dossier_context`. Écriture limitée
aux agents listés dans le whitelist du tool `save_client_fact`.

## Persistance des conversations

Tables `conversations` + `messages` (sprint v8). Chaque conversation est
liée à un `dossier_id` + `agent_name`. Reprise du fil au retour client.

## Ajouter un nouvel agent

1. Créer `lib/agents/<nom>/system-prompt.ts` avec `<NOM>_SYSTEM_PROMPT`.
2. Si tools : `lib/agents/<nom>/tools.ts` (définition Anthropic) +
   handlers dans une route ou un service dédié.
3. Créer `app/api/agents/<nom>/route.ts` en réutilisant
   `lib/agents/agent-route-factory.ts`.
4. Ajouter l'agent au switcher : `components/agent-switcher.tsx`.
5. Si l'agent doit savoir parler aux autres : ajouter le tool
   `delegate_to_<nom>` dans le prompt d'Amîn.
6. Ajouter à `AGENTS.md` (ce fichier) avec description, status, endpoint.

## Conventions de prompt

- Toujours en **français** côté instructions (interaction client en français).
- Vouvoiement obligatoire avec les clients.
- Mention systématique du cadre ORIAS dans les conseils financiers : "AMANA
  Patrimoine est CIF/COA/COBSP enregistré à l'ORIAS sous le n° 25009552".
- **Pas de fatwa individuelle** : pour toute question Sharia complexe,
  renvoyer vers Sakina Consulting.
- **Pas de conseil fiscal personnalisé** sans rappel "vous devez consulter
  votre conseiller fiscal pour votre situation propre".
- Tutoiement strictement interdit avec un client.
- Aucune attribution de citations à des savants individuels (tradition
  prudence AMANA).
