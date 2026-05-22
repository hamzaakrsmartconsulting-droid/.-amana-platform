'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

const FOREST = '#3a4d39'
const GOLD = '#c9a55a'
const CREAM = '#f8f4ec'

const TYPES = [
  { value: 'assurance_vie', label: 'Assurance-vie' },
  { value: 'scpi',          label: 'SCPI' },
  { value: 'cto',           label: 'Actions Halal (CTO)' },
  { value: 'immobilier',    label: 'Immobilier' },
  { value: 'pee',           label: 'PEE / PERCO' },
  { value: 'retraite',      label: 'Retraite (PER)' },
  { value: 'don',           label: 'Don / Waqf' },
]

type Form = {
  type: string
  nom: string
  gestionnaire: string
  description: string
  rendement: string
  ticket_min: string
  halal_label: string
  halal_detail: string
  actif: boolean
}

const EMPTY: Form = {
  type: 'scpi', nom: '', gestionnaire: '', description: '',
  rendement: '', ticket_min: '', halal_label: 'Conforme charia',
  halal_detail: '', actif: true,
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{ fontSize: '12px', color: '#6b7f6a', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500 }}>
        {label}
      </label>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: '8px',
  fontSize: '14px', color: FOREST, background: 'white', outline: 'none',
  width: '100%', boxSizing: 'border-box',
}

export default function ProduitFormPage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string
  const isNew = id === 'nouveau'

  const [form, setForm] = useState<Form>(EMPTY)
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isNew) return
    fetch(`/api/produits/${id}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return }
        setForm({
          type:         d.type ?? 'scpi',
          nom:          d.nom ?? '',
          gestionnaire: d.gestionnaire ?? '',
          description:  d.description ?? '',
          rendement:    d.rendement ?? '',
          ticket_min:   d.ticket_min?.toString() ?? '',
          halal_label:  d.halal_label ?? 'Conforme charia',
          halal_detail: d.halal_detail ?? '',
          actif:        d.actif !== false,
        })
      })
      .catch(() => setError('Erreur de chargement'))
      .finally(() => setLoading(false))
  }, [id, isNew])

  const set = (k: keyof Form, v: string | boolean) =>
    setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      const body = {
        ...form,
        ticket_min: form.ticket_min ? parseInt(form.ticket_min) : null,
      }
      const res = await fetch(
        isNew ? '/api/produits' : `/api/produits/${id}`,
        { method: isNew ? 'POST' : 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erreur')
      router.push('/conseiller/produits')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Supprimer ce produit ?')) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/produits/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Erreur suppression')
      router.push('/conseiller/produits')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: CREAM, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7f6a' }}>
      Chargement…
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: CREAM, display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ background: '#2b3a2a', padding: '0 52px', height: '68px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <a href="/" style={{ fontFamily: 'Georgia, serif', fontSize: '20px', color: CREAM, letterSpacing: '0.06em', textDecoration: 'none' }}>
          AMANA <span style={{ color: GOLD }}>PATRIMOINE</span>
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <a href="/conseiller"          style={{ color: 'rgba(248,244,236,0.6)', fontSize: '13px', textDecoration: 'none' }}>Dossiers</a>
          <a href="/conseiller/projets"  style={{ color: 'rgba(248,244,236,0.6)', fontSize: '13px', textDecoration: 'none' }}>Projets</a>
          <a href="/conseiller/produits" style={{ color: CREAM, fontSize: '13px', textDecoration: 'none' }}>Produits</a>
        </div>
      </div>

      <div style={{ flex: 1, maxWidth: '720px', margin: '0 auto', padding: '48px 24px', width: '100%' }}>

        {/* Titre */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' }}>
          <div>
            <a href="/conseiller/produits" style={{ fontSize: '13px', color: '#6b7f6a', textDecoration: 'none' }}>← Produits</a>
            <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '28px', color: FOREST, margin: '8px 0 0' }}>
              {isNew ? 'Nouveau produit' : 'Modifier le produit'}
            </h1>
          </div>
          {!isNew && (
            <button onClick={handleDelete} disabled={deleting} style={{
              padding: '8px 16px', background: 'white', color: '#991b1b',
              border: '1px solid #fca5a5', borderRadius: '6px', fontSize: '13px',
              cursor: 'pointer', fontWeight: 500,
            }}>
              {deleting ? 'Suppression…' : 'Supprimer'}
            </button>
          )}
        </div>

        {/* Formulaire */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '32px', boxShadow: '0 2px 12px rgba(58,77,57,0.06)', display: 'flex', flexDirection: 'column', gap: '20px' }}>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <Field label="Type de produit">
              <select value={form.type} onChange={e => set('type', e.target.value)} style={inputStyle}>
                {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </Field>
            <Field label="Actif">
              <select value={form.actif ? 'oui' : 'non'} onChange={e => set('actif', e.target.value === 'oui')} style={inputStyle}>
                <option value="oui">Oui — visible dans le catalogue</option>
                <option value="non">Non — masqué</option>
              </select>
            </Field>
          </div>

          <Field label="Nom du produit">
            <input value={form.nom} onChange={e => set('nom', e.target.value)} placeholder="ex. SCPI Sélection Europe" style={inputStyle} />
          </Field>

          <Field label="Gestionnaire / Société de gestion">
            <input value={form.gestionnaire} onChange={e => set('gestionnaire', e.target.value)} placeholder="ex. Primonial REIM" style={inputStyle} />
          </Field>

          <Field label="Description">
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Présentation du produit, stratégie, avantages…"
              rows={4}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <Field label="Rendement indicatif">
              <input value={form.rendement} onChange={e => set('rendement', e.target.value)} placeholder="ex. 5 – 7%" style={inputStyle} />
            </Field>
            <Field label="Ticket minimum (€)">
              <input type="number" value={form.ticket_min} onChange={e => set('ticket_min', e.target.value)} placeholder="ex. 5000" style={inputStyle} />
            </Field>
          </div>

          <Field label="Label halal">
            <input value={form.halal_label} onChange={e => set('halal_label', e.target.value)} placeholder="ex. Conforme charia" style={inputStyle} />
          </Field>

          <Field label="Détail conformité halal">
            <textarea
              value={form.halal_detail}
              onChange={e => set('halal_detail', e.target.value)}
              placeholder="ex. Screené AAOIFI, exclusion secteurs haram, audité annuellement…"
              rows={3}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </Field>

          {error && (
            <div style={{ padding: '12px 16px', background: '#fef2f2', borderRadius: '8px', color: '#991b1b', fontSize: '13px' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '8px' }}>
            <a href="/conseiller/produits" style={{
              padding: '10px 24px', background: 'white', color: '#6b7280',
              border: '1px solid #e5e7eb', borderRadius: '8px', textDecoration: 'none', fontSize: '14px',
            }}>
              Annuler
            </a>
            <button onClick={handleSave} disabled={saving || !form.nom} style={{
              padding: '10px 28px', background: saving || !form.nom ? '#e8dfc8' : GOLD,
              color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px',
              cursor: saving || !form.nom ? 'default' : 'pointer', fontWeight: 500,
            }}>
              {saving ? 'Enregistrement…' : isNew ? 'Créer le produit' : 'Enregistrer'}
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
