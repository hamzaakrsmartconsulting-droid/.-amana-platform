// app/assistant/mirath/page.tsx — v3 avec switcher
// Sprint Agents IA v3 · 27 avril 2026

import type { CSSProperties } from 'react'
import AgentChat from '@/components/agent-chat'
import AgentSwitcher from '@/components/agent-switcher'

const CREAM = '#f8f4ec'
const GREY = '#666666'
const WIRTH_COLOR = '#791F1F'

export const metadata = {
  title: 'Assistant Wirth Mirath · AMANA Patrimoine',
  description:
    "Conversation avec Wirth, agent Mirath AMANA. Calcul de votre dévolution successorale islamique articulée avec le droit français.",
}

export default function MirathPage() {
  const wrap: CSSProperties = {
    minHeight: '100vh',
    background: CREAM,
    padding: '24px 16px 60px',
  }
  const header: CSSProperties = {
    maxWidth: 1100,
    margin: '0 auto 20px',
    textAlign: 'center',
  }
  const title: CSSProperties = {
    margin: 0,
    fontSize: 24,
    fontWeight: 600,
    color: WIRTH_COLOR,
  }
  const subtitle: CSSProperties = {
    margin: '6px 0 16px',
    fontSize: 14,
    color: GREY,
  }

  return (
    <main style={wrap}>
      <header style={header}>
        <h1 style={title}>Wirth · Mirath et succession islamique</h1>
        <p style={subtitle}>
          Dévolution Faraïd articulée avec le droit français des successions.
        </p>
        <AgentSwitcher activeId="wirth" />
      </header>

      <AgentChat
        agentName="Wirth"
        agentRole="Agent Mirath et succession"
        agentInitial="W"
        apiPath="/api/agents/wirth"
        agentColor={WIRTH_COLOR}
        welcomeMessage="Commencez la conversation avec Wirth pour étudier votre dévolution successorale"
        examples={[
          'Je suis marié, deux enfants. Quelle dévolution prévoit le Mirath ?',
          'Comment articuler Faraïd et droit français pour respecter la part de mon fils ?',
          "Mon conjoint n'est pas musulman. Comment se passe la succession ?",
          'Combien dois-je donner à chacun de mes 4 enfants en Mirath ?',
        ]}
      />
    </main>
  )
}
