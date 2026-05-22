-- Purge dossiers + tous les clients (garde admin + conseiller + products)
-- docker exec -i supabase_db_amana-platform psql -U postgres -d postgres -f - < supabase/snippets/purge_dossiers_fresh.sql

BEGIN;

UPDATE public.validation_gates SET decided_by = NULL WHERE decided_by IS NOT NULL;

DELETE FROM public.onboarding_sessions;
DELETE FROM public.dossiers;
DELETE FROM public.documents_remis;

DELETE FROM public.projects
WHERE user_id NOT IN (
  SELECT id FROM auth.users
  WHERE email IN ('admin@amana-patrimoine.fr', 'conseiller@amana.local')
);

DELETE FROM public.mif2
WHERE user_id NOT IN (
  SELECT id FROM auth.users
  WHERE email IN ('admin@amana-patrimoine.fr', 'conseiller@amana.local')
);

DELETE FROM public.kyc
WHERE user_id NOT IN (
  SELECT id FROM auth.users
  WHERE email IN ('admin@amana-patrimoine.fr', 'conseiller@amana.local')
);

DELETE FROM public.user_consents
WHERE user_id NOT IN (
  SELECT id FROM auth.users
  WHERE email IN ('admin@amana-patrimoine.fr', 'conseiller@amana.local')
);

DELETE FROM public.client_facts
WHERE user_id IS NULL
   OR user_id NOT IN (
  SELECT id FROM auth.users
  WHERE email IN ('admin@amana-patrimoine.fr', 'conseiller@amana.local')
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
         OR user_id NOT IN (
        SELECT id FROM auth.users
        WHERE email IN ('admin@amana-patrimoine.fr', 'conseiller@amana.local')
      )
    $q$;
  END IF;
END $$;

DELETE FROM auth.users
WHERE email NOT IN (
  'admin@amana-patrimoine.fr',
  'conseiller@amana.local'
);

COMMIT;
