-- Hotfix local auth/data bootstrap for dashboard queries
-- - Fixes infinite recursion in profiles RLS policy
-- - Adds core tables expected by app: kyc, mif2, projects

-- ---------------------------------------------------------------------------
-- 1) Fix profiles policies (avoid self-recursive EXISTS on profiles)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "profiles_staff_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_update" ON public.profiles;

CREATE POLICY "profiles_staff_select" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.is_conseiller());

CREATE POLICY "profiles_admin_update" ON public.profiles
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- 2) KYC table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.kyc (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  civilite                    TEXT,
  prenom                      TEXT,
  nom                         TEXT,
  date_naissance              DATE,
  pays_naissance              TEXT,
  ville_naissance             TEXT,
  nationalite                 TEXT,
  capacite_juridique          TEXT,
  telephone                   TEXT,
  telephone_fixe              TEXT,
  adresse                     TEXT,
  code_postal                 TEXT,
  ville                       TEXT,
  pays                        TEXT,
  adresse_fiscale_identique   BOOLEAN DEFAULT TRUE,
  adresse_fiscale             TEXT,
  situation_familiale         TEXT,
  regime_matrimonial          TEXT,
  enfants_a_charge            BOOLEAN DEFAULT FALSE,
  nb_personnes_charge         INT,
  situation_pro               TEXT,
  secteur_activite            TEXT,
  csp                         TEXT,
  revenu_foyer                TEXT,
  revenu_annuel               TEXT,
  patrimoine_financier        TEXT,
  patrimoine_net              BIGINT,
  ifi_assujetti               BOOLEAN DEFAULT FALSE,
  numero_fiscal               TEXT,
  fatca_us_person             BOOLEAN DEFAULT FALSE,
  ppe                         BOOLEAN DEFAULT FALSE,
  ppe_entourage               BOOLEAN DEFAULT FALSE,
  objectif_investissement     TEXT,
  horizon_placement           TEXT,
  tolerance_risque            TEXT,
  perte_acceptable            TEXT,
  titulaire_compte            TEXT,
  nom_banque                  TEXT,
  iban                        TEXT,
  bic_swift                   TEXT,
  doc_identite_url            TEXT,
  doc_justif_url              TEXT,
  doc_rib_url                 TEXT,
  doc_residence_fiscale_url   TEXT,
  kyc_note_risque             INT,
  statut                      TEXT NOT NULL DEFAULT 'en_cours'
                              CHECK (statut IN ('en_cours', 'soumis', 'valide', 'rejete')),
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS kyc_user_id_idx ON public.kyc(user_id);

DROP TRIGGER IF EXISTS kyc_updated_at ON public.kyc;
CREATE TRIGGER kyc_updated_at
  BEFORE UPDATE ON public.kyc
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.kyc ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kyc_self_select" ON public.kyc;
CREATE POLICY "kyc_self_select" ON public.kyc
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "kyc_self_insert" ON public.kyc;
CREATE POLICY "kyc_self_insert" ON public.kyc
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "kyc_self_update" ON public.kyc;
CREATE POLICY "kyc_self_update" ON public.kyc
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "kyc_staff_all" ON public.kyc;
CREATE POLICY "kyc_staff_all" ON public.kyc
  FOR ALL TO authenticated
  USING (public.is_conseiller())
  WITH CHECK (public.is_conseiller());

-- ---------------------------------------------------------------------------
-- 3) MIF2 table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mif2 (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  formation_financiere        TEXT,
  experience_investissement   TEXT,
  produits_utilises           TEXT[],
  frequence_operations        TEXT,
  montant_moyen_operation     TEXT,
  comprehension_risque        TEXT,
  connaissance_scpi           TEXT,
  connaissance_assurance_vie  TEXT,
  score_mif2                  INT,
  profil_mif2                 TEXT,
  statut                      TEXT NOT NULL DEFAULT 'en_cours'
                              CHECK (statut IN ('en_cours', 'soumis', 'valide', 'rejete')),
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mif2_user_id_idx ON public.mif2(user_id);

DROP TRIGGER IF EXISTS mif2_updated_at ON public.mif2;
CREATE TRIGGER mif2_updated_at
  BEFORE UPDATE ON public.mif2
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.mif2 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mif2_self_select" ON public.mif2;
CREATE POLICY "mif2_self_select" ON public.mif2
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "mif2_self_insert" ON public.mif2;
CREATE POLICY "mif2_self_insert" ON public.mif2
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "mif2_self_update" ON public.mif2;
CREATE POLICY "mif2_self_update" ON public.mif2
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "mif2_staff_all" ON public.mif2;
CREATE POLICY "mif2_staff_all" ON public.mif2
  FOR ALL TO authenticated
  USING (public.is_conseiller())
  WITH CHECK (public.is_conseiller());

-- ---------------------------------------------------------------------------
-- 4) Projects table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.projects (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kyc_id        UUID REFERENCES public.kyc(id) ON DELETE SET NULL,
  conseiller_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type          TEXT NOT NULL,
  montant       NUMERIC(14,2),
  statut        TEXT NOT NULL DEFAULT 'en_cours'
                CHECK (statut IN ('en_cours', 'soumis', 'signe', 'actif', 'archive', 'rejete')),
  metadata      JSONB DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS projects_user_id_idx ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS projects_conseiller_id_idx ON public.projects(conseiller_id);
CREATE INDEX IF NOT EXISTS projects_created_at_idx ON public.projects(created_at DESC);

DROP TRIGGER IF EXISTS projects_updated_at ON public.projects;
CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "projects_self_select" ON public.projects;
CREATE POLICY "projects_self_select" ON public.projects
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "projects_self_insert" ON public.projects;
CREATE POLICY "projects_self_insert" ON public.projects
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "projects_self_update" ON public.projects;
CREATE POLICY "projects_self_update" ON public.projects
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "projects_staff_all" ON public.projects;
CREATE POLICY "projects_staff_all" ON public.projects
  FOR ALL TO authenticated
  USING (public.is_conseiller())
  WITH CHECK (public.is_conseiller());

