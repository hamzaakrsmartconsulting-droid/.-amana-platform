// app/assistant/relations/page.tsx — Wasîla (CRM/relations)
// Sprint Agents IA v9 · 29 avril 2026

import type { CSSProperties } from 'react'
import AgentChat from '@/components/agent-chat'
import AgentSwitcher from '@/components/agent-switcher'

const CREAM = '#f8f4ec'
const GREY = '#666666'
const WASILA_COLOR = '#0E7490'

export const metadata = {
  title: 'Assistant Wasîla CRM · AMANA Patrimoine',
  description:
    "Conversation avec Wasîla, agent CRM et relations client AMANA. Suivi des dossiers, relances, programmation de RDV.",
}

export default function RelationsPage() {
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
    color: WASILA_COLOR,
  }
  const subtitle: CSSProperties = {
    margin: '6px 0 16px',
    fontSize: 14,
    color: GREY,
  }

  return (
    <main style={wrap}>
      <header style={header}>
        <h1 style={title}>Wasîla · CRM & Relations</h1>
        <p style={subtitle}>
          Suivi des dossiers, relances clients, programmation de RDV. Cadences
          adaptées aux 3 offres AMANA (Mass / Patrimoniale / Premium).
        </p>
        <AgentSwitcher activeId="wasila" />
      </header>

      <AgentChat
        agentName="Wasîla"
        agentRole="Agent CRM & Relations"
        agentInitial="W"
        apiPath="/api/agents/wasila"
        agentColor={WASILA_COLOR}
        welcomeMessage="Pilotons ensemble la relation avec ce client"
        examples={[
          "Qu'est-ce que je dois relancer cette semaine sur ce dossier ?",
          'Comment relancer un client qui n\'a pas terminé son KYC depuis 10 jours ?',
          'Programme une cadence de suivi annuel pour un client Premium.',
          'Rédige un email de relance pour proposer un RDV bilan annuel.',
        ]}
      />
    </main>
  )
}
