// app/assistant/allocation/page.tsx — page Tartîb (Allocation patrimoniale)
// Sprint Agents IA v4 · 28 avril 2026

import type { CSSProperties } from 'react'
import AgentChat from '@/components/agent-chat'
import AgentSwitcher from '@/components/agent-switcher'

const CREAM = '#f8f4ec'
const GREY = '#666666'
const TARTIB_COLOR = '#5B3F8C'

export const metadata = {
  title: 'Assistant Tartîb Allocation · AMANA Patrimoine',
  description:
    "Conversation avec Tartîb, agent Allocation patrimoniale AMANA. Répartition cible halal entre liquidités, ETF islamic, SCPI Sharia, immobilier, or.",
}

export default function AllocationPage() {
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
    color: TARTIB_COLOR,
  }
  const subtitle: CSSProperties = {
    margin: '6px 0 16px',
    fontSize: 14,
    color: GREY,
  }

  return (
    <main style={wrap}>
      <header style={header}>
        <h1 style={title}>Tartîb · Allocation patrimoniale</h1>
        <p style={subtitle}>
          Répartition cible halal entre liquidités, ETF islamic, SCPI Sharia,
          immobilier Mourabaha et or, calibrée sur votre profil et votre offre AMANA.
        </p>
        <AgentSwitcher activeId="tartib" />
      </header>

      <AgentChat
        agentName="Tartîb"
        agentRole="Agent Allocation patrimoniale"
        agentInitial="T"
        apiPath="/api/agents/tartib"
        agentColor={TARTIB_COLOR}
        welcomeMessage="Construisons ensemble votre allocation cible"
        examples={[
          'Profil équilibré, 100 k€ disponibles, salarié 35 ans 2 enfants. Allocation cible ?',
          "J'ai déjà 200 k€ en RP, 50 k€ de liquidités, où placer 30 k€ supplémentaires en halal ?",
          'Quelle part d\'or physique dans un patrimoine de 500 k€ profil prudent ?',
          "Articulation ETF islamic + SCPI NCap : quelle proportion pour 80 k€ ?",
        ]}
      />
    </main>
  )
}
