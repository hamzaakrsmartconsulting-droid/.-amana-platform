-- Migration : table validation_gates pour les verrous Mohamed
-- Spec « Parcours Réglementaire AMANA » V2 (envoi LM signature) et V3 (envoi RA + bulletins)
-- Date : 2026-05-05

CREATE TABLE IF NOT EXISTS public.validation_gates (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  dossier_id    uuid NOT NULL REFERENCES public.dossiers(id) ON DELETE CASCADE,
  gate_type     text NOT NULL,
  -- 'lm_send'              : avant envoi Lettre de Mission en signature
  -- 'ra_bulletin_send'     : avant envoi Rapport d'Adéquation + bulletins
  decision      text NOT NULL DEFAULT 'pending',
  -- 'pending' | 'approved' | 'rejected'
  decided_by    uuid REFERENCES auth.users(id),
  decided_at    timestamptz,
  comment       text,
  metadata      jsonb DEFAULT '{}'::jsonb,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_validation_gates_dossier
  ON public.validation_gates(dossier_id);
CREATE INDEX IF NOT EXISTS idx_validation_gates_type_dossier
  ON public.validation_gates(gate_type, dossier_id);

-- Une seule décision active par (dossier, gate_type, decision != rejected)
-- pour éviter les doubles approvals
CREATE UNIQUE INDEX IF NOT EXISTS uniq_validation_gates_active
  ON public.validation_gates(dossier_id, gate_type)
  WHERE decision IN ('pending', 'approved');

CREATE TRIGGER trg_validation_gates_updated_at
  BEFORE UPDATE ON public.validation_gates
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

ALTER TABLE public.validation_gates ENABLE ROW LEVEL SECURITY;

-- Lecture : conseiller / admin / manager
CREATE POLICY validation_gates_read ON public.validation_gates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'manager', 'conseiller')
    )
  );

-- Écriture : admin/manager uniquement (Mohamed est admin)
CREATE POLICY validation_gates_write_admin ON public.validation_gates
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'manager')
    )
  );

CREATE POLICY validation_gates_update_admin ON public.validation_gates
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'manager')
    )
  );

COMMENT ON TABLE public.validation_gates IS
  'Verrous de validation manuelle (rôle admin Mohamed) avant actions critiques du parcours client';
COMMENT ON COLUMN public.validation_gates.gate_type IS
  'Type de verrou : lm_send (avant LM signature) | ra_bulletin_send (avant RA+bulletins)';
COMMENT ON COLUMN public.validation_gates.decision IS
  'pending | approved | rejected';
