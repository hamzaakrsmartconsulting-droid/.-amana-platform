'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const FOREST = '#444b3f'
const GOLD   = '#c9a55a'

interface Stats {
  totalClients:       number
  totalConseillers:   number
  kycEnAttente:       number
  projetsActifs:      number
  encoursTotalEur:    number
  produitsActifs:     number
  validationsEnAttente: number
}

export default function AdminDashboardPage() {
  const [stats,   setStats]   = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const sb = createClient()
      const [
        { count: clients },
        { count: conseillers },
        { count: kycAttente },
        { data: projets },
        { count: produits },
        { count: gatesEnAttente },
      ] = await Promise.all([
        sb.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'client'),
        sb.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'conseiller'),
        sb.from('kyc').select('*', { count: 'exact', head: true }).eq('statut', 'soumis'),
        sb.from('projets').select('montant').eq('statut', 'actif'),
        sb.from('produits').select('*', { count: 'exact', head: true }).eq('actif', true),
        sb.from('validation_gates').select('*', { count: 'exact', head: true }).eq('decision', 'pending'),
      ])
      const encours = (projets ?? []).reduce((s, p) => s + (p.montant ?? 0), 0)
      setStats({
        totalClients:         clients       ?? 0,
        totalConseillers:     conseillers   ?? 0,
        kycEnAttente:         kycAttente    ?? 0,
        projetsActifs:        (projets ?? []).length,
        encoursTotalEur:      encours,
        produitsActifs:       produits      ?? 0,
        validationsEnAttente: gatesEnAttente ?? 0,
      })
      setLoading(false)
    }
    load()
  }, [])

  const fmt = (n: number) =>
    n >= 1_000_000 ? `${(n/1_000_000).toFixed(2)} M€`
    : n >= 1_000   ? `${(n/1_000).toFixed(0)} k€`
    : `${n} €`

  const KPI = ({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) => (
    <div style={{
      background: 'white', borderRadius: 14, padding: '24px 28px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      borderTop: `3px solid ${accent ?? FOREST}`,
    }}>
      <div style={{ fontSize: 26, fontWeight: 700, color: FOREST, fontFamily: "'Inter', system-ui, sans-serif", marginBottom: 4 }}>
        {loading ? '—' : value}
      </div>
      <div style={{ fontSize: 13, color: '#5a6a59', fontFamily: "'Inter', system-ui, sans-serif" }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: '#9aaa99', marginTop: 4, fontFamily: "'Inter', system-ui, sans-serif" }}>{sub}</div>}
    </div>
  )

  return (
    <div>
      <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 28, color: FOREST, fontWeight: 400, margin: '0 0 6px' }}>
        Tableau de bord
      </h1>
      <p style={{ fontSize: 13, color: '#8a9a89', margin: '0 0 32px', fontFamily: "'Inter', system-ui, sans-serif" }}>
        Vue d&apos;ensemble de la plateforme AMANA
      </p>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
        <KPI label="Clients actifs"       value={stats?.totalClients ?? 0}     accent={FOREST} />
        <KPI label="Conseillers"          value={stats?.totalConseillers ?? 0}  accent="#4a7a9b" />
        <KPI label="KYC en attente"       value={stats?.kycEnAttente ?? 0}      accent="#e67e22" sub="À valider" />
        <KPI label="Projets actifs"       value={stats?.projetsActifs ?? 0}     accent={GOLD} />
        <KPI label="Encours total"        value={fmt(stats?.encoursTotalEur ?? 0)} accent={FOREST} />
        <KPI label="Produits actifs"      value={stats?.produitsActifs ?? 0}    accent="#6ab04c" />
        <KPI
          label="Validations en attente"
          value={stats?.validationsEnAttente ?? 0}
          accent="#dc2626"
          sub={(stats?.validationsEnAttente ?? 0) > 0 ? 'Action requise' : undefined}
        />
      </div>

      {/* Lien rapide validations si en attente */}
      {(stats?.validationsEnAttente ?? 0) > 0 && (
        <a href="/admin/validations" style={{
          display: 'flex', alignItems: 'center', gap: 12,
          background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: 12,
          padding: '14px 20px', marginBottom: 24, textDecoration: 'none',
        }}>
          <span style={{ fontSize: 20 }}>🔔</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#dc2626', fontFamily: "'Inter', system-ui, sans-serif" }}>
            {stats?.validationsEnAttente} verrou{(stats?.validationsEnAttente ?? 0) > 1 ? 's' : ''} en attente de votre décision
          </span>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: '#ef4444' }}>Voir →</span>
        </a>
      )}

      {/* Actions rapides */}
      <h2 style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: 14, fontWeight: 600, color: FOREST, letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 16px' }}>
        Actions rapides
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[
          { href: '/admin/users',    label: 'Gérer les utilisateurs', icon: '👥' },
          { href: '/admin/produits', label: 'Gérer les produits',     icon: '📦' },
          { href: '/admin/contenus', label: 'Éditer les contenus',    icon: '📝' },
          { href: '/admin/settings', label: 'Paramètres site',        icon: '⚙️' },
        ].map(({ href, label, icon }) => (
          <a key={href} href={href} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 10, padding: '24px 16px',
            background: 'white', borderRadius: 14, textDecoration: 'none',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            border: '1.5px solid #e8e4dc',
            transition: 'border-color 0.15s, box-shadow 0.15s',
          }}>
            <span style={{ fontSize: 24 }}>{icon}</span>
            <span style={{ fontSize: 12, color: FOREST, fontWeight: 600, textAlign: 'center', fontFamily: "'Inter', system-ui, sans-serif" }}>
              {label}
            </span>
          </a>
        ))}
      </div>
    </div>
  )
}
