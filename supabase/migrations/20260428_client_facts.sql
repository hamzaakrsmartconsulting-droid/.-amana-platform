-- supabase/migrations/20260428_client_facts.sql
-- Sprint Agents IA v5 · 28 avril 2026
-- Table de mémoire long-terme partagée par tous les agents AMANA.
-- Chaque "fact" est une connaissance persistante sur un client (âge, patrimoine, objectifs, etc.)
-- Les agents lisent ces facts au début de chaque conversation et les utilisent comme contexte.
-- Les agents peuvent ajouter de nouveaux facts via le tool save_client_fact.

CREATE TABLE IF NOT EXISTS public.client_facts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fact_key      TEXT NOT NULL,
  fact_value    TEXT NOT NULL,
  source_agent  TEXT,                    -- nom de l'agent qui a saisi le fact (mizan, tartib, user_explicit...)
  confidence    NUMERIC(3,2) DEFAULT 0.80 CHECK (confidence BETWEEN 0 AND 1),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT client_facts_user_key_unique UNIQUE (user_id, fact_key)
);

-- Index pour récupération rapide des facts d'un user
CREATE INDEX IF NOT EXISTS client_facts_user_id_idx ON public.client_facts(user_id);

-- Index pour requêtes par clé (ex: stats sur tous les âges)
CREATE INDEX IF NOT EXISTS client_facts_fact_key_idx ON public.client_facts(fact_key);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS client_facts_updated_at ON public.client_facts;
CREATE TRIGGER client_facts_updated_at
  BEFORE UPDATE ON public.client_facts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Row Level Security
ALTER TABLE public.client_facts ENABLE ROW LEVEL SECURITY;

-- Politique : un user peut lire ses propres facts
CREATE POLICY "Users can read own facts"
  ON public.client_facts
  FOR SELECT
  USING (auth.uid() = user_id);

-- Politique : un user peut insérer ses propres facts
CREATE POLICY "Users can insert own facts"
  ON public.client_facts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Politique : un user peut modifier ses propres facts
CREATE POLICY "Users can update own facts"
  ON public.client_facts
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Politique : un user peut supprimer ses propres facts
CREATE POLICY "Users can delete own facts"
  ON public.client_facts
  FOR DELETE
  USING (auth.uid() = user_id);

-- Politique : les admins peuvent tout lire (pour le back-office /admin/users/[id]/facts)
CREATE POLICY "Admins can read all facts"
  ON public.client_facts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- Politique : les admins peuvent modifier (pour saisie manuelle en RDV)
CREATE POLICY "Admins can write all facts"
  ON public.client_facts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- Note : les routes API utilisent supabase.auth.getUser() puis filtrent par user_id.
-- Les politiques RLS ci-dessus servent de double sécurité côté DB.

-- =================================================================
-- CATALOGUE DE FACT KEYS RECOMMANDÉS
-- =================================================================
-- Ce ne sont pas des contraintes (les agents peuvent en créer d'autres)
-- mais des conventions à utiliser pour rester cohérent entre agents.
--
-- Identité & famille
--   - age                       (entier en années, ex: "35")
--   - situation_familiale       (célibataire / marié / divorcé / veuf)
--   - nb_enfants                (entier, ex: "2")
--   - regime_matrimonial        (séparation de biens / communauté / etc.)
--
-- Revenus & charges
--   - revenus_annuels_eur       (entier, ex: "55000")
--   - charges_annuelles_eur     (entier, ex: "30000")
--   - taux_marginal_imposition  (pourcentage, ex: "30")
--
-- Patrimoine
--   - patrimoine_total_eur      (entier, ex: "80000")
--   - liquidites_eur            (entier)
--   - rp_valeur_eur             (résidence principale)
--   - rp_emprunt_restant_eur
--   - immobilier_locatif_eur
--   - actions_etf_eur
--   - scpi_sharia_eur
--   - or_physique_eur
--
-- Profil & objectifs
--   - profil_risque             (prudent / equilibre / dynamique / offensif)
--   - objectif_principal        (retraite / transmission / acquisition_rp / hajj / autre)
--   - horizon_placement_annees  (entier)
--
-- Configuration AMANA
--   - offre_amana_cible         (mass / patrimoniale / premium)
--   - kyc_statut                (en_cours / soumis / valide)
--   - mif2_complete             (true / false)
--
-- Sharia
--   - sensibilite_sharia        (stricte / standard / souple)
--
-- Notes libres
--   - notes_conseiller          (texte libre saisi par admin en RDV)
