-- tests/cleanup-test-data.sql
-- Sprint Agents IA v20 · 30 avril 2026
--
-- Nettoie les données de test E2E créées par Playwright.
-- À lancer périodiquement (ex: cron quotidien) ou avant chaque run de tests.
--
-- Critère : email contient '@amana-test.fr' OU prénom commence par 'Test'.
-- /!\ Vérifier que cette regex ne capture aucun client réel avant d'exécuter.

begin;

-- 1. Lister ce qui sera supprimé (revue manuelle si exécuté en interactif)
\echo 'Dossiers de test à supprimer :'
select id, prenom, nom, email_client, created_at
from public.dossiers
where email_client like '%@amana-test.fr'
   or prenom like 'Test%'
order by created_at desc;

\echo ''
\echo 'Onboarding sessions de test à supprimer :'
select id, email, prenom, nom, finalized, created_at
from public.onboarding_sessions
where email like '%@amana-test.fr'
   or prenom like 'Test%'
order by created_at desc;

-- 2. Suppression cascade
-- (les dossiers ont ON DELETE CASCADE vers documents, client_facts,
-- compliance_alerts, compliance_checks, dossier_stage_history,
-- conversations, messages, etc.)

delete from public.dossiers
where email_client like '%@amana-test.fr'
   or prenom like 'Test%';

delete from public.onboarding_sessions
where email like '%@amana-test.fr'
   or prenom like 'Test%';

-- 3. Profiles client de test
delete from public.profiles
where email like '%@amana-test.fr';

\echo ''
\echo 'Cleanup terminé. Pensez à valider avec un select avant de commit.'

-- ⚠ Décommenter `commit;` après validation manuelle
-- commit;
rollback; -- safety par défaut — à passer en commit en exécution réelle
