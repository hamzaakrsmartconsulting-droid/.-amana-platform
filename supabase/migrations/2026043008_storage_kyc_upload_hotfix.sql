-- Local dev hotfix: relax KYC storage upload/read policy for authenticated users.
-- This avoids upload failures when test users and folder ownership mismatch.

DROP POLICY IF EXISTS "kyc_docs_client_upload" ON storage.objects;
DROP POLICY IF EXISTS "kyc_docs_client_read" ON storage.objects;
DROP POLICY IF EXISTS "kyc_docs_client_update" ON storage.objects;

CREATE POLICY "kyc_docs_client_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'kyc-documents'
  );

CREATE POLICY "kyc_docs_client_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'kyc-documents'
  );

CREATE POLICY "kyc_docs_client_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'kyc-documents'
  )
  WITH CHECK (
    bucket_id = 'kyc-documents'
  );
