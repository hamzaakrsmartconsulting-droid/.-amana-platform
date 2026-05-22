-- Migration : ajout du gate V8 bilan_annuel_validation
-- Date : 2026-05-12
-- Spec Parcours Réglementaire AMANA — étape V, point V8

COMMENT ON COLUMN public.validation_gates.gate_type IS
  'Type de verrou Mohamed : '
  'kyc_validation (V1) | profil_risque_validation (V2) | lm_send (V3) | '
  'ra_recommandations (V4) | ra_synthese (V5) | ra_frais_exante (V6) | '
  'ra_bulletin_send (V7) | bilan_annuel_validation (V8)';

-- Grants sur documents_remis pour le service role (insertion depuis auth/callback)
GRANT SELECT, INSERT ON public.documents_remis TO authenticated;
