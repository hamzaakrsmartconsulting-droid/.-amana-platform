-- =============================================================================
-- PRODUCTION — supprime tous les utilisateurs sauf admin@amana-patrimoine.fr
-- Exécuter dans Supabase Dashboard → SQL Editor (projet prod).
-- IRRÉVERSIBLE. Ne pas lancer en local sauf test volontaire.
--
-- Garde : 1 compte Auth + profil admin (ORIAS / back-office).
-- Supprime : clients test, sessions onboarding, dossiers, données liées.
-- Ne supprime PAS : public.products
-- =============================================================================

BEGIN;

-- Admin de référence (vérifier avant COMMIT)
-- SELECT id, email FROM auth.users WHERE email = 'admin@amana-patrimoine.fr';

UPDATE public.validation_gates
SET decided_by = NULL
WHERE decided_by IS NOT NULL
  AND decided_by <> (
    SELECT id FROM auth.users WHERE email = 'admin@amana-patrimoine.fr' LIMIT 1
  );

-- Funnel + dossiers clients
DELETE FROM public.onboarding_sessions;
DELETE FROM public.dossier_stage_history;
DELETE FROM public.document_inputs;
DELETE FROM public.compliance_checks;
DELETE FROM public.compliance_alerts;
DELETE FROM public.messages;
DELETE FROM public.conversations;
DELETE FROM public.documents;
DELETE FROM public.documents_remis;
DELETE FROM public.dossiers;

-- Données par user_id (clients)
DELETE FROM public.projects
WHERE user_id IS DISTINCT FROM (
  SELECT id FROM auth.users WHERE email = 'admin@amana-patrimoine.fr' LIMIT 1
);

DELETE FROM public.mif2
WHERE user_id IS DISTINCT FROM (
  SELECT id FROM auth.users WHERE email = 'admin@amana-patrimoine.fr' LIMIT 1
);

DELETE FROM public.kyc
WHERE user_id IS DISTINCT FROM (
  SELECT id FROM auth.users WHERE email = 'admin@amana-patrimoine.fr' LIMIT 1
);

DELETE FROM public.user_consents
WHERE user_id IS DISTINCT FROM (
  SELECT id FROM auth.users WHERE email = 'admin@amana-patrimoine.fr' LIMIT 1
);

DELETE FROM public.client_facts
WHERE user_id IS NULL
   OR user_id IS DISTINCT FROM (
  SELECT id FROM auth.users WHERE email = 'admin@amana-patrimoine.fr' LIMIT 1
);

DELETE FROM public.audit_logs;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'signature_requests'
  ) THEN
    EXECUTE $q$
      DELETE FROM public.signature_requests
      WHERE user_id IS NULL
         OR user_id IS DISTINCT FROM (
        SELECT id FROM auth.users WHERE email = 'admin@amana-patrimoine.fr' LIMIT 1
      )
    $q$;
  END IF;
END $$;

-- Profils clients (orphelins éventuels)
DELETE FROM public.profiles
WHERE email IS DISTINCT FROM 'admin@amana-patrimoine.fr'
   OR id IS DISTINCT FROM (
  SELECT id FROM auth.users WHERE email = 'admin@amana-patrimoine.fr' LIMIT 1
);

-- Auth : tous sauf admin
-- Si erreur Storage : Dashboard → Storage → supprimer objets des users, puis relancer.
DELETE FROM auth.users
WHERE email <> 'admin@amana-patrimoine.fr';

COMMIT;

-- Vérification
SELECT 'auth.users' AS src, count(*) FROM auth.users
UNION ALL
SELECT 'profiles', count(*) FROM public.profiles;
