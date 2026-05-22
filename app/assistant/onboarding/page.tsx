// app/assistant/onboarding/page.tsx — Jamâ'a (Onboarding)
// Sprint Agents IA v9 · 29 avril 2026

import type { CSSProperties } from 'react'
import AgentChat from '@/components/agent-chat'
import AgentSwitcher from '@/components/agent-switcher'

const CREAM = '#f8f4ec'
const GREY = '#666666'
const JAMAA_COLOR = '#9D174D'

export const metadata = {
  title: "Assistant Jamâ'a Onboarding · AMANA Patrimoine",
  description:
    "Conversation avec Jamâ'a, agent Onboarding AMANA. Funnel d'entrée client : DER → KYC → MIF2 → LM → premier RDV.",
}

export default function OnboardingPage() {
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
    color: JAMAA_COLOR,
  }
  const subtitle: CSSProperties = {
    margin: '6px 0 16px',
    fontSize: 14,
    color: GREY,
  }

  return (
    <main style={wrap}>
      <header style={header}>
        <h1 style={title}>Jamâ’a · Onboarding</h1>
        <p style={subtitle}>
          Funnel d&apos;entrée client AMANA : DER → KYC → MIF2 → LM → premier RDV.
          Adapté aux 3 offres (Mass / Patrimoniale / Premium).
        </p>
        <AgentSwitcher activeId="jamaa" />
      </header>

      <AgentChat
        agentName="Jamâ’a"
        agentRole="Agent Onboarding"
        agentInitial="J"
        apiPath="/api/agents/jamaa"
        agentColor={JAMAA_COLOR}
        welcomeMessage="Cadrons l'onboarding de ce client"
        examples={[
          "Comment je commence l'onboarding d'un nouveau prospect Patrimoniale ?",
          'Quelles étapes restent à faire pour ce dossier ?',
          'Rédige l\'email d\'accueil après signature de la DER.',
          "Prépare un script d'appel pour relancer un KYC en attente depuis 14 jours.",
        ]}
      />
    </main>
  )
}
