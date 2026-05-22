'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const FOREST = '#3a4d39'
const GOLD   = '#c9a55a'
const CREAM  = '#f8f4ec'

interface Produit {
  id:                   string
  nom:                  string
  type:                 string
  slug:                 string
  gestionnaire:         string
  description:          string | null
  rendement_min:        number | null
  rendement_max:        number | null
  ticket_min:           number | null
  halal_certifie:       boolean
  actif:                boolean
  frais_entree_pct:     number | null
  frais_gestion_pct:    number | null
  commission_amana_pct: number | null
  created_at:           string
}

const EMPTY: Omit<Produit, 'id' | 'created_at'> = {
  nom: '', type: 'scpi', slug: '', gestionnaire: '',
  description: '', rendement_min: null, rendement_max: null,
  ticket_min: null, halal_certifie: false, actif: true,
  frais_entree_pct: null, frais_gestion_pct: null, commission_amana_pct: null,
}

const TYPES = [
  'assurance_vie', 'capitalisation', 'scpi', 'cto',
  'retraite', 'pee', 'don', 'immobilier',
]

const TYPE_LABEL: Record<string, string> = {
  assurance_vie: 'Assurance-vie',
  capitalisation: 'Capitalisation',
  scpi:          'SCPI',
  cto:           'Compte-Titres',
  retraite:      'Retraite / PER',
  pee:           'PEE / PERCO',
  don:           'Don / Waqf',
  immobilier:    'Immobilier',
}

function toSlug(s: string) {
  return s.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export default function AdminProduitsPage() {
  const [produits, setProduits] = useState<Produit[]>([])
  const [loading,  setLoading]  = useState(true)
  const [editing,  setEditing]  = useState<Partial<Produit> | null>(null)
  const [saving,   setSaving]   = useState(false)
  const [msg,      setMsg]      = useState('')
  const supabase = createClient()

  useEffect(() => { loadProduits() }, [])

  async function loadProduits() {
    setLoading(true)
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('type', { ascending: true })
    if (error) setMsg(`Erreur chargement : ${error.message}`)
    setProduits((data ?? []) as Produit[])
    setLoading(false)
  }

  async function saveProduit() {
    if (!editing) return
    setSaving(true)

    // Auto-slug si vide
    const payload = { ...editing }
    if (!payload.slug && payload.nom) payload.slug = toSlug(payload.nom)

    let error
    if (payload.id) {
      const { id, created_at, ...rest } = payload as Produit
      ;({ error } = await supabase.from('products').update(rest).eq('id', id))
    } else {
      ;({ error } = await supabase.from('products').insert(payload))
    }

    if (error) {
      setMsg(`Erreur : ${error.message}`)
    } else {
      setMsg(payload.id ? 'Produit mis à jour.' : 'Produit créé.')
      setEditing(null)
      loadProduits()
    }
    setSaving(false)
    setTimeout(() => setMsg(''), 4000)
  }

  async function toggleActif(p: Produit) {
    await supabase.from('products').update({ actif: !p.actif }).eq('id', p.id)
    setProduits(prev => prev.map(x => x.id === p.id ? { ...x, actif: !p.actif } : x))
  }

  const input: React.CSSProperties = {
    width: '100%', padding: '9px 12px',
    border: '1.5px solid #ddd5c8', borderRadius: 8,
    fontSize: 13, color: '#2a3829', background: '#fafaf8',
    outline: 'none', boxSizing: 'border-box',
    fontFamily: "'Inter', system-ui, sans-serif",
  }
  const lbl: React.CSSProperties = {
    display: 'block', fontSize: 11, fontWeight: 600, color: '#5a6a59',
    textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5,
    fontFamily: "'Inter', system-ui, sans-serif",
  }

  const actifCount = produits.filter(p => p.actif).length

  return (
    <div>
      {/* Titre + bouton */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 28, color: FOREST, fontWeight: 400, margin: '0 0 4px' }}>
            Produits financiers
          </h1>
          <p style={{ fontSize: 13, color: '#8a9a89', margin: 0 }}>
            {produits.length} produit{produits.length > 1 ? 's' : ''} · {actifCount} actif{actifCount > 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={() => setEditing({ ...EMPTY })} style={{
          padding: '10px 20px', background: FOREST, color: 'white',
          border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600,
          cursor: 'pointer',
        }}>
          + Nouveau produit
        </button>
      </div>

      {/* Message flash */}
      {msg && (
        <div style={{
          background: msg.startsWith('Erreur') ? '#fde8e8' : '#e8f5e9',
          border: `1px solid ${msg.startsWith('Erreur') ? '#f5c6c6' : '#a5d6a7'}`,
          borderRadius: 8, padding: '10px 16px', marginBottom: 16,
          fontSize: 13, color: msg.startsWith('Erreur') ? '#c0392b' : '#1b5e20',
        }}>
          {msg}
        </div>
      )}

      {/* Formulaire édition */}
      {editing && (
        <div style={{
          background: 'white', borderRadius: 14, padding: 24, marginBottom: 24,
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: `1.5px solid ${GOLD}40`,
        }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 20, color: FOREST, fontWeight: 400, margin: '0 0 20px' }}>
            {editing.id ? 'Modifier le produit' : 'Nouveau produit'}
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={lbl}>Nom du produit *</label>
              <input
                value={editing.nom ?? ''}
                onChange={e => setEditing(p => ({
                  ...p!,
                  nom: e.target.value,
                  slug: p?.slug || toSlug(e.target.value),
                }))}
                style={input}
                placeholder="ex: Patrimoine Vie Plus Multiprojet"
              />
            </div>
            <div>
              <label style={lbl}>Gestionnaire *</label>
              <input
                value={editing.gestionnaire ?? ''}
                onChange={e => setEditing(p => ({ ...p!, gestionnaire: e.target.value }))}
                style={input}
                placeholder="ex: VIE PLUS"
              />
            </div>
            <div>
              <label style={lbl}>Type *</label>
              <select
                value={editing.type ?? 'scpi'}
                onChange={e => setEditing(p => ({ ...p!, type: e.target.value }))}
                style={input}
              >
                {TYPES.map(t => <option key={t} value={t}>{TYPE_LABEL[t] ?? t}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Slug (auto-généré)</label>
              <input
                value={editing.slug ?? ''}
                onChange={e => setEditing(p => ({ ...p!, slug: e.target.value }))}
                style={{ ...input, color: '#8a9a89', fontSize: 12 }}
                placeholder="auto"
              />
            </div>
            <div>
              <label style={lbl}>Rendement min (%)</label>
              <input
                type="number" step="0.01"
                value={editing.rendement_min ?? ''}
                onChange={e => setEditing(p => ({ ...p!, rendement_min: parseFloat(e.target.value) || null }))}
                style={input}
                placeholder="ex: 3.27"
              />
            </div>
            <div>
              <label style={lbl}>Rendement max (%)</label>
              <input
                type="number" step="0.01"
                value={editing.rendement_max ?? ''}
                onChange={e => setEditing(p => ({ ...p!, rendement_max: parseFloat(e.target.value) || null }))}
                style={input}
                placeholder="ex: 4.52"
              />
            </div>
            <div>
              <label style={lbl}>Ticket minimum (€)</label>
              <input
                type="number"
                value={editing.ticket_min ?? ''}
                onChange={e => setEditing(p => ({ ...p!, ticket_min: parseInt(e.target.value) || null }))}
                style={input}
                placeholder="ex: 1000"
              />
            </div>
            <div>
              <label style={lbl}>Frais d'entrée (%)</label>
              <input
                type="number" step="0.01"
                value={editing.frais_entree_pct ?? ''}
                onChange={e => setEditing(p => ({ ...p!, frais_entree_pct: parseFloat(e.target.value) || null }))}
                style={input}
                placeholder="ex: 4.50"
              />
            </div>
            <div>
              <label style={lbl}>Frais de gestion annuels (%)</label>
              <input
                type="number" step="0.01"
                value={editing.frais_gestion_pct ?? ''}
                onChange={e => setEditing(p => ({ ...p!, frais_gestion_pct: parseFloat(e.target.value) || null }))}
                style={input}
                placeholder="ex: 0.80"
              />
            </div>
            <div>
              <label style={lbl}>Commission AMANA (%)</label>
              <input
                type="number" step="0.01"
                value={editing.commission_amana_pct ?? ''}
                onChange={e => setEditing(p => ({ ...p!, commission_amana_pct: parseFloat(e.target.value) || null }))}
                style={input}
                placeholder="ex: 0.50"
              />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={lbl}>Description</label>
            <textarea
              value={editing.description ?? ''}
              onChange={e => setEditing(p => ({ ...p!, description: e.target.value }))}
              rows={3}
              style={{ ...input, resize: 'vertical', lineHeight: 1.6 }}
              placeholder="Description courte du produit"
            />
          </div>

          <div style={{ display: 'flex', gap: 24, marginBottom: 20 }}>
            {[
              { key: 'actif' as const,           label: 'Produit actif (visible dans le catalogue)' },
              { key: 'halal_certifie' as const,  label: 'Sélection éthique interne (flag interne)' },
            ].map(({ key, label }) => (
              <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={!!editing[key]}
                  onChange={e => setEditing(p => ({ ...p!, [key]: e.target.checked }))}
                  style={{ accentColor: FOREST, width: 14, height: 14 }}
                />
                <span style={{ fontSize: 12, color: '#5a6a59' }}>{label}</span>
              </label>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button
              onClick={() => setEditing(null)}
              style={{ padding: '9px 20px', background: 'transparent', border: '1.5px solid #ddd5c8', borderRadius: 8, fontSize: 13, cursor: 'pointer', color: '#5a6a59' }}
            >
              Annuler
            </button>
            <button
              onClick={saveProduit}
              disabled={saving || !editing.nom || !editing.gestionnaire}
              style={{ padding: '9px 20px', background: saving ? '#6a7f69' : FOREST, color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: saving ? 'default' : 'pointer' }}
            >
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </div>
      )}

      {/* Table produits */}
      <div style={{ background: 'white', borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '24px 1fr 110px 120px 90px 100px',
          padding: '12px 20px', borderBottom: '1px solid #f0ece4',
          fontSize: 10, fontWeight: 700, color: '#8a9a89',
          letterSpacing: '0.1em', textTransform: 'uppercase',
        }}>
          <div/>
          <div>Produit</div>
          <div>Type</div>
          <div>Rendement</div>
          <div>Ticket min</div>
          <div>Actions</div>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#8a9a89', fontSize: 13 }}>Chargement…</div>
        ) : produits.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#8a9a89', fontSize: 13 }}>Aucun produit. Créez le premier.</div>
        ) : produits.map((p, i) => (
          <div
            key={p.id}
            style={{
              display: 'grid',
              gridTemplateColumns: '24px 1fr 110px 120px 90px 100px',
              padding: '14px 20px', alignItems: 'center',
              borderBottom: i < produits.length - 1 ? '1px solid #f8f5f0' : 'none',
              opacity: p.actif ? 1 : 0.45,
              background: editing?.id === p.id ? '#fdfaf5' : 'transparent',
            }}
          >
            {/* Indicateur actif */}
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: p.actif ? '#10b981' : '#d1d5db',
            }} />

            {/* Nom + gestionnaire */}
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: FOREST }}>{p.nom}</div>
              <div style={{ fontSize: 11, color: '#9aaa99', marginTop: 2 }}>{p.gestionnaire}</div>
            </div>

            {/* Type */}
            <div style={{ fontSize: 11, color: '#5a6a59', fontWeight: 600 }}>
              <span style={{ background: CREAM, padding: '3px 8px', borderRadius: 10 }}>
                {TYPE_LABEL[p.type] ?? p.type}
              </span>
            </div>

            {/* Rendement */}
            <div style={{ fontSize: 13, fontWeight: 600, color: FOREST }}>
              {p.rendement_min != null && p.rendement_max != null
                ? p.rendement_min === p.rendement_max
                  ? `${p.rendement_min} %`
                  : `${p.rendement_min} – ${p.rendement_max} %`
                : <span style={{ color: '#9aaa99', fontWeight: 400, fontSize: 12 }}>variable</span>
              }
            </div>

            {/* Ticket min */}
            <div style={{ fontSize: 12, color: '#5a6a59' }}>
              {p.ticket_min ? `${Number(p.ticket_min).toLocaleString('fr-FR')} €` : '—'}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => setEditing({ ...p })}
                style={{ padding: '5px 10px', border: '1px solid #ddd5c8', borderRadius: 6, background: 'white', cursor: 'pointer', fontSize: 11, color: FOREST }}
              >
                Modifier
              </button>
              <button
                onClick={() => toggleActif(p)}
                style={{
                  padding: '5px 10px',
                  border: `1px solid ${p.actif ? '#e74c3c40' : '#10b98140'}`,
                  borderRadius: 6,
                  background: p.actif ? '#fde8e820' : '#ecfdf520',
                  cursor: 'pointer', fontSize: 11,
                  color: p.actif ? '#e74c3c' : '#10b981',
                }}
              >
                {p.actif ? 'Désact.' : 'Activer'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
