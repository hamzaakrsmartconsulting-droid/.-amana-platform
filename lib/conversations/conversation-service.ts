// lib/conversations/conversation-service.ts
// Sprint Agents IA v8 · 29 avril 2026
// Helper serveur pour la persistence des conversations.

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export type ConversationMessage = {
  id: string
  conversation_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  metadata: Record<string, unknown> | null
  created_at: string
}

export type Conversation = {
  id: string
  conseiller_id: string
  dossier_id: string | null
  agent_name: string
  title: string | null
  created_at: string
  updated_at: string
  archived_at: string | null
}

export type ConversationWithStats = Conversation & {
  messages_count: number
  last_user_message: string | null
}

async function getSupabaseServer() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {},
      },
    }
  )
}

/**
 * Crée une nouvelle conversation pour un conseiller, sur un dossier (ou bac à sable),
 * avec un agent donné.
 */
export async function createConversation(params: {
  conseillerId: string
  dossierId: string | null
  agentName: string
  title?: string
}): Promise<{ ok: true; conversation: Conversation } | { ok: false; error: string }> {
  const supabase = await getSupabaseServer()
  const { data, error } = await supabase
    .from('conversations')
    .insert({
      conseiller_id: params.conseillerId,
      dossier_id: params.dossierId,
      agent_name: params.agentName,
      title: params.title ?? null,
    })
    .select('*')
    .single()

  if (error || !data) {
    console.error('[conversation-service] erreur création', error)
    return { ok: false, error: error?.message ?? 'Erreur création' }
  }
  return { ok: true, conversation: data as Conversation }
}

/**
 * Récupère une conversation par son id.
 */
export async function getConversation(conversationId: string): Promise<Conversation | null> {
  const supabase = await getSupabaseServer()
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', conversationId)
    .maybeSingle()
  if (error || !data) return null
  return data as Conversation
}

/**
 * Liste les conversations d'un conseiller, filtrées éventuellement par dossier+agent.
 * Retourne les stats (nb de messages, dernier message user).
 */
export async function listConversations(params: {
  conseillerId: string
  dossierId?: string | null
  agentName?: string
  limit?: number
}): Promise<ConversationWithStats[]> {
  const supabase = await getSupabaseServer()
  let query = supabase
    .from('conversations_with_stats')
    .select('*')
    .eq('conseiller_id', params.conseillerId)
    .order('updated_at', { ascending: false })
    .limit(params.limit ?? 50)

  if (params.dossierId === null) {
    query = query.is('dossier_id', null)
  } else if (params.dossierId !== undefined) {
    query = query.eq('dossier_id', params.dossierId)
  }

  if (params.agentName) {
    query = query.eq('agent_name', params.agentName)
  }

  const { data, error } = await query
  if (error) {
    console.error('[conversation-service] erreur listing', error)
    return []
  }
  return (data ?? []) as ConversationWithStats[]
}

/**
 * Liste les messages d'une conversation, ordre chronologique.
 */
export async function listMessages(conversationId: string): Promise<ConversationMessage[]> {
  const supabase = await getSupabaseServer()
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[conversation-service] erreur listing messages', error)
    return []
  }
  return (data ?? []) as ConversationMessage[]
}

/**
 * Persiste un message dans une conversation. Met à jour le updated_at de la conversation.
 */
export async function saveMessage(params: {
  conversationId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  metadata?: Record<string, unknown>
}): Promise<{ ok: true; message: ConversationMessage } | { ok: false; error: string }> {
  const supabase = await getSupabaseServer()
  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: params.conversationId,
      role: params.role,
      content: params.content,
      metadata: params.metadata ?? null,
    })
    .select('*')
    .single()

  if (error || !data) {
    console.error('[conversation-service] erreur save message', error)
    return { ok: false, error: error?.message ?? 'Erreur save message' }
  }

  // Bump le updated_at de la conversation
  await supabase
    .from('conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', params.conversationId)

  return { ok: true, message: data as ConversationMessage }
}

/**
 * Met à jour le titre d'une conversation (généralement auto à partir du 1er message user).
 */
export async function updateConversationTitle(
  conversationId: string,
  title: string
): Promise<void> {
  const supabase = await getSupabaseServer()
  await supabase
    .from('conversations')
    .update({ title: title.slice(0, 200) })
    .eq('id', conversationId)
}

/**
 * Archive une conversation (soft delete).
 */
export async function archiveConversation(
  conversationId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await getSupabaseServer()
  const { error } = await supabase
    .from('conversations')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', conversationId)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

/**
 * Génère un titre court à partir du premier message user.
 * Utilisé pour identifier la conversation dans la sidebar.
 */
export function generateTitleFromMessage(content: string): string {
  const trimmed = content.trim().replace(/\s+/g, ' ')
  if (trimmed.length <= 60) return trimmed
  return trimmed.slice(0, 57) + '…'
}
