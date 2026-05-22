// app/api/agents/sajl/route.ts
// Sprint Agents IA v12 · 30 avril 2026
//
// Endpoint streaming de l'agent Sajl (Document & Reporting).
// Pattern tool use loop équivalent à celui d'Amîn (sprint v4) :
//   1. Reçoit les messages utilisateur
//   2. Stream les blocs de réponse Anthropic en SSE
//   3. Si Claude utilise un outil, l'exécute côté serveur, ré-injecte le
//      tool_result dans la conversation, re-stream
//   4. MAX_ITERATIONS = 10 (anti-boucle infinie)
//
// La sécurité s'appuie sur :
//   - Auth Supabase (l'utilisateur doit être connecté)
//   - Le dossier_id passé en argument des outils est croisé avec le
//     conseiller_id auth — un conseiller ne peut générer/lire que pour
//     ses propres dossiers (RLS + check explicite)
//   - Audit log pour chaque appel d'outil sensible (génération PDF)

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

import { SAJL_SYSTEM_PROMPT } from '@/lib/agents/sajl/system-prompt'
import { SAJL_TOOLS, SAJL_TOOL_NAMES } from '@/lib/agents/sajl/tools'

import {
  generateDerForDossier,
  generateLmForDossier,
  generateRaForDossier,
  generateBilanForDossier,
  generatePrecoForDossier,
  generateZakatForDossier,
  generateSuccessionForDossier,
  type DerInputs,
  type LmInputs,
  type RaInputs,
  type BilanInputs,
  type PrecoInputs,
  type ZakatInputs,
  type SuccessionInputs,
} from '@/lib/documents/generate-pdf'
import { applyGateAfterDocumentGenerated } from '@/lib/workflow/validation-gates'
import {
  getDocumentInputs,
  upsertDocumentInputs,
  listDocumentInputsForDossier,
  type DocumentType,
} from '@/lib/documents/document-inputs-service'

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

// =====================================================================
// Tool exécution (server-side)
// =====================================================================
async function executeTool(params: {
  conseillerId: string
  toolName: string
  toolInput: Record<string, unknown>
}): Promise<unknown> {
  const { conseillerId, toolName, toolInput } = params

  switch (toolName) {
    // ---------------------------------------------------------------
    case 'list_document_inputs': {
      const dossier_id = String(toolInput.dossier_id ?? '')
      if (!dossier_id) return { error: 'dossier_id manquant' }
      // Vérification appartenance dossier — RLS le ferait, mais on retourne
      // une erreur métier propre.
      const ok = await checkDossierBelongsTo(conseillerId, dossier_id)
      if (!ok) return { error: 'Dossier introuvable ou accès refusé' }
      const rows = await listDocumentInputsForDossier(dossier_id)
      return {
        rows: rows.map((r) => ({
          document_type: r.document_type,
          status: r.status,
          updated_at: r.updated_at,
          inputs_keys: Object.keys(r.inputs ?? {}),
        })),
      }
    }
    // ---------------------------------------------------------------
    case 'get_document_inputs': {
      const dossier_id = String(toolInput.dossier_id ?? '')
      const document_type = String(toolInput.document_type ?? '') as DocumentType
      if (!dossier_id || !document_type)
        return { error: 'dossier_id ou document_type manquant' }
      const ok = await checkDossierBelongsTo(conseillerId, dossier_id)
      if (!ok) return { error: 'Dossier introuvable ou accès refusé' }
      const row = await getDocumentInputs(dossier_id, document_type)
      return { row }
    }
    // ---------------------------------------------------------------
    case 'update_document_inputs': {
      const dossier_id = String(toolInput.dossier_id ?? '')
      const document_type = String(toolInput.document_type ?? '') as DocumentType
      const inputs = (toolInput.inputs ?? {}) as Record<string, unknown>
      const status = (toolInput.status ?? 'draft') as 'draft' | 'ready'
      if (!dossier_id || !document_type)
        return { error: 'dossier_id ou document_type manquant' }
      const ok = await checkDossierBelongsTo(conseillerId, dossier_id)
      if (!ok) return { error: 'Dossier introuvable ou accès refusé' }
      const result = await upsertDocumentInputs({
        conseillerId,
        dossierId: dossier_id,
        documentType: document_type,
        inputs: inputs as never,
        status,
      })
      return result
    }
    // ---------------------------------------------------------------
    case 'generate_document': {
      const dossier_id = String(toolInput.dossier_id ?? '')
      const document_type = String(toolInput.document_type ?? '') as DocumentType
      if (!dossier_id || !document_type)
        return { error: 'dossier_id ou document_type manquant' }
      const ok = await checkDossierBelongsTo(conseillerId, dossier_id)
      if (!ok) return { error: 'Dossier introuvable ou accès refusé' }

      // Charger les inputs de la base
      const row = await getDocumentInputs(dossier_id, document_type)
      const inputs = (row?.inputs ?? {}) as Record<string, unknown>

      // Dispatch
      let result
      switch (document_type) {
        case 'der':
          result = await generateDerForDossier(conseillerId, dossier_id, inputs as DerInputs)
          break
        case 'lm':
          result = await generateLmForDossier(conseillerId, dossier_id, inputs as LmInputs)
          break
        case 'ra':
          result = await generateRaForDossier(conseillerId, dossier_id, inputs as RaInputs)
          break
        case 'bilan':
          result = await generateBilanForDossier(conseillerId, dossier_id, inputs as BilanInputs)
          break
        case 'preco':
          result = await generatePrecoForDossier(conseillerId, dossier_id, inputs as PrecoInputs)
          break
        case 'zakat':
          result = await generateZakatForDossier(conseillerId, dossier_id, inputs as ZakatInputs)
          break
        case 'succession':
          result = await generateSuccessionForDossier(
            conseillerId,
            dossier_id,
            inputs as SuccessionInputs
          )
          break
        default:
          return { error: `Type de document inconnu : ${document_type}` }
      }

      if (!result.ok) {
        const isInputsError = result.error.startsWith('Inputs ')
        return {
          ok: false,
          error: result.error,
          missingInputs: isInputsError,
        }
      }

      void applyGateAfterDocumentGenerated(dossier_id, document_type).catch(err => {
        console.error(`[sajl] gate pending (${document_type})`, err)
      })

      // Audit log de l'appel agent
      await auditLog(conseillerId, {
        action: 'agent.sajl.generate_document',
        entity_type: 'document',
        entity_id: result.doc.id,
        metadata: { type: document_type, dossier_id, filename: result.doc.filename },
      })

      return { ok: true, doc: result.doc }
    }
    // ---------------------------------------------------------------
    case 'list_dossier_documents': {
      const dossier_id = String(toolInput.dossier_id ?? '')
      if (!dossier_id) return { error: 'dossier_id manquant' }
      const ok = await checkDossierBelongsTo(conseillerId, dossier_id)
      if (!ok) return { error: 'Dossier introuvable ou accès refusé' }
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
      const { data, error } = await supabase
        .from('documents')
        .select('id, type, filename, storage_path, status, created_at')
        .eq('dossier_id', dossier_id)
        .order('created_at', { ascending: false })
      if (error) return { error: error.message }
      // Générer un signed URL pour chaque doc (10 min)
      const rows = await Promise.all(
        (data ?? []).map(async (d) => {
          const { data: signed } = await supabase.storage
            .from('documents')
            .createSignedUrl(d.storage_path, 600)
          return { ...d, signed_url: signed?.signedUrl ?? null }
        })
      )
      return { rows }
    }
    // ---------------------------------------------------------------
    default:
      return { error: `Outil inconnu : ${toolName}` }
  }
}

// =====================================================================
// Helpers
// =====================================================================
async function checkDossierBelongsTo(
  conseillerId: string,
  dossierId: string
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
  const { data, error } = await supabase
    .from('dossiers')
    .select('id, conseiller_id')
    .eq('id', dossierId)
    .maybeSingle()
  if (error || !data) return false
  return data.conseiller_id === conseillerId
}

async function auditLog(
  userId: string,
  payload: {
    action: string
    entity_type: string
    entity_id: string
    metadata?: Record<string, unknown>
  }
) {
  try {
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
    await supabase.from('audit_logs').insert({
      user_id: userId,
      action: payload.action,
      entity_type: payload.entity_type,
      entity_id: payload.entity_id,
      metadata: { ...(payload.metadata ?? {}), agent: 'sajl', timestamp: new Date().toISOString() },
    })
  } catch (err) {
    console.error('[sajl] audit log error', err)
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

  let body: { messages?: Anthropic.MessageParam[]; dossier_id?: string }
  try {
    body = (await request.json()) as { messages?: Anthropic.MessageParam[]; dossier_id?: string }
  } catch {
    return NextResponse.json({ error: 'Body JSON invalide' }, { status: 400 })
  }

  const messages: Anthropic.MessageParam[] = body.messages ?? []
  if (messages.length === 0) {
    return NextResponse.json({ error: 'Aucun message fourni' }, { status: 400 })
  }

  // Injecter le dossier_id actif dans le system prompt si fourni
  const systemPrompt = body.dossier_id
    ? `${SAJL_SYSTEM_PROMPT}\n\n# Contexte de session\n\nLe dossier actif pour cette conversation est : **${body.dossier_id}**. Utilise-le par défaut comme dossier_id pour tous les outils, sauf si l'utilisateur fait explicitement référence à un autre dossier.`
    : SAJL_SYSTEM_PROMPT

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY manquant côté serveur' }, { status: 500 })
  }
  const anthropic = new Anthropic({ apiKey })

  // SSE stream
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
          // Appel Anthropic avec streaming
          const response = await anthropic.messages.create({
            model: MODEL,
            max_tokens: 4096,
            system: systemPrompt,
            tools: SAJL_TOOLS,
            messages: conversation,
            stream: true,
          })

          let assistantBlocks: Anthropic.ContentBlock[] = []
          let stopReason: string | null = null

          // Reconstituer les blocs depuis le stream
          for await (const event of response) {
            // Re-émettre les deltas texte au client
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              send('text_delta', { text: event.delta.text })
            }
            // Capturer la fin et le stop_reason
            if (event.type === 'message_delta' && event.delta.stop_reason) {
              stopReason = event.delta.stop_reason
            }
          }

          // Recharger les blocs complets via un second appel non-streamé (plus simple
          // que de tout reconstituer depuis le stream pour les tool_use)
          const fullResponse = await anthropic.messages.create({
            model: MODEL,
            max_tokens: 4096,
            system: systemPrompt,
            tools: SAJL_TOOLS,
            messages: conversation,
          })
          assistantBlocks = fullResponse.content
          stopReason = fullResponse.stop_reason ?? stopReason

          // Ajouter la réponse assistant à la conversation
          conversation.push({ role: 'assistant', content: assistantBlocks })

          // Pas de tool use → fin de la boucle
          if (stopReason !== 'tool_use') {
            send('done', { iterations: iter + 1 })
            controller.close()
            return
          }

          // Exécuter chaque tool_use et préparer les tool_result
          const toolResults: Anthropic.ToolResultBlockParam[] = []
          for (const block of assistantBlocks) {
            if (block.type !== 'tool_use') continue
            if (!SAJL_TOOL_NAMES.includes(block.name as never)) {
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

          // Injecter les tool_results dans la conversation
          conversation.push({ role: 'user', content: toolResults })
        }

        // Sortie de boucle = MAX_ITERATIONS atteint
        send('error', {
          message: `Limite de ${MAX_ITERATIONS} itérations atteinte. Reformuler la demande pour la simplifier.`,
        })
        controller.close()
      } catch (err) {
        console.error('[sajl] stream error', err)
        send('error', {
          message: err instanceof Error ? err.message : 'Erreur serveur Sajl',
        })
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
