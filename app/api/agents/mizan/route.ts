// app/api/agents/mizan/route.ts — Mizan v5 (avec persistence conversations)
// Sprint Agents IA v8 · 29 avril 2026
//
// Évolution vs v4 (sprint v6) :
//   - Persiste user et assistant messages dans table messages
//   - Renvoie X-Conversation-Id en header pour reprise du fil

import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type Anthropic from '@anthropic-ai/sdk'
import { anthropic, DEFAULT_MODEL } from '@/lib/anthropic'
import { MIZAN_SYSTEM_PROMPT } from '@/lib/agents/mizan-system-prompt'
import { loadClientFactsForPrompt } from '@/lib/agents/client-memory'
import { SAVE_FACT_TOOL, enrichSystemPrompt } from '@/lib/agents/save-fact-tool'
import { DOSSIER_TOOLS } from '@/lib/agents/dossier-tools'
import {
  execCreateDossier,
  execSwitchDossier,
  execSwitchToSandbox,
  execListDossiers,
  execSaveClientFact,
  type ToolExecutionState,
} from '@/lib/agents/dossier-tool-handlers'
import {
  getActiveDossierIdFromCookie,
  getDossier,
  buildActiveDossierCookie,
} from '@/lib/dossiers/dossier-service'
import {
  createConversation,
  getConversation,
  saveMessage,
  updateConversationTitle,
  generateTitleFromMessage,
} from '@/lib/conversations/conversation-service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_ITERATIONS = 10
const MAX_TOKENS = 2000
const STREAM_CHUNK_SIZE = 30
const AGENT_NAME = 'mizan'

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

async function executeToolUse(
  tu: Anthropic.ToolUseBlock,
  state: ToolExecutionState,
  agentName: string
): Promise<string> {
  const input = (tu.input as Record<string, unknown>) ?? {}
  switch (tu.name) {
    case 'create_dossier':     return execCreateDossier(state, input)
    case 'switch_dossier':     return execSwitchDossier(state, input)
    case 'switch_to_sandbox':  return execSwitchToSandbox(state)
    case 'list_dossiers':      return execListDossiers(state, input)
    case 'save_client_fact':   return execSaveClientFact(state, input, agentName)
    default:                   return `Tool inconnu : ${tu.name}`
  }
}

export async function POST(request: NextRequest) {
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
  try { body = await request.json() } catch {
    return new Response('Corps de requête JSON invalide', { status: 400 })
  }

  const messagesRaw = Array.isArray(body.messages) ? body.messages : null
  if (!messagesRaw || messagesRaw.length === 0) {
    return new Response('Le champ "messages" est requis', { status: 400 })
  }

  const userMessages: ChatMessage[] = []
  for (const m of messagesRaw) {
    if (!isChatMessage(m)) {
      return new Response('Format de message invalide', { status: 400 })
    }
    userMessages.push({ role: m.role, content: m.content })
  }

  // === Phase 0 : préparation
  const state: ToolExecutionState = {
    conseillerId: auth.userId,
    activeDossierId: await getActiveDossierIdFromCookie(),
    pendingCookieUpdate: null,
  }

  let dossierName: string | undefined = undefined
  if (state.activeDossierId) {
    const d = await getDossier(state.activeDossierId)
    if (d) dossierName = `${d.prenom} ${d.nom}`
    else state.activeDossierId = null
  }

  // === Persistence — récupérer ou créer la conversation
  let conversationId: string | null = body.conversation_id ?? null
  let isFirstMessage = false
  if (conversationId) {
    const existing = await getConversation(conversationId)
    if (!existing || existing.conseiller_id !== auth.userId) {
      conversationId = null
    }
  }
  if (!conversationId) {
    const result = await createConversation({
      conseillerId: auth.userId,
      dossierId: state.activeDossierId,
      agentName: AGENT_NAME,
    })
    if (result.ok) {
      conversationId = result.conversation.id
      isFirstMessage = true
    }
  }

  // Persister le dernier message user
  const lastUserMsg = userMessages[userMessages.length - 1]
  if (conversationId && lastUserMsg.role === 'user') {
    await saveMessage({
      conversationId,
      role: 'user',
      content: lastUserMsg.content,
    })
    if (isFirstMessage) {
      await updateConversationTitle(
        conversationId,
        generateTitleFromMessage(lastUserMsg.content)
      )
    }
  }

  const factsBlock = await loadClientFactsForPrompt(
    state.conseillerId,
    state.activeDossierId,
    dossierName
  )
  const enrichedSystemPrompt = enrichSystemPrompt(MIZAN_SYSTEM_PROMPT, factsBlock)
  const tools: Anthropic.Tool[] = [SAVE_FACT_TOOL, ...DOSSIER_TOOLS]

  // === Phase 1 : tool use loop (non-stream)
  const convo: Anthropic.MessageParam[] = userMessages.map((m) => ({
    role: m.role,
    content: m.content,
  }))

  let finalText = ''
  let interruptionMessage = ''

  try {
    let iteration = 0
    while (iteration < MAX_ITERATIONS) {
      iteration++

      const response = await anthropic.messages.create({
        model: DEFAULT_MODEL,
        max_tokens: MAX_TOKENS,
        system: enrichedSystemPrompt,
        messages: convo,
        tools,
      })

      if (response.stop_reason === 'end_turn' || response.stop_reason === 'stop_sequence') {
        finalText = response.content
          .filter((b): b is Anthropic.TextBlock => b.type === 'text')
          .map((b) => b.text)
          .join('\n')
        break
      }

      if (response.stop_reason === 'tool_use') {
        const toolUseBlocks = response.content.filter(
          (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
        )

        const toolResults = await Promise.all(
          toolUseBlocks.map(async (tu) => {
            const content = await executeToolUse(tu, state, AGENT_NAME)
            return {
              type: 'tool_result' as const,
              tool_use_id: tu.id,
              content,
            }
          })
        )

        convo.push({ role: 'assistant', content: response.content })
        convo.push({ role: 'user', content: toolResults })
        continue
      }

      interruptionMessage = `\n\n*[Orchestration interrompue : ${response.stop_reason ?? 'inconnu'}]*`
      break
    }

    if (iteration >= MAX_ITERATIONS && !finalText) {
      interruptionMessage = `\n\n*[Limite de ${MAX_ITERATIONS} consultations atteinte.]*`
    }
  } catch (err) {
    console.error(`[${AGENT_NAME}] erreur orchestration`, err)
    const message = err instanceof Error ? err.message : 'Erreur inconnue'
    finalText = `*[Erreur Mizan : ${message}]*`
  }

  const fullOutput = finalText + interruptionMessage

  // === Persister le message assistant
  if (conversationId && fullOutput.trim()) {
    await saveMessage({
      conversationId,
      role: 'assistant',
      content: fullOutput,
      metadata: { agent_name: AGENT_NAME, model: DEFAULT_MODEL },
    })
  }

  // === Phase 2 : stream du texte final
  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for (let i = 0; i < fullOutput.length; i += STREAM_CHUNK_SIZE) {
          controller.enqueue(encoder.encode(fullOutput.slice(i, i + STREAM_CHUNK_SIZE)))
        }
        controller.close()
      } catch (err) {
        controller.error(err)
      }
    },
  })

  // === Phase 3 : NextResponse avec set-cookie + X-Conversation-Id
  const response = new NextResponse(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
      'X-Conversation-Id': conversationId ?? '',
    },
  })

  if (state.pendingCookieUpdate !== null) {
    const cookieConfig = buildActiveDossierCookie(state.pendingCookieUpdate.dossierId)
    response.cookies.set(cookieConfig.name, cookieConfig.value, cookieConfig.options)
  }

  return response
}
