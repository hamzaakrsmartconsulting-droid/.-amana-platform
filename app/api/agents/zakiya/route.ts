// app/api/agents/zakiya/route.ts — Zakiya v3 (avec mémoire client)
// Sprint Agents IA v5 · 28 avril 2026

import { createAgentRoute } from '@/lib/agents/agent-route-factory'
import { ZAKIYA_SYSTEM_PROMPT } from '@/lib/agents/zakiya-system-prompt'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const POST = createAgentRoute({
  systemPrompt: ZAKIYA_SYSTEM_PROMPT,
  agentName: 'zakiya',
})
