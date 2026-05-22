-- Migration : ajout des champs documents réglementaires sur la table products
-- Exécuter dans Supabase SQL Editor après consents_migration.sql
-- Date : 2026-04-26

-- Ajout des colonnes de documents réglementaires
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS document_kid_url   text,   -- DICI/KID pour SCPI et CTO (MIF2)
  ADD COLUMN IF NOT EXISTS document_dip_url   text,   -- DIP Assurance pour AV et PER (COA)
  ADD COLUMN IF NOT EXISTS document_prospectus_url text, -- Prospectus complet
  ADD COLUMN IF NOT EXISTS sharia_certificate_url  text, -- Certificat de conformité charaïque
  ADD COLUMN IF NOT EXISTS frais_entree_pct   numeric(5,2) DEFAULT 0, -- Frais de souscription %
  ADD COLUMN IF NOT EXISTS frais_gestion_pct  numeric(5,2) DEFAULT 0, -- Frais de gestion annuels %
  ADD COLUMN IF NOT EXISTS commission_amana_pct numeric(5,2) DEFAULT 0; -- Commission AMANA %

-- Commentaires
COMMENT ON COLUMN products.document_kid_url IS 'URL du DICI/KID (Document d''Information Clés) — obligatoire pour SCPI et CTO, remis avant souscription (MIF2 Art.24)';
COMMENT ON COLUMN products.document_dip_url IS 'URL du DIP (Document d''Information Précontractuelle) — obligatoire pour assurance-vie et PER (art. L522-5 Code des assurances)';
COMMENT ON COLUMN products.frais_entree_pct IS 'Frais de souscription en % — utilisé pour le tableau coûts ex-ante MIF2';
COMMENT ON COLUMN products.frais_gestion_pct IS 'Frais de gestion annuels en % — utilisé pour le tableau coûts ex-ante MIF2';
COMMENT ON COLUMN products.commission_amana_pct IS 'Commission courtage perçue par AMANA Patrimoine — à divulguer avant souscription (MIF2)';

-- Table pour tracer la remise des DICI/DIP avant souscription (obligatoire MIF2)
CREATE TABLE IF NOT EXISTS document_remis (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id   uuid NOT NULL REFERENCES products(id),
  document_type text NOT NULL, -- 'kid', 'dip', 'prospectus'
  remis_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT document_remis_unique UNIQUE (user_id, product_id, document_type)
);

CREATE INDEX IF NOT EXISTS idx_document_remis_user ON document_remis(user_id);
CREATE INDEX IF NOT EXISTS idx_document_remis_product ON document_remis(product_id);

ALTER TABLE document_remis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_docs_select" ON document_remis
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_own_docs_insert" ON document_remis
  FOR INSERT WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE document_remis IS 'Traçabilité de la remise des documents réglementaires (DICI/KID, DIP) avant souscription — exigence MIF2 Art.24 et directive assurance';
