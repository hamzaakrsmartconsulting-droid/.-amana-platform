// app/api/agents/jamaa/route.ts — Jamâ'a v1 (Onboarding)
// Sprint Agents IA v9 · 29 avril 2026

import { createAgentRoute } from '@/lib/agents/agent-route-factory'
import { JAMAA_SYSTEM_PROMPT } from '@/lib/agents/jamaa-system-prompt'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const POST = createAgentRoute({
  systemPrompt: JAMAA_SYSTEM_PROMPT,
  agentName: 'jamaa',
})
