// lib/agents/agent-route-factory.ts — v3 avec persistence des conversations
// Sprint Agents IA v8 · 29 avril 2026
//
// Évolutions vs v2 (sprint v6) :
//   - Lit conversation_id du body (optionnel)
//   - Si absent : crée une nouvelle conversation pour ce dossier+agent
//   - Persiste le dernier message user à chaque requête
//   - Persiste le message assistant complet après streaming
//   - Renvoie conversation_id dans le header X-Conversation-Id
//   - Le client (agent-chat.tsx) stocke conversation_id en localStorage pour reprise

import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { anthropic, DEFAULT_MODEL, MAX_TOKENS } from '@/lib/anthropic'
import { loadClientFactsForPrompt } from '@/lib/agents/client-memory'
import { enrichSystemPrompt } from '@/lib/agents/save-fact-tool'
import {
  getActiveDossierIdFromCookie,
  getDossier,
} from '@/lib/dossiers/dossier-service'
import {
  createConversation,
  getConversation,
  saveMessage,
  updateConversationTitle,
  generateTitleFromMessage,
} from '@/lib/conversations/conversation-service'

type ChatRole = 'user' | 'assistant'
type ChatMessage = { role: ChatRole; content: string }

function isChatMessage(m: unknown): m is ChatMessage {
  if (!m || typeof m !== 'object') return false
  const msg = m as Record<string, unknown>
  return (
    (msg.role === 'user' || msg.role === 'assistant') &&
    typeof msg.content === 'string' &&
    msg.content.trim().length > 0
  )
}

async function checkAuth(): Promise<{ authorized: boolean; userId?: string }> {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {},
      },
    }
  )
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return { authorized: false }
  return { authorized: true, userId: user.id }
}

export type CreateAgentRouteOptions = {
  systemPrompt: string
  agentName: string
}

export function createAgentRoute(opts: CreateAgentRouteOptions) {
  const { systemPrompt: baseSystemPrompt, agentName } = opts

  return async function POST(request: NextRequest) {
    const auth = await checkAuth()
    if (!auth.authorized || !auth.userId) {
      return new Response(
        JSON.stringify({
          error: 'Authentification requise',
          message: 'Connectez-vous à votre espace AMANA pour utiliser les agents IA.',
          redirect: '/auth',
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (!anthropic) {
      return new Response('ANTHROPIC_API_KEY non configurée côté serveur', { status: 500 })
    }

    let body: { messages?: unknown; conversation_id?: string | null }
    try {
      body = await request.json()
    } catch {
      return new Response('Corps de requête JSON invalide', { status: 400 })
    }

    const messagesRaw = Array.isArray(body.messages) ? body.messages : null
    if (!messagesRaw || messagesRaw.length === 0) {
      return new Response('Le champ "messages" est requis (tableau non vide)', {
        status: 400,
      })
    }

    const messages: ChatMessage[] = []
    for (const m of messagesRaw) {
      if (!isChatMessage(m)) {
        return new Response('Format de message invalide', { status: 400 })
      }
      messages.push({ role: m.role, content: m.content })
    }

    if (messages.length > 50) {
      return new Response('Historique trop long (max 50 messages)', { status: 400 })
    }

    // Dossier actif
    const dossierId = await getActiveDossierIdFromCookie()
    let dossierName: string | undefined = undefined
    if (dossierId) {
      const dossier = await getDossier(dossierId)
      if (dossier) dossierName = `${dossier.prenom} ${dossier.nom}`
    }

    // Récupérer ou créer la conversation
    let conversationId: string | null = body.conversation_id ?? null
    let isFirstMessage = false

    if (conversationId) {
      // Vérifier que cette conversation appartient bien à ce conseiller
      const existing = await getConversation(conversationId)
      if (!existing || existing.conseiller_id !== auth.userId) {
        // Conversation invalide ou pas la nôtre → on en crée une nouvelle
        conversationId = null
      }
    }

    if (!conversationId) {
      const result = await createConversation({
        conseillerId: auth.userId,
        dossierId,
        agentName,
      })
      if (result.ok) {
        conversationId = result.conversation.id
        isFirstMessage = true
      } else {
        console.error(`[${agentName}] échec création conversation`, result.error)
        // Continue sans persistence (graceful degradation)
      }
    }

    // Persister le dernier message user (le plus récent dans le tableau)
    const lastUserMsg = messages[messages.length - 1]
    if (conversationId && lastUserMsg.role === 'user') {
      const saved = await saveMessage({
        conversationId,
        role: 'user',
        content: lastUserMsg.content,
      })
      if (!saved.ok) {
        console.error(`[${agentName}] échec persist user message`, saved.error)
      }

      // Si c'est le 1er message, set le titre auto
      if (isFirstMessage) {
        await updateConversationTitle(
          conversationId,
          generateTitleFromMessage(lastUserMsg.content)
        )
      }
    }

    // Charger les facts client pour enrichir le system prompt
    let enrichedSystemPrompt = baseSystemPrompt
    try {
      const factsBlock = await loadClientFactsForPrompt(
        auth.userId,
        dossierId,
        dossierName
      )
      enrichedSystemPrompt = enrichSystemPrompt(baseSystemPrompt, factsBlock)
    } catch (err) {
      console.error(`[${agentName}] échec chargement facts, continue sans`, err)
    }

    try {
      const stream = anthropic.messages.stream({
        model: DEFAULT_MODEL,
        max_tokens: MAX_TOKENS,
        system: enrichedSystemPrompt,
        messages,
      })

      const encoder = new TextEncoder()
      let assistantBuffer = ''
      const persistConversationId = conversationId

      const readable = new ReadableStream({
        async start(controller) {
          try {
            for await (const event of stream) {
              if (
                event.type === 'content_block_delta' &&
                event.delta.type === 'text_delta'
              ) {
                assistantBuffer += event.delta.text
                controller.enqueue(encoder.encode(event.delta.text))
              }
            }
            controller.close()

            // Persister le message assistant après streaming complet
            if (persistConversationId && assistantBuffer.trim()) {
              const saved = await saveMessage({
                conversationId: persistConversationId,
                role: 'assistant',
                content: assistantBuffer,
                metadata: { agent_name: agentName, model: DEFAULT_MODEL },
              })
              if (!saved.ok) {
                console.error(`[${agentName}] échec persist assistant message`, saved.error)
              }
            }
          } catch (err) {
            console.error(`[${agentName}] erreur streaming`, err)
            controller.error(err)
          }
        },
      })

      return new Response(readable, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          'X-Accel-Buffering': 'no',
          'X-Conversation-Id': conversationId ?? '',
        },
      })
    } catch (err) {
      console.error(`[${agentName}] erreur Anthropic`, err)
      const message = err instanceof Error ? err.message : 'Erreur inconnue côté Anthropic'
      return new Response(`Erreur Anthropic : ${message}`, { status: 500 })
    }
  }
}
