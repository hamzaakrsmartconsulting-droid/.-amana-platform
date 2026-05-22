// app/assistant/layout.tsx
// Sprint Agents IA v6 · 29 avril 2026
// Layout englobant toutes les pages /assistant/* avec la sidebar dossiers à gauche

import type { CSSProperties } from 'react'
import DossierSidebar from '@/components/dossier-sidebar'

export default function AssistantLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const root: CSSProperties = {
    display: 'flex',
    minHeight: '100vh',
    background: '#f8f4ec',
  }
  const main: CSSProperties = {
    flex: 1,
    minHeight: '100vh',
    overflow: 'auto',
  }

  return (
    <div style={root}>
      <DossierSidebar />
      <main style={main}>{children}</main>
    </div>
  )
}
