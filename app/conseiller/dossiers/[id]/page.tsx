'use client'

// app/conseiller/dossiers/[id]/page.tsx
// Espace conseiller — Hub dossier client (lecture seule)
// Affiche les informations du dossier et les documents générés.

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const FOREST = '#444b3f'
const GOLD = '#c9a55a'
const CREAM = '#f8f4ec'
const GREY = '#666666'
const GREY_LIGHT = '#e5e5e5'
const RED = '#b91c1c'

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
}

type AmanaDocument = {
  id: string
  type: string
  filename: string
  storage_path: string
  status: string
  yousign_status: string | null
  created_at: string
}

const DOC_TYPE_LABELS: Record<string, string> = {
  der: "DER (Entrée en relation)",
  lm: "Lettre de mission",
  ra: "Rapport d'adéquation",
  bilan: "Bilan patrimonial Mizan",
  preco: "Préconisation patrimoniale",
  zakat: "Calendrier Zakat",
  succession: "Stratégie successorale",
  bulletin: "Bulletin de souscription",
}


function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default function ConseillerDossierPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const dossierId = params.id

  const [dossier, setDossier] = useState<Dossier | null>(null)
  const [documents, setDocuments] = useState<AmanaDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const [signModal, setSignModal] = useState<{ doc: AmanaDocument } | null>(null)
  const [signForm, setSignForm] = useState({ email: '', prenom: '', nom: '', tel: '' })
  const [signLoading, setSignLoading] = useState(false)
  const [signError, setSignError] = useState<string | null>(null)
  const [signSuccess, setSignSuccess] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/dossiers/${dossierId}`)
        if (!res.ok) {
          const d = await res.json().catch(() => ({}))
          throw new Error(d.error ?? `HTTP ${res.status}`)
        }
        const d = await res.json()
        setDossier(d.dossier)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erreur chargement dossier')
      }

      try {
        const supabase = createClient()
        const { data, error: dbErr } = await supabase
          .from('documents')
          .select('id, type, filename, storage_path, status, yousign_status, created_at')
          .eq('dossier_id', dossierId)
          .order('created_at', { ascending: false })
        if (dbErr) throw new Error(dbErr.message)
        setDocuments((data ?? []) as AmanaDocument[])
      } catch {
        // documents non-bloquant
      }

      setLoading(false)
    }
    void load()
  }, [dossierId])

  async function handleDownload(doc: AmanaDocument) {
    setDownloadError(null)
    try {
      const res = await fetch(`/api/documents/${doc.id}`)
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error ?? `HTTP ${res.status}`)
      }
      const { signed_url } = await res.json()
      window.open(signed_url, '_blank')
    } catch (e) {
      setDownloadError(e instanceof Error ? e.message : 'Erreur téléchargement')
    }
  }

  function openSignModal(doc: AmanaDocument) {
    setSignError(null)
    setSignSuccess(null)
    setSignForm({
      email: dossier?.email_client ?? '',
      prenom: dossier?.prenom ?? '',
      nom: dossier?.nom ?? '',
      tel: dossier?.telephone ?? '',
    })
    setSignModal({ doc })
  }

  async function handleSign(e: React.FormEvent) {
    e.preventDefault()
    if (!signModal) return
    setSignLoading(true)
    setSignError(null)
    setSignSuccess(null)
    try {
      const res = await fetch(`/api/documents/${signModal.doc.id}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signer_email: signForm.email,
          signer_first_name: signForm.prenom,
          signer_last_name: signForm.nom,
          signer_phone: signForm.tel || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error ?? `HTTP ${res.status}`)
      }
      setSignSuccess(`✓ Demande Yousign envoyée ! Email de signature envoyé à ${signForm.email}`)
      // Rafraîchir la liste des documents
      const supabase = createClient()
      const { data: docs } = await supabase
        .from('documents')
        .select('id, type, filename, storage_path, status, yousign_status, created_at')
        .eq('dossier_id', dossierId)
        .order('created_at', { ascending: false })
      setDocuments((docs ?? []) as AmanaDocument[])
      setTimeout(() => setSignModal(null), 3000)
    } catch (e) {
      setSignError(e instanceof Error ? e.message : 'Erreur envoi Yousign')
    } finally {
      setSignLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: CREAM, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif', color: GREY }}>
        Chargement du dossier…
      </div>
    )
  }

  if (error || !dossier) {
    return (
      <div style={{ minHeight: '100vh', background: CREAM, padding: '40px 24px', fontFamily: 'system-ui, sans-serif' }}>
        <p style={{ color: RED }}>{error ?? 'Dossier introuvable'}</p>
        <Link href="/conseiller" style={{ color: FOREST, textDecoration: 'underline', fontSize: '14px' }}>
          ← Retour à la liste
        </Link>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: CREAM }}>
      {/* Header */}
      <header style={{ background: FOREST, padding: '0 48px', height: '68px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <a href="/" style={{ fontFamily: 'Georgia, serif', fontSize: '20px', color: CREAM, letterSpacing: '0.15em', textDecoration: 'none' }}>AMANA</a>
          <span style={{ fontSize: '12px', color: '#8aab89', fontFamily: 'system-ui, sans-serif', letterSpacing: '0.08em', fontWeight: 600 }}>ESPACE CONSEILLER</span>
        </div>
        <Link href="/conseiller" style={{ fontSize: '13px', color: '#c8d8c7', fontFamily: 'system-ui, sans-serif', textDecoration: 'none' }}>
          ← Liste clients
        </Link>
      </header>

      <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px 24px' }}>
        {/* Titre dossier */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '28px', color: FOREST, margin: '0 0 6px', fontWeight: 400 }}>
            {dossier.prenom} {dossier.nom}
          </h1>
          <p style={{ fontSize: '13px', color: GREY, margin: 0, fontFamily: 'system-ui, sans-serif' }}>
            Dossier {dossier.id} · {dossier.statut}
            {dossier.offre_amana_cible && ` · Offre ${dossier.offre_amana_cible}`}
          </p>
        </div>

        {/* Identité */}
        <div style={{ background: 'white', borderRadius: '14px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: `1px solid ${GREY_LIGHT}`, marginBottom: '24px' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, color: FOREST, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 12px' }}>
            Identité client
          </p>
          <table style={{ width: '100%', fontSize: '13px', fontFamily: 'system-ui, sans-serif', borderCollapse: 'collapse' }}>
            <tbody>
              {[
                ['Email', dossier.email_client],
                ['Téléphone', dossier.telephone],
                ['Statut', dossier.statut],
                ['Offre AMANA', dossier.offre_amana_cible],
                ['Notes', dossier.notes],
                ['Créé le', fmtDate(dossier.created_at)],
                ['Mis à jour', fmtDate(dossier.updated_at)],
              ].map(([label, val]) => (
                <tr key={label}>
                  <td style={{ color: GREY, padding: '4px 0', width: '200px' }}>{label}</td>
                  <td style={{ color: '#353b32' }}>{val ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Documents générés */}
        <div style={{ background: 'white', borderRadius: '14px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: `1px solid ${GREY_LIGHT}` }}>
          <p style={{ fontSize: '11px', fontWeight: 700, color: FOREST, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 12px' }}>
            Documents générés ({documents.length})
          </p>

          {downloadError && (
            <div style={{ marginBottom: '12px', padding: '10px 14px', background: '#fde8e8', borderRadius: '8px', fontSize: '13px', color: RED }}>
              {downloadError}
            </div>
          )}

          {documents.length === 0 ? (
            <p style={{ fontSize: '14px', color: GREY, fontStyle: 'italic', fontFamily: 'system-ui, sans-serif', margin: 0 }}>
              Aucun document généré pour ce dossier.
            </p>
          ) : (
            <table style={{ width: '100%', fontSize: '13px', fontFamily: 'system-ui, sans-serif', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${GREY_LIGHT}`, textAlign: 'left' }}>
                  {['Type', 'Fichier', 'Statut', 'Date', ''].map(h => (
                    <th key={h} style={{ padding: '8px 0', color: GREY, fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {documents.map(doc => (
                  <tr key={doc.id} style={{ borderBottom: `1px solid ${GREY_LIGHT}` }}>
                    <td style={{ padding: '10px 0', fontWeight: 600, color: FOREST }}>
                      {DOC_TYPE_LABELS[doc.type] ?? doc.type.toUpperCase()}
                    </td>
                    <td style={{ padding: '10px 0', color: GREY, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {doc.filename}
                    </td>
                    <td style={{ padding: '10px 0' }}>
                      <span style={{
                        display: 'inline-block', padding: '3px 10px', borderRadius: '20px',
                        fontSize: '11px', fontWeight: 600,
                        background: doc.status === 'generated' ? '#e8f5e9' : '#fff8e1',
                        color: doc.status === 'generated' ? '#2e7d32' : '#f57f17',
                      }}>
                        {doc.status}
                      </span>
                    </td>
                    <td style={{ padding: '10px 0', color: GREY, whiteSpace: 'nowrap' }}>
                      {new Date(doc.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ padding: '10px 0', textAlign: 'right', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => handleDownload(doc)}
                        style={{
                          padding: '6px 14px', background: 'transparent',
                          color: FOREST, border: `1px solid ${FOREST}`,
                          borderRadius: '6px', fontSize: '12px', fontWeight: 600,
                          cursor: 'pointer', fontFamily: 'system-ui, sans-serif',
                        }}
                      >
                        Télécharger
                      </button>
                      {['der', 'lm', 'bulletin'].includes(doc.type) && doc.yousign_status !== 'signed' && (
                        <button
                          onClick={() => openSignModal(doc)}
                          style={{
                            padding: '6px 14px',
                            background: doc.yousign_status === 'pending' ? '#f57f17' : FOREST,
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px', fontSize: '12px', fontWeight: 600,
                            cursor: 'pointer', fontFamily: 'system-ui, sans-serif',
                          }}
                        >
                          {doc.yousign_status === 'pending' ? '⏳ En attente signature' : '✍ Envoyer Yousign'}
                        </button>
                      )}
                      {doc.yousign_status === 'signed' && (
                        <span style={{ padding: '6px 14px', background: '#e8f5e9', color: '#2e7d32', borderRadius: '6px', fontSize: '12px', fontWeight: 600, fontFamily: 'system-ui, sans-serif' }}>
                          ✓ Signé
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {/* Modal signature Yousign */}
      {signModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{
            background: 'white', borderRadius: '16px', padding: '32px',
            width: '480px', maxWidth: '90vw', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            fontFamily: 'system-ui, sans-serif',
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: FOREST, margin: '0 0 4px', fontFamily: 'Georgia, serif' }}>
              Envoyer en signature Yousign
            </h2>
            <p style={{ fontSize: '13px', color: GREY, margin: '0 0 20px' }}>
              {DOC_TYPE_LABELS[signModal.doc.type] ?? signModal.doc.type.toUpperCase()} — {signModal.doc.filename}
            </p>

            {signSuccess ? (
              <div style={{ padding: '16px', background: '#e8f5e9', borderRadius: '10px', color: '#2e7d32', fontSize: '14px', fontWeight: 600 }}>
                {signSuccess}
              </div>
            ) : (
              <form onSubmit={handleSign} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: FOREST, display: 'block', marginBottom: '4px' }}>
                    Email du signataire *
                  </label>
                  <input
                    type="email" required
                    value={signForm.email}
                    onChange={e => setSignForm(f => ({ ...f, email: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', border: `1px solid ${GREY_LIGHT}`, borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: FOREST, display: 'block', marginBottom: '4px' }}>
                      Prénom *
                    </label>
                    <input
                      type="text" required
                      value={signForm.prenom}
                      onChange={e => setSignForm(f => ({ ...f, prenom: e.target.value }))}
                      style={{ width: '100%', padding: '9px 12px', border: `1px solid ${GREY_LIGHT}`, borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: FOREST, display: 'block', marginBottom: '4px' }}>
                      Nom *
                    </label>
                    <input
                      type="text" required
                      value={signForm.nom}
                      onChange={e => setSignForm(f => ({ ...f, nom: e.target.value }))}
                      style={{ width: '100%', padding: '9px 12px', border: `1px solid ${GREY_LIGHT}`, borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: GREY, display: 'block', marginBottom: '4px' }}>
                    Téléphone (optionnel, format +33...)
                  </label>
                  <input
                    type="tel"
                    value={signForm.tel}
                    onChange={e => setSignForm(f => ({ ...f, tel: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', border: `1px solid ${GREY_LIGHT}`, borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                    placeholder="+33612345678"
                  />
                </div>

                {signError && (
                  <div style={{ padding: '10px 14px', background: '#fde8e8', borderRadius: '8px', fontSize: '13px', color: RED }}>
                    {signError}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setSignModal(null)}
                    style={{
                      flex: 1, padding: '10px', background: 'transparent',
                      border: `1px solid ${GREY_LIGHT}`, borderRadius: '8px',
                      fontSize: '14px', cursor: 'pointer', color: GREY,
                    }}
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={signLoading}
                    style={{
                      flex: 2, padding: '10px', background: FOREST,
                      color: 'white', border: 'none', borderRadius: '8px',
                      fontSize: '14px', fontWeight: 700, cursor: signLoading ? 'wait' : 'pointer',
                      opacity: signLoading ? 0.7 : 1,
                    }}
                  >
                    {signLoading ? 'Envoi en cours…' : '✍ Envoyer en signature Yousign'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
