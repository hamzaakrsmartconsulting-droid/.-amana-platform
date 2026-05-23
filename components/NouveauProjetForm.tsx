'use client'

import { useState } from 'react'
import type { CSSProperties, ChangeEvent } from 'react'
import { createClient } from '@/lib/supabase/client'

const FOREST = '#444b3f'
const GOLD = '#c9a55a'
const CREAM = '#f8f4ec'

const TYPES_PROJET = [
  { value: 'assurance_vie', label: 'Assurance-vie', desc: 'Epargne long terme, fiscalite optimisee' },
  { value: 'scpi',          label: 'SCPI',          desc: 'Pierre-papier, revenus locatifs halal' },
  { value: 'cto',           label: 'CTO',           desc: 'Compte-titres, actions ethiques' },
  { value: 'immobilier',    label: 'Immobilier',     desc: 'Investissement direct ou SCI' },
  { value: 'pee',           label: 'PEE / PERCO',   desc: 'Epargne salariale' },
  { value: 'retraite',      label: 'Retraite',       desc: 'PER individuel' },
  { value: 'don',           label: 'Don / Waqf',    desc: 'Philanthropie islamique' },
]

const inp: CSSProperties = {
  width: '100%', padding: '11px 14px', border: '1px solid #d4c9a8',
  borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box',
}
const lbl: CSSProperties = {
  display: 'block', fontSize: '12px', fontWeight: 500, color: '#6d7368',
  textTransform: 'uppercase', letterSpacing: '0.05em',
  marginBottom: '6px', marginTop: '20px',
}
const btnG: CSSProperties = {
  padding: '13px 32px', background: GOLD, color: 'white',
  border: 'none', borderRadius: '8px', fontSize: '15px',
  cursor: 'pointer', fontWeight: 500,
}
const btnO: CSSProperties = {
  padding: '13px 32px', background: 'transparent', color: FOREST,
  border: '1px solid #d4c9a8', borderRadius: '8px',
  fontSize: '15px', cursor: 'pointer',
}

type Props = {
  kycId: string
  userId: string
  tenantId: string
  conseillerName: string
}

export default function NouveauProjetForm({ kycId, userId, tenantId, conseillerName }: Props) {
  const [type, setType] = useState('')
  const [montant, setMontant] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!type || !montant) return
    setSaving(true)
    setError('')
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Non connecte')

      const { error: e } = await supabase.from('projects').insert({
        tenant_id: tenantId,
        user_id: userId,
        kyc_id: kycId,
        conseiller_id: user.id,
        type,
        montant: parseInt(montant),
        statut: 'en_cours',
        metadata: { notes, conseiller_name: conseillerName },
      })
      if (e) throw e
      setDone(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur creation projet')
    } finally {
      setSaving(false)
    }
  }

  if (done) {
    return (
      <div style={{ padding: '24px', background: '#d1fae5', borderRadius: '12px', color: '#065f46', textAlign: 'center' }}>
        <div style={{ fontSize: '24px', marginBottom: '8px' }}>&#10003;</div>
        <div style={{ fontWeight: 600, marginBottom: '4px' }}>Projet cree avec succes</div>
        <div style={{ fontSize: '13px' }}>
          {TYPES_PROJET.find(t => t.value === type)?.label} — {parseInt(montant).toLocaleString('fr-FR')} EUR
        </div>
        <button
          onClick={() => { setDone(false); setType(''); setMontant(''); setNotes('') }}
          style={{ ...btnO, marginTop: '16px', fontSize: '13px', padding: '8px 20px' }}
        >
          Creer un autre projet
        </button>
      </div>
    )
  }

  return (
    <div>
      {/* Choix du type */}
      <label style={lbl}>Type de projet</label>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '4px' }}>
        {TYPES_PROJET.map(t => (
          <button
            key={t.value}
            onClick={() => setType(t.value)}
            style={{
              padding: '14px 16px', borderRadius: '10px', textAlign: 'left', cursor: 'pointer',
              border: type === t.value ? `2px solid ${GOLD}` : '1px solid #d4c9a8',
              background: type === t.value ? '#fef9f0' : 'white',
              transition: 'all 0.15s',
            }}
          >
            <div style={{ fontWeight: 600, color: FOREST, fontSize: '14px', marginBottom: '2px' }}>{t.label}</div>
            <div style={{ fontSize: '11px', color: '#6d7368' }}>{t.desc}</div>
          </button>
        ))}
      </div>

      {/* Montant */}
      <label style={lbl}>Montant envisage (EUR)</label>
      <input
        style={inp} type="number" value={montant}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setMontant(e.target.value)}
        placeholder="ex : 50000"
      />

      {/* Notes internes */}
      <label style={lbl}>Notes internes (facultatif)</label>
      <textarea
        style={{ ...inp, minHeight: '80px', resize: 'vertical' as const, fontFamily: 'inherit' }}
        value={notes}
        onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
        placeholder="Contexte, contraintes specifiques, priorites..."
      />

      {error && (
        <div style={{ background: '#fde8e8', border: '1px solid #f5c6c6', borderRadius: '8px', padding: '12px 16px', marginTop: '12px', fontSize: '13px', color: '#c0392b' }}>
          {error}
        </div>
      )}

      <div style={{ marginTop: '24px' }}>
        <button
          style={{ ...btnG, opacity: saving || !type || !montant ? 0.6 : 1 }}
          onClick={handleSubmit}
          disabled={saving || !type || !montant}
        >
          {saving ? 'Creation...' : 'Creer le projet'}
        </button>
      </div>
    </div>
  )
}
