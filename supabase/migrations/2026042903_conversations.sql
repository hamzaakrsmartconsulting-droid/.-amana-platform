-- supabase/migrations/20260429_conversations.sql
-- Sprint Agents IA v8 · 29 avril 2026
-- Persistence des conversations agents AMANA :
--   - 1 conversation = 1 conseiller × 1 dossier × 1 agent
--   - dossier_id NULL = bac à sable
--   - Reprise automatique du fil au refresh

-- ====================================================================
-- 1. Table conversations
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.conversations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conseiller_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dossier_id      UUID REFERENCES public.dossiers(id) ON DELETE CASCADE,
  agent_name      TEXT NOT NULL,
  title           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS conversations_conseiller_id_idx ON public.conversations(conseiller_id);
CREATE INDEX IF NOT EXISTS conversations_dossier_id_idx    ON public.conversations(dossier_id);
CREATE INDEX IF NOT EXISTS conversations_agent_name_idx    ON public.conversations(agent_name);
CREATE INDEX IF NOT EXISTS conversations_updated_at_idx    ON public.conversations(updated_at DESC);

DROP TRIGGER IF EXISTS conversations_updated_at ON public.conversations;
CREATE TRIGGER conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Conseiller manages own conversations"
  ON public.conversations FOR ALL TO authenticated
  USING (auth.uid() = conseiller_id)
  WITH CHECK (auth.uid() = conseiller_id);

CREATE POLICY "Admins manage all conversations"
  ON public.conversations FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ====================================================================
-- 2. Table messages
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content         TEXT NOT NULL,
  metadata        JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS messages_conversation_id_idx ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS messages_created_at_idx      ON public.messages(created_at);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Politiques messages : un user peut lire/écrire les messages de ses propres conversations
CREATE POLICY "Conseiller reads own messages"
  ON public.messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = messages.conversation_id
        AND conversations.conseiller_id = auth.uid()
    )
  );

CREATE POLICY "Conseiller writes own messages"
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = messages.conversation_id
        AND conversations.conseiller_id = auth.uid()
    )
  );

CREATE POLICY "Admins manage all messages"
  ON public.messages FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ====================================================================
-- 3. Vue pratique : conversations avec compteur de messages et dernier message
-- ====================================================================

DROP VIEW IF EXISTS public.conversations_with_stats;
CREATE VIEW public.conversations_with_stats
WITH (security_invoker = true) AS
SELECT
  c.*,
  COALESCE((
    SELECT count(*)::int
    FROM public.messages m
    WHERE m.conversation_id = c.id
  ), 0) AS messages_count,
  (
    SELECT m.content
    FROM public.messages m
    WHERE m.conversation_id = c.id AND m.role = 'user'
    ORDER BY m.created_at DESC
    LIMIT 1
  ) AS last_user_message
FROM public.conversations c
WHERE c.archived_at IS NULL;

-- Fin migration v8
