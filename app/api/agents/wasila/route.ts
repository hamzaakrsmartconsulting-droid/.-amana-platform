// app/api/agents/wasila/route.ts — Wasîla v1 (CRM/relances)
// Sprint Agents IA v9 · 29 avril 2026
// Utilise la factory v3 (héritée du sprint v8) :
//   auth Supabase + chargement facts client + persistence conversations

import { createAgentRoute } from '@/lib/agents/agent-route-factory'
import { WASILA_SYSTEM_PROMPT } from '@/lib/agents/wasila-system-prompt'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const POST = createAgentRoute({
  systemPrompt: WASILA_SYSTEM_PROMPT,
  agentName: 'wasila',
})
