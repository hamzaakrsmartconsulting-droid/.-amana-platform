// components/agent-switcher.tsx — v3 avec 9 agents
// Sprint Agents IA v9 · 29 avril 2026
// Modifications vs v2 (sprint v4) :
//   - Ajout de Wasîla (CRM/relations) sur /assistant/relations
//   - Ajout de Jamâ'a (onboarding) sur /assistant/onboarding
//   - 9 agents au total : Amîn + 6 famille A (conseil) + 2 famille C (support)
'use client'

import Link from 'next/link'
import type { CSSProperties } from 'react'

const FOREST = '#444b3f'
const GOLD = '#c9a55a'

export type AgentTab = {
  id: string
  name: string
  role: string
  href: string
  color: string
  dotColor: string
}

export const AGENTS: AgentTab[] = [
  {
    id: 'amin',
    name: 'Amîn',
    role: 'Orchestrateur',
    href: '/assistant',
    color: '#1F3A8A',
    dotColor: GOLD,
  },
  {
    id: 'mizan',
    name: 'Mizan',
    role: 'Bilan patrimonial',
    href: '/assistant/bilan',
    color: FOREST,
    dotColor: GOLD,
  },
  {
    id: 'tartib',
    name: 'Tartîb',
    role: 'Allocation',
    href: '/assistant/allocation',
    color: '#5B3F8C',
    dotColor: '#FAF7F2',
  },
  {
    id: 'tahara',
    name: 'Tahara',
    role: 'Sharia Compliance',
    href: '/assistant/sharia',
    color: '#3B6D11',
    dotColor: '#FAF7F2',
  },
  {
    id: 'zakiya',
    name: 'Zakiya',
    role: 'Zakat',
    href: '/assistant/zakat',
    color: '#BA7517',
    dotColor: '#FAF7F2',
  },
  {
    id: 'sakan',
    name: 'Sakan',
    role: 'Immobilier & Mourabaha',
    href: '/assistant/immobilier',
    color: '#854F0B',
    dotColor: '#FAF7F2',
  },
  {
    id: 'wirth',
    name: 'Wirth',
    role: 'Mirath et succession',
    href: '/assistant/mirath',
    color: '#791F1F',
    dotColor: '#FAF7F2',
  },
  {
    id: 'wasila',
    name: 'Wasîla',
    role: 'CRM & relations',
    href: '/assistant/relations',
    color: '#0E7490',
    dotColor: GOLD,
  },
  {
    id: 'jamaa',
    name: 'Jamâ’a',
    role: 'Onboarding',
    href: '/assistant/onboarding',
    color: '#9D174D',
    dotColor: GOLD,
  },
]

type Props = { activeId: string }

export default function AgentSwitcher({ activeId }: Props) {
  const row: CSSProperties = {
    display: 'flex',
    justifyContent: 'center',
    gap: 8,
    flexWrap: 'wrap',
    marginTop: 4,
  }

  return (
    <div style={row}>
      {AGENTS.map((agent) => {
        const isActive = agent.id === activeId
        const tabStyle: CSSProperties = {
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 16px',
          background: isActive ? agent.color : 'rgba(68, 75, 63, 0.08)',
          color: isActive ? '#f8f4ec' : '#444b3f',
          borderRadius: 999,
          fontSize: 13,
          fontWeight: 500,
          textDecoration: 'none',
          border: 'none',
          transition: 'background 0.15s, color 0.15s',
        }
        const dotStyle: CSSProperties = {
          width: 8,
          height: 8,
          borderRadius: 4,
          background: agent.dotColor,
        }

        if (isActive) {
          return (
            <span key={agent.id} style={tabStyle}>
              <span style={dotStyle} />
              {agent.name} · {agent.role}
            </span>
          )
        }

        return (
          <Link key={agent.id} href={agent.href} style={tabStyle}>
            <span style={dotStyle} />
            {agent.name} · {agent.role}
          </Link>
        )
      })}
    </div>
  )
}
