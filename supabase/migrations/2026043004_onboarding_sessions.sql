-- Sprint Agents IA v18 · 30 avril 2026
-- Table onboarding_sessions : stocke l'avancement du funnel public AVANT
-- création du compte client. Permet à un prospect de revenir compléter sa
-- démarche sans tout reprendre.
--
-- Sécurité : aucune RLS conseiller (le prospect n'est pas authentifié).
-- L'identification se fait par session_token (uuid v4 généré côté client,
-- conservé en cookie httpOnly côté serveur).

create table if not exists public.onboarding_sessions (
  id uuid primary key default gen_random_uuid(),
  session_token text not null unique,

  -- Étape 1 : objectifs
  objectif_principal text check (objectif_principal in (
    'preparer_retraite',
    'transmettre_patrimoine',
    'optimiser_fiscalite',
    'epargner_projet',
    'investir_immo',
    'gerer_heritage',
    'autre'
  )),
  horizon_annees integer check (horizon_annees > 0 and horizon_annees <= 60),
  capacite_pertes text check (capacite_pertes in ('faible', 'moyenne', 'elevee')),

  -- Étape 2 : situation patrimoniale
  patrimoine_net_eur numeric(14, 2),
  revenus_annuels_eur numeric(12, 2),
  charges_annuelles_eur numeric(12, 2),
  capacite_epargne_mensuelle_eur numeric(10, 2),
  situation_familiale text check (situation_familiale in (
    'celibataire',
    'pacs',
    'marie_communaute_reduite',
    'marie_separation_biens',
    'marie_communaute_universelle',
    'divorce',
    'veuf'
  )),
  nb_enfants integer check (nb_enfants >= 0 and nb_enfants <= 20),

  -- Étape 2 bis : indicateurs de complexité (pour aiguillage Premium)
  detient_parts_societe boolean default false,
  detient_sci boolean default false,
  expatrie_ou_non_resident boolean default false,
  succession_active boolean default false,
  plus_de_deux_immeubles boolean default false,
  entrepreneur_ou_liberal boolean default false,

  -- Étape 3 : sensibilité Sharia
  sensibilite_sharia text check (sensibilite_sharia in ('elevee', 'moyenne', 'principielle')),
  patrimoine_haram_a_purifier boolean default false,
  pratique_zakat boolean default false,

  -- Étape 4 : identité (pour création de compte)
  prenom text,
  nom text,
  email text,
  telephone text,

  -- Aiguillage calculé
  offre_aiguillee text check (offre_aiguillee in ('mass', 'patrimoniale', 'premium')),
  offre_score jsonb,

  -- Statut session
  current_step integer not null default 1 check (current_step between 1 and 5),
  finalized boolean not null default false,
  finalized_dossier_id uuid references public.dossiers(id) on delete set null,
  finalized_user_id uuid references public.profiles(id) on delete set null,

  -- Métadonnées
  user_agent text,
  ip_address inet,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  finalized_at timestamptz,
  expires_at timestamptz not null default (now() + interval '30 days')
);

create index if not exists idx_onboarding_session_token on public.onboarding_sessions (session_token);
create index if not exists idx_onboarding_email on public.onboarding_sessions (email) where email is not null;
create index if not exists idx_onboarding_finalized on public.onboarding_sessions (finalized, expires_at);

-- updated_at auto
create or replace function public.tg_onboarding_sessions_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  if new.finalized = true and (old.finalized is null or old.finalized = false) then
    new.finalized_at := now();
  end if;
  return new;
end;
$$;
drop trigger if exists trg_onboarding_sessions_updated_at on public.onboarding_sessions;
create trigger trg_onboarding_sessions_updated_at
  before update on public.onboarding_sessions
  for each row execute function public.tg_onboarding_sessions_updated_at();

-- =====================================================================
-- RLS : sessions accessibles uniquement par session_token (vérifié côté API),
-- jamais directement par les anonymes. Les admins peuvent tout voir pour
-- analyser le funnel.
-- =====================================================================
alter table public.onboarding_sessions enable row level security;

-- Aucune lecture / écriture directe par anon. Tout passe par les API server
-- qui valident le session_token côté serveur.
drop policy if exists onboarding_sessions_admin_select on public.onboarding_sessions;
create policy onboarding_sessions_admin_select on public.onboarding_sessions for select to authenticated
  using (public.is_admin());

drop policy if exists onboarding_sessions_admin_delete on public.onboarding_sessions;
create policy onboarding_sessions_admin_delete on public.onboarding_sessions for delete to authenticated
  using (public.is_admin());

-- Les API server-side écrivent via service_role (bypass RLS).
-- Pas de policy INSERT/UPDATE pour authenticated.

-- =====================================================================
-- Cleanup : purge des sessions expirées non finalisées
-- =====================================================================
-- À appeler périodiquement via cron (Supabase Edge Function ou GitHub Action) :
--   delete from onboarding_sessions where expires_at < now() and finalized = false;

comment on table public.onboarding_sessions is
  'Sessions du funnel public /onboard. Identifié par session_token (cookie httpOnly). Aiguille vers Mass/Patrimoniale/Premium selon patrimoine + complexité. Expire après 30 jours non finalisés.';
