-- Hotfix : ajout colonne `source` à user_consents
-- Permet de tracer la provenance de l'accusé de réception
-- (ex. funnel_onboarding_email_click, ui_form, conseiller_validation, …)
-- Date : 2026-05-05

ALTER TABLE public.user_consents
  ADD COLUMN IF NOT EXISTS source text;

COMMENT ON COLUMN public.user_consents.source IS
  'Origine de l''accusé de réception : funnel_onboarding_email_click, ui_form, conseiller_validation, etc.';

CREATE INDEX IF NOT EXISTS idx_user_consents_source
  ON public.user_consents(source)
  WHERE source IS NOT NULL;
