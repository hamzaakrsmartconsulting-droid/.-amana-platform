-- Migration : table user_consents pour traçabilité des consentements réglementaires
-- Exécuter dans Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- Date : 2026-04-26

-- Table user_consents
CREATE TABLE IF NOT EXISTS user_consents (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  -- Valeurs : 'cgu', 'confidentialite', 'der', 'lettre_mission', 'dici', 'dip'
  version     text NOT NULL DEFAULT '1.0',
  accepted_at timestamptz NOT NULL DEFAULT now(),
  ip_address  text,          -- optionnel, à alimenter côté API si besoin
  user_agent  text,          -- optionnel
  created_at  timestamptz DEFAULT now(),
  CONSTRAINT user_consents_unique UNIQUE (user_id, document_type)
);

-- Index pour les lookups fréquents
CREATE INDEX IF NOT EXISTS idx_user_consents_user_id ON user_consents(user_id);
CREATE INDEX IF NOT EXISTS idx_user_consents_type ON user_consents(document_type);

-- RLS (Row Level Security)
ALTER TABLE user_consents ENABLE ROW LEVEL SECURITY;

-- Un utilisateur ne peut voir et modifier que ses propres consentements
CREATE POLICY "users_own_consents_select" ON user_consents
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_own_consents_insert" ON user_consents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_own_consents_update" ON user_consents
  FOR UPDATE USING (auth.uid() = user_id);

-- Les conseillers peuvent voir les consentements de leurs clients
-- (nécessite une table profiles avec role='conseiller')
CREATE POLICY "conseillers_read_consents" ON user_consents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('conseiller', 'manager')
    )
  );

-- Commentaires sur la table
COMMENT ON TABLE user_consents IS 'Traçabilité des consentements réglementaires (CGU, DER, lettre de mission, DICI, DIP) — Conservation 5 ans conformément aux obligations LCB-FT et MIF2';
COMMENT ON COLUMN user_consents.document_type IS 'Type de document : cgu | confidentialite | der | lettre_mission | dici | dip';
COMMENT ON COLUMN user_consents.version IS 'Version du document accepté (pour audit trail)';
COMMENT ON COLUMN user_consents.accepted_at IS 'Horodatage précis de l''acceptation — utilisé comme preuve de consentement';
