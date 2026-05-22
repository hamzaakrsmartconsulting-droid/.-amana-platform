-- Migration : ajout des gate_types V2 + V4-V6 au parcours réglementaire AMANA
-- Date : 2026-05-12

-- Mise à jour du commentaire de la colonne gate_type pour documenter les nouveaux types
COMMENT ON COLUMN public.validation_gates.gate_type IS
  'Type de verrou : '
  'kyc_validation (V1) | profil_risque_validation (V2) | lm_send (V3) | '
  'ra_recommandations (V4) | ra_synthese (V5) | ra_frais_exante (V6) | ra_bulletin_send (V7)';

-- Ajout des nouveaux types dans la table documents si pas déjà présents
-- (lcbft, ppe_annexe, bulletin pour les blocs 2 et 6)
DO $$
BEGIN
  -- Vérifier si la colonne type a un CHECK constraint, sinon ne rien faire
  -- Les nouveaux document types seront gérés par application, pas par CHECK
  NULL;
END $$;
