// app/assistant/immobilier/page.tsx — Sakan
// Sprint Agents IA v3 · 27 avril 2026

import type { CSSProperties } from 'react'
import AgentChat from '@/components/agent-chat'
import AgentSwitcher from '@/components/agent-switcher'

const CREAM = '#f8f4ec'
const GREY = '#666666'
const SAKAN_COLOR = '#854F0B'

export const metadata = {
  title: 'Assistant Sakan Immobilier · AMANA Patrimoine',
  description:
    "Conversation avec Sakan, agent Immobilier & Mourabaha AMANA. Étude de votre projet immobilier en financement halal.",
}

export default function ImmobilierPage() {
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
    color: SAKAN_COLOR,
  }
  const subtitle: CSSProperties = {
    margin: '6px 0 16px',
    fontSize: 14,
    color: GREY,
  }

  return (
    <main style={wrap}>
      <header style={header}>
        <h1 style={title}>Sakan · Immobilier & Mourabaha</h1>
        <p style={subtitle}>
          Étude de votre projet immobilier en financement halal. Mourabaha
          Chaabi Bank, structuration SCI, fiscalité française.
        </p>
        <AgentSwitcher activeId="sakan" />
      </header>

      <AgentChat
        agentName="Sakan"
        agentRole="Agent Immobilier & Mourabaha"
        agentInitial="S"
        apiPath="/api/agents/sakan"
        agentColor={SAKAN_COLOR}
        welcomeMessage="Étudions votre projet immobilier en financement halal"
        examples={[
          "Comment fonctionne la Mourabaha avec Chaabi Bank concrètement ?",
          'Combien coûte vraiment une Mourabaha vs un crédit conventionnel ?',
          "Pourquoi le Pinel est-il exclu chez AMANA ?",
          'Faut-il que je crée une SCI pour mon investissement locatif ?',
        ]}
      />
    </main>
  )
}
