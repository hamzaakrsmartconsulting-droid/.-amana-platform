-- Sprint Agents IA v16 · 30 avril 2026
-- Extension table documents pour signature électronique Yousign + nouvelle table
-- yousign_signatures pour tracer le cycle de vie d'une procédure de signature.

-- =====================================================================
-- 1. Étendre la table documents avec les colonnes signature
-- =====================================================================
-- Note : la colonne yousign_id existe déjà (sprint v10a), on la conserve.

alter table public.documents
  add column if not exists yousign_status text
    check (yousign_status in ('not_sent', 'pending', 'signed', 'declined', 'expired', 'cancelled')),
  add column if not exists yousign_signature_request_id text,
  add column if not exists yousign_signed_url text,
  add column if not exists yousign_sent_at timestamptz,
  add column if not exists yousign_signed_at timestamptz,
  add column if not exists yousign_signer_email text,
  add column if not exists yousign_signer_name text;

-- Mettre à jour les documents existants à 'not_sent' par défaut
update public.documents
set yousign_status = 'not_sent'
where yousign_status is null;

-- =====================================================================
-- 2. Table yousign_signatures (audit trail des événements webhook)
-- =====================================================================
create table if not exists public.yousign_signatures (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  conseiller_id uuid not null references public.profiles(id) on delete cascade,
  event_name text not null check (event_name in (
    'signature_request.activated',
    'signature_request.signed',
    'signature_request.declined',
    'signature_request.expired',
    'signature_request.cancelled',
    'signer.signed',
    'signer.declined',
    'signer.error',
    'other'
  )),
  signature_request_id text not null,
  signer_email text,
  signer_name text,
  raw_payload jsonb,
  received_at timestamptz not null default now()
);

create index if not exists idx_yousign_sig_doc on public.yousign_signatures (document_id, received_at desc);
create index if not exists idx_yousign_sig_request on public.yousign_signatures (signature_request_id);

-- =====================================================================
-- RLS
-- =====================================================================
alter table public.yousign_signatures enable row level security;

drop policy if exists yousign_sig_select on public.yousign_signatures;
create policy yousign_sig_select on public.yousign_signatures for select to authenticated
  using (conseiller_id = auth.uid() or public.is_admin());

-- INSERT : seul le service role (webhook handler) écrit ici. Pas de policy
-- INSERT TO authenticated nécessaire.

drop policy if exists yousign_sig_insert_service on public.yousign_signatures;
create policy yousign_sig_insert_service on public.yousign_signatures for insert to service_role
  with check (true);

comment on table public.yousign_signatures is
  'Audit trail des événements Yousign reçus via webhook (activated, signed, declined, etc.). Insertions uniquement par service_role depuis le webhook handler.';

comment on column public.documents.yousign_status is
  'Statut de la signature : not_sent (pas encore envoyé), pending (envoyé en attente), signed (signé), declined (refusé), expired, cancelled.';
