'use client'

import { useState } from 'react'
import DossierSidebar from '@/components/dossier-sidebar'

export default function AssistantShell({ children }: { children: React.ReactNode }) {
  const [navOpen, setNavOpen] = useState(false)

  return (
    <div className={`assistant-shell${navOpen ? ' dossier-nav-open' : ''}`}>
      <button
        type="button"
        className="dossier-sidebar-toggle"
        aria-label="Ouvrir le menu dossiers"
        onClick={() => setNavOpen(true)}
      >
        Dossiers
      </button>
      {navOpen && (
        <div
          className="dossier-sidebar-backdrop"
          aria-hidden
          onClick={() => setNavOpen(false)}
        />
      )}
      <DossierSidebar onNavigate={() => setNavOpen(false)} />
      <main>{children}</main>
    </div>
  )
}
