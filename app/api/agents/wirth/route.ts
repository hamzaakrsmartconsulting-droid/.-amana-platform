// app/api/agents/wirth/route.ts — Wirth v3 (avec mémoire client)
// Sprint Agents IA v5 · 28 avril 2026

import { createAgentRoute } from '@/lib/agents/agent-route-factory'
import { WIRTH_SYSTEM_PROMPT } from '@/lib/agents/wirth-system-prompt'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const POST = createAgentRoute({
  systemPrompt: WIRTH_SYSTEM_PROMPT,
  agentName: 'wirth',
})
