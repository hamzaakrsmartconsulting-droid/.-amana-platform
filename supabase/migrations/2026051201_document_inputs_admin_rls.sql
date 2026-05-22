-- supabase/migrations/2026051201_document_inputs_admin_rls.sql
-- Ajoute les politiques RLS manquantes pour les admins sur document_inputs.
-- Sans ces policies, un admin qui appelle upsertDocumentInputs avec la session
-- client (non service-role) obtenait un 403 depuis la RLS INSERT/UPDATE.
-- Le DELETE et le SELECT avaient déjà un bypass admin (public.is_admin()).

-- INSERT admin
drop policy if exists document_inputs_insert_admin on public.document_inputs;
create policy document_inputs_insert_admin
  on public.document_inputs
  for insert
  to authenticated
  with check (public.is_admin());

-- UPDATE admin
drop policy if exists document_inputs_update_admin on public.document_inputs;
create policy document_inputs_update_admin
  on public.document_inputs
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
