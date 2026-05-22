// app/api/agents/sakan/route.ts — Sakan v3 (avec mémoire client)
// Sprint Agents IA v5 · 28 avril 2026

import { createAgentRoute } from '@/lib/agents/agent-route-factory'
import { SAKAN_SYSTEM_PROMPT } from '@/lib/agents/sakan-system-prompt'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const POST = createAgentRoute({
  systemPrompt: SAKAN_SYSTEM_PROMPT,
  agentName: 'sakan',
})
