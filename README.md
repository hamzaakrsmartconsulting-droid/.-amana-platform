# AMANA Patrimoine — Plateforme

Plateforme de gestion de patrimoine spécialisée en finance islamique (CGP),
conforme ORIAS (CIF / COA / COBSP). Couvre l'onboarding prospect, le KYC,
la production des documents réglementaires (DER, lettre de mission, rapport
d'adéquation, bilan patrimonial, préconisation, calendrier zakat, stratégie
successorale) et l'orchestration d'agents IA pour le conseil patrimonial.

> **Statut** — beta interne. Pas encore ouvert à des clients réels.
> Validation ORIAS externe en cours sur les documents réglementaires.

## Stack

- **Frontend & API** : Next.js 16.2 (App Router) + React 19 + TypeScript strict
- **Style** : Tailwind CSS v4 (config inline dans `app/globals.css`)
- **Base de données + Auth + Storage** : Supabase (Postgres 17, RLS activé partout)
- **Agents IA** : Anthropic SDK (`@anthropic-ai/sdk`) avec tool use loop
- **Documents PDF** : `@react-pdf/renderer` + `pdf-lib`
- **Signature électronique** : Yousign API v3 (sandbox + prod)
- **Email transactionnel** : Resend
- **Hébergement** : Vercel (preview + production)

## Prérequis

- Node 20+
- npm 10+
- Compte Supabase (projet `amana-platform`)
- Comptes Anthropic, Yousign, Resend (clés en `.env.local`)
- Vercel CLI : `npm i -g vercel`

## Quick start

```bash
git clone https://github.com/cgp-glitch/amana-platform.git
cd amana-platform
git checkout main   # branche de référence — voir "Workflow git" ci-dessous

npm install
cp .env.example .env.local
# remplir .env.local — voir LYON_DEPLOY_KIT/sync_env_local.sh pour pull auto depuis Vercel

npm run dev
# http://localhost:3000
```

### Développement 100 % local (Supabase + Docker)

1. [Docker Desktop](https://www.docker.com/products/docker-desktop/) démarré.
2. À la racine du repo : `npm run supabase:start` (premier lancement : téléchargement des images).
3. Vérifier les clés : `npm run supabase:status` (en cas de doute, recopier URL + `anon` + `service_role` dans `.env.local`).
4. `.env.local` : `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`, clés du stack local, `DEV_BYPASS_AUTH=0` pour tester la vraie session.
5. Studio local : http://localhost:54323 — Auth : emails de test sur http://localhost:54324 (Inbucket).
6. Arrêt : `npm run supabase:stop`.

**Schéma SQL :** les fichiers dans `supabase/migrations/` décrivent des **évolutions** d’une base déjà peuplée (ex. `profiles`, `products`). Sur une base vide, `npm run supabase:reset` peut échouer tant qu’un **schéma initial** (dump d’équipe, `supabase db pull` depuis le projet hébergé lié, ou script interne) n’a pas été appliqué.

Variables d'environnement : voir `.env.example` (toutes commentées).
Setup automatisé : `bash LYON_DEPLOY_KIT/sync_env_local.sh` puis
`bash LYON_DEPLOY_KIT/bootstrap_local_secrets.sh`.

## Scripts npm

| Script | Effet |
|--------|-------|
| `npm run dev` | Serveur Next.js en watch |
| `npm run supabase:start` | Démarre Postgres + Auth + API locale (Docker) |
| `npm run supabase:stop` | Arrête le stack Supabase local |
| `npm run supabase:status` | Affiche URL, ports et clés API locales |
| `npm run supabase:reset` | Recrée la DB et rejoue les migrations (+ `seed.sql`) |
| `npm run build` | Build production (Turbopack) |
| `npm run start` | Sert le build production |
| `npm run typecheck` | `tsc --noEmit` strict |
| `npm run lint` | ESLint sur tout le repo |
| `npm run lint:fix` | ESLint avec auto-fix |
| `npm run test` | Tests unitaires Vitest |
| `npm run test:watch` | Vitest en watch |
| `npm run test:e2e` | Tests Playwright (preview/prod) |

## Structure

```
amana-platform/
├── app/                    # Next.js App Router
│   ├── admin/              # Back-office conseiller (RLS = role admin)
│   ├── api/                # Routes API (46 endpoints)
│   ├── assistant/          # Pages IA grand public (allocation, mirath, etc.)
│   ├── auth/               # Login + reset password
│   ├── conseiller/         # Vue conseiller
│   ├── dashboard/          # Espace client authentifié
│   ├── onboard/            # Funnel public sans auth (Mass / Patrimoniale / Premium)
│   ├── globals.css         # Tailwind v4 + variables AMANA
│   └── layout.tsx          # Root layout
├── components/             # Composants React partagés
├── lib/
│   ├── agents/             # Prompts + tools des 14 agents IA
│   ├── compliance/         # Service Raqîb (criblage, alertes)
│   ├── conversations/      # Persistance des fils de discussion
│   ├── documents/          # Templates PDF + génération
│   ├── dossiers/           # Service dossiers + transitions
│   ├── events/             # Mawsim (événements RP)
│   ├── onboarding/         # Funnel public + aiguillage 3 offres
│   ├── supabase/           # Clients server / browser / service
│   ├── workflow/           # Pipeline + auto-triggers Mass
│   └── yousign/            # Service signature électronique
├── supabase/migrations/    # Migrations SQL versionnées
├── proxy.ts                # Middleware Next.js v16 (renommé proxy.ts)
└── LYON_DEPLOY_KIT/        # Scripts de déploiement + tests
```

> **Pourquoi `proxy.ts` et pas `middleware.ts`** : Next.js 16 reconnaît les
> deux noms ; `proxy.ts` a été choisi pour éviter le piège Cursor qui renomme
> `middleware.ts` automatiquement et casse les redirections en prod.
> Voir commit `378d600` pour l'historique.

## Variables d'environnement

Toutes documentées dans `.env.example`. Les principales :

| Variable | Côté | Description |
|----------|------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | URL projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Clé anon Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Server | Service role (webhooks + funnel public) |
| `ANTHROPIC_API_KEY` | Server | Clé API Claude |
| `ANTHROPIC_MODEL` | Server | Modèle par défaut (`claude-sonnet-4-6`) |
| `YOUSIGN_API_KEY` | Server | Clé API Yousign |
| `YOUSIGN_BASE_URL` | Server | `api-sandbox.yousign.app` ou `api.yousign.app` |
| `YOUSIGN_WEBHOOK_SECRET` | Server | Secret HMAC validation webhook |
| `EMAIL_PROVIDER` | Server | `resend` (défaut) ou `smtp` |
| `EMAIL_FROM` | Server | Expéditeur utilisé par Resend/SMTP |
| `RESEND_API_KEY` | Server | Clé API Resend |
| `SMTP_HOST` | Server | Host SMTP local (Mailpit : `127.0.0.1`) |
| `SMTP_PORT` | Server | Port SMTP (Mailpit Supabase local : `54325`) |
| `SMTP_SECURE` | Server | `0` (dev) / `1` (TLS) |
| `SMTP_USER` | Server | User SMTP (optionnel) |
| `SMTP_PASS` | Server | Password SMTP (optionnel) |
| `AMANA_DEFAULT_CONSEILLER_ID` | Server | UUID Mohamed dans `auth.users` |
| `AMANA_INTERNAL_SECRET` | Server | 32 bytes hex pour endpoints internes |
| `AMANA_BASE_URL` | Server | URL canonique (preview/prod différenciée) |
| `NEXT_PUBLIC_ORIAS_NUM` | Public | Numéro ORIAS — actuellement `25009552` |

> **Piège Vercel** : ne JAMAIS marquer une variable `NEXT_PUBLIC_*` comme
> "Sensitive" — sinon Vercel ne l'inline pas dans le bundle client et tu
> obtiens des 401 en prod. Voir `feedback_vercel_sensitive_next_public.md`
> dans le dossier mémoire.

## Architecture des agents IA

14 agents en production (juin 2026) répartis en 3 familles :

- **Conseil patrimoine** : Mizan (bilan), Wirth (Mirath), Tartîb (allocation),
  Tahara (purification haram), Zakiya (zakat), Sakan (immobilier mourabaha).
- **Orchestration & client** : Amîn (orchestrateur), Wasîla (CRM/relances),
  Jamâ'a (onboarding assisté), Sajl (documents & reporting).
- **Conformité & événements** : Raqîb (conformité ORIAS + criblage),
  Mawsim (événements RP), Khabar (communication).

Détail par agent : voir [`AGENTS.md`](./AGENTS.md).

## Workflow git

- Branche `main` = référence stable (déployée en prod Vercel).
- Une feature branch par sujet : `feat/...`, `fix/...`, `chore/...`.
- PR obligatoire vers `main` (jamais de push direct).
- 1 reviewer senior + CI verte avant merge.
- Tag de release après chaque merge significatif (`lyon-baseline-2026-04-30`).

> **Avant Lyon (23/05/2026)** : la branche de travail historique était
> `sprint-agents-v18-funnel-public`. Elle a été mergée dans `main` le
> 30/04/2026 — utilise `main` désormais.

## Sécurité

- RLS Postgres activé sur les 28 tables `public.*`.
- Service role isolé via `lib/supabase/server.ts` (fonction `serviceSupabase()`).
- HMAC SHA-256 sur le webhook Yousign (`timingSafeEqual`).
- Audit logs systématiques sur les actions sensibles (`audit_logs`).
- Politique RGPD : export/delete client implémentés (sprint v7).

Reporter une faille : voir [`SECURITY.md`](./SECURITY.md).

## Déploiement

Le déploiement passe par Vercel (auto-deploy sur push). Pour un déploiement
manuel ou un re-test du funnel :

```bash
bash LYON_DEPLOY_KIT/sync_env_local.sh        # sync env vars
bash LYON_DEPLOY_KIT/bootstrap_local_secrets.sh   # secrets locaux
# Tests : voir LYON_DEPLOY_KIT/LYON_DEPLOY_TEST_GUIDE.md
```

## Conformité réglementaire

AMANA Patrimoine est immatriculée à l'ORIAS sous le numéro **25009552**
(CIF / COA / COBSP), Anacofi-Courtage, RCP AIG `RD02002149P`.
Médiateurs : AMF, ANM, LMA. Conformité Sharia : Sakina Consulting.

Les documents réglementaires (DER, LM, RA) sont en cours de validation par
un prestataire externe avant ouverture aux clients réels.

## Contribuer

Voir [`CONTRIBUTING.md`](./CONTRIBUTING.md) pour les conventions de code,
les commits, le workflow git et la procédure de revue.

## Licence

Propriétaire — AMANA Patrimoine SAS. Tous droits réservés.
