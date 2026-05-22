// app/assistant/zakat/page.tsx — Zakiya
// Sprint Agents IA v3 · 27 avril 2026

import type { CSSProperties } from 'react'
import AgentChat from '@/components/agent-chat'
import AgentSwitcher from '@/components/agent-switcher'

const CREAM = '#f8f4ec'
const GREY = '#666666'
const ZAKIYA_COLOR = '#BA7517'

export const metadata = {
  title: 'Assistant Zakiya Zakat · AMANA Patrimoine',
  description:
    "Conversation avec Zakiya, agent Zakat AMANA. Calcul de votre zakat annuelle conformément à AAOIFI 35.",
}

export default function ZakatPage() {
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
    color: ZAKIYA_COLOR,
  }
  const subtitle: CSSProperties = {
    margin: '6px 0 16px',
    fontSize: 14,
    color: GREY,
  }

  return (
    <main style={wrap}>
      <header style={header}>
        <h1 style={title}>Zakiya · Calcul de la Zakat</h1>
        <p style={subtitle}>
          Calcul annuel selon AAOIFI 35, échéancier, attestation, articulation
          fiscale française.
        </p>
        <AgentSwitcher activeId="zakiya" />
      </header>

      <AgentChat
        agentName="Zakiya"
        agentRole="Agent Zakat"
        agentInitial="Z"
        apiPath="/api/agents/zakiya"
        agentColor={ZAKIYA_COLOR}
        welcomeMessage="Calculons ensemble votre zakat annuelle"
        examples={[
          'Comment calculer ma zakat avec 50 k€ de liquidités et 30 k€ en ETF Islamic ?',
          "Quel est le nisab à utiliser en France en 2026 ?",
          'Comment fonctionne la zakat sur ma SCPI NCap Education Santé ?',
          'Puis-je déduire ma zakat de mes impôts français ?',
        ]}
      />
    </main>
  )
}
