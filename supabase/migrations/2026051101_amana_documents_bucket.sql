-- Migration : création du bucket Storage amana-documents
-- Ce bucket était documenté comme "créé via UI" dans 2026042902_documents.sql
-- mais doit exister en migration pour les envs locaux (db reset / CI).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'amana-documents',
  'amana-documents',
  FALSE,
  52428800,   -- 50 Mo max par fichier
  ARRAY['application/pdf', 'application/octet-stream']
)
ON CONFLICT (id) DO NOTHING;

-- Service role peut lire/écrire (background jobs, auto-trigger)
DROP POLICY IF EXISTS amana_docs_service_role ON storage.objects;

-- Les policies sur amana-documents pour conseiller + admin
-- sont déjà définies dans 2026042902_documents.sql.
-- On s'assure juste qu'elles ne cassent pas en cas de re-run.
DROP POLICY IF EXISTS amana_docs_conseiller_all ON storage.objects;
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

DROP POLICY IF EXISTS amana_docs_admin_all ON storage.objects;
CREATE POLICY amana_docs_admin_all ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'amana-documents'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    bucket_id = 'amana-documents'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'manager')
    )
  );
