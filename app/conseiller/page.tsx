'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const FOREST = '#444b3f'
const GOLD = '#c9a55a'
const CREAM = '#f8f4ec'

type Client = {
  id: string
  email: string
  nom: string
  prenom: string
  created_at: string
  email_confirmed: boolean
  kyc: boolean
  mif2: { profil_mif2?: string; score_mif2?: number } | null
  dossier_id?: string | null
}

function Badge({ ok }: { ok: boolean }) {
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: '20px',
      fontSize: '12px', fontWeight: 600,
      background: ok ? '#e8f5e9' : '#fff8e1',
      color: ok ? '#2e7d32' : '#f57f17',
    }}>
      {ok ? '✓ Complété' : '○ En attente'}
    </span>
  )
}

function ProfilBadge({ profil }: { profil?: string }) {
  if (!profil) return <span style={{ color: '#ccc', fontSize: '13px' }}>—</span>
  const colors: Record<string, { bg: string; color: string }> = {
    débutant: { bg: '#e3f2fd', color: '#1565c0' },
    averti: { bg: '#fff3e0', color: '#e65100' },
    expert: { bg: '#f3e5f5', color: '#6a1b9a' },
  }
  const c = colors[profil] ?? { bg: '#f5f5f5', color: '#333' }
  return (
    <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, background: c.bg, color: c.color, textTransform: 'capitalize' }}>
      {profil}
    </span>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function ConseillerPage() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [filtered, setFiltered] = useState<Client[]>([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'tous' | 'complets' | 'incomplets'>('tous')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/admin/clients')
      .then(r => {
        if (r.status === 401) throw new Error('non-autorise')
        if (!r.ok) throw new Error('erreur')
        return r.json()
      })
      .then(d => {
        setClients(d.clients)
        setLoading(false)
      })
      .catch(e => {
        setError(e.message === 'non-autorise'
          ? "Accès réservé aux conseillers AMANA."
          : "Erreur lors du chargement des clients.")
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    let list = [...clients]
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(c =>
        c.email.toLowerCase().includes(q) ||
        c.nom.toLowerCase().includes(q) ||
        c.prenom.toLowerCase().includes(q)
      )
    }
    if (filter === 'complets') list = list.filter(c => c.kyc && c.mif2)
    if (filter === 'incomplets') list = list.filter(c => !c.kyc || !c.mif2)
    setFiltered(list)
  }, [search, filter, clients])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth')
  }

  const total = clients.length
  const complets = clients.filter(c => c.kyc && c.mif2).length

  return (
    <div style={{ minHeight: '100vh', background: CREAM }}>
      <header style={{ background: FOREST, padding: '0 48px', height: '68px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <a href="/" style={{ fontFamily: 'Georgia, serif', fontSize: '20px', color: CREAM, letterSpacing: '0.15em', textDecoration: 'none' }}>AMANA</a>
          <span style={{ fontSize: '12px', color: '#8aab89', fontFamily: 'system-ui, sans-serif', letterSpacing: '0.08em', fontWeight: 600 }}>VUE CONSEILLER</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <a href="/dashboard" style={{ fontSize: '13px', color: '#c8d8c7', fontFamily: 'system-ui, sans-serif', textDecoration: 'none' }}>Mon espace</a>
          <button onClick={handleLogout} style={{ padding: '7px 16px', background: 'transparent', color: CREAM, border: '1px solid rgba(255,255,255,0.3)', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', fontFamily: 'system-ui, sans-serif' }}>
            Déconnexion
          </button>
        </div>
      </header>

      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ marginBottom: '32px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '26px', color: FOREST, margin: '0 0 6px', fontWeight: 400 }}>Tableau de bord clients</h1>
            {!loading && !error && (
              <p style={{ fontSize: '14px', color: '#7a8a79', margin: 0, fontFamily: 'system-ui, sans-serif' }}>
                <strong style={{ color: FOREST }}>{total}</strong> client{total > 1 ? 's' : ''} inscrit{total > 1 ? 's' : ''} —{' '}
                <strong style={{ color: '#2e7d32' }}>{complets}</strong> dossier{complets > 1 ? 's' : ''} complet{complets > 1 ? 's' : ''}
              </p>
            )}
          </div>
          {!loading && !error && total > 0 && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: '#aaa', fontWeight: 600, letterSpacing: '0.08em', marginBottom: '6px' }}>TAUX DE COMPLÉTION</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: GOLD }}>{Math.round(complets / total * 100)}%</div>
            </div>
          )}
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '80px 0', fontSize: '15px', color: '#7a8a79' }}>Chargement des clients…</div>
        )}

        {error && (
          <div style={{ background: '#fde8e8', border: '1px solid #f5c6c6', borderRadius: '12px', padding: '24px', fontSize: '15px', color: '#c0392b', textAlign: 'center' }}>
            {error}
          </div>
        )}

        {!loading && !error && (
          <>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Rechercher par nom ou email…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  flex: 1, minWidth: '220px', padding: '10px 16px',
                  border: '1px solid #d4c5a9', borderRadius: '8px',
                  fontSize: '14px', fontFamily: 'system-ui, sans-serif',
                  color: FOREST, outline: 'none', background: 'white',
                }}
              />
              {(['tous', 'complets', 'incomplets'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{
                    padding: '10px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'system-ui, sans-serif',
                    background: filter === f ? FOREST : 'white',
                    color: filter === f ? 'white' : '#7a8a79',
                    border: `1px solid ${filter === f ? FOREST : '#d4c5a9'}`,
                  }}
                >
                  {f === 'tous' ? 'Tous' : f === 'complets' ? 'Complets' : 'Incomplets'}
                </button>
              ))}
            </div>

            {filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#7a8a79', fontSize: '15px' }}>
                Aucun client trouvé.
              </div>
            ) : (
              <div style={{ background: 'white', borderRadius: '14px', boxShadow: '0 2px 12px rgba(68,75,63,0.06)', border: '1px solid #e8e0d0', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f9f6ef', borderBottom: '1px solid #e8e0d0' }}>
                      {['Client', 'Email', 'Inscription', 'KYC', 'Profil MIF2', 'Score', 'Actions'].map(h => (
                        <th key={h} style={{
                          padding: '12px 16px', textAlign: 'left',
                          fontSize: '11px', fontWeight: 700, color: '#7a8a79',
                          letterSpacing: '0.08em', fontFamily: 'system-ui, sans-serif',
                        }}>
                          {h.toUpperCase()}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((c, i) => (
                      <tr key={c.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid #f0ebe0' : 'none' }}>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: FOREST, fontFamily: 'system-ui, sans-serif' }}>
                            {c.prenom || c.nom ? `${c.prenom} ${c.nom}`.trim() : '—'}
                          </div>
                          {!c.email_confirmed && (
                            <div style={{ fontSize: '11px', color: '#f57f17', marginTop: '2px' }}>Email non confirmé</div>
                          )}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ fontSize: '13px', color: '#5a6a59', fontFamily: 'system-ui, sans-serif' }}>{c.email}</span>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ fontSize: '13px', color: '#7a8a79', fontFamily: 'system-ui, sans-serif', whiteSpace: 'nowrap' }}>
                            {formatDate(c.created_at)}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <Badge ok={c.kyc} />
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <ProfilBadge profil={c.mif2?.profil_mif2} />
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          {c.mif2?.score_mif2 != null ? (
                            <span style={{ fontSize: '14px', fontWeight: 700, color: GOLD }}>
                              {c.mif2.score_mif2}<span style={{ fontSize: '11px', color: '#aaa', fontWeight: 400 }}>/25</span>
                            </span>
                          ) : (
                            <span style={{ color: '#ccc', fontSize: '13px' }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <a
                              href={c.dossier_id
                                ? `/conseiller/dossiers/${c.dossier_id}`
                                : `/conseiller/dossier?uid=${c.id}`}
                              style={{
                                display: 'inline-block', padding: '6px 14px',
                                background: FOREST, color: 'white',
                                borderRadius: '6px', fontSize: '12px', fontWeight: 600,
                                textDecoration: 'none', fontFamily: 'system-ui, sans-serif',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              Voir dossier →
                            </a>
                            {c.kyc && c.mif2 && (
                              <a
                                href={`/rapport-adequation?uid=${c.id}`}
                                style={{
                                  display: 'inline-block', padding: '6px 14px',
                                  background: 'transparent', color: FOREST,
                                  border: `1px solid ${FOREST}`,
                                  borderRadius: '6px', fontSize: '12px', fontWeight: 600,
                                  textDecoration: 'none', fontFamily: 'system-ui, sans-serif',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                Rapport →
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
