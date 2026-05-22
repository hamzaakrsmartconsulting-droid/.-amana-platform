# Contribuer à AMANA Patrimoine

Ce document décrit les conventions et le workflow attendus pour développer
sur la plateforme. Si quelque chose n'est pas clair, ouvre une issue avec le
label `question`.

## Setup local

Voir [`README.md`](./README.md) pour le quick start. Si tu débutes :

```bash
git clone https://github.com/cgp-glitch/amana-platform.git
cd amana-platform
npm install
cp .env.example .env.local
# Remplir les variables — voir LYON_DEPLOY_KIT/sync_env_local.sh pour pull auto
npm run dev
```

## Workflow git

### Branches

- `main` — référence stable, déployée en prod Vercel. Push direct **interdit**.
- `feat/<courte-desc>` — nouvelle fonctionnalité (ex : `feat/onboard-rate-limit`).
- `fix/<courte-desc>` — correction de bug.
- `chore/<courte-desc>` — tâche sans impact fonctionnel (deps, refactor, doc).

### Commits

Format : `<type>: <courte description>` au présent, en français.

Types : `feat`, `fix`, `chore`, `refactor`, `docs`, `test`, `style`.

Exemples :
```
feat: ajoute Zod validation sur /api/onboard/start
fix: corrige bug CSS dans email KYC validé
chore: bump @anthropic-ai/sdk 0.91 → 1.0
test: ajoute E2E Patrimoniale 200k€
docs: documente convention proxy.ts vs middleware.ts
```

### Pull requests

1. Branche feature à partir de `main` à jour.
2. PR vers `main`. Template auto-rempli — compléter Quoi / Pourquoi / Test.
3. CI doit être verte (typecheck + lint + tests + build).
4. 1 reviewer senior approuve. Mohamed est codeowner sur les zones
   sensibles (documents réglementaires, conformité, migrations, .env).
5. Merge en **squash** (1 commit propre par PR).
6. Branche feature supprimée après merge.

## Conventions de code

### TypeScript

- `strict: true` activé dans `tsconfig.json` — pas de `any` implicite.
- Préférer `unknown` à `any` quand le type est inconnu.
- Pas de `as never` sauf cas extrême documenté en commentaire.
- Préférer les types explicites en signature de fonction publique.
- Préférer `Pick<T, K>` / `Omit<T, K>` à des duplications de types.

### Validation runtime

- Tout endpoint API public **doit** valider ses entrées avec Zod (à venir).
- Casts `as` interdits sur les données venant du client.

### Naming

- **Fichiers** : `kebab-case.ts` (ex : `onboarding-service.ts`).
- **Composants React** : `PascalCase` à l'export (ex : `KycDocumentUpload`).
- **Pages Next** : kebab-case dossier (ex : `app/lettre-de-mission/page.tsx`).
- **Tables Postgres** : `snake_case` au pluriel (ex : `client_facts`).
- **Variables env** : `SCREAMING_SNAKE_CASE` ; préfixer par `NEXT_PUBLIC_` si
  nécessaire côté client.

### Structure

- Un fichier = une responsabilité claire.
- Pas de fichier > 500 lignes (refactorer si dépasse).
- Pas de fonction > 100 lignes (extraire des helpers).
- Imports en haut du fichier — pas d'`import` au milieu.
- Pas de barrel imports (`index.ts` ré-exporteurs) — préférer les imports
  explicites pour aider le tree-shaking.

### Erreurs

- **Toujours** logger une erreur avant de la masquer.
- `catch { return false }` interdit — au minimum `catch (err) { console.error(...) }`.
- Pour le futur monitoring (Sentry post-Lyon) : utiliser `console.error`
  avec un prefix `[<module>]` (ex : `[yousign] webhook validation failed`).

### Commentaires

- Préférer des noms expressifs aux commentaires.
- Header de fichier obligatoire pour les services métier (lib/) :

```typescript
// lib/onboarding/onboarding-service.ts
// Sprint Agents IA v18 · 30 avril 2026
//
// <description en 1-3 lignes du rôle du fichier>
```

### CSS / Tailwind

- Tailwind v4 — config inline dans `app/globals.css` via `@theme inline`.
- Couleurs AMANA disponibles : `amana-forest`, `amana-gold`, `amana-dark`,
  `amana-grey`, `amana-cream`, `amana-grey-light`, `amana-soft-grey`.
- Pas de styles inline `style={{}}` sauf cas métier (ex : couleur dynamique
  selon donnée).

## Tests

- **Unitaires** : Vitest dans `*.test.ts` colocalisé avec le fichier testé.
- **E2E** : Playwright dans `tests/e2e/`.
- Les **tests doivent vraiment tester** : pas de `expect(['x','y']).toContain('x')`
  qui passe toujours.
- Couverture cible : 80 % sur `lib/` (services métier), 100 % sur les
  fonctions de calcul critique (`routeToOffer`, `verifyWebhookSignature`).

## Sécurité

### Règles dures

- ❌ Jamais de secret en clair dans le code, les commits, les PR.
- ❌ Jamais d'exposition de `SUPABASE_SERVICE_ROLE_KEY` côté client.
- ❌ Jamais de policy RLS `USING (true)` côté `public` sans justification
  explicite documentée.
- ❌ Jamais de `dangerouslySetInnerHTML` sans sanitization.
- ❌ Jamais d'écriture en DB sans audit log pour les actions sensibles.

### Ce qu'il faut faire

- ✅ RLS activé sur toute nouvelle table (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`).
- ✅ Policies par rôle (admin / conseiller / client) — voir migrations existantes.
- ✅ Vues avec `WITH (security_invoker = true)`.
- ✅ Validation HMAC sur tous les webhooks externes.
- ✅ Rate limiting sur tout endpoint public (cible post-Lyon).

## Migrations Supabase

- Versionnées dans `supabase/migrations/<YYYYMMDD>_<description>.sql`.
- **Idempotentes** : `CREATE TABLE IF NOT EXISTS`, `DROP POLICY IF EXISTS`
  avant `CREATE POLICY`.
- Ajouter `ENABLE ROW LEVEL SECURITY` à toute nouvelle table.
- Tester en local puis en preview avant de merger.

> **Piège connu** : la table `supabase_migrations` peut être désynchronisée
> du dossier `supabase/migrations/` si certaines migrations ont été appliquées
> via SQL Editor. Dans ce cas, faire un reseed manuel.

## Pièges déjà rencontrés (à éviter de répéter)

Lecture obligatoire pour les nouveaux arrivants :

1. **`proxy.ts` vs `middleware.ts`** — Cursor renomme automatiquement.
   Vérifier `git diff` avant chaque commit. Voir commit `378d600`.
2. **Vercel Sensitive sur `NEXT_PUBLIC_*`** — casse le bundle client. Ne
   jamais cocher Sensitive sur ces variables.
3. **Vercel CLI ne pull pas les Sensitive** — récupérer manuellement via
   le dashboard Supabase.
4. **`vercel env pull --environment=development`** tire vide si vars
   définies en Production+Preview seulement. Utiliser `--environment=preview`.
5. **Triple-backticks dans template literals TS** — cassent le tsc dans les
   prompts d'agents. Utiliser indentation à la place.
6. **`profiles` n'a pas de colonne `email`** — l'email vit dans `auth.users`.
   Pour récupérer l'email : `supabase.auth.admin.listUsers()` (paginé).
7. **`is_admin()` / `is_conseiller()` SECURITY DEFINER** — ne PAS revoke
   EXECUTE pour `authenticated`, sinon les policies SELECT cassent.

## Reviews

Quand tu reviewes une PR, pense à :

- La PR fait-elle bien **une seule chose** ?
- Les noms sont-ils clairs ?
- Les erreurs sont-elles loggées avant d'être avalées ?
- Y a-t-il un test qui couvre le changement ?
- Les types sont-ils stricts ?
- Y a-t-il des `console.log` oubliés ?
- Le `.env.example` est-il à jour si une nouvelle var apparaît ?

## Questions

- Discord interne / Slack équipe AMANA pour le quotidien.
- Issue GitHub avec label `question` pour les sujets qui méritent trace.
- Mohamed pour les arbitrages métier / conformité.
