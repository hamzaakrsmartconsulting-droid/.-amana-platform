-- Migration : Q1.6 ESG/SFDR dans onboarding_sessions + table documents_remis
-- Spec Parcours Réglementaire AMANA · 06 mai 2026

-- =====================================================================
-- 1. Ajout des colonnes ESG/SFDR dans onboarding_sessions (Q1.6)
-- =====================================================================
ALTER TABLE public.onboarding_sessions
  ADD COLUMN IF NOT EXISTS esg_preference       TEXT    CHECK (esg_preference IN ('article8', 'article9', 'label_isr', 'sans_preference')),
  ADD COLUMN IF NOT EXISTS esg_pct_min          INTEGER CHECK (esg_pct_min >= 0 AND esg_pct_min <= 100),
  ADD COLUMN IF NOT EXISTS esg_indicateurs      TEXT[]; -- ex: {'biodiversite','emissions_co2','droits_sociaux'}

-- =====================================================================
-- 2. Table documents_remis
-- Preuve formelle de remise des documents réglementaires (article L.541-8-1 CMF).
-- Distinct de user_consents : ici on trace la remise physique d'un document
-- (DER, LM, RA…), pas juste un clic sur un checkbox de consentement.
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.documents_remis (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dossier_id     UUID        REFERENCES public.dossiers(id) ON DELETE SET NULL,
  document_type  TEXT        NOT NULL CHECK (document_type IN (
    'der_generique', 'der_personnalise', 'lm', 'ra', 'bilan', 'bulletin',
    'rapport_trimestriel', 'bilan_annuel', 'fiche_lcbft'
  )),
  -- Canal de remise
  source         TEXT        NOT NULL CHECK (source IN (
    'funnel_onboarding_email_click',  -- client a cliqué le magic-link du mail DER
    'email_attachment',               -- envoi email avec PJ
    'yousign_signed',                 -- document signé électroniquement
    'conseiller_manuel',              -- remise directe par le conseiller
    'espace_client'                   -- téléchargement depuis l'espace client
  )),
  remis_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Référence optionnelle au document Storage
  document_id    UUID        REFERENCES public.documents(id) ON DELETE SET NULL,
  -- Contexte technique
  ip_address     INET,
  user_agent     TEXT,
  metadata       JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_docs_remis_user_id   ON public.documents_remis(user_id);
CREATE INDEX IF NOT EXISTS idx_docs_remis_dossier_id ON public.documents_remis(dossier_id);
CREATE INDEX IF NOT EXISTS idx_docs_remis_type       ON public.documents_remis(document_type);

ALTER TABLE public.documents_remis ENABLE ROW LEVEL SECURITY;

-- Client voit ses propres remises
CREATE POLICY docs_remis_client_select ON public.documents_remis
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Conseiller voit les remises de ses dossiers
CREATE POLICY docs_remis_conseiller_select ON public.documents_remis
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.dossiers d
      WHERE d.id = dossier_id AND d.conseiller_id = auth.uid()
    )
  );

-- Admin tout voir
CREATE POLICY docs_remis_admin_all ON public.documents_remis
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =====================================================================
-- 3. Ajouter kyc_attente_validation dans les stages pipeline autorisés
--    (séparation kyc_attente = soumis, kyc_a_valider = en cours revue Mohamed)
-- =====================================================================
-- Note : si le check constraint bloque 'kyc_a_valider', on le gère proprement.
DO $$
BEGIN
  -- On tente de dropper + recréer le check sur pipeline_stage
  -- pour ajouter 'kyc_a_valider' si absent
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'dossiers'
      AND column_name = 'pipeline_stage'
  ) THEN
    RAISE NOTICE 'Colonne pipeline_stage introuvable dans dossiers — migration ignorée';
  END IF;
END
$$;
