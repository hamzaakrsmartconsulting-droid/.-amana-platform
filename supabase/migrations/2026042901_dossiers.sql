-- supabase/migrations/20260429_dossiers.sql
-- Sprint Agents IA v6 · 29 avril 2026
-- Notion de "dossier" : silo isolé pour chaque client/prospect analysé.
-- Un conseiller AMANA (en pratique Mohamed Mosbahi) peut avoir N dossiers.
-- Chaque dossier accumule ses propres facts, conversations, documents.
-- dossier_id = NULL → bac à sable (questions méta, tests).

-- =======================================================================
-- 1. Table dossiers
-- =======================================================================

CREATE TABLE IF NOT EXISTS public.dossiers (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conseiller_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nom                TEXT NOT NULL,
  prenom             TEXT NOT NULL,
  email_client       TEXT,
  telephone          TEXT,
  statut             TEXT NOT NULL DEFAULT 'prospect'
                      CHECK (statut IN ('prospect', 'actif', 'archive')),
  offre_amana_cible  TEXT
                      CHECK (offre_amana_cible IS NULL OR offre_amana_cible IN ('mass', 'patrimoniale', 'premium')),
  notes              TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS dossiers_conseiller_id_idx ON public.dossiers(conseiller_id);
CREATE INDEX IF NOT EXISTS dossiers_statut_idx        ON public.dossiers(statut);
CREATE INDEX IF NOT EXISTS dossiers_updated_at_idx    ON public.dossiers(updated_at DESC);

-- Trigger updated_at (la fonction set_updated_at() existe déjà depuis le sprint v5)
DROP TRIGGER IF EXISTS dossiers_updated_at ON public.dossiers;
CREATE TRIGGER dossiers_updated_at
  BEFORE UPDATE ON public.dossiers
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.dossiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Conseiller can read own dossiers"
  ON public.dossiers FOR SELECT
  USING (auth.uid() = conseiller_id);

CREATE POLICY "Conseiller can insert own dossiers"
  ON public.dossiers FOR INSERT
  WITH CHECK (auth.uid() = conseiller_id);

CREATE POLICY "Conseiller can update own dossiers"
  ON public.dossiers FOR UPDATE
  USING (auth.uid() = conseiller_id)
  WITH CHECK (auth.uid() = conseiller_id);

CREATE POLICY "Conseiller can delete own dossiers"
  ON public.dossiers FOR DELETE
  USING (auth.uid() = conseiller_id);

CREATE POLICY "Admins read all dossiers"
  ON public.dossiers FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "Admins write all dossiers"
  ON public.dossiers FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- =======================================================================
-- 2. Modification client_facts : ajout dossier_id (NULLABLE = bac à sable)
-- =======================================================================

ALTER TABLE public.client_facts
  ADD COLUMN IF NOT EXISTS dossier_id UUID REFERENCES public.dossiers(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS client_facts_dossier_id_idx ON public.client_facts(dossier_id);

-- L'ancienne contrainte unique (user_id, fact_key) ne convient plus :
-- on veut autoriser le même fact_key sur des dossiers différents.
-- Stratégie : 2 index uniques distincts.
--   - dossier_id IS NULL → unicité sur (user_id, fact_key) (bac à sable)
--   - dossier_id IS NOT NULL → unicité sur (user_id, dossier_id, fact_key)

ALTER TABLE public.client_facts
  DROP CONSTRAINT IF EXISTS client_facts_user_key_unique;

DROP INDEX IF EXISTS public.client_facts_no_dossier_unique;
CREATE UNIQUE INDEX client_facts_no_dossier_unique
  ON public.client_facts(user_id, fact_key)
  WHERE dossier_id IS NULL;

DROP INDEX IF EXISTS public.client_facts_with_dossier_unique;
CREATE UNIQUE INDEX client_facts_with_dossier_unique
  ON public.client_facts(user_id, dossier_id, fact_key)
  WHERE dossier_id IS NOT NULL;

-- =======================================================================
-- 3. Politiques RLS adaptées sur client_facts
-- =======================================================================
-- Les politiques existantes du sprint v5 (Users can read/insert/update/delete own facts)
-- restent valables : un user accède à ses propres facts (peu importe le dossier).
-- L'isolation par dossier se fait côté code dans la factory (filtrage par dossier_id).
-- Les politiques admin existantes (read/write all) restent aussi valables.

-- =======================================================================
-- 4. Vue helper pour le back-office /admin/dossiers
-- =======================================================================
-- Liste les dossiers avec compteur de facts associés.

CREATE OR REPLACE VIEW public.dossiers_with_stats AS
SELECT
  d.*,
  COALESCE((
    SELECT count(*)::int
    FROM public.client_facts cf
    WHERE cf.dossier_id = d.id
  ), 0) AS facts_count,
  COALESCE((
    SELECT max(cf.updated_at)
    FROM public.client_facts cf
    WHERE cf.dossier_id = d.id
  ), d.created_at) AS last_activity_at
FROM public.dossiers d;

-- Fin migration v6
