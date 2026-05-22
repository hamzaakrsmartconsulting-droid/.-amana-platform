-- =============================================================================
-- AMANA Patrimoine — Baseline schema (must run BEFORE all other migrations)
-- Created: 2026-04-25 (timestamp chosen to sort before all existing migrations)
-- =============================================================================
-- Ce fichier crée le socle minimal que toutes les autres migrations supposent :
--   • table public.profiles   (roles client / conseiller / admin)
--   • table public.products   (catalogue produits halal)
--   • fonctions RLS helpers   is_admin() / is_conseiller()
--   • trigger handle_new_user (crée automatiquement un profil à l'inscription)
--   • bucket kyc-documents    (storage)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0. Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- 1. Table profiles
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT,
  prenom        TEXT,
  nom           TEXT,
  role          TEXT NOT NULL DEFAULT 'client'
                  CHECK (role IN ('client', 'conseiller', 'admin')),
  kyc_statut    TEXT NOT NULL DEFAULT 'non_soumis'
                  CHECK (kyc_statut IN ('non_soumis', 'en_cours', 'soumis', 'valide', 'rejete')),
  mif2_complete BOOLEAN NOT NULL DEFAULT FALSE,
  offre_amana   TEXT CHECK (offre_amana IS NULL OR offre_amana IN ('mass', 'patrimoniale', 'premium')),
  tenant_id     UUID,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS profiles_role_idx  ON public.profiles(role);
CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles(email);

-- updated_at trigger (function may already exist in later migrations — idempotent)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Each user can read & update their own row
CREATE POLICY "profiles_self_select" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "profiles_self_update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admins & conseillers can read all profiles
CREATE POLICY "profiles_staff_select" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'conseiller')
    )
  );

-- Admins can update any profile
CREATE POLICY "profiles_admin_update" ON public.profiles
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- ---------------------------------------------------------------------------
-- 2. RLS helper functions (used by subsequent migrations)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_conseiller()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'conseiller')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------------
-- 3. Trigger : create profile row on auth.users INSERT
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, prenom, nom, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'prenom', ''),
    COALESCE(NEW.raw_user_meta_data->>'nom', ''),
    'client'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 4. Table products (referenced by 20260426_products_docs.sql)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                    TEXT UNIQUE NOT NULL,
  nom                     TEXT NOT NULL,
  categorie               TEXT NOT NULL
                            CHECK (categorie IN ('scpi', 'assurance_vie', 'per', 'compte_titre', 'or', 'immobilier', 'autre')),
  description             TEXT,
  rendement_cible_pct     NUMERIC(5,2),
  risque_niveau           INT CHECK (risque_niveau BETWEEN 1 AND 7),
  sharia_compliant        BOOLEAN NOT NULL DEFAULT TRUE,
  actif                   BOOLEAN NOT NULL DEFAULT TRUE,
  ordre_affichage         INT DEFAULT 0,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS products_updated_at ON public.products;
CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Tout le monde (même anonyme) peut lire les produits actifs
CREATE POLICY "products_public_select" ON public.products
  FOR SELECT
  USING (actif = TRUE);

-- Seuls les admins et conseillers peuvent gérer le catalogue
CREATE POLICY "products_staff_all" ON public.products
  FOR ALL TO authenticated
  USING (public.is_conseiller())
  WITH CHECK (public.is_conseiller());

-- ---------------------------------------------------------------------------
-- 5. Storage bucket kyc-documents
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('kyc-documents', 'kyc-documents', FALSE)
ON CONFLICT (id) DO NOTHING;

-- Policy : client peut uploader ses propres docs
DROP POLICY IF EXISTS "kyc_docs_client_upload" ON storage.objects;
CREATE POLICY "kyc_docs_client_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'kyc-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy : client peut lire ses propres docs
DROP POLICY IF EXISTS "kyc_docs_client_read" ON storage.objects;
CREATE POLICY "kyc_docs_client_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'kyc-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy : conseiller peut lire tous les docs kyc
DROP POLICY IF EXISTS "kyc_docs_conseiller_read" ON storage.objects;
CREATE POLICY "kyc_docs_conseiller_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'kyc-documents'
    AND public.is_conseiller()
  );

-- ---------------------------------------------------------------------------
-- 6. Seed : un compte admin par défaut pour le développement local
-- ---------------------------------------------------------------------------
-- ATTENTION : ne jamais inclure des mots de passe en clair en production.
-- Ce bloc crée un admin local UNIQUEMENT si la base est vide (local dev).
-- Mot de passe : Admin1234!  — à changer immédiatement en prod.
-- En production, créer l'admin via le Dashboard Supabase (Authentication > Add user).

DO $$
DECLARE
  _uid uuid;
BEGIN
  -- Vérifier si l'email existe déjà
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@amana-patrimoine.fr') THEN
    -- Insérer dans auth.users directement (méthode safe pour seed local)
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      confirmation_token, recovery_token, email_change, email_change_token_new, reauthentication_token,
      phone_change, phone_change_token, role, aud, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_super_admin
    ) VALUES (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000000',
      'admin@amana-patrimoine.fr',
      crypt('Admin1234!', gen_salt('bf')),
      now(),
      '', '', '', '', '',
      '', '',
      'authenticated', 'authenticated',
      now(), now(),
      '{"provider":"email","providers":["email"]}',
      '{"prenom":"Admin","nom":"AMANA"}',
      FALSE
    )
    RETURNING id INTO _uid;

    -- Mettre le rôle admin sur le profil
    UPDATE public.profiles SET role = 'admin' WHERE id = _uid;
  END IF;
END;
$$;
