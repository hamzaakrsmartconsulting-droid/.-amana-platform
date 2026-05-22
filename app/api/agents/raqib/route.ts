// app/api/agents/raqib/route.ts — v3
// Sprint Agents IA v21 · 30 avril 2026
//
// Évolution v3 (vs v2 sprint v15) : appel automatique de
// triggerPostScreening après record_pre_screen_decision. Permet de
// transitionner le dossier en 'kyc_attente' ou 'bloque' selon la
// décision prise par Mohamed.
//
// REMPLACE app/api/agents/raqib/route.ts du sprint v15.

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

import { RAQIB_SYSTEM_PROMPT } from '@/lib/agents/raqib/system-prompt'
import { RAQIB_TOOLS, RAQIB_TOOL_NAMES } from '@/lib/agents/raqib/tools'
import {
  listAlerts,
  createAlert,
  resolveAlert,
  listComplianceChecks,
  recordComplianceCheck,
  auditDossierCompliance,
  prescreenLookup,
  recordPreScreenDecision,
  type AlertCategory,
  type AlertSeverity,
  type AlertStatut,
  type CheckResult,
  type CheckType,
} from '@/lib/compliance/compliance-service'
import { triggerPostScreening } from '@/lib/workflow/auto-trigger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_ITERATIONS = 10
const MODEL = 'claude-sonnet-4-6'

async function getAuthUser() {
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
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return { userId: user.id }
}

async function checkDossierBelongsTo(conseillerId: string, dossierId: string) {
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
  const { data } = await supabase
    .from('dossiers')
    .select('id, conseiller_id')
    .eq('id', dossierId)
    .maybeSingle()
  if (!data) return false
  return data.conseiller_id === conseillerId
}

async function executeTool(params: {
  conseillerId: string
  toolName: string
  toolInput: Record<string, unknown>
}): Promise<unknown> {
  const { conseillerId, toolName, toolInput } = params

  switch (toolName) {
    case 'list_alerts':
      return {
        alerts: await listAlerts({
          severity: toolInput.severity as AlertSeverity[] | undefined,
          statut: toolInput.statut as AlertStatut[] | undefined,
          category: toolInput.category as AlertCategory[] | undefined,
          dossier_id: toolInput.dossier_id as string | undefined,
        }),
      }
    case 'create_alert': {
      const dossier_id = toolInput.dossier_id as string | undefined
      if (dossier_id) {
        const ok = await checkDossierBelongsTo(conseillerId, dossier_id)
        if (!ok) return { error: 'Dossier introuvable ou accès refusé' }
      }
      return await createAlert({
        conseillerId,
        dossierId: dossier_id,
        severity: toolInput.severity as AlertSeverity,
        category: toolInput.category as AlertCategory,
        titre: String(toolInput.titre ?? ''),
        description: toolInput.description as string | undefined,
        due_date: toolInput.due_date as string | undefined,
      })
    }
    case 'resolve_alert': {
      const alert_id = String(toolInput.alert_id ?? '')
      if (!alert_id) return { error: 'alert_id manquant' }
      return await resolveAlert({
        alertId: alert_id,
        resolution_notes: toolInput.resolution_notes as string | undefined,
        statut: (toolInput.statut as AlertStatut | undefined) ?? 'resolved',
      })
    }
    case 'list_compliance_checks': {
      const dossier_id = String(toolInput.dossier_id ?? '')
      if (!dossier_id) return { error: 'dossier_id manquant' }
      const ok = await checkDossierBelongsTo(conseillerId, dossier_id)
      if (!ok) return { error: 'Dossier introuvable ou accès refusé' }
      return { checks: await listComplianceChecks(dossier_id) }
    }
    case 'record_compliance_check': {
      const dossier_id = String(toolInput.dossier_id ?? '')
      if (!dossier_id) return { error: 'dossier_id manquant' }
      const ok = await checkDossierBelongsTo(conseillerId, dossier_id)
      if (!ok) return { error: 'Dossier introuvable ou accès refusé' }
      return await recordComplianceCheck({
        conseillerId,
        dossierId: dossier_id,
        check_type: toolInput.check_type as CheckType,
        result: toolInput.result as CheckResult,
        evidence: toolInput.evidence as string | undefined,
        source: toolInput.source as string | undefined,
        expires_at: toolInput.expires_at as string | undefined,
        notes: toolInput.notes as string | undefined,
      })
    }
    case 'audit_dossier_compliance': {
      const dossier_id = String(toolInput.dossier_id ?? '')
      if (!dossier_id) return { error: 'dossier_id manquant' }
      const ok = await checkDossierBelongsTo(conseillerId, dossier_id)
      if (!ok) return { error: 'Dossier introuvable ou accès refusé' }
      return await auditDossierCompliance(dossier_id)
    }
    case 'pre_screen_lookup': {
      const dossier_id = String(toolInput.dossier_id ?? '')
      if (!dossier_id) return { error: 'dossier_id manquant' }
      const ok = await checkDossierBelongsTo(conseillerId, dossier_id)
      if (!ok) return { error: 'Dossier introuvable ou accès refusé' }
      return await prescreenLookup({
        dossierId: dossier_id,
        date_naissance: toolInput.date_naissance as string | undefined,
        nationalite: toolInput.nationalite as string | undefined,
        contexte_pro: toolInput.contexte_pro as string | undefined,
      })
    }
    case 'record_pre_screen_decision': {
      const dossier_id = String(toolInput.dossier_id ?? '')
      const decision = String(toolInput.decision_globale ?? '') as CheckResult
      const sources = String(toolInput.sources_consultees ?? '')
      if (!dossier_id) return { error: 'dossier_id manquant' }
      if (!decision || !['clean', 'flagged', 'manual_review'].includes(decision))
        return { error: 'decision_globale invalide' }
      if (!sources?.trim())
        return { error: 'sources_consultees obligatoire pour traçabilité audit' }
      const ok = await checkDossierBelongsTo(conseillerId, dossier_id)
      if (!ok) return { error: 'Dossier introuvable ou accès refusé' }
      const result = await recordPreScreenDecision({
        conseillerId,
        dossierId: dossier_id,
        decision_globale: decision,
        sources_consultees: sources,
        notes: toolInput.notes as string | undefined,
        validity_months: toolInput.validity_months as number | undefined,
      })
      // ============================================================
      // NOUVEAU v21 : déclencher transition pipeline post-screening
      // ============================================================
      if (result.ok) {
        try {
          await triggerPostScreening({
            dossierId: dossier_id,
            decision: decision as 'clean' | 'manual_review' | 'flagged',
          })
        } catch (err) {
          console.error('[raqib] triggerPostScreening error', err)
          // On ne bloque pas — la décision est enregistrée
        }
      }
      return result
    }
    default:
      return { error: `Outil inconnu : ${toolName}` }
  }
}

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

  const today = new Date().toISOString().slice(0, 10)
  const systemPrompt = `${RAQIB_SYSTEM_PROMPT}\n\n# Date du jour\n\n**${today}**.`

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY manquant' }, { status: 500 })
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
          const streamResp = await anthropic.messages.create({
            model: MODEL,
            max_tokens: 4096,
            system: systemPrompt,
            tools: RAQIB_TOOLS,
            messages: conversation,
            stream: true,
          })
          for await (const event of streamResp) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              send('text_delta', { text: event.delta.text })
            }
          }
          const fullResp = await anthropic.messages.create({
            model: MODEL,
            max_tokens: 4096,
            system: systemPrompt,
            tools: RAQIB_TOOLS,
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
            if (!RAQIB_TOOL_NAMES.includes(block.name as never)) {
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
        send('error', { message: `Limite de ${MAX_ITERATIONS} itérations atteinte.` })
        controller.close()
      } catch (err) {
        console.error('[raqib v3] stream error', err)
        send('error', { message: err instanceof Error ? err.message : 'Erreur Raqîb' })
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
