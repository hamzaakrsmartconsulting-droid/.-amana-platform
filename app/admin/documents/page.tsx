'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

const FOREST = '#444b3f'
const GOLD   = '#c9a55a'
const GREY   = '#666666'
const GREY_LIGHT = '#e5e5e5'

type DossierRow = {
  id: string
  prenom: string
  nom: string
  email_client: string | null
  offre_amana_cible: string | null
  statut: string
  created_at: string
  // KYC info
  kyc_statut: string | null
  docs_count: number // generated PDFs
  kyc_cni: boolean
  kyc_domicile: boolean
  kyc_rib: boolean
  kyc_res_fiscale: boolean
  kyc_avis_imp: boolean
  kyc_origine_fonds: boolean
}

function KycBadge({ statut }: { statut: string | null }) {
  if (!statut) return <span style={{ fontSize: 11, color: '#9ca3af' }}>—</span>
  const map: Record<string, { label: string; bg: string; color: string }> = {
    soumis:    { label: 'Soumis',    bg: '#dbeafe', color: '#1d4ed8' },
    valide:    { label: 'Validé',    bg: '#dcfce7', color: '#16a34a' },
    rejete:    { label: 'Rejeté',    bg: '#fee2e2', color: '#dc2626' },
    en_cours:  { label: 'En cours',  bg: '#fef9c3', color: '#854d0e' },
  }
  const s = map[statut] ?? { label: statut, bg: '#f3f4f6', color: '#374151' }
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 20,
      fontSize: 11, fontWeight: 600, background: s.bg, color: s.color,
    }}>
      {s.label}
    </span>
  )
}

function DocDots({ total, filled }: { total: number; filled: number }) {
  return (
    <span style={{ display: 'inline-flex', gap: 3, alignItems: 'center' }}>
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          style={{
            width: 8, height: 8, borderRadius: '50%',
            background: i < filled ? '#16a34a' : '#d1d5db',
            display: 'inline-block',
          }}
        />
      ))}
      <span style={{ fontSize: 11, color: GREY, marginLeft: 4 }}>{filled}/{total}</span>
    </span>
  )
}

export default function AdminDocumentsPage() {
  const [rows, setRows]     = useState<DossierRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')

  useEffect(() => {
    async function load() {
      const sb = createClient()

      const [{ data: dossiers }, { data: kycs }, { data: docCounts }] = await Promise.all([
        sb.from('dossiers').select('id, prenom, nom, email_client, offre_amana_cible, statut, created_at').order('created_at', { ascending: false }),
        sb.from('kyc').select('user_id, statut, doc_identite_url, doc_justif_url, doc_rib_url, doc_residence_fiscale_url, doc_avis_imposition_url, doc_origine_fonds_url'),
        sb.from('documents').select('id, dossier_id'),
      ])

      // Build email → kyc map (join via email_client → auth.users is not RLS accessible, use kyc.user_id)
      // We'll enrich after matching by dossier email
      const kycByUserId = new Map(
        (kycs ?? []).map(k => [k.user_id, k])
      )

      // Doc count by dossier_id
      const docCountMap = new Map<string, number>()
      for (const d of docCounts ?? []) {
        docCountMap.set(d.dossier_id, (docCountMap.get(d.dossier_id) ?? 0) + 1)
      }

      // We need email → user_id to match kyc
      // Fetch onboarding sessions for email→user mapping
      const { data: sessions } = await sb
        .from('onboarding_sessions')
        .select('finalized_user_id, email')
        .not('finalized_user_id', 'is', null)

      const emailToUserId = new Map<string, string>()
      for (const s of sessions ?? []) {
        if (s.email && s.finalized_user_id) {
          emailToUserId.set(s.email.toLowerCase(), s.finalized_user_id)
        }
      }

      const result: DossierRow[] = (dossiers ?? []).map(d => {
        const uid = d.email_client ? emailToUserId.get(d.email_client.toLowerCase()) : undefined
        const kyc = uid ? kycByUserId.get(uid) : undefined

        return {
          id: d.id,
          prenom: d.prenom,
          nom: d.nom,
          email_client: d.email_client,
          offre_amana_cible: d.offre_amana_cible,
          statut: d.statut,
          created_at: d.created_at,
          kyc_statut: kyc?.statut ?? null,
          docs_count: docCountMap.get(d.id) ?? 0,
          kyc_cni: !!kyc?.doc_identite_url,
          kyc_domicile: !!kyc?.doc_justif_url,
          kyc_rib: !!kyc?.doc_rib_url,
          kyc_res_fiscale: !!kyc?.doc_residence_fiscale_url,
          kyc_avis_imp: !!kyc?.doc_avis_imposition_url,
          kyc_origine_fonds: !!kyc?.doc_origine_fonds_url,
        }
      })

      setRows(result)
      setLoading(false)
    }
    load()
  }, [])

  const filtered = rows.filter(r => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      r.nom.toLowerCase().includes(q) ||
      r.prenom.toLowerCase().includes(q) ||
      (r.email_client ?? '').toLowerCase().includes(q)
    )
  })

  return (
    <div>
      <h1 style={{
        fontFamily: "'Cormorant Garamond', Georgia, serif",
        fontSize: 28, color: FOREST, fontWeight: 400, margin: '0 0 4px',
      }}>
        Documents clients
      </h1>
      <p style={{ fontSize: 13, color: GREY, margin: '0 0 24px', fontFamily: "'Inter', system-ui, sans-serif" }}>
        Pièces justificatives et documents générés pour chaque client.
      </p>

      <div style={{ marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Rechercher par nom, prénom, email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%', maxWidth: 420, padding: '9px 14px',
            border: `1px solid ${GREY_LIGHT}`, borderRadius: 8,
            fontSize: 13, fontFamily: "'Inter', system-ui, sans-serif", outline: 'none',
          }}
        />
      </div>

      {loading ? (
        <p style={{ color: GREY, fontSize: 13, fontFamily: "'Inter', system-ui, sans-serif" }}>Chargement…</p>
      ) : (
        <div style={{ overflowX: 'auto', borderRadius: 10, border: `1px solid ${GREY_LIGHT}`, background: 'white' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, fontFamily: "'Inter', system-ui, sans-serif" }}>
            <thead>
              <tr style={{ background: '#f9f9f8', borderBottom: `1px solid ${GREY_LIGHT}` }}>
                {['Client', 'Email', 'Offre', 'KYC', 'Pièces justificatives (6)', 'PDFs générés', ''].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, fontSize: 11, color: GREY, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: '24px 16px', color: GREY, textAlign: 'center' }}>Aucun dossier trouvé</td></tr>
              ) : filtered.map((r, i) => {
                const kycFilled = [r.kyc_cni, r.kyc_domicile, r.kyc_rib, r.kyc_res_fiscale, r.kyc_avis_imp, r.kyc_origine_fonds].filter(Boolean).length
                return (
                  <tr key={r.id} style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${GREY_LIGHT}` : undefined }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: FOREST }}>
                      {r.prenom} {r.nom}
                    </td>
                    <td style={{ padding: '12px 16px', color: GREY }}>
                      {r.email_client ?? '—'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {r.offre_amana_cible ? (
                        <span style={{ fontSize: 11, fontWeight: 600, color: GOLD, textTransform: 'capitalize' }}>
                          {r.offre_amana_cible}
                        </span>
                      ) : '—'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <KycBadge statut={r.kyc_statut} />
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <DocDots total={6} filled={kycFilled} />
                    </td>
                    <td style={{ padding: '12px 16px', color: GREY }}>
                      {r.docs_count > 0 ? (
                        <span style={{ fontWeight: 600, color: FOREST }}>{r.docs_count} PDF{r.docs_count > 1 ? 's' : ''}</span>
                      ) : <span style={{ color: '#9ca3af' }}>—</span>}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <Link
                        href={`/admin/documents/${r.id}`}
                        style={{
                          display: 'inline-block', padding: '6px 14px',
                          background: FOREST, color: 'white', borderRadius: 6,
                          fontSize: 12, fontWeight: 600, textDecoration: 'none',
                          whiteSpace: 'nowrap', fontFamily: "'Inter', system-ui, sans-serif",
                        }}
                      >
                        Voir documents →
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
