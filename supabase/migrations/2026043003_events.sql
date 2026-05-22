-- Sprint Agents IA v13 · 30 avril 2026
-- Tables pour l'agent Mawsim (Événements & RP) :
--   events          : événements (tables rondes, stands, conférences, webinaires, salons)
--   event_actions   : checklist d'actions de prep par événement
--   event_contacts  : contacts associés (intervenants, partenaires, journalistes, prospects)
--
-- Pattern de sécurité : RLS bindées TO authenticated (jamais TO public),
-- isolation par conseiller_id (un conseiller voit uniquement ses propres événements).
-- Admins ont accès complet via is_admin().

-- =====================================================================
-- Table events
-- =====================================================================
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  conseiller_id uuid not null references public.profiles(id) on delete cascade,
  nom text not null,
  type text not null check (type in ('table_ronde', 'stand', 'conference', 'webinaire', 'salon', 'rdv_partenaire', 'autre')),
  date_debut timestamptz not null,
  date_fin timestamptz,
  lieu text,
  description text,
  statut text not null default 'prepa' check (statut in ('prepa', 'j_minus_7', 'j_minus_1', 'en_cours', 'fait', 'annule')),
  audience_cible text,
  objectifs text,
  kpi_attendu text,
  budget_estime_eur numeric(10,2),
  budget_reel_eur numeric(10,2),
  bilan_post_event text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_events_conseiller_date on public.events (conseiller_id, date_debut desc);
create index if not exists idx_events_statut on public.events (statut);

-- updated_at auto
create or replace function public.tg_events_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists trg_events_updated_at on public.events;
create trigger trg_events_updated_at
  before update on public.events
  for each row execute function public.tg_events_updated_at();

-- =====================================================================
-- Table event_actions (checklist de prep)
-- =====================================================================
create table if not exists public.event_actions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  conseiller_id uuid not null references public.profiles(id) on delete cascade,
  titre text not null,
  description text,
  due_date date,
  statut text not null default 'todo' check (statut in ('todo', 'in_progress', 'done', 'blocked')),
  categorie text not null default 'autre' check (categorie in ('logistique', 'contenu', 'contacts', 'comm_pre', 'comm_post', 'suivi', 'autre')),
  assigne_a text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  done_at timestamptz
);

create index if not exists idx_event_actions_event on public.event_actions (event_id, due_date);
create index if not exists idx_event_actions_conseiller on public.event_actions (conseiller_id);

create or replace function public.tg_event_actions_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  if new.statut = 'done' and (old.statut is null or old.statut <> 'done') then
    new.done_at := now();
  end if;
  if new.statut <> 'done' then
    new.done_at := null;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_event_actions_updated_at on public.event_actions;
create trigger trg_event_actions_updated_at
  before update on public.event_actions
  for each row execute function public.tg_event_actions_updated_at();

-- =====================================================================
-- Table event_contacts
-- =====================================================================
create table if not exists public.event_contacts (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  conseiller_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('intervenant', 'partenaire', 'journaliste', 'prospect', 'equipe', 'autre')),
  nom text not null,
  email text,
  phone text,
  organisation text,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_event_contacts_event on public.event_contacts (event_id);
create index if not exists idx_event_contacts_conseiller on public.event_contacts (conseiller_id);

-- =====================================================================
-- RLS
-- =====================================================================
alter table public.events enable row level security;
alter table public.event_actions enable row level security;
alter table public.event_contacts enable row level security;

-- events policies
drop policy if exists events_select on public.events;
create policy events_select on public.events for select to authenticated
  using (conseiller_id = auth.uid() or public.is_admin());

drop policy if exists events_insert on public.events;
create policy events_insert on public.events for insert to authenticated
  with check (conseiller_id = auth.uid());

drop policy if exists events_update on public.events;
create policy events_update on public.events for update to authenticated
  using (conseiller_id = auth.uid())
  with check (conseiller_id = auth.uid());

drop policy if exists events_delete on public.events;
create policy events_delete on public.events for delete to authenticated
  using (conseiller_id = auth.uid() or public.is_admin());

-- event_actions policies
drop policy if exists event_actions_select on public.event_actions;
create policy event_actions_select on public.event_actions for select to authenticated
  using (conseiller_id = auth.uid() or public.is_admin());

drop policy if exists event_actions_insert on public.event_actions;
create policy event_actions_insert on public.event_actions for insert to authenticated
  with check (
    conseiller_id = auth.uid()
    and exists (
      select 1 from public.events e where e.id = event_id and e.conseiller_id = auth.uid()
    )
  );

drop policy if exists event_actions_update on public.event_actions;
create policy event_actions_update on public.event_actions for update to authenticated
  using (conseiller_id = auth.uid())
  with check (conseiller_id = auth.uid());

drop policy if exists event_actions_delete on public.event_actions;
create policy event_actions_delete on public.event_actions for delete to authenticated
  using (conseiller_id = auth.uid() or public.is_admin());

-- event_contacts policies (mêmes règles)
drop policy if exists event_contacts_select on public.event_contacts;
create policy event_contacts_select on public.event_contacts for select to authenticated
  using (conseiller_id = auth.uid() or public.is_admin());

drop policy if exists event_contacts_insert on public.event_contacts;
create policy event_contacts_insert on public.event_contacts for insert to authenticated
  with check (
    conseiller_id = auth.uid()
    and exists (
      select 1 from public.events e where e.id = event_id and e.conseiller_id = auth.uid()
    )
  );

drop policy if exists event_contacts_update on public.event_contacts;
create policy event_contacts_update on public.event_contacts for update to authenticated
  using (conseiller_id = auth.uid())
  with check (conseiller_id = auth.uid());

drop policy if exists event_contacts_delete on public.event_contacts;
create policy event_contacts_delete on public.event_contacts for delete to authenticated
  using (conseiller_id = auth.uid() or public.is_admin());

comment on table public.events is
  'Événements pilotés par l''agent Mawsim : tables rondes, stands, conférences, webinaires, salons. RLS isolé par conseiller_id.';
comment on table public.event_actions is
  'Checklist d''actions de prep par événement, organisée par catégorie (logistique / contenu / contacts / comm_pre / comm_post / suivi).';
comment on table public.event_contacts is
  'Contacts associés à un événement : intervenants, partenaires, journalistes, prospects, équipe.';

-- =====================================================================
-- Seed Lyon 23 mai 2026 (événement prioritaire AMANA — tâche #3)
-- =====================================================================
-- Décommenter si vous voulez peupler automatiquement le 1er événement.
-- Le conseiller_id doit être substitué par l'UUID de Mohamed côté admin.
--
-- insert into public.events (conseiller_id, nom, type, date_debut, lieu, description,
--   statut, audience_cible, objectifs, kpi_attendu)
-- values (
--   '<UUID_MOHAMED>',
--   'Lyon 23 mai 2026 — Table ronde + stand AMANA',
--   'table_ronde',
--   '2026-05-23 09:00:00+02',
--   'Lyon (lieu à confirmer)',
--   'Première sortie publique majeure d''AMANA Patrimoine. Table ronde finance islamique + stand pour rencontres prospects.',
--   'prepa',
--   'CGP, prospects musulmans patrimoniaux, partenaires distribution',
--   'Notoriété + 5 rdv qualifiés post-événement',
--   '5+ rdv qualifiés, 50+ contacts, 3 articles presse spécialisée'
-- );
