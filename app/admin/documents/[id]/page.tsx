'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

const FOREST = '#444b3f'
const GOLD   = '#c9a55a'
const GREY   = '#666666'
const GREY_LIGHT = '#e5e5e5'

type Tab = 'pieces' | 'generes'

type KycDoc = {
  key: string
  label: string
  url: string | null
  present: boolean
}

type GenDoc = {
  id: string
  type: string
  filename: string | null
  url: string | null
  status: string
  created_at: string
}

type Dossier = {
  id: string
  prenom: string
  nom: string
  email_client: string | null
  offre_amana_cible: string | null
  statut: string
}

const DOC_TYPE_LABEL: Record<string, string> = {
  der: 'DER — Entrée en relation',
  lm: 'Lettre de mission',
  ra: "Rapport d'adéquation",
  bilan: 'Bilan patrimonial',
  preco: 'Préconisation',
  zakat: 'Calendrier Zakat',
  succession: 'Stratégie successorale',
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    draft:    { bg: '#fef9c3', color: '#854d0e' },
    sent:     { bg: '#dbeafe', color: '#1d4ed8' },
    signed:   { bg: '#dcfce7', color: '#16a34a' },
    archived: { bg: '#f3f4f6', color: '#374151' },
  }
  const s = map[status] ?? { bg: '#f3f4f6', color: '#374151' }
  return (
    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: s.bg, color: s.color }}>
      {status}
    </span>
  )
}

export default function AdminDocumentDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const dossierId = params.id

  const [tab, setTab]             = useState<Tab>('pieces')
  const [dossier, setDossier]     = useState<Dossier | null>(null)
  const [kycDocs, setKycDocs]     = useState<KycDoc[]>([])
  const [genDocs, setGenDocs]     = useState<GenDoc[]>([])
  const [loadingKyc, setLoadingKyc] = useState(true)
  const [loadingGen, setLoadingGen] = useState(true)
  const [errorKyc, setErrorKyc]   = useState<string | null>(null)
  const [errorGen, setErrorGen]   = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    // Load dossier info
    fetch(`/api/dossiers/${dossierId}`)
      .then(r => r.json())
      .then(d => setDossier(d.dossier ?? null))
      .catch(() => {})

    // Load KYC pieces
    setLoadingKyc(true)
    fetch(`/api/admin/dossiers/${dossierId}/kyc-documents`)
      .then(r => r.json())
      .then(d => { setKycDocs(d.documents ?? []); setLoadingKyc(false) })
      .catch(() => { setErrorKyc('Impossible de charger les pièces KYC.'); setLoadingKyc(false) })

    // Load generated PDFs
    setLoadingGen(true)
    fetch(`/api/admin/dossiers/${dossierId}/review-documents`)
      .then(r => r.json())
      .then(d => { setGenDocs(d.documents ?? []); setLoadingGen(false) })
      .catch(() => { setErrorGen('Impossible de charger les documents générés.'); setLoadingGen(false) })
  }, [dossierId])

  const kycFilled = kycDocs.filter(d => d.present).length

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button
          onClick={() => router.push('/admin/documents')}
          style={{
            background: 'none', border: `1px solid ${GREY_LIGHT}`, borderRadius: 6,
            padding: '6px 12px', fontSize: 12, cursor: 'pointer', color: GREY,
            fontFamily: "'Inter', system-ui, sans-serif",
          }}
        >
          ← Retour
        </button>
        <div>
          <h1 style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: 24, color: FOREST, fontWeight: 400, margin: 0,
          }}>
            {dossier ? `${dossier.prenom} ${dossier.nom}` : '…'}
          </h1>
          {dossier?.email_client && (
            <p style={{ margin: 0, fontSize: 12, color: GREY, fontFamily: "'Inter', system-ui, sans-serif" }}>
              {dossier.email_client}
              {dossier.offre_amana_cible && ` · Offre ${dossier.offre_amana_cible}`}
            </p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: `2px solid ${GREY_LIGHT}`, marginBottom: 24, gap: 0 }}>
        {([
          { key: 'pieces', label: `📎 Pièces justificatives (${kycFilled}/6)` },
          { key: 'generes', label: `📄 Documents générés (${genDocs.length})` },
        ] as { key: Tab; label: string }[]).map(t => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setPreviewUrl(null) }}
            style={{
              background: 'none', border: 'none', padding: '10px 20px',
              fontSize: 13, fontWeight: tab === t.key ? 700 : 400,
              color: tab === t.key ? FOREST : GREY,
              borderBottom: tab === t.key ? `2px solid ${FOREST}` : '2px solid transparent',
              marginBottom: -2, cursor: 'pointer',
              fontFamily: "'Inter', system-ui, sans-serif",
              transition: 'all 0.15s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* PDF preview */}
      {previewUrl && (
        <div style={{ marginBottom: 20, borderRadius: 10, overflow: 'hidden', border: `1px solid ${GREY_LIGHT}`, background: '#111' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: FOREST }}>
            <span style={{ color: 'white', fontSize: 12, fontFamily: "'Inter', system-ui, sans-serif" }}>Aperçu du document</span>
            <button onClick={() => setPreviewUrl(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: 16, cursor: 'pointer' }}>✕</button>
          </div>
          <iframe
            src={previewUrl}
            style={{ width: '100%', height: 600, border: 'none', display: 'block' }}
            title="Aperçu document"
          />
        </div>
      )}

      {/* Tab: Pièces justificatives */}
      {tab === 'pieces' && (
        <div style={{ background: 'white', borderRadius: 10, border: `1px solid ${GREY_LIGHT}`, overflow: 'hidden' }}>
          {loadingKyc ? (
            <p style={{ padding: 24, color: GREY, fontSize: 13, fontFamily: "'Inter', system-ui, sans-serif" }}>Chargement…</p>
          ) : errorKyc ? (
            <p style={{ padding: 24, color: '#dc2626', fontSize: 13, fontFamily: "'Inter', system-ui, sans-serif" }}>{errorKyc}</p>
          ) : kycDocs.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center' }}>
              <p style={{ color: GREY, fontSize: 14, fontFamily: "'Inter', system-ui, sans-serif" }}>
                Aucune pièce justificative — le client n'a pas encore complété son KYC.
              </p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, fontFamily: "'Inter', system-ui, sans-serif" }}>
              <thead>
                <tr style={{ background: '#f9f9f8', borderBottom: `1px solid ${GREY_LIGHT}` }}>
                  {['Document', 'Statut', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '10px 20px', textAlign: 'left', fontWeight: 600, fontSize: 11, color: GREY, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {kycDocs.map((doc, i) => (
                  <tr key={doc.key} style={{ borderBottom: i < kycDocs.length - 1 ? `1px solid ${GREY_LIGHT}` : undefined }}>
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 16 }}>{doc.present && doc.url ? '✅' : doc.present ? '⚠️' : '⬜'}</span>
                        <span style={{ color: FOREST, fontWeight: 500 }}>{doc.label}</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      {doc.present && doc.url ? (
                        <span style={{ color: '#16a34a', fontWeight: 600, fontSize: 12 }}>Fourni</span>
                      ) : doc.present ? (
                        <span style={{ color: '#b45309', fontWeight: 600, fontSize: 12 }}>Lien expiré</span>
                      ) : (
                        <span style={{ color: '#9ca3af', fontSize: 12 }}>Non fourni</span>
                      )}
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      {doc.url ? (
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            onClick={() => setPreviewUrl(prev => prev === doc.url ? null : doc.url)}
                            style={{
                              padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                              border: `1px solid ${FOREST}`, background: 'white', color: FOREST,
                              cursor: 'pointer', fontFamily: "'Inter', system-ui, sans-serif",
                            }}
                          >
                            Aperçu
                          </button>
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            download
                            style={{
                              padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                              background: FOREST, color: 'white', textDecoration: 'none',
                              fontFamily: "'Inter', system-ui, sans-serif",
                            }}
                          >
                            Télécharger
                          </a>
                        </div>
                      ) : (
                        <span style={{ color: '#9ca3af', fontSize: 12 }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab: Documents générés */}
      {tab === 'generes' && (
        <div style={{ background: 'white', borderRadius: 10, border: `1px solid ${GREY_LIGHT}`, overflow: 'hidden' }}>
          {loadingGen ? (
            <p style={{ padding: 24, color: GREY, fontSize: 13, fontFamily: "'Inter', system-ui, sans-serif" }}>Chargement…</p>
          ) : errorGen ? (
            <p style={{ padding: 24, color: '#dc2626', fontSize: 13, fontFamily: "'Inter', system-ui, sans-serif" }}>{errorGen}</p>
          ) : genDocs.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center' }}>
              <p style={{ color: GREY, fontSize: 14, fontFamily: "'Inter', system-ui, sans-serif" }}>
                Aucun document généré pour ce client.
              </p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, fontFamily: "'Inter', system-ui, sans-serif" }}>
              <thead>
                <tr style={{ background: '#f9f9f8', borderBottom: `1px solid ${GREY_LIGHT}` }}>
                  {['Type', 'Fichier', 'Statut', 'Date', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '10px 20px', textAlign: 'left', fontWeight: 600, fontSize: 11, color: GREY, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {genDocs.map((doc, i) => (
                  <tr key={doc.id} style={{ borderBottom: i < genDocs.length - 1 ? `1px solid ${GREY_LIGHT}` : undefined }}>
                    <td style={{ padding: '14px 20px', fontWeight: 600, color: FOREST }}>
                      {DOC_TYPE_LABEL[doc.type] ?? doc.type.toUpperCase()}
                    </td>
                    <td style={{ padding: '14px 20px', color: GREY, fontSize: 12, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {doc.filename ?? '—'}
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <StatusBadge status={doc.status} />
                    </td>
                    <td style={{ padding: '14px 20px', color: GREY, fontSize: 12 }}>
                      {doc.created_at ? fmtDate(doc.created_at) : '—'}
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      {doc.url ? (
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            onClick={() => setPreviewUrl(prev => prev === doc.url ? null : doc.url)}
                            style={{
                              padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                              border: `1px solid ${FOREST}`, background: 'white', color: FOREST,
                              cursor: 'pointer', fontFamily: "'Inter', system-ui, sans-serif",
                            }}
                          >
                            Aperçu
                          </button>
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                              background: GOLD, color: 'white', textDecoration: 'none',
                              fontFamily: "'Inter', system-ui, sans-serif",
                            }}
                          >
                            Ouvrir
                          </a>
                        </div>
                      ) : (
                        <span style={{ color: '#9ca3af', fontSize: 12 }}>Lien indisponible</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
