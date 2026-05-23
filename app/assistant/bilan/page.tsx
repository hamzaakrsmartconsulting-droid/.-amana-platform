// app/assistant/bilan/page.tsx — page Mizan (Bilan patrimonial)
// Sprint Agents IA v4 · 28 avril 2026
// Mizan déplacé de /assistant vers /assistant/bilan (Amîn prend la racine)

import type { CSSProperties } from 'react'
import AgentChat from '@/components/agent-chat'
import AgentSwitcher from '@/components/agent-switcher'

const CREAM = '#f8f4ec'
const GREY = '#666666'
const FOREST = '#444b3f'

export const metadata = {
  title: 'Assistant Mizan Bilan · AMANA Patrimoine',
  description:
    "Conversation avec Mizan, agent Bilan patrimonial AMANA. Premier diagnostic global, profil de risque, cadrage de la situation.",
}

export default function BilanPage() {
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
    color: FOREST,
  }
  const subtitle: CSSProperties = {
    margin: '6px 0 16px',
    fontSize: 14,
    color: GREY,
  }

  return (
    <main style={wrap}>
      <header style={header}>
        <h1 style={title}>Mizan · Bilan patrimonial</h1>
        <p style={subtitle}>
          Premier diagnostic global, profil de risque, cadrage de votre situation
          patrimoniale.
        </p>
        <AgentSwitcher activeId="mizan" />
      </header>

      <AgentChat
        agentName="Mizan"
        agentRole="Agent Bilan patrimonial"
        agentInitial="M"
        apiPath="/api/agents/mizan"
        agentColor={FOREST}
        welcomeMessage="Faisons le point sur votre patrimoine ensemble"
        examples={[
          'Je suis salarié, 35 ans, 2 enfants, patrimoine 80 k€. Comment je commence ?',
          'Quelle différence entre un PER et une assurance-vie en finance islamique ?',
          "C'est quoi la SCPI NCap Education Santé ?",
          'Comment calcule-t-on la zakat sur des ETF islamiques ?',
        ]}
      />
    </main>
  )
}
