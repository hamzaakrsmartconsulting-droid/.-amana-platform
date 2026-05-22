// app/api/agents/mawsim/route.ts
// Sprint Agents IA v13 · 30 avril 2026
//
// Endpoint streaming de l'agent Mawsim (Événements & RP).
// Pattern tool use loop identique à Sajl (sprint v12) et Amîn (sprint v4).

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

import { MAWSIM_SYSTEM_PROMPT } from '@/lib/agents/mawsim/system-prompt'
import { MAWSIM_TOOLS, MAWSIM_TOOL_NAMES } from '@/lib/agents/mawsim/tools'
import {
  listEvents,
  getEvent,
  createEvent,
  updateEvent,
  upsertEventAction,
  markActionDone,
  upsertEventContact,
  type EventStatut,
  type EventType,
} from '@/lib/events/events-service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_ITERATIONS = 10
const MODEL = 'claude-sonnet-4-6'

// =====================================================================
// Auth helper
// =====================================================================
async function getAuthUser(): Promise<{ userId: string } | null> {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll() {},
      },
    }
  )
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  return { userId: user.id }
}

async function checkEventBelongsTo(
  conseillerId: string,
  eventId: string
): Promise<boolean> {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll() {},
      },
    }
  )
  const { data } = await supabase
    .from('events')
    .select('id, conseiller_id')
    .eq('id', eventId)
    .maybeSingle()
  if (!data) return false
  return data.conseiller_id === conseillerId
}

// =====================================================================
// Tool execution
// =====================================================================
async function executeTool(params: {
  conseillerId: string
  toolName: string
  toolInput: Record<string, unknown>
}): Promise<unknown> {
  const { conseillerId, toolName, toolInput } = params

  switch (toolName) {
    case 'list_events': {
      return {
        events: await listEvents({
          statut: toolInput.statut as EventStatut[] | undefined,
          type: toolInput.type as EventType[] | undefined,
          futur_only: toolInput.futur_only as boolean | undefined,
        }),
      }
    }
    case 'get_event': {
      const event_id = String(toolInput.event_id ?? '')
      if (!event_id) return { error: 'event_id manquant' }
      const ok = await checkEventBelongsTo(conseillerId, event_id)
      if (!ok) return { error: 'Événement introuvable ou accès refusé' }
      return await getEvent(event_id)
    }
    case 'create_event': {
      const nom = String(toolInput.nom ?? '')
      const type = String(toolInput.type ?? '') as EventType
      const date_debut = String(toolInput.date_debut ?? '')
      if (!nom || !type || !date_debut)
        return { error: 'nom, type et date_debut sont requis' }
      return await createEvent({
        conseillerId,
        nom,
        type,
        date_debut,
        date_fin: toolInput.date_fin as string | undefined,
        lieu: toolInput.lieu as string | undefined,
        description: toolInput.description as string | undefined,
        statut: toolInput.statut as EventStatut | undefined,
        audience_cible: toolInput.audience_cible as string | undefined,
        objectifs: toolInput.objectifs as string | undefined,
        kpi_attendu: toolInput.kpi_attendu as string | undefined,
        budget_estime_eur: toolInput.budget_estime_eur as number | undefined,
      })
    }
    case 'update_event': {
      const event_id = String(toolInput.event_id ?? '')
      const patch = (toolInput.patch ?? {}) as Record<string, unknown>
      if (!event_id) return { error: 'event_id manquant' }
      const ok = await checkEventBelongsTo(conseillerId, event_id)
      if (!ok) return { error: 'Événement introuvable ou accès refusé' }
      return await updateEvent(event_id, patch as never)
    }
    case 'upsert_event_action': {
      const event_id = String(toolInput.event_id ?? '')
      const titre = String(toolInput.titre ?? '')
      if (!event_id || !titre)
        return { error: 'event_id et titre sont requis' }
      const ok = await checkEventBelongsTo(conseillerId, event_id)
      if (!ok) return { error: 'Événement introuvable ou accès refusé' }
      return await upsertEventAction({
        conseillerId,
        eventId: event_id,
        id: toolInput.id as string | undefined,
        titre,
        description: toolInput.description as string | undefined,
        due_date: toolInput.due_date as string | undefined,
        statut: toolInput.statut as 'todo' | 'in_progress' | 'done' | 'blocked' | undefined,
        categorie: toolInput.categorie as never,
        assigne_a: toolInput.assigne_a as string | undefined,
        notes: toolInput.notes as string | undefined,
      })
    }
    case 'mark_action_done': {
      const action_id = String(toolInput.action_id ?? '')
      if (!action_id) return { error: 'action_id manquant' }
      // Pas de check propriétaire ici — la RLS bloquera de toute façon.
      return await markActionDone(action_id)
    }
    case 'upsert_event_contact': {
      const event_id = String(toolInput.event_id ?? '')
      const role = String(toolInput.role ?? '') as never
      const nom = String(toolInput.nom ?? '')
      if (!event_id || !role || !nom)
        return { error: 'event_id, role et nom sont requis' }
      const ok = await checkEventBelongsTo(conseillerId, event_id)
      if (!ok) return { error: 'Événement introuvable ou accès refusé' }
      return await upsertEventContact({
        conseillerId,
        eventId: event_id,
        id: toolInput.id as string | undefined,
        role,
        nom,
        email: toolInput.email as string | undefined,
        phone: toolInput.phone as string | undefined,
        organisation: toolInput.organisation as string | undefined,
        notes: toolInput.notes as string | undefined,
      })
    }
    default:
      return { error: `Outil inconnu : ${toolName}` }
  }
}

// =====================================================================
// Route POST — streaming
// =====================================================================
export async function POST(request: NextRequest) {
  const auth = await getAuthUser()
  if (!auth) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  let body: { messages?: Anthropic.MessageParam[] }
  try {
    body = (await request.json()) as { messages?: Anthropic.MessageParam[] }
  } catch {
    return NextResponse.json({ error: 'Body JSON invalide' }, { status: 400 })
  }

  const messages: Anthropic.MessageParam[] = body.messages ?? []
  if (messages.length === 0) {
    return NextResponse.json({ error: 'Aucun message fourni' }, { status: 400 })
  }

  // Injecter la date du jour pour que Mawsim puisse calculer J-X
  const today = new Date().toISOString().slice(0, 10)
  const systemPrompt = `${MAWSIM_SYSTEM_PROMPT}\n\n# Contexte\n\nDate du jour : **${today}**.`

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY manquant côté serveur' }, { status: 500 })
  }
  const anthropic = new Anthropic({ apiKey })

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        )
      }

      const conversation: Anthropic.MessageParam[] = [...messages]

      try {
        for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
          // Streaming pass for text deltas
          const streamResp = await anthropic.messages.create({
            model: MODEL,
            max_tokens: 4096,
            system: systemPrompt,
            tools: MAWSIM_TOOLS,
            messages: conversation,
            stream: true,
          })
          for await (const event of streamResp) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              send('text_delta', { text: event.delta.text })
            }
          }

          // Non-streaming pass for full blocks (tool_use included)
          const fullResp = await anthropic.messages.create({
            model: MODEL,
            max_tokens: 4096,
            system: systemPrompt,
            tools: MAWSIM_TOOLS,
            messages: conversation,
          })
          conversation.push({ role: 'assistant', content: fullResp.content })
          if (fullResp.stop_reason !== 'tool_use') {
            send('done', { iterations: iter + 1 })
            controller.close()
            return
          }

          const toolResults: Anthropic.ToolResultBlockParam[] = []
          for (const block of fullResp.content) {
            if (block.type !== 'tool_use') continue
            if (!MAWSIM_TOOL_NAMES.includes(block.name as never)) {
              toolResults.push({
                type: 'tool_result',
                tool_use_id: block.id,
                content: `Outil inconnu : ${block.name}`,
                is_error: true,
              })
              continue
            }
            send('tool_call', { name: block.name, input: block.input })
            const result = await executeTool({
              conseillerId: auth.userId,
              toolName: block.name,
              toolInput: (block.input ?? {}) as Record<string, unknown>,
            })
            send('tool_result', { name: block.name, result })
            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: JSON.stringify(result),
            })
          }
          conversation.push({ role: 'user', content: toolResults })
        }

        send('error', {
          message: `Limite de ${MAX_ITERATIONS} itérations atteinte.`,
        })
        controller.close()
      } catch (err) {
        console.error('[mawsim] stream error', err)
        send('error', { message: err instanceof Error ? err.message : 'Erreur Mawsim' })
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}
