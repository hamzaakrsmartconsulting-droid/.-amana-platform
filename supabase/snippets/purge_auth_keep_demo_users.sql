-- =============================================================================
-- LOCAL UNIQUEMENT — supprime tous les utilisateurs Auth sauf les 3 comptes seed.
-- Ne pas exécuter sur staging / production.
--
-- Prérequis : Postgres superuser (ex. rôle postgres du stack Supabase local).
-- Exemple (depuis la racine du repo, stack locale démarrée) :
--   npx supabase db query --local -f supabase/snippets/purge_auth_keep_demo_users.sql
-- Alternative : psql sur le port Postgres local (souvent 54322).
--
-- Les lignes public.products ne sont pas modifiées.
-- =============================================================================

BEGIN;

UPDATE public.validation_gates
SET decided_by = NULL
WHERE decided_by IS NOT NULL;

DELETE FROM auth.users
WHERE email NOT IN (
  'admin@amana-patrimoine.fr',
  'conseiller@amana.local',
  'client@amana.local'
);

COMMIT;
