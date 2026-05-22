// app/assistant/page.tsx — page Amîn (orchestrateur, point d'entrée par défaut)
// Sprint Agents IA v4 · 28 avril 2026
// /assistant pointe désormais sur Amîn (au lieu de Mizan dans v3)

import type { CSSProperties } from 'react'
import AgentChat from '@/components/agent-chat'
import AgentSwitcher from '@/components/agent-switcher'

const CREAM = '#f8f4ec'
const GREY = '#666666'
const AMIN_COLOR = '#1F3A8A'

export const metadata = {
  title: 'Assistant Amîn · AMANA Patrimoine',
  description:
    "Conversation avec Amîn, méta-orchestrateur AMANA. Une seule porte d'entrée pour interroger les 6 agents spécialistes (Mizan, Tartîb, Tahara, Zakiya, Sakan, Wirth).",
}

export default function AssistantPage() {
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
    color: AMIN_COLOR,
  }
  const subtitle: CSSProperties = {
    margin: '6px 0 16px',
    fontSize: 14,
    color: GREY,
  }

  return (
    <main style={wrap}>
      <header style={header}>
        <h1 style={title}>Amîn · Méta-orchestrateur</h1>
        <p style={subtitle}>
          Une seule porte d'entrée. Amîn comprend votre demande, consulte le ou les
          agents spécialistes pertinents et synthétise leurs apports.
        </p>
        <AgentSwitcher activeId="amin" />
      </header>

      <AgentChat
        agentName="Amîn"
        agentRole="Méta-orchestrateur AMANA"
        agentInitial="A"
        apiPath="/api/agents/amin"
        agentColor={AMIN_COLOR}
        welcomeMessage="Posez votre question. Je consulte les bons spécialistes pour vous."
        examples={[
          "Je suis salarié, 35 ans, 2 enfants, patrimoine 80 k€. Comment je commence chez AMANA ?",
          "Comment articuler ma succession islamique avec le droit français pour ma SCI ?",
          'Quelle allocation cible pour un profil équilibré, halal, 100 k€ disponibles ?',
          "J'ai 50 k€ de liquidités et 30 k€ d'ETF islamic. Comment calculer ma zakat ?",
        ]}
      />
    </main>
  )
}
