-- =============================================================================
-- Seed local — comptes de démo + projet signature (Yousign)
-- Exécuté après les migrations sur `npm run supabase:reset`.
--
-- Comptes (mot de passe commun conseiller/admin : Admin1234! — client : Client1234!)
--   • admin@amana-patrimoine.fr   → rôle admin   (créé par migration baseline)
--   • conseiller@amana.local      → rôle conseiller (UUID fixe ci-dessous)
--   • client@amana.local          → rôle client (parcours client / KYC / signature)
--
-- Catalogue public.products : conservé via migrations (ON CONFLICT), pas touché ici.
--
-- Purger les autres comptes sur une DB déjà encombrée (LOCAL UNIQUEMENT) :
--   voir supabase/snippets/purge_auth_keep_demo_users.sql
-- =============================================================================

-- Ancien client de démo (email personnel) : retirer pour n'avoir qu'un seul client seed.
DELETE FROM auth.users WHERE email = 'hamzalazigheb@gmail.com';

DO $$
DECLARE
  _admin_id uuid;
  _conseiller_id uuid;
  _client_id uuid := 'c0000003-0000-4000-b000-000000000001'::uuid;
  _kyc_id uuid;
BEGIN
  -- 0) Admin (créé par 20260425_000_baseline.sql si absent)
  SELECT id INTO _admin_id
  FROM auth.users
  WHERE email = 'admin@amana-patrimoine.fr'
  LIMIT 1;

  IF _admin_id IS NOT NULL THEN
    UPDATE public.profiles
    SET
      role = 'admin',
      prenom = COALESCE(NULLIF(trim(prenom), ''), 'Admin'),
      nom = COALESCE(NULLIF(trim(nom), ''), 'AMANA'),
      full_name = COALESCE(NULLIF(trim(full_name), ''), 'Admin AMANA'),
      updated_at = now()
    WHERE id = _admin_id;
  END IF;

  -- 1) Conseiller (UUID fixe → AMANA_DEFAULT_CONSEILLER_ID dans .env.local)
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'conseiller@amana.local') THEN
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      confirmation_token, recovery_token, email_change, email_change_token_new, reauthentication_token,
      phone_change, phone_change_token, role, aud, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_super_admin
    ) VALUES (
      '0745a52d-de63-462b-a4be-5465a599bc8a',
      '00000000-0000-0000-0000-000000000000',
      'conseiller@amana.local',
      crypt('Admin1234!', gen_salt('bf')),
      now(),
      '', '', '', '', '',
      '', '',
      'authenticated', 'authenticated',
      now(), now(),
      '{"provider":"email","providers":["email"]}',
      '{"prenom":"Conseiller","nom":"Demo"}',
      FALSE
    );
  END IF;

  SELECT id INTO _conseiller_id
  FROM auth.users
  WHERE email = 'conseiller@amana.local'
  LIMIT 1;

  UPDATE public.profiles
  SET
    role = 'conseiller',
    prenom = COALESCE(prenom, 'Conseiller'),
    nom = COALESCE(nom, 'Demo'),
    full_name = COALESCE(full_name, 'Conseiller Demo'),
    updated_at = now()
  WHERE id = _conseiller_id;

  -- 2) Client unique pour parcours client / KYC / projets
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'client@amana.local') THEN
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      confirmation_token, recovery_token, email_change, email_change_token_new, reauthentication_token,
      phone_change, phone_change_token, role, aud, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_super_admin
    ) VALUES (
      _client_id,
      '00000000-0000-0000-0000-000000000000',
      'client@amana.local',
      crypt('Client1234!', gen_salt('bf')),
      now(),
      '', '', '', '', '',
      '', '',
      'authenticated', 'authenticated',
      now(), now(),
      '{"provider":"email","providers":["email"]}',
      '{"prenom":"Client","nom":"Demo"}',
      FALSE
    );
  ELSE
    SELECT id INTO _client_id FROM auth.users WHERE email = 'client@amana.local' LIMIT 1;
  END IF;

  -- 3) KYC client (signature / pipeline)
  INSERT INTO public.kyc (
    user_id, prenom, nom, ville, telephone, statut, updated_at
  )
  VALUES (
    _client_id, 'Client', 'Demo', 'Lyon', '0600000000', 'valide', now()
  )
  ON CONFLICT (user_id) DO UPDATE
  SET
    prenom = EXCLUDED.prenom,
    nom = EXCLUDED.nom,
    ville = EXCLUDED.ville,
    telephone = EXCLUDED.telephone,
    statut = EXCLUDED.statut,
    updated_at = now();

  SELECT id INTO _kyc_id
  FROM public.kyc
  WHERE user_id = _client_id
  LIMIT 1;

  -- 4) Projet en "soumis" pour tester la vue conseiller (signature / workflow)
  IF NOT EXISTS (
    SELECT 1
    FROM public.projects
    WHERE user_id = _client_id
      AND metadata->>'seed_tag' = 'local-signature-demo'
  ) THEN
    INSERT INTO public.projects (
      user_id, kyc_id, conseiller_id, type, montant, statut, metadata
    )
    VALUES (
      _client_id,
      _kyc_id,
      _conseiller_id,
      'assurance_vie',
      25000,
      'soumis',
      jsonb_build_object(
        'seed_tag', 'local-signature-demo',
        'notes', 'Projet seed local pour test signature Yousign'
      )
    );
  END IF;
END;
$$;
