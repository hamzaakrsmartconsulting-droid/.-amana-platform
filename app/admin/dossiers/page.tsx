// app/admin/dossiers/page.tsx — v2 avec liens cliquables vers détail
// Sprint Agents IA v7 · 29 avril 2026
// Modif vs v1 : chaque ligne du tableau est cliquable et navigue vers /admin/dossiers/[id]

'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const FOREST = '#3a4d39'
const DARK = '#2a3829'
const GREY = '#666666'
const GREY_LIGHT = '#e5e5e5'

type DossierWithStats = {
  id: string
  conseiller_id: string
  nom: string
  prenom: string
  email_client: string | null
  telephone: string | null
  statut: 'prospect' | 'actif' | 'archive'
  offre_amana_cible: 'mass' | 'patrimoniale' | 'premium' | null
  notes: string | null
  created_at: string
  updated_at: string
  archived_at: string | null
  facts_count: number
  last_activity_at: string
}

export default function AdminDossiersPage() {
  const router = useRouter()
  const [dossiers, setDossiers] = useState<DossierWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('dossiers_with_stats')
        .select('*')
        .order('last_activity_at', { ascending: false })
      if (error) {
        console.error('[admin-dossiers] erreur', error)
      }
      setDossiers((data ?? []) as DossierWithStats[])
      setLoading(false)
    }
    void load()
  }, [])

  const filtered = dossiers.filter((d) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      d.nom.toLowerCase().includes(q) ||
      d.prenom.toLowerCase().includes(q) ||
      (d.email_client ?? '').toLowerCase().includes(q)
    )
  })

  const fmtDate = (s: string) => new Date(s).toLocaleDateString('fr-FR')
  const statusBadge = (statut: string): CSSProperties => {
    const colors: Record<string, { bg: string; fg: string }> = {
      prospect: { bg: '#fef3c7', fg: '#92400e' },
      actif:    { bg: '#d1fae5', fg: '#065f46' },
      archive:  { bg: '#e5e7eb', fg: '#374151' },
    }
    const c = colors[statut] ?? colors.archive
    return {
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 999,
      background: c.bg,
      color: c.fg,
      fontSize: 11,
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
    }
  }

  const rowStyle: CSSProperties = {
    borderBottom: `1px solid ${GREY_LIGHT}`,
    cursor: 'pointer',
    transition: 'background 0.15s',
  }

  return (
    <div>
      <h1 style={{
        fontFamily: "'Cormorant Garamond', Georgia, serif",
        fontSize: 28, color: FOREST, fontWeight: 400, margin: '0 0 6px',
      }}>
        Dossiers
      </h1>
      <p style={{ fontSize: 13, color: GREY, margin: '0 0 24px' }}>
        Tous les dossiers clients/prospects analysés via la plateforme AMANA. Clique sur une ligne pour voir le détail.
      </p>

      <input
        type="text"
        placeholder="Rechercher par nom, prénom, email…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          width: '100%', maxWidth: 400, padding: '10px 14px',
          border: `1px solid ${GREY_LIGHT}`, borderRadius: 10,
          fontSize: 14, marginBottom: 24, boxSizing: 'border-box',
          fontFamily: 'inherit',
        }}
      />

      {loading ? (
        <p>Chargement…</p>
      ) : filtered.length === 0 ? (
        <p style={{ color: GREY, fontStyle: 'italic' }}>
          {dossiers.length === 0
            ? "Aucun dossier pour l'instant. Va sur /assistant et demande à Mizan de créer ton premier dossier."
            : 'Aucun dossier ne correspond à ta recherche.'}
        </p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${GREY_LIGHT}`, textAlign: 'left' }}>
              <th style={{ padding: '10px 8px', color: GREY, fontWeight: 600 }}>Nom</th>
              <th style={{ padding: '10px 8px', color: GREY, fontWeight: 600 }}>Email</th>
              <th style={{ padding: '10px 8px', color: GREY, fontWeight: 600 }}>Statut</th>
              <th style={{ padding: '10px 8px', color: GREY, fontWeight: 600 }}>Offre</th>
              <th style={{ padding: '10px 8px', color: GREY, fontWeight: 600, textAlign: 'right' }}>Faits</th>
              <th style={{ padding: '10px 8px', color: GREY, fontWeight: 600 }}>Dernière activité</th>
              <th style={{ padding: '10px 8px', color: GREY, fontWeight: 600 }}>Créé</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((d) => (
              <tr
                key={d.id}
                style={rowStyle}
                onClick={() => router.push(`/admin/dossiers/${d.id}`)}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#fafafa')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <td style={{ padding: '10px 8px', color: DARK, fontWeight: 600 }}>
                  {d.prenom} {d.nom}
                </td>
                <td style={{ padding: '10px 8px', color: GREY }}>
                  {d.email_client ?? '—'}
                </td>
                <td style={{ padding: '10px 8px' }}>
                  <span style={statusBadge(d.statut)}>{d.statut}</span>
                </td>
                <td style={{ padding: '10px 8px', color: GREY }}>
                  {d.offre_amana_cible ?? '—'}
                </td>
                <td style={{ padding: '10px 8px', color: DARK, textAlign: 'right' }}>
                  {d.facts_count}
                </td>
                <td style={{ padding: '10px 8px', color: GREY }}>
                  {fmtDate(d.last_activity_at)}
                </td>
                <td style={{ padding: '10px 8px', color: GREY }}>
                  {fmtDate(d.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
