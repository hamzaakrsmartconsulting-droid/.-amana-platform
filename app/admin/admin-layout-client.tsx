'use client'

import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const FOREST = '#444b3f'
const GOLD   = '#c9a55a'
const DARK   = '#353b32'

const NAV = [
  {
    href: '/admin',
    label: 'Tableau de bord',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="1" width="6" height="6" rx="1" fill="currentColor" opacity="0.8"/>
        <rect x="9" y="1" width="6" height="6" rx="1" fill="currentColor" opacity="0.8"/>
        <rect x="1" y="9" width="6" height="6" rx="1" fill="currentColor" opacity="0.8"/>
        <rect x="9" y="9" width="6" height="6" rx="1" fill="currentColor" opacity="0.8"/>
      </svg>
    ),
  },
  {
    href: '/admin/produits',
    label: 'Produits',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M2 4h12M2 8h8M2 12h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    href: '/admin/users',
    label: 'Utilisateurs',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="6" cy="5" r="3" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M1 14c0-2.8 2.2-5 5-5s5 2.2 5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        <path d="M12 7v4M10 9h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    href: '/admin/pipeline',
    label: 'Pipeline',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="4" width="3" height="8" rx="1" fill="currentColor" opacity="0.7"/>
        <rect x="6" y="2" width="3" height="10" rx="1" fill="currentColor" opacity="0.85"/>
        <rect x="11" y="5" width="3" height="7" rx="1" fill="currentColor"/>
      </svg>
    ),
  },
  {
    href: '/admin/validations',
    label: 'Validations',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M2 8l4 4 8-8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    href: '/admin/contenus',
    label: 'Contenus légaux',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="1" width="10" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M5 5h5M5 8h5M5 11h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    href: '/admin/settings',
    label: 'Paramètres',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41"
          stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
  },
]

export default function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router   = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth')
    router.refresh()
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f5f3ef' }}>

      {/* ── Sidebar ── */}
      <aside style={{
        width: 220, background: DARK,
        display: 'flex', flexDirection: 'column',
        position: 'fixed', top: 0, left: 0, bottom: 0,
        zIndex: 50,
      }}>
        {/* Logo */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <img src="/amana-logo-header.png" alt="AMANA" style={{ height: 44, width: 'auto', objectFit: 'contain' }}/>
          <div style={{
            marginTop: 8, fontSize: 9, fontWeight: 700,
            color: GOLD, letterSpacing: '0.18em', textTransform: 'uppercase',
            fontFamily: "'Inter', system-ui, sans-serif",
          }}>
            Administration
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV.map(({ href, label, icon }) => {
            const isActive = pathname === href || (href !== '/admin' && pathname.startsWith(href))
            return (
              <a
                key={href}
                href={href}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 12px', borderRadius: 8,
                  textDecoration: 'none',
                  background: isActive ? `rgba(201,165,90,0.12)` : 'transparent',
                  color: isActive ? GOLD : 'rgba(255,255,255,0.55)',
                  fontSize: 13, fontWeight: isActive ? 600 : 400,
                  fontFamily: "'Inter', system-ui, sans-serif",
                  letterSpacing: '0.02em',
                  transition: 'all 0.15s',
                  borderLeft: isActive ? `2px solid ${GOLD}` : '2px solid transparent',
                }}
              >
                {icon}
                {label}
              </a>
            )
          })}
        </nav>

        {/* Footer — Conseiller + Déconnexion */}
        <div style={{ padding: '12px 10px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <a href="/conseiller" style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '9px 12px', borderRadius: 8, textDecoration: 'none',
            color: 'rgba(255,255,255,0.4)', fontSize: 12,
            fontFamily: "'Inter', system-ui, sans-serif",
            transition: 'color 0.15s',
          }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 12V7L7 2L12 7V12H9V9H5V12H2Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
            </svg>
            Espace conseiller
          </a>
          <button onClick={handleLogout} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '9px 12px', borderRadius: 8,
            background: 'none', border: 'none',
            color: 'rgba(255,255,255,0.35)', fontSize: 12,
            fontFamily: "'Inter', system-ui, sans-serif",
            cursor: 'pointer', textAlign: 'left',
            transition: 'color 0.15s',
          }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M5 1H2a1 1 0 00-1 1v9a1 1 0 001 1h3M9 9.5L12 6.5M12 6.5L9 3.5M12 6.5H5"
                stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Déconnexion
          </button>
        </div>
      </aside>

      {/* ── Contenu principal ── */}
      <main style={{ marginLeft: 220, flex: 1, minHeight: '100vh' }}>
        {/* Topbar */}
        <div style={{
          background: 'white', borderBottom: '1px solid #e8e4dc',
          padding: '0 32px', height: 56,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, zIndex: 40,
        }}>
          <div style={{ fontSize: 13, color: '#6d7368', fontFamily: "'Inter', system-ui, sans-serif" }}>
            {NAV.find(n => n.href === pathname || (n.href !== '/admin' && pathname.startsWith(n.href)))?.label ?? 'Admin'}
          </div>
          <div style={{
            fontSize: 11, color: FOREST, fontWeight: 600,
            fontFamily: "'Inter', system-ui, sans-serif",
            background: 'rgba(68,75,63,0.06)', padding: '4px 10px', borderRadius: 20,
            letterSpacing: '0.08em', textTransform: 'uppercase',
          }}>
            Admin
          </div>
        </div>

        <div style={{ padding: '32px' }}>
          {children}
        </div>
      </main>
    </div>
  )
}
