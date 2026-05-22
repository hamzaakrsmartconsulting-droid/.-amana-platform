-- supabase/migrations/20260429_documents.sql
-- Sprint Agents IA v10a · 29 avril 2026
-- Table documents : tracking des documents générés (DER, LM, RA, etc.)
-- Plus politiques RLS sur le bucket amana-documents.

-- ====================================================================
-- 1. Table documents
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conseiller_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dossier_id      UUID REFERENCES public.dossiers(id) ON DELETE CASCADE,
  type            TEXT NOT NULL CHECK (type IN ('der', 'lm', 'ra', 'bilan', 'preco', 'succession', 'zakat')),
  filename        TEXT NOT NULL,
  storage_path    TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'signed', 'archived')),
  yousign_id      TEXT,
  metadata        JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  signed_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS documents_conseiller_id_idx ON public.documents(conseiller_id);
CREATE INDEX IF NOT EXISTS documents_dossier_id_idx    ON public.documents(dossier_id);
CREATE INDEX IF NOT EXISTS documents_type_idx          ON public.documents(type);
CREATE INDEX IF NOT EXISTS documents_status_idx        ON public.documents(status);
CREATE INDEX IF NOT EXISTS documents_created_at_idx    ON public.documents(created_at DESC);

DROP TRIGGER IF EXISTS documents_updated_at ON public.documents;
CREATE TRIGGER documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Conseiller manages own documents"
  ON public.documents FOR ALL TO authenticated
  USING (auth.uid() = conseiller_id)
  WITH CHECK (auth.uid() = conseiller_id);

CREATE POLICY "Admins manage all documents"
  ON public.documents FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ====================================================================
-- 2. Storage policies sur amana-documents (bucket privé déjà créé via UI)
-- ====================================================================
-- Le bucket doit avoir été créé manuellement via Supabase Dashboard → Storage
-- avec public=false, avant d'exécuter cette migration.

-- Politique : conseiller manipule ses propres documents
CREATE POLICY amana_docs_conseiller_all ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'amana-documents'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  )
  WITH CHECK (
    bucket_id = 'amana-documents'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

-- Politique : admin tout faire
CREATE POLICY amana_docs_admin_all ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'amana-documents'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    bucket_id = 'amana-documents'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Fin migration v10a
