-- Sprint Pipeline Additionnel · 23 mai 2026
--
-- Pipeline pour les SOUSCRIPTIONS COMPLÉMENTAIRES (post-actif).
-- Chaque ligne `projects` représente une souscription à un produit donné.
-- On lui adjoint un pipeline_stage propre (orthogonal au pipeline du dossier client).
--
-- Pipeline client (dossiers.pipeline_stage)  → entrée en relation (1 fois par client)
-- Pipeline projet (projects.pipeline_stage)  → 1 par souscription produit
--
-- On ajoute aussi `project_id` (nullable) à `documents` et `validation_gates`
-- pour pouvoir tracer LM/RA/Bilan spécifiques à un project.

-- =====================================================================
-- 1. Colonnes projects pour le pipeline produit
-- =====================================================================
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS dossier_id UUID
    REFERENCES public.dossiers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pipeline_stage TEXT
    CHECK (pipeline_stage IN (
      'nouveau',          -- Client a soumis montant + ack
      'docs_a_generer',   -- Admin doit générer LM/RA/Bilan pour ce produit
      'lm_ra_envoyes',    -- Pack envoyé en signature Yousign
      'signes',           -- Pack signé par le client
      'souscription',     -- Transmis à l'assureur
      'actif',            -- Produit actif (assureur confirmé)
      'suivi',            -- Suivi régulier
      'bloque',           -- En attente (problème détecté)
      'archive'           -- Clôturé / annulé
    )),
  ADD COLUMN IF NOT EXISTS pipeline_stage_updated_at TIMESTAMPTZ DEFAULT now();

-- Backfill des projects existants : on les considère 'actif' s'ils ont
-- statut='actif', sinon 'nouveau' (le conseiller pourra reclasser).
UPDATE public.projects
SET pipeline_stage = CASE
  WHEN statut = 'actif'   THEN 'actif'
  WHEN statut = 'signe'   THEN 'souscription'
  WHEN statut = 'archive' THEN 'archive'
  WHEN statut = 'rejete'  THEN 'archive'
  WHEN statut = 'soumis'  THEN 'docs_a_generer'
  ELSE 'nouveau'
END
WHERE pipeline_stage IS NULL;

CREATE INDEX IF NOT EXISTS idx_projects_pipeline_stage
  ON public.projects (pipeline_stage, pipeline_stage_updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_projects_dossier_id
  ON public.projects (dossier_id);

COMMENT ON COLUMN public.projects.pipeline_stage IS
  'Étape pipeline souscription complémentaire. Transitions tracées dans project_stage_history.';
COMMENT ON COLUMN public.projects.dossier_id IS
  'Dossier client parent (lien fonctionnel — non strictement requis car un project est lié via user_id).';

-- =====================================================================
-- 2. Table project_stage_history (historique transitions projet)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.project_stage_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  conseiller_id   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  from_stage      TEXT,
  to_stage        TEXT NOT NULL,
  triggered_by    TEXT NOT NULL CHECK (triggered_by IN (
    'manual',
    'webhook_yousign',
    'background_job',
    'souscription_client',
    'autre'
  )),
  trigger_context JSONB,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_stage_history_project
  ON public.project_stage_history (project_id, created_at DESC);

ALTER TABLE public.project_stage_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS project_stage_history_select ON public.project_stage_history;
CREATE POLICY project_stage_history_select
  ON public.project_stage_history FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'manager', 'conseiller')
    )
  );

DROP POLICY IF EXISTS project_stage_history_insert ON public.project_stage_history;
CREATE POLICY project_stage_history_insert
  ON public.project_stage_history FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'manager', 'conseiller')
    )
  );

-- =====================================================================
-- 3. Lien optionnel project_id sur documents
-- =====================================================================
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS project_id UUID
    REFERENCES public.projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_documents_project_id
  ON public.documents (project_id);

COMMENT ON COLUMN public.documents.project_id IS
  'Si non NULL : ce document est lié à une souscription complémentaire (project) et non au dossier global.';

-- =====================================================================
-- 4. Lien optionnel project_id sur validation_gates
-- =====================================================================
ALTER TABLE public.validation_gates
  ADD COLUMN IF NOT EXISTS project_id UUID
    REFERENCES public.projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_validation_gates_project
  ON public.validation_gates (project_id);

-- L'index unique existant (dossier_id, gate_type) doit être assoupli :
-- un même dossier peut avoir N projects, chacun avec sa propre gate `lm_send` par exemple.
DROP INDEX IF EXISTS public.uniq_validation_gates_active;
CREATE UNIQUE INDEX uniq_validation_gates_active
  ON public.validation_gates(dossier_id, gate_type, COALESCE(project_id, '00000000-0000-0000-0000-000000000000'::uuid))
  WHERE decision IN ('pending', 'approved');

COMMENT ON COLUMN public.validation_gates.project_id IS
  'Si non NULL : gate liée à une souscription complémentaire (project) et non au dossier global.';

-- =====================================================================
-- 5. Vue v_pipeline_projects pour le 2e Kanban
-- =====================================================================
CREATE OR REPLACE VIEW public.v_pipeline_projects
WITH (security_invoker = true) AS
SELECT
  p.id,
  p.user_id,
  p.kyc_id,
  p.conseiller_id,
  p.dossier_id,
  p.type,
  p.montant,
  p.statut,
  p.pipeline_stage,
  p.pipeline_stage_updated_at,
  p.metadata,
  p.created_at,
  p.updated_at,
  -- Infos client (depuis dossier)
  d.prenom        AS client_prenom,
  d.nom           AS client_nom,
  d.email_client  AS client_email,
  d.offre_amana_cible AS client_offre,
  -- Infos produit (depuis metadata + products)
  (p.metadata->>'product_id')::uuid AS product_id,
  COALESCE(prod.nom, p.metadata->>'product_nom') AS product_nom,
  prod.gestionnaire AS product_gestionnaire,
  -- Compteurs documents liés au projet
  (SELECT count(*) FROM public.documents doc WHERE doc.project_id = p.id) AS docs_count
FROM public.projects p
LEFT JOIN public.dossiers d ON d.id = p.dossier_id
LEFT JOIN public.products prod ON prod.id = (p.metadata->>'product_id')::uuid;

COMMENT ON VIEW public.v_pipeline_projects IS
  'Vue agrégée pour le pipeline additionnel (souscriptions complémentaires). Security invoker = filtre par RLS du conseiller.';
