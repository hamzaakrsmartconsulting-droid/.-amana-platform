'use client'

import React from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const FOREST = '#444b3f'
const GOLD   = '#c9a55a'

const Logo = () => (
  <img
    src="/amana-logo-header.png"
    alt="AMANA Patrimoine"
    style={{ height: 56, width: 'auto', objectFit: 'contain', display: 'block' }}
  />
)

interface AmanaHeaderProps {
  backHref?:     string
  backLabel?:    string
  rightContent?: React.ReactNode
  showLogout?:   boolean
  userInitials?: string
}

export default function AmanaHeader({
  backHref,
  backLabel    = 'Retour',
  rightContent,
  showLogout   = false,
  userInitials,
}: AmanaHeaderProps) {
  const router   = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/auth')
    router.refresh()
  }

  return (
    <header className="amana-header" style={{
      background: FOREST,
      padding: '0 24px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      borderBottom: '1px solid rgba(201,165,90,0.15)',
      height: 64,
    }}>
      {/* Left */}
      <div style={{ minWidth: 80 }}>
        {backHref && (
          <a href={backHref} className="amana-header-back" style={{
            fontSize: 12, color: 'rgba(255,255,255,0.45)',
            textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6,
            fontFamily: "'Inter', system-ui, sans-serif",
            fontWeight: 500, letterSpacing: '0.03em',
          }}>
            ← <span>{backLabel}</span>
          </a>
        )}
      </div>

      {/* Center */}
      <a href="/dashboard" style={{ textDecoration: 'none', lineHeight: 0 }}>
        <Logo />
      </a>

      {/* Right */}
      <div style={{ minWidth: 80, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12 }}>
        {rightContent}
        {userInitials && (
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'rgba(255,255,255,0.12)',
            border: '1px solid rgba(255,255,255,0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, color: 'white',
            fontFamily: "'Inter', system-ui, sans-serif",
            letterSpacing: '0.05em',
          }}>
            {userInitials}
          </div>
        )}
        {showLogout && (
          <button
            onClick={handleLogout}
            title="Se déconnecter"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 7,
              color: 'rgba(255,255,255,0.65)',
              fontSize: 12, fontWeight: 500,
              fontFamily: "'Inter', system-ui, sans-serif",
              cursor: 'pointer',
              letterSpacing: '0.03em',
              transition: 'background 0.15s, color 0.15s',
            }}
            onMouseEnter={e => {
              const b = e.currentTarget
              b.style.background = 'rgba(255,255,255,0.15)'
              b.style.color = 'rgba(255,255,255,0.9)'
            }}
            onMouseLeave={e => {
              const b = e.currentTarget
              b.style.background = 'rgba(255,255,255,0.08)'
              b.style.color = 'rgba(255,255,255,0.65)'
            }}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M5 1H2a1 1 0 00-1 1v9a1 1 0 001 1h3M9 9.5L12 6.5M12 6.5L9 3.5M12 6.5H5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Déconnexion
          </button>
        )}
      </div>
    </header>
  )
}

/* Avatar helper — conservé pour compatibilité */
export function UserAvatar({ initials, onClick }: { initials: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} style={{
      width: 32, height: 32, borderRadius: '50%',
      background: 'rgba(255,255,255,0.12)',
      border: '1px solid rgba(255,255,255,0.18)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 12, fontWeight: 700, color: 'white',
      fontFamily: "'Inter', system-ui, sans-serif",
      cursor: 'pointer', letterSpacing: '0.05em',
      transition: 'background 0.15s',
    }}>
      {initials}
    </button>
  )
}
