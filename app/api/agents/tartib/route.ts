// app/api/agents/tartib/route.ts — Tartîb v2 (avec mémoire client)
// Sprint Agents IA v5 · 28 avril 2026

import { createAgentRoute } from '@/lib/agents/agent-route-factory'
import { TARTIB_SYSTEM_PROMPT } from '@/lib/agents/tartib-system-prompt'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const POST = createAgentRoute({
  systemPrompt: TARTIB_SYSTEM_PROMPT,
  agentName: 'tartib',
})
