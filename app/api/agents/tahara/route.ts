// app/api/agents/tahara/route.ts — Tahara v3 (avec mémoire client)
// Sprint Agents IA v5 · 28 avril 2026

import { createAgentRoute } from '@/lib/agents/agent-route-factory'
import { TAHARA_SYSTEM_PROMPT } from '@/lib/agents/tahara-system-prompt'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const POST = createAgentRoute({
  systemPrompt: TAHARA_SYSTEM_PROMPT,
  agentName: 'tahara',
})
