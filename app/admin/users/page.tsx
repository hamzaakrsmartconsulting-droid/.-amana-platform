'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const FOREST = '#3a4d39'
const GOLD   = '#c9a55a'

const ROLES = ['client', 'conseiller', 'admin'] as const
type Role = typeof ROLES[number]

interface UserRow {
  id:         string
  full_name:  string | null
  role:       Role
  created_at: string
  tenant_id:  string | null
}

const ROLE_COLOR: Record<Role, string> = {
  client:     '#4a7a9b',
  conseiller: FOREST,
  admin:      GOLD,
}

export default function AdminUsersPage() {
  const [users,   setUsers]   = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const [saving,  setSaving]  = useState<string | null>(null)
  const [msg,     setMsg]     = useState('')

  const supabase = createClient()

  useEffect(() => { loadUsers() }, [])

  async function loadUsers() {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, role, created_at, tenant_id')
      .order('created_at', { ascending: false })
    setUsers((data ?? []) as UserRow[])
    setLoading(false)
  }

  async function changeRole(userId: string, newRole: Role) {
    setSaving(userId)
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId)
    if (error) {
      setMsg(`Erreur : ${error.message}`)
    } else {
      setUsers(u => u.map(x => x.id === userId ? { ...x, role: newRole } : x))
      setMsg('Rôle mis à jour.')
    }
    setSaving(null)
    setTimeout(() => setMsg(''), 3000)
  }

  const filtered = users.filter(u =>
    !search || (u.full_name ?? '').toLowerCase().includes(search.toLowerCase()) || u.id.includes(search)
  )

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 28, color: FOREST, fontWeight: 400, margin: '0 0 4px' }}>
            Utilisateurs & rôles
          </h1>
          <p style={{ fontSize: 13, color: '#8a9a89', margin: 0, fontFamily: "'Inter', system-ui, sans-serif" }}>
            {users.length} utilisateur{users.length > 1 ? 's' : ''} enregistré{users.length > 1 ? 's' : ''}
          </p>
        </div>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher…"
          style={{
            padding: '9px 14px', border: '1.5px solid #ddd5c8', borderRadius: 8,
            fontSize: 13, width: 220, background: 'white', outline: 'none',
            fontFamily: "'Inter', system-ui, sans-serif", color: FOREST,
          }}
        />
      </div>

      {msg && (
        <div style={{
          background: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: 8,
          padding: '10px 16px', marginBottom: 16, fontSize: 13, color: '#1b5e20',
          fontFamily: "'Inter', system-ui, sans-serif",
        }}>{msg}</div>
      )}

      <div style={{ background: 'white', borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        {/* Header tableau */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 120px 160px 100px',
          padding: '12px 20px', borderBottom: '1px solid #f0ece4',
          fontSize: 10, fontWeight: 700, color: '#8a9a89',
          letterSpacing: '0.1em', textTransform: 'uppercase',
          fontFamily: "'Inter', system-ui, sans-serif",
        }}>
          <div>Utilisateur</div>
          <div>Rôle actuel</div>
          <div>Changer le rôle</div>
          <div>Inscription</div>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#8a9a89', fontFamily: "'Inter', system-ui, sans-serif", fontSize: 13 }}>
            Chargement…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#8a9a89', fontFamily: "'Inter', system-ui, sans-serif", fontSize: 13 }}>
            Aucun utilisateur trouvé.
          </div>
        ) : filtered.map((user, i) => (
          <div key={user.id} style={{
            display: 'grid', gridTemplateColumns: '1fr 120px 160px 100px',
            padding: '14px 20px', alignItems: 'center',
            borderBottom: i < filtered.length - 1 ? '1px solid #f8f5f0' : 'none',
          }}>
            {/* Nom */}
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: FOREST, fontFamily: "'Inter', system-ui, sans-serif" }}>
                {user.full_name ?? 'Sans nom'}
              </div>
              <div style={{ fontSize: 11, color: '#9aaa99', marginTop: 2, fontFamily: "'Inter', system-ui, sans-serif" }}>
                {user.id.slice(0, 8)}…
              </div>
            </div>

            {/* Badge rôle */}
            <div>
              <span style={{
                display: 'inline-block', padding: '3px 10px', borderRadius: 20,
                fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
                textTransform: 'uppercase',
                background: `${ROLE_COLOR[user.role]}18`,
                color: ROLE_COLOR[user.role],
                fontFamily: "'Inter', system-ui, sans-serif",
              }}>
                {user.role}
              </span>
            </div>

            {/* Select rôle */}
            <div>
              <select
                value={user.role}
                onChange={e => changeRole(user.id, e.target.value as Role)}
                disabled={saving === user.id}
                style={{
                  padding: '6px 10px', border: '1.5px solid #ddd5c8', borderRadius: 7,
                  fontSize: 12, background: 'white', color: FOREST, cursor: 'pointer',
                  fontFamily: "'Inter', system-ui, sans-serif", outline: 'none',
                  opacity: saving === user.id ? 0.6 : 1,
                }}
              >
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            {/* Date */}
            <div style={{ fontSize: 12, color: '#9aaa99', fontFamily: "'Inter', system-ui, sans-serif" }}>
              {new Date(user.created_at).toLocaleDateString('fr-FR')}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
