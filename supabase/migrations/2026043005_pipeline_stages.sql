-- Sprint Agents IA v19 · 30 avril 2026
-- Pipeline visuel admin + traçabilité des transitions d'étape par dossier.
--
-- Approche :
--   - Ajout d'une colonne `pipeline_stage` à `dossiers` (sub-statut précis,
--     orthogonal au statut existant prospect|actif|archive)
--   - Nouvelle table `dossier_stage_history` qui trace chaque transition
--     avec l'agent ou la personne qui l'a déclenchée et le contexte
--
-- Les transitions sont déclenchées par les hooks d'automatisation côté code
-- (lib/workflow/auto-trigger.ts).

-- =====================================================================
-- 1. Extension de la table dossiers
-- =====================================================================
alter table public.dossiers
  add column if not exists pipeline_stage text
    check (pipeline_stage in (
      'nouveau',         -- juste créé
      'criblage',        -- criblage Raqîb en cours
      'kyc_attente',     -- criblage OK, attente upload pièces
      'kyc_complet',     -- KYC validé
      'der_envoye',      -- DER en attente signature Yousign
      'der_signe',       -- DER signé
      'lm_envoyee',      -- LM en attente signature
      'lm_signee',       -- LM signée
      'bilan_genere',    -- Bilan + RA + Préco générés
      'souscription',    -- en cours souscription assureur
      'actif',           -- client actif (1ère souscription faite)
      'suivi',           -- suivi régulier
      'bloque',          -- bloqué (alerte critique en cours)
      'archive'          -- clôturé
    )),
  add column if not exists pipeline_stage_updated_at timestamptz default now();

-- Backfill : mettre les dossiers existants à un stage cohérent
update public.dossiers
set pipeline_stage = case
  when statut = 'archive' then 'archive'
  when statut = 'actif' then 'actif'
  else 'nouveau'
end
where pipeline_stage is null;

-- Index pour le kanban
create index if not exists idx_dossiers_pipeline_stage
  on public.dossiers (conseiller_id, pipeline_stage, updated_at desc);

-- =====================================================================
-- 2. Table dossier_stage_history
-- =====================================================================
create table if not exists public.dossier_stage_history (
  id uuid primary key default gen_random_uuid(),
  dossier_id uuid not null references public.dossiers(id) on delete cascade,
  conseiller_id uuid not null references public.profiles(id) on delete cascade,
  from_stage text,
  to_stage text not null,
  triggered_by text not null check (triggered_by in (
    'manual',          -- Mohamed manuellement
    'agent_sajl',
    'agent_raqib',
    'agent_mawsim',
    'agent_jamaa',
    'webhook_yousign',
    'background_job',
    'funnel_onboarding',
    'autre'
  )),
  trigger_context jsonb,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_stage_history_dossier
  on public.dossier_stage_history (dossier_id, created_at desc);

-- =====================================================================
-- 3. RLS
-- =====================================================================
alter table public.dossier_stage_history enable row level security;

drop policy if exists stage_history_select on public.dossier_stage_history;
create policy stage_history_select on public.dossier_stage_history for select to authenticated
  using (conseiller_id = auth.uid() or public.is_admin());

drop policy if exists stage_history_insert on public.dossier_stage_history;
create policy stage_history_insert on public.dossier_stage_history for insert to authenticated
  with check (conseiller_id = auth.uid());

-- service_role pour les hooks background
drop policy if exists stage_history_insert_service on public.dossier_stage_history;
create policy stage_history_insert_service on public.dossier_stage_history for insert to service_role
  with check (true);

-- =====================================================================
-- 4. Vue v_pipeline_dossiers : agrégation pour le kanban admin
-- =====================================================================
create or replace view public.v_pipeline_dossiers
with (security_invoker = true) as
select
  d.id,
  d.conseiller_id,
  d.prenom,
  d.nom,
  d.email_client,
  d.telephone,
  d.statut,
  d.offre_amana_cible,
  d.pipeline_stage,
  d.pipeline_stage_updated_at,
  d.created_at,
  d.updated_at,
  -- compte des docs déjà générés
  (select count(*) from public.documents doc where doc.dossier_id = d.id) as docs_count,
  -- compte des criblages récents
  (select count(*) from public.compliance_checks c
   where c.dossier_id = d.id
     and c.checked_at > now() - interval '12 months') as compliance_checks_recent,
  -- alertes critical ouvertes
  (select count(*) from public.compliance_alerts a
   where a.dossier_id = d.id
     and a.statut in ('open', 'in_progress')
     and a.severity = 'critical') as critical_alerts_open
from public.dossiers d
where d.archived_at is null;

comment on view public.v_pipeline_dossiers is
  'Vue agrégée pour le kanban /admin/pipeline. Inclut docs_count, compliance_checks_recent, critical_alerts_open. Security invoker = filtre par RLS du conseiller.';

comment on column public.dossiers.pipeline_stage is
  'Étape précise dans le pipeline AMANA (orthogonal à statut). Transitions tracées dans dossier_stage_history.';
