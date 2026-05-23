'use client'

import { useCallback, useEffect, useState } from 'react'

const FOREST = '#3a4d39'
const GOLD   = '#c9a55a'

const GATE_LABEL: Record<string, string> = {
  kyc_validation:           'V1 — Validation KYC — pièces + cohérence LCB-FT',
  profil_risque_validation: 'V2 — Validation Profil Risque + Bilan patrimonial',
  lm_send:                  'V3 — Validation LM avant signature',
  ra_recommandations:       'V4 — Validation recommandations RA (sections 7-10)',
  ra_synthese:              'V5 — Validation synthèse RA (texte libre conseiller)',
  ra_frais_exante:          'V6 — Validation frais ex ante (article 24 §4 MIF II)',
  ra_bulletin_send:         'V7 — Validation bulletins de souscription',
  bilan_annuel_validation:  'V8 — Validation bilan annuel + re-recommandations (art. 25 MIF II)',
  preco_validation:         'Validation Préconisation (après génération)',
  zakat_validation:         'Validation Zakat (après génération)',
  succession_validation:    'Validation Succession (après génération)',
}

const GATE_DESCRIPTION: Record<string, string> = {
  kyc_validation:           "Vérifier : pièce d'identité, cohérence revenus/patrimoine, PPE, origine des fonds, score LCB-FT acceptable.",
  profil_risque_validation: "Vérifier : cohérence du score calculé avec les réponses, interprétation correcte de la situation, recommandations préliminaires alignées sur le profil.",
  lm_send:                  "Vérifier : offre cohérente avec le patrimoine, honoraires conformes à la grille AMANA, périmètre précis.",
  ra_recommandations:       "Rédiger / valider : solution + producteur + ISIN, justification adéquation profil/horizon/objectifs, frais ex ante.",
  ra_synthese:              "Rédiger / valider : synthèse en 3-5 paragraphes accessibles (voix du conseiller, non modifiable par l'IA).",
  ra_frais_exante:          "Valider : frais d'entrée, frais courants annuels, coût total estimé sur la durée (montants absolus + %).",
  ra_bulletin_send:         "Vérifier : cohérence avec le RA validé, montants/fréquences corrects, bénéficiaires désignés (AV).",
  bilan_annuel_validation:  "Valider la mise à jour annuelle du bilan patrimonial. Vérifier les éventuelles re-recommandations et la communication client (art. 25 MIF II).",
  preco_validation:         "Vérifier : cohérence avec le profil client, adéquation des recommandations, conformité ORIAS / MIF II, pas de promesse de performance.",
  zakat_validation:         "Vérifier : calcul des actifs zakables, taux nisab, méthode de purification, cohérence avec le patrimoine déclaré.",
  succession_validation:    "Vérifier : parts héréditaires, cohérence avec la situation familiale, mention du cadre fiqh (sans fatwa), conformité documentaire.",
}

/** Ordre d'affichage des verrous (liste = uniquement gates pending en base). */
const GATE_ORDER = Object.keys(GATE_LABEL)

interface Dossier {
  id: string
  prenom: string | null
  nom: string | null
  email_client: string | null
  pipeline_stage: string | null
  pipeline_stage_updated_at: string | null
  created_at: string
}

interface Gate {
  id: string
  dossier_id: string
  gate_type: string
  decision: 'pending' | 'approved' | 'rejected'
  decided_at: string | null
  comment: string | null
}

interface Document {
  id: string
  type: string
  url: string | null
  filename: string | null
  created_at: string
  dossier_id?: string | null
}

interface KycDoc {
  key: string
  label: string
  url: string | null
  present: boolean
}

// ── Review Panel state ──────────────────────────────────────────────────────
interface ReviewTarget {
  dossier: Dossier
  gateType: string
}

export default function AdminValidationsPage() {
  const [dossiers, setDossiers]   = useState<Dossier[]>([])
  const [gates, setGates]         = useState<Record<string, Gate[]>>({})
  const [loading, setLoading]     = useState(true)
  const [acting, setActing]       = useState<string | null>(null)
  const [error, setError]         = useState<string | null>(null)

  // Review panel
  const [review, setReview]       = useState<ReviewTarget | null>(null)
  const [comment, setComment]     = useState('')
  const [editFields, setEditFields] = useState<Record<string, string>>({})
  const [docs, setDocs]           = useState<Document[]>([])
  const [docLoading, setDocLoading] = useState(false)
  const [docLoadError, setDocLoadError] = useState<string | null>(null)
  const [pdfUrl, setPdfUrl]       = useState<string | null>(null)
  const [kycDocs, setKycDocs]     = useState<KycDoc[]>([])
  const [kycDocLoading, setKycDocLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/validations')
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof json.error === 'string' ? json.error : `Erreur HTTP ${res.status}`)
        setDossiers([])
        setGates({})
        return
      }
      setDossiers((json.dossiers ?? []) as Dossier[])
      setGates((json.gates ?? {}) as Record<string, Gate[]>)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur chargement')
      setDossiers([])
      setGates({})
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Open review panel: PDFs via API avec signed URLs (bypass RLS + dossiers frères)
  async function openReview(dossier: Dossier, gateType: string) {
    setReview({ dossier, gateType })
    setComment('')
    setEditFields({})
    setPdfUrl(null)
    setDocLoadError(null)
    setDocLoading(true)
    setDocs([])
    setKycDocs([])

    // Charger les PDFs générés (DER, LM, etc.)
    try {
      const res = await fetch(`/api/admin/dossiers/${dossier.id}/review-documents`)
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setDocLoadError(typeof json.error === 'string' ? json.error : `Erreur HTTP ${res.status}`)
      } else {
        setDocs((json.documents ?? []) as Document[])
      }
    } catch {
      setDocLoadError('Impossible de charger les documents.')
    } finally {
      setDocLoading(false)
    }

    // Pour V1 : charger aussi les pièces justificatives KYC du client
    if (gateType === 'kyc_validation') {
      setKycDocLoading(true)
      try {
        const res = await fetch(`/api/admin/dossiers/${dossier.id}/kyc-documents`)
        const json = await res.json().catch(() => ({}))
        if (res.ok) setKycDocs((json.documents ?? []) as KycDoc[])
      } catch { /* non bloquant */ }
      finally { setKycDocLoading(false) }
    }
  }

  function closeReview() {
    setReview(null)
    setComment('')
    setEditFields({})
    setPdfUrl(null)
    setDocs([])
    setKycDocs([])
    setDocLoadError(null)
  }

  async function decide(
    dossierId: string,
    gateType: string,
    decision: 'approved' | 'rejected',
  ) {
    setActing(`${dossierId}:${gateType}`)
    setError(null)
    try {
      const res = await fetch('/api/admin/validation-gates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dossier_id: dossierId, gate_type: gateType, decision, comment: comment || null }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erreur')

      // V1 approuvé
      if (gateType === 'kyc_validation' && decision === 'approved') {
        // Passer risque LCB-FT édité si renseigné
        const risque = editFields['risque_lcbft']
        if (risque) {
          await fetch(`/api/dossiers/${dossierId}/kyc-edit`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ risque_lcbft: risque }),
          }).catch(() => {/* non bloquant */})
        }
        await fetch('/api/admin/kyc-validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dossier_id: dossierId }),
        })
      }

      // V2 approuvé — déclencher auto-bilan + auto-profil via proxy (secret géré côté serveur)
      if (gateType === 'profil_risque_validation' && decision === 'approved') {
        void fetch('/api/admin/trigger-auto-bilan-profil', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dossier_id: dossierId }),
        }).then(r => r.json()).then(d => {
          if (!d.ok) console.warn('[V2] trigger-auto-bilan-profil result:', d)
        }).catch(() => {/* non bloquant */})

        // Surcharge manuelle du profil si Mohamed a modifié la valeur calculée
        if (editFields['profil_retenu']) {
          void fetch('/api/documents/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              dossier_id: dossierId,
              type: 'profil_risque',
              inputs: {
                profil_retenu: editFields['profil_retenu'],
                commentaire_conseiller: editFields['commentaire_conseiller'],
              },
            }),
          }).catch(() => {/* non bloquant */})
        }

        await fetch('/api/admin/validation-gates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dossier_id: dossierId, gate_type: 'lm_send', decision: 'pending' }),
        })
      }

      // V3 approuvé — auto-lm seulement si pas de LM déjà générée (Mass : génération manuelle + send-docs)
      if (gateType === 'lm_send' && decision === 'approved') {
        const hasLm = docs.some(d => d.dossier_id === dossierId && d.type === 'lm')
        if (!hasLm) {
          void fetch('/api/admin/trigger-auto-lm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dossier_id: dossierId }),
          }).then(r => r.json()).then(d => {
            if (!d.ok) console.warn('[V3] auto-lm result:', d)
          }).catch(() => {/* non bloquant */})
        }
      }

      // V4 approuvé
      if (gateType === 'ra_recommandations' && decision === 'approved') {
        await fetch('/api/admin/validation-gates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dossier_id: dossierId, gate_type: 'ra_synthese', decision: 'pending' }),
        })
      }

      // V5 approuvé
      if (gateType === 'ra_synthese' && decision === 'approved') {
        await fetch('/api/admin/validation-gates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dossier_id: dossierId, gate_type: 'ra_frais_exante', decision: 'pending' }),
        })
      }

      // V6 approuvé — auto-ra seulement si pas de RA déjà généré (Mass : envoi Yousign via send-docs)
      if (gateType === 'ra_frais_exante' && decision === 'approved') {
        const hasRa = docs.some(d => d.dossier_id === dossierId && d.type === 'ra')
        if (!hasRa) {
          void fetch('/api/admin/trigger-auto-ra', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dossier_id: dossierId }),
          }).then(r => r.json()).then(d => {
            if (!d.ok) console.warn('[V6] trigger-auto-ra result:', d)
          }).catch(() => {/* non bloquant */})
        }
      }

      // V7 approuvé — déclencher auto-bulletin (Bulletin souscription → Yousign)
      if (gateType === 'ra_bulletin_send' && decision === 'approved') {
        void fetch('/api/admin/trigger-auto-bulletin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dossier_id: dossierId }),
        }).then(r => r.json()).then(d => {
          if (!d.ok) console.warn('[V7] trigger-auto-bulletin result:', d)
        }).catch(() => {/* non bloquant */})
      }

      // V8 approuvé — transition actif → suivi (art. 25 MIF II)
      if (gateType === 'bilan_annuel_validation' && decision === 'approved') {
        void fetch('/api/admin/trigger-suivi', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dossier_id: dossierId }),
        }).catch(() => {/* non bloquant */})
      }

      await load()
      closeReview()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setActing(null)
    }
  }

  function gateFor(dossier: Dossier, gateType: string): Gate | undefined {
    return (gates[dossier.id] ?? [])
      .filter(g => g.gate_type === gateType)
      .sort((a, b) => (b.decided_at ?? '').localeCompare(a.decided_at ?? ''))[0]
  }

  const isActingNow = review ? acting === `${review.dossier.id}:${review.gateType}` : false

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div>
      <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 28, color: FOREST, fontWeight: 400, margin: '0 0 6px' }}>
        Validations administrateur
      </h1>
      <p style={{ fontSize: 13, color: '#8a9a89', margin: '0 0 32px', fontFamily: "'Inter', system-ui, sans-serif" }}>
        Une ligne apparaît ici uniquement lorsqu&apos;un verrou est créé en base (KYC, génération PDF, ou étape suivante après approbation).
      </p>

      {error && (
        <div style={{ background: '#fee2e2', color: '#991b1b', padding: '12px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ color: '#6b7280', fontSize: 13 }}>Chargement…</div>
      ) : dossiers.length === 0 ? (
        <div style={{ background: 'white', padding: 24, borderRadius: 12, color: '#6b7280', fontSize: 13 }}>
          Aucun dossier en attente de validation.
        </div>
      ) : (
        <div style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, fontFamily: "'Inter', system-ui, sans-serif" }}>
            <thead style={{ background: '#f8f4ec' }}>
              <tr>
                <th style={{ textAlign: 'left', padding: '12px 16px', color: FOREST, fontWeight: 600 }}>Client</th>
                <th style={{ textAlign: 'left', padding: '12px 16px', color: FOREST, fontWeight: 600 }}>Étape pipeline</th>
                <th style={{ textAlign: 'left', padding: '12px 16px', color: FOREST, fontWeight: 600 }}>Verrou</th>
                <th style={{ textAlign: 'left', padding: '12px 16px', color: FOREST, fontWeight: 600 }}>État</th>
                <th style={{ textAlign: 'left', padding: '12px 16px', color: FOREST, fontWeight: 600 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {dossiers.flatMap(d => {
                const gateTypes = [...new Set(
                  (gates[d.id] ?? [])
                    .filter(g => g.decision === 'pending')
                    .map(g => g.gate_type),
                )].sort(
                  (a, b) => GATE_ORDER.indexOf(a) - GATE_ORDER.indexOf(b),
                )
                return gateTypes.map(gt => {
                  const g = gateFor(d, gt)
                  const decision = g?.decision ?? 'pending'
                  const isActing = acting === `${d.id}:${gt}`
                  const pipelineStage = d.pipeline_stage ?? '—'
                  return (
                    <tr key={`${d.id}-${gt}`} style={{ borderTop: '1px solid #f0eee8' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 600, color: FOREST }}>{d.prenom} {d.nom}</div>
                        <div style={{ fontSize: 11, color: '#8a9a89' }}>{d.email_client}</div>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#5a6a59' }}>{pipelineStage}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 600, color: FOREST }}>{GATE_LABEL[gt] ?? gt}</div>
                        {GATE_DESCRIPTION[gt] && (
                          <div style={{ fontSize: 11, color: '#8a9a89', marginTop: 3, lineHeight: 1.5, maxWidth: 260 }}>
                            {GATE_DESCRIPTION[gt]}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          display: 'inline-block', padding: '3px 10px', borderRadius: 12,
                          fontSize: 11, fontWeight: 600,
                          background: decision === 'approved' ? '#d1fae5' : decision === 'rejected' ? '#fee2e2' : '#fef3c7',
                          color:      decision === 'approved' ? '#065f46' : decision === 'rejected' ? '#991b1b' : '#92400e',
                        }}>
                          {decision === 'approved' ? 'Approuvé' : decision === 'rejected' ? 'Refusé' : 'En attente'}
                        </span>
                        {g?.decided_at && (
                          <div style={{ fontSize: 10, color: '#9aaa99', marginTop: 4 }}>
                            {new Date(g.decided_at).toLocaleString('fr-FR')}
                          </div>
                        )}
                        {g?.comment && (
                          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4, fontStyle: 'italic' }}>
                            « {g.comment} »
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <button
                          onClick={() => openReview(d, gt)}
                          disabled={isActing}
                          style={{
                            padding: '7px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                            border: `1.5px solid ${FOREST}`,
                            background: 'white', color: FOREST,
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                          }}
                        >
                          <span>📋</span> Réviser
                        </button>
                      </td>
                    </tr>
                  )
                })
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── Review Panel (full-page overlay) ─────────────────────────────── */}
      {review && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.55)', display: 'flex',
        }}>
          {/* Left — PDF viewer */}
          <div style={{ flex: 1, background: '#1a1a1a', display: 'flex', flexDirection: 'column' }}>

            {/* ── Pièces justificatives KYC (V1 uniquement) ──────────────────── */}
            {review.gateType === 'kyc_validation' && (
              <div style={{ background: '#0f1f0e', borderBottom: '1px solid #2a3a29', padding: '10px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ color: '#86efac', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
                    📎 Pièces justificatives client
                  </span>
                  {kycDocLoading && <span style={{ color: '#555', fontSize: 11 }}>Chargement…</span>}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {!kycDocLoading && kycDocs.length === 0 && (
                    <span style={{ color: '#4b5563', fontSize: 11 }}>Aucune pièce téléversée</span>
                  )}
                  {kycDocs.map(doc => (
                    <a
                      key={doc.key}
                      href={doc.url ?? '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => {
                        if (!doc.url) { e.preventDefault(); return }
                        // Si PDF, ouvrir dans l'iframe
                        if (doc.url.includes('.pdf') || doc.url.includes('pdf')) {
                          e.preventDefault()
                          setPdfUrl(doc.url)
                        }
                      }}
                      title={doc.present ? doc.label : `${doc.label} — non fourni`}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '4px 10px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                        border: `1.5px solid ${doc.present && doc.url ? '#166534' : '#374151'}`,
                        background: doc.present && doc.url ? '#14532d' : '#1f2937',
                        color: doc.present && doc.url ? '#86efac' : doc.present ? '#f87171' : '#6b7280',
                        cursor: doc.url ? 'pointer' : 'default',
                        textDecoration: 'none',
                      }}
                    >
                      {doc.present ? (doc.url ? '✓' : '⚠') : '✗'} {doc.label}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Doc selector (PDFs générés) */}
            <div style={{ background: '#111', padding: '10px 16px', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ color: '#ccc', fontSize: 12, fontWeight: 600 }}>Documents générés :</span>
              {docLoading && <span style={{ color: '#888', fontSize: 12 }}>Chargement…</span>}
              {!docLoading && docLoadError && (
                <span style={{ color: '#f87171', fontSize: 12 }}>⚠ {docLoadError}</span>
              )}
              {!docLoading && !docLoadError && docs.length === 0 && (
                <span style={{ color: '#666', fontSize: 12 }}>Aucun document généré pour ce client</span>
              )}
              {docs.map(doc => (
                <button
                  key={doc.id}
                  onClick={() => doc.url ? setPdfUrl(doc.url) : undefined}
                  disabled={!doc.url}
                  title={doc.filename ?? doc.type}
                  style={{
                    padding: '4px 10px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                    border: `1.5px solid ${pdfUrl === doc.url ? GOLD : '#444'}`,
                    background: pdfUrl === doc.url ? '#2a2a2a' : 'transparent',
                    color: pdfUrl === doc.url ? GOLD : doc.url ? '#aaa' : '#555',
                    cursor: doc.url ? 'pointer' : 'not-allowed',
                    opacity: doc.url ? 1 : 0.5,
                  }}
                >
                  {doc.type.toUpperCase()}
                </button>
              ))}
            </div>
            {/* Iframe PDF */}
            <div style={{ flex: 1, overflow: 'hidden' }}>
              {pdfUrl ? (
                <iframe
                  src={pdfUrl}
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  title="Document"
                />
              ) : (
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  height: '100%', color: '#555', gap: 12,
                }}>
                  <span style={{ fontSize: 48 }}>📄</span>
                  <span style={{ fontSize: 14 }}>Sélectionner un document ci-dessus</span>
                  {docs.length > 0 && (
                    <button
                      onClick={() => setPdfUrl(docs[0].url)}
                      style={{
                        padding: '8px 18px', borderRadius: 6, fontSize: 13, fontWeight: 600,
                        border: 'none', background: FOREST, color: 'white', cursor: 'pointer',
                      }}
                    >
                      Ouvrir le dernier document
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right — Decision panel */}
          <div style={{
            width: 380, background: 'white', display: 'flex', flexDirection: 'column',
            boxShadow: '-4px 0 24px rgba(0,0,0,0.2)',
          }}>
            {/* Header */}
            <div style={{ background: FOREST, padding: '16px 20px', color: 'white' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>
                    {review.dossier.prenom} {review.dossier.nom}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>
                    {GATE_LABEL[review.gateType] ?? review.gateType}
                  </div>
                </div>
                <button
                  onClick={closeReview}
                  style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: 18, cursor: 'pointer', padding: 4 }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Scrollable body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
              {/* Context */}
              <div style={{ background: '#f8f4ec', borderRadius: 8, padding: '12px 14px', marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: '#8a9a89', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase' }}>
                  Contexte
                </div>
                <div style={{ fontSize: 12, color: '#3a4d39', lineHeight: 1.6 }}>
                  {GATE_DESCRIPTION[review.gateType]}
                </div>
                <div style={{ fontSize: 11, color: '#aaa', marginTop: 8 }}>
                  Pipeline : <strong style={{ color: FOREST }}>{review.dossier.pipeline_stage}</strong>
                </div>
              </div>

              {/* ── Édition inline : V1 KYC ─────────────────────── */}
              {review.gateType === 'kyc_validation' && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: FOREST, marginBottom: 8 }}>
                    Surcharge manuelle — Classification LCB-FT
                  </div>
                  <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 4 }}>
                    Risque LCB-FT retenu
                  </label>
                  <select
                    value={editFields['risque_lcbft'] ?? ''}
                    onChange={e => setEditFields(p => ({ ...p, risque_lcbft: e.target.value }))}
                    style={{
                      width: '100%', padding: '8px 10px', border: '1.5px solid #d1d5db',
                      borderRadius: 6, fontSize: 13, background: 'white',
                    }}
                  >
                    <option value="">Conserver la valeur calculée</option>
                    <option value="faible">Faible</option>
                    <option value="modere">Modéré</option>
                    <option value="eleve">Élevé</option>
                  </select>
                </div>
              )}

              {/* ── Édition inline : V2 Profil Risque ───────────── */}
              {review.gateType === 'profil_risque_validation' && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: FOREST, marginBottom: 8 }}>
                    Surcharge manuelle — Profil retenu
                  </div>
                  <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 4 }}>
                    Profil investisseur retenu
                  </label>
                  <select
                    value={editFields['profil_retenu'] ?? ''}
                    onChange={e => setEditFields(p => ({ ...p, profil_retenu: e.target.value }))}
                    style={{
                      width: '100%', padding: '8px 10px', border: '1.5px solid #d1d5db',
                      borderRadius: 6, fontSize: 13, background: 'white', marginBottom: 10,
                    }}
                  >
                    <option value="">Conserver le scoring calculé</option>
                    <option value="prudent">Prudent</option>
                    <option value="equilibre">Équilibré</option>
                    <option value="dynamique">Dynamique</option>
                    <option value="offensif">Offensif</option>
                  </select>
                  <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 4 }}>
                    Justification de surcharge (obligatoire si profil modifié)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Expliquer pourquoi le profil calculé est surchargé…"
                    value={editFields['commentaire_conseiller'] ?? ''}
                    onChange={e => setEditFields(p => ({ ...p, commentaire_conseiller: e.target.value }))}
                    style={{
                      width: '100%', padding: '8px 10px', border: '1.5px solid #d1d5db',
                      borderRadius: 6, fontSize: 12, resize: 'vertical', boxSizing: 'border-box',
                    }}
                  />
                </div>
              )}

              {/* Commentaire de décision */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: FOREST, display: 'block', marginBottom: 6 }}>
                  Commentaire de décision
                </label>
                <textarea
                  rows={4}
                  placeholder="Observations, réserves, conditions…"
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 12px', border: '1.5px solid #d1d5db',
                    borderRadius: 8, fontSize: 13, resize: 'vertical', boxSizing: 'border-box',
                    fontFamily: "'Inter', system-ui, sans-serif",
                  }}
                />
              </div>

              {error && (
                <div style={{ background: '#fee2e2', color: '#991b1b', padding: '10px 14px', borderRadius: 8, fontSize: 12, marginBottom: 12 }}>
                  {error}
                </div>
              )}
            </div>

            {/* Footer — action buttons */}
            <div style={{ padding: '16px 20px', borderTop: '1px solid #f0eee8', display: 'flex', gap: 10 }}>
              <button
                disabled={isActingNow}
                onClick={() => decide(review.dossier.id, review.gateType, 'approved')}
                style={{
                  flex: 1, padding: '11px 0', borderRadius: 8, fontSize: 13, fontWeight: 700,
                  border: 'none', background: isActingNow ? '#e5e7eb' : FOREST,
                  color: isActingNow ? '#9ca3af' : 'white',
                  cursor: isActingNow ? 'not-allowed' : 'pointer',
                }}
              >
                {isActingNow ? '…' : '✓ Approuver'}
              </button>
              <button
                disabled={isActingNow}
                onClick={() => decide(review.dossier.id, review.gateType, 'rejected')}
                style={{
                  flex: 1, padding: '11px 0', borderRadius: 8, fontSize: 13, fontWeight: 700,
                  border: '1.5px solid #dc2626', background: 'white',
                  color: isActingNow ? '#9ca3af' : '#dc2626',
                  cursor: isActingNow ? 'not-allowed' : 'pointer',
                }}
              >
                ✕ Refuser
              </button>
            </div>
          </div>
        </div>
      )}

      <p style={{ fontSize: 11, color: '#9aaa99', marginTop: 24, fontFamily: "'Inter', system-ui, sans-serif" }}>
        Réservé au rôle <strong style={{ color: GOLD }}>admin</strong>. Toutes les décisions sont consignées dans <code>audit_logs</code>.
      </p>
    </div>
  )
}
