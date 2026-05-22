// app/assistant/sharia/page.tsx — Tahara
// Sprint Agents IA v3 · 27 avril 2026

import type { CSSProperties } from 'react'
import AgentChat from '@/components/agent-chat'
import AgentSwitcher from '@/components/agent-switcher'

const CREAM = '#f8f4ec'
const GREY = '#666666'
const TAHARA_COLOR = '#3B6D11'

export const metadata = {
  title: 'Assistant Tahara Sharia · AMANA Patrimoine',
  description:
    "Conversation avec Tahara, agent Sharia Compliance AMANA. Validation Charia adossée AAOIFI.",
}

export default function ShariaPage() {
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
    color: TAHARA_COLOR,
  }
  const subtitle: CSSProperties = {
    margin: '6px 0 16px',
    fontSize: 14,
    color: GREY,
  }

  return (
    <main style={wrap}>
      <header style={header}>
        <h1 style={title}>Tahara · Sharia Compliance</h1>
        <p style={subtitle}>
          Filtre de premier niveau adossé AAOIFI. Escalade Sakina pour les cas
          complexes.
        </p>
        <AgentSwitcher activeId="tahara" />
      </header>

      <AgentChat
        agentName="Tahara"
        agentRole="Agent Sharia Compliance"
        agentInitial="T"
        apiPath="/api/agents/tahara"
        agentColor={TAHARA_COLOR}
        welcomeMessage="Posez vos questions Charia à Tahara"
        examples={[
          'Le bitcoin est-il halal selon AAOIFI ?',
          "Quels sont les seuils financiers AAOIFI pour qu'une action soit conforme ?",
          'Pourquoi le fonds en euros est-il exclu chez AMANA ?',
          'Quelle est la différence entre une SCPI charia et une SCPI ISR ?',
        ]}
      />
    </main>
  )
}
