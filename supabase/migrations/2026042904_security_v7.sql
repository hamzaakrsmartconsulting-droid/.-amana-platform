-- supabase/migrations/20260429_security_v7.sql
-- Sprint Agents IA v7 · 29 avril 2026
-- Sécurité KYC + RGPD : admin storage policy + cleanup doublons + audit log étendu

-- ====================================================================
-- 1. Storage : policy admin sur kyc-documents
-- ====================================================================
-- Avant : seul le conseiller pouvait lire tous les docs (kyc_docs_conseiller_read).
-- Manque : l'admin ne pouvait pas lire les docs des clients en back-office.
-- Fix : nouvelle policy ALL pour les admins.

CREATE POLICY kyc_docs_admin_all ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'kyc-documents'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    bucket_id = 'kyc-documents'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- ====================================================================
-- 2. Storage : suppression des doublons de policies
-- ====================================================================
-- "users read own docs" duplique "kyc_docs_client_read"
-- "users upload own docs" duplique "kyc_docs_client_upload"

DROP POLICY IF EXISTS "users read own docs" ON storage.objects;
DROP POLICY IF EXISTS "users upload own docs" ON storage.objects;

-- ====================================================================
-- 3. Audit logs : actions étendues
-- ====================================================================
-- La table audit_logs existe déjà (utilisée par /api/kyc/valider).
-- On s'assure qu'elle a les colonnes nécessaires pour le sprint v7.
-- Si la table n'existe pas, on la crée.

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID,
  user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action        TEXT NOT NULL,
  entity_type   TEXT,
  entity_id     TEXT,
  metadata      JSONB,
  ip_address    TEXT,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index pour requêtes
CREATE INDEX IF NOT EXISTS audit_logs_user_id_idx     ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS audit_logs_action_idx      ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS audit_logs_entity_idx      ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx  ON public.audit_logs(created_at DESC);

-- RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Politique : admin peut tout lire (pour back-office)
DROP POLICY IF EXISTS "Admins read audit_logs" ON public.audit_logs;
CREATE POLICY "Admins read audit_logs" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (is_admin());

-- Politique : conseiller peut tout lire (transparence interne)
DROP POLICY IF EXISTS "Conseiller read audit_logs" ON public.audit_logs;
CREATE POLICY "Conseiller read audit_logs" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (is_conseiller());

-- Politique : un user peut lire les logs sur son propre compte (transparence RGPD)
DROP POLICY IF EXISTS "Users read own audit_logs" ON public.audit_logs;
CREATE POLICY "Users read own audit_logs" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Pas de policy INSERT/UPDATE/DELETE pour les users : seul le service_role insère
-- (les routes API server-side utilisent service_role en interne).

-- ====================================================================
-- 4. Vérification post-migration
-- ====================================================================
-- Après application, exécuter :
-- SELECT policyname, cmd, roles FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' ORDER BY policyname;
-- Doit afficher 6 policies (sans les 2 doublons supprimés) + kyc_docs_admin_all.
--
-- SELECT count(*) FROM audit_logs;
-- Doit retourner un nombre (>= 0).
