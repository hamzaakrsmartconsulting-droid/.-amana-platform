-- Sprint Agents IA v14 · 30 avril 2026
-- Tables pour l'agent Raqîb (Conformité) :
--   compliance_alerts    : alertes de non-conformité (documentaire, LCB-FT, criblage, échéance)
--   compliance_checks    : résultats de criblages PEP / sanctions / source des fonds par dossier
--
-- Pattern de sécurité : RLS bindées TO authenticated (jamais TO public),
-- isolation par conseiller_id. Admins accès complet via is_admin().

-- =====================================================================
-- Table compliance_alerts
-- =====================================================================
create table if not exists public.compliance_alerts (
  id uuid primary key default gen_random_uuid(),
  conseiller_id uuid not null references public.profiles(id) on delete cascade,
  dossier_id uuid references public.dossiers(id) on delete cascade,
  severity text not null check (severity in ('info', 'warning', 'critical')),
  category text not null check (category in ('lcb_ft', 'criblage', 'documentaire', 'echeance', 'autre')),
  titre text not null,
  description text,
  due_date date,
  statut text not null default 'open' check (statut in ('open', 'in_progress', 'resolved', 'ignored')),
  resolution_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists idx_compliance_alerts_conseiller on public.compliance_alerts (conseiller_id, statut, severity);
create index if not exists idx_compliance_alerts_dossier on public.compliance_alerts (dossier_id);
create index if not exists idx_compliance_alerts_due on public.compliance_alerts (due_date) where statut = 'open';

create or replace function public.tg_compliance_alerts_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  if new.statut = 'resolved' and (old.statut is null or old.statut <> 'resolved') then
    new.resolved_at := now();
  end if;
  return new;
end;
$$;
drop trigger if exists trg_compliance_alerts_updated_at on public.compliance_alerts;
create trigger trg_compliance_alerts_updated_at
  before update on public.compliance_alerts
  for each row execute function public.tg_compliance_alerts_updated_at();

-- =====================================================================
-- Table compliance_checks (criblages KYC / LCB-FT)
-- =====================================================================
create table if not exists public.compliance_checks (
  id uuid primary key default gen_random_uuid(),
  dossier_id uuid not null references public.dossiers(id) on delete cascade,
  conseiller_id uuid not null references public.profiles(id) on delete cascade,
  check_type text not null check (check_type in ('pep', 'sanctions', 'embargos', 'source_funds', 'beneficial_owner', 'autre')),
  result text not null check (result in ('clean', 'flagged', 'manual_review', 'pending')),
  evidence text,
  source text,
  checked_at timestamptz not null default now(),
  expires_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_compliance_checks_dossier on public.compliance_checks (dossier_id, check_type, checked_at desc);
create index if not exists idx_compliance_checks_conseiller on public.compliance_checks (conseiller_id);
create index if not exists idx_compliance_checks_expires on public.compliance_checks (expires_at) where result = 'clean';

-- =====================================================================
-- RLS
-- =====================================================================
alter table public.compliance_alerts enable row level security;
alter table public.compliance_checks enable row level security;

-- compliance_alerts policies
drop policy if exists compliance_alerts_select on public.compliance_alerts;
create policy compliance_alerts_select on public.compliance_alerts for select to authenticated
  using (conseiller_id = auth.uid() or public.is_admin());

drop policy if exists compliance_alerts_insert on public.compliance_alerts;
create policy compliance_alerts_insert on public.compliance_alerts for insert to authenticated
  with check (conseiller_id = auth.uid());

drop policy if exists compliance_alerts_update on public.compliance_alerts;
create policy compliance_alerts_update on public.compliance_alerts for update to authenticated
  using (conseiller_id = auth.uid())
  with check (conseiller_id = auth.uid());

drop policy if exists compliance_alerts_delete on public.compliance_alerts;
create policy compliance_alerts_delete on public.compliance_alerts for delete to authenticated
  using (conseiller_id = auth.uid() or public.is_admin());

-- compliance_checks policies
drop policy if exists compliance_checks_select on public.compliance_checks;
create policy compliance_checks_select on public.compliance_checks for select to authenticated
  using (conseiller_id = auth.uid() or public.is_admin());

drop policy if exists compliance_checks_insert on public.compliance_checks;
create policy compliance_checks_insert on public.compliance_checks for insert to authenticated
  with check (
    conseiller_id = auth.uid()
    and exists (select 1 from public.dossiers d where d.id = dossier_id and d.conseiller_id = auth.uid())
  );

drop policy if exists compliance_checks_update on public.compliance_checks;
create policy compliance_checks_update on public.compliance_checks for update to authenticated
  using (conseiller_id = auth.uid())
  with check (conseiller_id = auth.uid());

drop policy if exists compliance_checks_delete on public.compliance_checks;
create policy compliance_checks_delete on public.compliance_checks for delete to authenticated
  using (conseiller_id = auth.uid() or public.is_admin());

comment on table public.compliance_alerts is
  'Alertes de non-conformité gérées par Raqîb. Catégories : lcb_ft, criblage, documentaire, échéance, autre.';
comment on table public.compliance_checks is
  'Résultats des criblages PEP / sanctions / source des fonds / bénéficiaires effectifs par dossier client.';
