-- Sprint Agents IA v10c · 30 avril 2026
-- Table document_inputs : stocke les données obligatoires saisies dans le
-- formulaire pré-génération de document (DER / LM / RA / Bilan / Préco / etc.).
--
-- 1 dossier × 1 type de document = 1 ligne (UPSERT).
-- Le payload `inputs` est un JSONB libre, validé côté code TypeScript par
-- les fonctions validateLmInputs / validateRaInputs (cf. generate-pdf.ts).
--
-- L'API /api/dossiers/[id]/document-inputs (GET/POST) écrit ici.
-- L'API /api/documents/generate lit ces inputs au moment du rendu PDF.

create table if not exists public.document_inputs (
  id uuid primary key default gen_random_uuid(),
  dossier_id uuid not null references public.dossiers(id) on delete cascade,
  conseiller_id uuid not null references public.profiles(id) on delete cascade,
  document_type text not null check (document_type in ('der','lm','ra','bilan','preco','succession','zakat')),
  inputs jsonb not null default '{}'::jsonb,
  -- Statut du formulaire : 'draft' tant que le conseiller n'a pas validé,
  -- 'ready' quand tous les champs requis sont remplis et qu'on peut générer.
  status text not null default 'draft' check (status in ('draft','ready')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Un seul jeu d'inputs par couple (dossier, document_type).
  -- Si le conseiller régénère, il met à jour la ligne existante.
  unique (dossier_id, document_type)
);

create index if not exists idx_document_inputs_dossier
  on public.document_inputs (dossier_id);

create index if not exists idx_document_inputs_conseiller
  on public.document_inputs (conseiller_id);

-- updated_at auto via trigger
create or replace function public.tg_document_inputs_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_document_inputs_updated_at on public.document_inputs;
create trigger trg_document_inputs_updated_at
  before update on public.document_inputs
  for each row execute function public.tg_document_inputs_updated_at();

-- =====================================================================
-- RLS : un conseiller voit/écrit uniquement ses propres dossiers ; admin total.
-- Pas de policy "TO public" : on bind explicitement TO authenticated.
-- (rappel mémoire : policies always-true sur public = escalade de privilège)
-- =====================================================================

alter table public.document_inputs enable row level security;

-- SELECT : conseiller propriétaire ou admin
drop policy if exists document_inputs_select on public.document_inputs;
create policy document_inputs_select
  on public.document_inputs
  for select
  to authenticated
  using (
    conseiller_id = auth.uid()
    or public.is_admin()
  );

-- INSERT : conseiller crée pour ses propres dossiers
drop policy if exists document_inputs_insert on public.document_inputs;
create policy document_inputs_insert
  on public.document_inputs
  for insert
  to authenticated
  with check (
    conseiller_id = auth.uid()
    and exists (
      select 1 from public.dossiers d
      where d.id = dossier_id
        and d.conseiller_id = auth.uid()
    )
  );

-- UPDATE : conseiller met à jour ses propres lignes
drop policy if exists document_inputs_update on public.document_inputs;
create policy document_inputs_update
  on public.document_inputs
  for update
  to authenticated
  using (conseiller_id = auth.uid())
  with check (conseiller_id = auth.uid());

-- DELETE : conseiller supprime ses propres lignes (RGPD)
drop policy if exists document_inputs_delete on public.document_inputs;
create policy document_inputs_delete
  on public.document_inputs
  for delete
  to authenticated
  using (
    conseiller_id = auth.uid()
    or public.is_admin()
  );

-- Service role : accès complet (déjà via bypass RLS, mais on documente)
comment on table public.document_inputs is
  'Données obligatoires saisies avant génération d''un document officiel (DER/LM/RA/...). 1 ligne par couple (dossier, document_type). Rempli via /admin/dossiers/[id]/generate-doc/[type].';
