// app/admin/dossiers/[id]/page.tsx — v3 avec boutons LM + RA actifs
// Sprint Agents IA v10b · 29 avril 2026
// Modifications vs v2 (sprint v10a) :
//   - Activation des boutons "Lettre de mission" et "Rapport d'adéquation"
//   - Handler générique handleGenerateDoc(type) pour les 3 types

'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

const FOREST = '#444b3f'
const GOLD = '#c9a55a'
const DARK = '#353b32'
const GREY = '#666666'
const GREY_LIGHT = '#e5e5e5'
const RED = '#b91c1c'
const RED_LIGHT = '#fef2f2'

type Dossier = {
  id: string
  conseiller_id: string
  nom: string
  prenom: string
  email_client: string | null
  telephone: string | null
  statut: string
  offre_amana_cible: string | null
  notes: string | null
  created_at: string
  updated_at: string
  archived_at: string | null
}

type ClientFact = {
  fact_key: string
  fact_value: string
  source_agent: string | null
  confidence: number
  updated_at: string
  dossier_id: string | null
}

type AmanaDocument = {
  id: string
  type: string
  filename: string
  storage_path: string
  status: string
  yousign_status: string | null
  yousign_signature_request_id: string | null
  created_at: string
}

type DocType = 'der' | 'lm' | 'ra' | 'bilan' | 'preco' | 'zakat' | 'succession'

const DOC_LABEL: Record<string, string> = {
  der: 'DER (Document d\'Entrée en Relation)',
  lm: 'Lettre de mission',
  ra: 'Rapport d\'adéquation',
  bilan: 'Bilan patrimonial',
  preco: 'Préco allocation',
  succession: 'Stratégie successorale',
  zakat: 'Calendrier zakat',
}

/** Types soumis à validation admin avant Yousign (aligné lib/workflow/validation-gates.ts). */
const DOC_GATE_TYPE: Partial<Record<string, string>> = {
  lm: 'lm_send',
  ra: 'ra_recommandations',
  bilan: 'profil_risque_validation',
  profil_risque: 'profil_risque_validation',
  preco: 'preco_validation',
  zakat: 'zakat_validation',
  succession: 'succession_validation',
  bulletin: 'ra_bulletin_send',
}

type ValidationGateRow = {
  gate_type: string
  decision: string
}

export default function AdminDossierDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [dossier, setDossier] = useState<Dossier | null>(null)
  const [facts, setFacts] = useState<ClientFact[]>([])
  const [documents, setDocuments] = useState<AmanaDocument[]>([])
  const [gateByType, setGateByType] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteInput, setDeleteInput] = useState('')
  const [deleting, setDeleting] = useState(false)
  // Sélection documents pour envoi
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set())
  const [sending, setSending] = useState(false)
  const [sendSuccess, setSendSuccess] = useState<string | null>(null)
  const [syncingYousign, setSyncingYousign] = useState(false)

  const hasPendingYousign = documents.some(d => d.yousign_status === 'pending')

  async function reloadDossier() {
    try {
      const res = await fetch(`/api/dossiers/${params.id}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? `HTTP ${res.status}`)
      }
      const data = (await res.json()) as { dossier: Dossier; facts: ClientFact[] }
      setDossier(data.dossier)
      setFacts(data.facts ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    }
  }

  async function reloadDocuments() {
    try {
      const syncRes = await fetch(`/api/admin/dossiers/${params.id}/sync-validation-gates`, {
        method: 'POST',
      })
      if (!syncRes.ok) {
        const syncJson = await syncRes.json().catch(() => ({}))
        console.error('[admin-dossier] sync-validation-gates', syncJson.error ?? syncRes.status)
      }

      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const [{ data, error: dbErr }, { data: gates, error: gateErr }] = await Promise.all([
        supabase
          .from('documents')
          .select('id, type, filename, storage_path, status, yousign_status, yousign_signature_request_id, created_at')
          .eq('dossier_id', params.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('validation_gates')
          .select('gate_type, decision')
          .eq('dossier_id', params.id)
          .order('created_at', { ascending: false }),
      ])
      if (dbErr) throw new Error(dbErr.message)
      if (gateErr) console.error('[admin-dossier] gates', gateErr.message)
      setDocuments((data ?? []) as AmanaDocument[])
      const map: Record<string, string> = {}
      for (const g of (gates ?? []) as ValidationGateRow[]) {
        if (!map[g.gate_type]) map[g.gate_type] = g.decision
      }
      setGateByType(map)
    } catch (err) {
      console.error('[admin-dossier] erreur listing docs', err)
    }
  }

  function validationDecisionForDoc(docType: string): string | null {
    const gateType = DOC_GATE_TYPE[docType]
    if (!gateType) return null
    const decision = gateByType[gateType]
    return decision ?? null
  }

  function selectedDocsNeedApproval(): boolean {
    for (const id of selectedDocs) {
      const doc = documents.find(d => d.id === id)
      if (!doc) continue
      const gateType = DOC_GATE_TYPE[doc.type]
      if (!gateType) continue
      if (gateByType[gateType] !== 'approved') return true
    }
    return false
  }

  const canSendYousign =
    selectedDocs.size > 0 && !selectedDocsNeedApproval() && Boolean(dossier?.email_client)

  async function syncYousignIfNeeded() {
    const hasPendingYousign = documents.some(
      d => d.yousign_status === 'pending' && Boolean(d.yousign_signature_request_id),
    )
    if (!hasPendingYousign) return
    try {
      const res = await fetch(`/api/admin/dossiers/${params.id}/sync-yousign`, {
        method: 'POST',
      })
      const data = await res.json()
      if (res.ok && data.synced > 0) {
        await Promise.all([reloadDossier(), reloadDocuments()])
        setSendSuccess(
          `✓ Signatures Yousign synchronisées (${data.synced} procédure${data.synced > 1 ? 's' : ''})`,
        )
      }
    } catch {
      /* sync silencieux au chargement */
    }
  }

  useEffect(() => {
    async function load() {
      await Promise.all([reloadDossier(), reloadDocuments()])
      setLoading(false)
    }
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id])

  useEffect(() => {
    if (loading) return
    void syncYousignIfNeeded()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, documents.length])

  useEffect(() => {
    const generated = searchParams.get('generated')
    if (!generated) return
    void reloadDocuments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  async function activateDossier() {
    if (!dossier) return
    try {
      await fetch('/api/dossiers/active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dossier_id: dossier.id }),
      })
      router.push('/assistant')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur activation')
    }
  }

  function handleExport() {
    if (!dossier) return
    window.open(`/api/dossiers/${dossier.id}/export`, '_blank')
  }

  async function handleDownloadDocument(doc: AmanaDocument) {
    try {
      const res = await fetch(`/api/documents/${doc.id}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? `HTTP ${res.status}`)
      }
      const data = (await res.json()) as { signed_url: string }
      window.open(data.signed_url, '_blank')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur téléchargement')
    }
  }

  function toggleDoc(id: string) {
    setSelectedDocs(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selectedDocs.size === documents.length) {
      setSelectedDocs(new Set())
    } else {
      setSelectedDocs(new Set(documents.map(d => d.id)))
    }
  }

  async function handleSyncYousign() {
    setSyncingYousign(true)
    setError(null)
    setSendSuccess(null)
    try {
      const res = await fetch(`/api/admin/dossiers/${params.id}/sync-yousign`, {
        method: 'POST',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
      if (data.synced > 0) {
        const wfNote = data.results?.some(
          (r: { signed_updated?: boolean; workflow_ok?: boolean }) =>
            r.signed_updated && !r.workflow_ok,
        )
          ? ' — pipeline : vérifiez le stade dossier'
          : ' — statut signé et pipeline mis à jour'
        setSendSuccess(
          `✓ ${data.synced} procédure${data.synced > 1 ? 's' : ''} Yousign synchronisée${data.synced > 1 ? 's' : ''}${wfNote}`,
        )
      } else {
        setSendSuccess(
          data.message ??
            'Aucune procédure terminée côté Yousign (ou déjà à jour)',
        )
      }
      await Promise.all([reloadDossier(), reloadDocuments()])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur sync Yousign')
    } finally {
      setSyncingYousign(false)
    }
  }

  async function handleSendDocs() {
    if (selectedDocs.size === 0) return
    setSending(true)
    setSendSuccess(null)
    setError(null)
    try {
      const res = await fetch(`/api/dossiers/${params.id}/send-docs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doc_ids: Array.from(selectedDocs) }),
      })
      const data = await res.json()
      if (!res.ok) {
        const detail =
          data.telephone_dossier != null
            ? ` (tél. dossier : ${data.telephone_dossier})`
            : ''
        throw new Error(`${data.error ?? `HTTP ${res.status}`}${detail}`)
      }
      setSendSuccess(`✓ ${data.sent} document${data.sent > 1 ? 's' : ''} envoyé${data.sent > 1 ? 's' : ''} via Yousign à ${dossier?.email_client}`)
      setSelectedDocs(new Set())
      // Recharger les documents pour voir le statut Yousign mis à jour
      await reloadDocuments()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur envoi Yousign')
    } finally {
      setSending(false)
    }
  }

  async function handleDeleteDocument(docId: string) {
    if (!confirm('Supprimer ce document définitivement ?')) return
    const res = await fetch(`/api/documents/${docId}`, { method: 'DELETE' })
    if (res.ok) {
      setDocuments(prev => prev.filter(d => d.id !== docId))
      setSelectedDocs(prev => { const n = new Set(prev); n.delete(docId); return n })
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Erreur suppression document')
    }
  }

  async function handleDelete() {
    if (!dossier) return
    if (deleteInput !== 'SUPPRIMER') {
      setError('Tape SUPPRIMER pour confirmer')
      return
    }
    setDeleting(true)
    try {
      const res = await fetch(`/api/dossiers/${dossier.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation: 'SUPPRIMER' }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? `HTTP ${res.status}`)
      }
      router.push('/admin/dossiers')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur suppression')
      setDeleting(false)
    }
  }

  // ===== Styles =====
  const fmtDate = (s: string) => new Date(s).toLocaleString('fr-FR')
  const sectionTitle: CSSProperties = {
    fontSize: 12, fontWeight: 700, color: FOREST,
    letterSpacing: '0.08em', textTransform: 'uppercase',
    margin: '24px 0 12px',
  }
  const card: CSSProperties = {
    background: 'white', borderRadius: 14, padding: 24,
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    border: `1px solid ${GREY_LIGHT}`,
  }
  const button: CSSProperties = {
    padding: '10px 18px', background: FOREST, color: '#f8f4ec',
    border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600,
    cursor: 'pointer', fontFamily: "'Inter', system-ui, sans-serif",
  }
  const buttonGhost: CSSProperties = {
    ...button, background: 'transparent', color: FOREST,
    borderWidth: 1, borderStyle: 'solid', borderColor: FOREST,
  }
  const buttonDanger: CSSProperties = { ...button, background: RED }
  const buttonGen: CSSProperties = { ...button, background: GOLD, color: DARK }
  const overlay: CSSProperties = {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.4)', zIndex: 100,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }
  const dialog: CSSProperties = {
    background: 'white', borderRadius: 16, padding: 24,
    maxWidth: 480, width: '90%',
    boxShadow: '0 8px 40px rgba(0,0,0,0.2)',
    fontFamily: "'Inter', system-ui, sans-serif",
  }
  const input: CSSProperties = {
    width: '100%', padding: '10px 14px',
    border: `1px solid ${GREY_LIGHT}`, borderRadius: 8,
    fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box',
  }

  if (loading) return <p>Chargement…</p>
  if (error && !dossier) return <p style={{ color: RED }}>{error}</p>
  if (!dossier) return <p>Dossier introuvable</p>

  function GenButton({ type, label }: { type: DocType; label: string }) {
    return (
      <Link
        href={`/admin/dossiers/${dossier!.id}/generate-doc/${type}`}
        style={{ ...buttonGen, textDecoration: 'none', display: 'inline-block' }}
      >
        {label}
      </Link>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: 28, color: FOREST, fontWeight: 400, margin: '0 0 4px',
          }}>
            {dossier.prenom} {dossier.nom}
          </h1>
          <p style={{ fontSize: 13, color: GREY, margin: 0 }}>
            Dossier {dossier.id} · {dossier.statut}
            {dossier.offre_amana_cible && ` · Offre ${dossier.offre_amana_cible}`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button style={buttonGhost} onClick={activateDossier}>
            Activer dans Assistant
          </button>
          <button style={buttonGhost} onClick={handleExport}>
            Exporter (RGPD)
          </button>
          <button style={buttonDanger} onClick={() => setShowDeleteConfirm(true)}>
            Supprimer
          </button>
        </div>
      </div>

      <div style={card}>
        <p style={{ ...sectionTitle, margin: 0 }}>Identité client</p>
        <table style={{ width: '100%', fontSize: 13, marginTop: 12 }}>
          <tbody>
            <tr><td style={{ color: GREY, padding: '4px 0', width: 200 }}>Email</td><td style={{ color: DARK }}>{dossier.email_client ?? '—'}</td></tr>
            <tr><td style={{ color: GREY, padding: '4px 0' }}>Téléphone</td><td style={{ color: DARK }}>{dossier.telephone ?? '—'}</td></tr>
            <tr><td style={{ color: GREY, padding: '4px 0' }}>Statut</td><td style={{ color: DARK }}>{dossier.statut}</td></tr>
            <tr><td style={{ color: GREY, padding: '4px 0' }}>Offre AMANA</td><td style={{ color: DARK }}>{dossier.offre_amana_cible ?? '—'}</td></tr>
            <tr><td style={{ color: GREY, padding: '4px 0' }}>Notes</td><td style={{ color: DARK }}>{dossier.notes ?? '—'}</td></tr>
            <tr><td style={{ color: GREY, padding: '4px 0' }}>Créé le</td><td style={{ color: DARK }}>{fmtDate(dossier.created_at)}</td></tr>
            <tr><td style={{ color: GREY, padding: '4px 0' }}>Mis à jour</td><td style={{ color: DARK }}>{fmtDate(dossier.updated_at)}</td></tr>
          </tbody>
        </table>
      </div>

      <p style={sectionTitle}>Documents générés ({documents.length})</p>
      <div style={card}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <GenButton type="der" label="Générer DER" />
          <GenButton type="lm" label="Lettre de mission" />
          <GenButton type="ra" label="Rapport d'adéquation" />
          {(['bilan', 'preco', 'zakat', 'succession'] as const).map(t => (
            <Link
              key={t}
              href={`/admin/dossiers/${dossier!.id}/generate-doc/${t}`}
              style={{ ...buttonGhost, textDecoration: 'none', display: 'inline-block', fontSize: 13 }}
            >
              {t === 'bilan' ? 'Bilan Mizan' : t === 'preco' ? 'Préconisation' : t === 'zakat' ? 'Zakat' : 'Succession'}
            </Link>
          ))}
          {hasPendingYousign && (
            <button
              type="button"
              style={{ ...buttonGhost, fontSize: 13 }}
              disabled={syncingYousign}
              onClick={() => void handleSyncYousign()}
            >
              {syncingYousign ? 'Sync Yousign…' : '↻ Sync signatures Yousign'}
            </button>
          )}
        </div>

        {documents.length === 0 ? (
          <p style={{ color: GREY, fontStyle: 'italic', margin: 0 }}>
            Aucun document généré pour ce dossier. Clique sur un bouton ci-dessus pour générer.
          </p>
        ) : (
          <>
            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${GREY_LIGHT}`, textAlign: 'left' }}>
                  <th style={{ padding: '8px 8px 8px 0', width: 32 }}>
                    <input
                      type="checkbox"
                      checked={selectedDocs.size === documents.length && documents.length > 0}
                      onChange={toggleAll}
                      style={{ cursor: 'pointer', width: 16, height: 16 }}
                    />
                  </th>
                  <th style={{ padding: '8px 0', color: GREY, fontWeight: 600 }}>Type</th>
                  <th style={{ padding: '8px 0', color: GREY, fontWeight: 600 }}>Fichier</th>
                  <th style={{ padding: '8px 0', color: GREY, fontWeight: 600 }}>Validation</th>
                  <th style={{ padding: '8px 0', color: GREY, fontWeight: 600 }}>Signature</th>
                  <th style={{ padding: '8px 0', color: GREY, fontWeight: 600 }}>Généré</th>
                  <th style={{ padding: '8px 0', color: GREY, fontWeight: 600 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr
                    key={doc.id}
                    style={{
                      borderBottom: `1px solid ${GREY_LIGHT}`,
                      background: selectedDocs.has(doc.id) ? '#f0f6f0' : 'transparent',
                      cursor: 'pointer',
                    }}
                    onClick={() => toggleDoc(doc.id)}
                  >
                    <td style={{ padding: '8px 8px 8px 0' }} onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedDocs.has(doc.id)}
                        onChange={() => toggleDoc(doc.id)}
                        style={{ cursor: 'pointer', width: 16, height: 16 }}
                      />
                    </td>
                    <td style={{ padding: '8px 0', color: DARK, fontWeight: 600 }}>{DOC_LABEL[doc.type] ?? doc.type}</td>
                    <td style={{ padding: '8px 0', color: GREY, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.filename}</td>
                    <td style={{ padding: '8px 0' }}>
                      {(() => {
                        const v = validationDecisionForDoc(doc.type)
                        if (v === null) return <span style={{ fontSize: 11, color: '#aaa' }}>—</span>
                        if (v === 'approved') {
                          return (
                            <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 12, background: '#e8f5e9', color: '#2e7d32', fontWeight: 700 }}>
                              ✓ Approuvé
                            </span>
                          )
                        }
                        if (v === 'rejected') {
                          return (
                            <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 12, background: RED_LIGHT, color: RED, fontWeight: 700 }}>
                              Refusé
                            </span>
                          )
                        }
                        return (
                          <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 12, background: '#fff8e1', color: '#b35900', fontWeight: 700 }}>
                            En attente
                          </span>
                        )
                      })()}
                    </td>
                    <td style={{ padding: '8px 0' }}>
                      {doc.yousign_status === 'signed' ? (
                        <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 12, background: '#e8f5e9', color: '#2e7d32', fontWeight: 700 }}>✓ Signé</span>
                      ) : doc.yousign_status === 'pending' ? (
                        <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 12, background: '#fff8e1', color: '#b35900', fontWeight: 700 }}>⏳ En attente</span>
                      ) : (
                        <span style={{ fontSize: 11, color: '#aaa' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '8px 0', color: GREY }}>{fmtDate(doc.created_at)}</td>
                    <td style={{ padding: '8px 0' }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          style={{ ...buttonGhost, padding: '4px 10px', fontSize: 12 }}
                          onClick={() => handleDownloadDocument(doc)}
                        >
                          Télécharger
                        </button>
                        <button
                          style={{ ...buttonDanger, padding: '4px 10px', fontSize: 12 }}
                          onClick={() => handleDeleteDocument(doc.id)}
                        >
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Panneau Yousign */}
            {selectedDocs.size > 0 && (() => {
              const selectedList = documents.filter((d) => selectedDocs.has(d.id))
              return (
                <div
                  style={{
                    marginTop: 24,
                    background: 'white',
                    borderRadius: 14,
                    border: `1px solid ${GREY_LIGHT}`,
                    boxShadow: '0 4px 24px rgba(58, 77, 57, 0.08)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: 16,
                      padding: '20px 24px',
                      borderLeft: `4px solid ${GOLD}`,
                      background: 'linear-gradient(135deg, #faf8f4 0%, #ffffff 55%)',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                        <p
                          style={{
                            margin: '0 0 4px',
                            fontSize: 11,
                            fontWeight: 700,
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                            color: GREY,
                          }}
                        >
                          Signature électronique
                        </p>
                        <h3
                          style={{
                            margin: '0 0 8px',
                            fontFamily: "'Cormorant Garamond', Georgia, serif",
                            fontSize: 20,
                            fontWeight: 600,
                            color: FOREST,
                          }}
                        >
                          Envoi Yousign
                        </h3>
                        <p style={{ margin: 0, fontSize: 13, color: GREY, lineHeight: 1.55 }}>
                          Une procédure unique regroupe{' '}
                          <strong style={{ color: DARK }}>
                            {selectedDocs.size} document{selectedDocs.size > 1 ? 's' : ''}
                          </strong>
                          . Le client reçoit un seul lien de signature par email.
                        </p>
                    </div>
                    <span
                      style={{
                        flexShrink: 0,
                        padding: '6px 12px',
                        borderRadius: 20,
                        background: '#f0f6f0',
                        fontSize: 11,
                        fontWeight: 700,
                        color: FOREST,
                        letterSpacing: '0.04em',
                      }}
                    >
                      YOUSIGN
                    </span>
                  </div>

                  <div style={{ padding: '16px 24px 0', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {selectedList.map((d) => (
                      <span
                        key={d.id}
                        style={{
                          padding: '5px 12px',
                          borderRadius: 6,
                          background: '#f5f3ef',
                          border: `1px solid ${GREY_LIGHT}`,
                          fontSize: 12,
                          fontWeight: 600,
                          color: DARK,
                        }}
                      >
                        {DOC_LABEL[d.type] ?? d.type}
                      </span>
                    ))}
                  </div>

                  <div
                    style={{
                      margin: '16px 24px 0',
                      padding: '12px 16px',
                      borderRadius: 10,
                      background: '#f8f4ec',
                      border: `1px solid #e8dfc8`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      fontSize: 13,
                      color: DARK,
                    }}
                  >
                    <span style={{ color: GREY, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Destinataire
                    </span>
                    <span style={{ fontWeight: 600 }}>{dossier?.email_client ?? '—'}</span>
                  </div>

                  {selectedDocsNeedApproval() && (
                    <div
                      style={{
                        margin: '16px 24px 0',
                        padding: '14px 16px',
                        background: '#fffbeb',
                        borderRadius: 10,
                        border: '1px solid #fde68a',
                        fontSize: 13,
                        color: '#78350f',
                        lineHeight: 1.55,
                      }}
                    >
                      <strong style={{ display: 'block', marginBottom: 4, color: '#92400e' }}>
                        Validation administrateur requise
                      </strong>
                      Les documents LM, RA ou Bilan doivent être approuvés avant l&apos;envoi.{' '}
                      <Link
                        href="/admin/validations"
                        style={{ color: FOREST, fontWeight: 700, textDecoration: 'underline' }}
                      >
                        Ouvrir Validations
                      </Link>
                    </div>
                  )}

                  {sendSuccess && (
                    <div
                      style={{
                        margin: '16px 24px 0',
                        padding: '14px 16px',
                        background: '#ecfdf5',
                        borderRadius: 10,
                        border: '1px solid #a7f3d0',
                        color: '#166534',
                        fontSize: 13,
                        fontWeight: 600,
                        lineHeight: 1.5,
                      }}
                    >
                      {sendSuccess}
                    </div>
                  )}

                  <div
                    style={{
                      marginTop: 20,
                      padding: '16px 24px 20px',
                      borderTop: `1px solid ${GREY_LIGHT}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      gap: 12,
                      flexWrap: 'wrap',
                    }}
                  >
                    <button
                      type="button"
                      style={{
                        ...buttonGhost,
                        padding: '11px 18px',
                        fontSize: 13,
                        borderColor: GREY_LIGHT,
                        color: GREY,
                      }}
                      onClick={() => {
                        setSelectedDocs(new Set())
                        setSendSuccess(null)
                      }}
                    >
                      Annuler la sélection
                    </button>
                    <button
                      type="button"
                      style={{
                        ...button,
                        padding: '11px 24px',
                        fontSize: 13,
                        background: canSendYousign && !sending ? FOREST : '#9ca3af',
                        boxShadow: canSendYousign && !sending ? '0 2px 8px rgba(68,75,63,0.25)' : 'none',
                        opacity: 1,
                        cursor: sending || !canSendYousign ? 'not-allowed' : 'pointer',
                      }}
                      onClick={handleSendDocs}
                      disabled={sending || !canSendYousign}
                      title={
                        selectedDocsNeedApproval()
                          ? 'Approuvez les documents dans Validations'
                          : undefined
                      }
                    >
                      {sending
                        ? 'Envoi en cours…'
                        : `Envoyer la procédure (${selectedDocs.size} PDF)`}
                    </button>
                  </div>
                </div>
              )
            })()}
          </>
        )}
      </div>

      <p style={sectionTitle}>Faits accumulés ({facts.length})</p>
      <div style={card}>
        {facts.length === 0 ? (
          <p style={{ color: GREY, fontStyle: 'italic', margin: 0 }}>
            Aucun fait enregistré pour ce dossier. Les agents en ajouteront automatiquement
            au fil des conversations.
          </p>
        ) : (
          <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${GREY_LIGHT}`, textAlign: 'left' }}>
                <th style={{ padding: '8px 0', color: GREY, fontWeight: 600 }}>Clé</th>
                <th style={{ padding: '8px 0', color: GREY, fontWeight: 600 }}>Valeur</th>
                <th style={{ padding: '8px 0', color: GREY, fontWeight: 600 }}>Source</th>
                <th style={{ padding: '8px 0', color: GREY, fontWeight: 600 }}>Confiance</th>
                <th style={{ padding: '8px 0', color: GREY, fontWeight: 600 }}>Mis à jour</th>
              </tr>
            </thead>
            <tbody>
              {facts.map((f) => (
                <tr key={f.fact_key} style={{ borderBottom: `1px solid ${GREY_LIGHT}` }}>
                  <td style={{ padding: '8px 0', color: DARK, fontWeight: 600 }}>{f.fact_key}</td>
                  <td style={{ padding: '8px 0', color: DARK }}>{f.fact_value}</td>
                  <td style={{ padding: '8px 0', color: GREY }}>{f.source_agent ?? '—'}</td>
                  <td style={{ padding: '8px 0', color: GREY }}>{(f.confidence * 100).toFixed(0)}%</td>
                  <td style={{ padding: '8px 0', color: GREY }}>{fmtDate(f.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {error && (
        <div style={{
          padding: '8px 12px', background: RED_LIGHT,
          border: '1px solid #fecaca', borderRadius: 8,
          color: '#991b1b', fontSize: 12, marginTop: 12,
        }}>
          {error}
        </div>
      )}

      {showDeleteConfirm && (
        <div style={overlay} onClick={() => setShowDeleteConfirm(false)}>
          <div style={dialog} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ margin: '0 0 12px', fontSize: 18, color: RED, fontWeight: 600 }}>
              Suppression RGPD
            </h2>
            <p style={{ fontSize: 14, color: DARK, lineHeight: 1.5, marginBottom: 12 }}>
              Suppression <strong>définitive</strong> du dossier{' '}
              <strong>{dossier.prenom} {dossier.nom}</strong>, de ses {facts.length} fait{facts.length > 1 ? 's' : ''}
              {documents.length > 0 ? `, et de ses ${documents.length} document${documents.length > 1 ? 's' : ''}` : ''}.
              Action irréversible.
            </p>
            <input
              type="text"
              placeholder="Tape SUPPRIMER"
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              style={{ ...input, marginBottom: 16 }}
              autoFocus
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                style={{ ...buttonGhost, flex: 1 }}
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setDeleteInput('')
                  setError(null)
                }}
              >
                Annuler
              </button>
              <button
                style={{
                  ...buttonDanger, flex: 1,
                  opacity: deleteInput === 'SUPPRIMER' && !deleting ? 1 : 0.5,
                  cursor: deleteInput === 'SUPPRIMER' && !deleting ? 'pointer' : 'not-allowed',
                }}
                onClick={handleDelete}
                disabled={deleteInput !== 'SUPPRIMER' || deleting}
              >
                {deleting ? 'Suppression…' : 'Supprimer définitivement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
