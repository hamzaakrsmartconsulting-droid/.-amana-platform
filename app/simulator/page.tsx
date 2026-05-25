'use client'

import type { CSSProperties } from 'react'
import Link from 'next/link'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import AmanaLogo from '@/components/amana-logo'

const FOREST = '#444b3f'
const GOLD = '#c9a55a'
const CREAM = '#f8f4ec'
const HEADER_BG = '#353b32'

type SimState = {
  step: number
  objectifs: string[]
  situation: string
  enfants: number
  immo: number
  financier: number
  revenus: string
  tmi: number | null
  montantAV: number
  montantSCPI: number
  montantCTO: number
}

const initialState: SimState = {
  step: 1,
  objectifs: [],
  situation: '',
  enfants: 0,
  immo: 0,
  financier: 0,
  revenus: '',
  tmi: null,
  montantAV: 0,
  montantSCPI: 0,
  montantCTO: 0,
}

function calcCashback(av: number, scpi: number, cto: number) {
  const count = [av, scpi, cto].filter(m => m > 0).length
  if (count === 3) return { pct: 2, montant: scpi * 0.02 }
  if (count === 2) return { pct: 1, montant: scpi * 0.01 }
  return { pct: 0, montant: 0 }
}

const cardStyle: CSSProperties = {
  background: 'white',
  borderRadius: '16px',
  padding: '48px',
  maxWidth: '640px',
  width: '100%',
  boxShadow: '0 4px 40px rgba(68,75,63,0.10)',
  position: 'relative',
}

const btnGold: CSSProperties = {
  padding: '13px 32px',
  background: GOLD,
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  fontSize: '15px',
  cursor: 'pointer',
  fontWeight: 500,
}

const btnOutline: CSSProperties = {
  padding: '13px 32px',
  background: 'transparent',
  color: FOREST,
  border: '1px solid #d4c9a8',
  borderRadius: '8px',
  fontSize: '15px',
  cursor: 'pointer',
}

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  border: '1px solid #d4c9a8',
  borderRadius: '8px',
  fontSize: '14px',
  boxSizing: 'border-box',
  marginTop: '6px',
}

const labelStyle: CSSProperties = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 500,
  color: '#6d7368',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: '4px',
}

export default function SimulatorPage() {
  const [s, setS] = useState<SimState>(initialState)
  const [saving, setSaving] = useState(false)

  function next() {
    setS(prev => ({ ...prev, step: Math.min(6, prev.step + 1) }))
  }
  function back() {
    setS(prev => ({ ...prev, step: Math.max(1, prev.step - 1) }))
  }

  function toggleObjectif(id: string) {
    setS(prev => ({
      ...prev,
      objectifs: prev.objectifs.includes(id)
        ? prev.objectifs.filter(x => x !== id)
        : [...prev.objectifs, id],
    }))
  }

  async function handleCreateDossier() {
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('simulations').insert({
        user_id: user?.id ?? null,
        objectifs: s.objectifs,
        situation: s.situation,
        enfants: s.enfants,
        immo: s.immo,
        financier: s.financier,
        revenus: s.revenus,
        tmi: s.tmi,
        montant_av: s.montantAV,
        montant_scpi: s.montantSCPI,
        montant_cto: s.montantCTO,
      })
    } catch (_) {}
    window.location.href = '/register'
  }
  const cashback = calcCashback(s.montantAV, s.montantSCPI, s.montantCTO)
  const canNext1 = s.objectifs.length > 0
  const canNext2 = Boolean(s.situation)
  const canNext4 = Boolean(s.revenus)
  const canNext5 = s.tmi !== null

  return (
    <div style={{ minHeight: '100vh', background: CREAM, display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          background: HEADER_BG,
          padding: '0 52px',
          height: '68px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <AmanaLogo href="/" height={40} />
        <span style={{ color: 'rgba(248,244,236,0.5)', fontSize: '13px' }}>
          Étape {s.step} / 6
        </span>
      </div>

      <div style={{ height: '3px', background: '#e8dfc8' }}>
        <div
          style={{
            height: '100%',
            background: GOLD,
            width: `${(s.step / 6) * 100}%`,
            transition: 'width 0.4s ease',
          }}
        />
      </div>

      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 24px',
        }}
      >
        {/* Step 1 — Objectifs */}
        {s.step === 1 && (
          <div style={cardStyle}>
            <div
              style={{
                fontSize: '12px',
                color: GOLD,
                fontWeight: 500,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                marginBottom: '12px',
              }}
            >
              Étape 1 · Objectifs
            </div>
            <h2
              style={{
                fontFamily: 'Georgia, serif',
                fontSize: '28px',
                color: FOREST,
                margin: '0 0 8px',
              }}
            >
              Quels sont vos objectifs patrimoniaux ?
            </h2>
            <p style={{ color: '#6d7368', fontSize: '14px', margin: '0 0 32px' }}>
              Sélectionnez tout ce qui vous correspond.
            </p>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                marginBottom: '32px',
              }}
            >
              {[
                { id: 'retraite', label: 'Préparer ma retraite' },
                { id: 'transmission', label: 'Transmettre un patrimoine' },
                { id: 'epargne', label: 'Faire fructifier mon épargne' },
                { id: 'immobilier', label: "Investir dans l'immobilier" },
              ].map(o => (
                <div
                  key={o.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleObjectif(o.id)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      toggleObjectif(o.id)
                    }
                  }}
                  style={{
                    padding: '16px',
                    border: `2px solid ${s.objectifs.includes(o.id) ? GOLD : '#d4c9a8'}`,
                    borderRadius: '12px',
                    cursor: 'pointer',
                    background: s.objectifs.includes(o.id) ? '#fdf6e8' : 'white',
                    fontSize: '14px',
                    color: FOREST,
                    transition: 'all 0.2s',
                  }}
                >
                  {o.label}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" style={btnGold} onClick={next} disabled={!canNext1}>
                Continuer →
              </button>
            </div>
          </div>
        )}

        {/* Step 2 — Situation */}
        {s.step === 2 && (
          <div style={cardStyle}>
            <div
              style={{
                fontSize: '12px',
                color: GOLD,
                fontWeight: 500,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                marginBottom: '12px',
              }}
            >
              Étape 2 · Situation familiale
            </div>
            <h2
              style={{
                fontFamily: 'Georgia, serif',
                fontSize: '28px',
                color: FOREST,
                margin: '0 0 32px',
              }}
            >
              Votre situation personnelle
            </h2>
            <label style={labelStyle}>Situation familiale</label>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px',
                marginBottom: '24px',
              }}
            >
              {[
                { id: 'celibataire', label: 'Célibataire' },
                { id: 'marie', label: 'Marié(e)' },
                { id: 'pacse', label: 'Pacsé(e)' },
                { id: 'divorce', label: 'Divorcé(e)' },
              ].map(opt => (
                <div
                  key={opt.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setS(prev => ({ ...prev, situation: opt.id }))}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setS(prev => ({ ...prev, situation: opt.id }))
                    }
                  }}
                  style={{
                    padding: '14px',
                    border: `2px solid ${s.situation === opt.id ? GOLD : '#d4c9a8'}`,
                    borderRadius: '10px',
                    cursor: 'pointer',
                    background: s.situation === opt.id ? '#fdf6e8' : 'white',
                    fontSize: '14px',
                    color: FOREST,
                    textAlign: 'center',
                  }}
                >
                  {opt.label}
                </div>
              ))}
            </div>
            <label style={labelStyle}>Nombre d&apos;enfants à charge</label>
            <input
              type="number"
              min={0}
              max={20}
              value={s.enfants}
              onChange={e =>
                setS(prev => ({ ...prev, enfants: parseInt(e.target.value, 10) || 0 }))
              }
              style={inputStyle}
            />
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: '32px',
              }}
            >
              <button type="button" style={btnOutline} onClick={back}>
                ← Retour
              </button>
              <button type="button" style={btnGold} onClick={next} disabled={!canNext2}>
                Continuer →
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — Patrimoine */}
        {s.step === 3 && (
          <div style={cardStyle}>
            <div
              style={{
                fontSize: '12px',
                color: GOLD,
                fontWeight: 500,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                marginBottom: '12px',
              }}
            >
              Étape 3 · Patrimoine
            </div>
            <h2
              style={{
                fontFamily: 'Georgia, serif',
                fontSize: '28px',
                color: FOREST,
                margin: '0 0 32px',
              }}
            >
              Votre patrimoine actuel
            </h2>
            <label style={labelStyle}>Patrimoine immobilier (€)</label>
            <input
              type="number"
              min={0}
              value={s.immo || ''}
              onChange={e =>
                setS(prev => ({ ...prev, immo: parseInt(e.target.value, 10) || 0 }))
              }
              style={inputStyle}
              placeholder="0"
            />
            <label style={{ ...labelStyle, marginTop: '20px' }}>Patrimoine financier (€)</label>
            <input
              type="number"
              min={0}
              value={s.financier || ''}
              onChange={e =>
                setS(prev => ({ ...prev, financier: parseInt(e.target.value, 10) || 0 }))
              }
              style={inputStyle}
              placeholder="0"
            />
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: '32px',
              }}
            >
              <button type="button" style={btnOutline} onClick={back}>
                ← Retour
              </button>
              <button type="button" style={btnGold} onClick={next}>
                Continuer →
              </button>
            </div>
          </div>
        )}

        {/* Step 4 — Revenus */}
        {s.step === 4 && (
          <div style={cardStyle}>
            <div
              style={{
                fontSize: '12px',
                color: GOLD,
                fontWeight: 500,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                marginBottom: '12px',
              }}
            >
              Étape 4 · Revenus
            </div>
            <h2
              style={{
                fontFamily: 'Georgia, serif',
                fontSize: '28px',
                color: FOREST,
                margin: '0 0 32px',
              }}
            >
              Vos revenus annuels
            </h2>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                marginBottom: '32px',
              }}
            >
              {[
                { id: '<30k', label: 'Moins de 30 000 €/an' },
                { id: '30-60k', label: '30 000 – 60 000 €/an' },
                { id: '60-100k', label: '60 000 – 100 000 €/an' },
                { id: '>100k', label: 'Plus de 100 000 €/an' },
              ].map(r => (
                <div
                  key={r.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setS(prev => ({ ...prev, revenus: r.id }))}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setS(prev => ({ ...prev, revenus: r.id }))
                    }
                  }}
                  style={{
                    padding: '16px 20px',
                    border: `2px solid ${s.revenus === r.id ? GOLD : '#d4c9a8'}`,
                    borderRadius: '10px',
                    cursor: 'pointer',
                    background: s.revenus === r.id ? '#fdf6e8' : 'white',
                    fontSize: '14px',
                    color: FOREST,
                  }}
                >
                  {r.label}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button type="button" style={btnOutline} onClick={back}>
                ← Retour
              </button>
              <button type="button" style={btnGold} onClick={next} disabled={!canNext4}>
                Continuer →
              </button>
            </div>
          </div>
        )}

        {/* Step 5 — TMI */}
        {s.step === 5 && (
          <div style={cardStyle}>
            <div
              style={{
                fontSize: '12px',
                color: GOLD,
                fontWeight: 500,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                marginBottom: '12px',
              }}
            >
              Étape 5 · Fiscalité
            </div>
            <h2
              style={{
                fontFamily: 'Georgia, serif',
                fontSize: '28px',
                color: FOREST,
                margin: '0 0 8px',
              }}
            >
              Votre taux marginal d&apos;imposition
            </h2>
            <p style={{ color: '#6d7368', fontSize: '14px', margin: '0 0 32px' }}>
              Utilisé pour optimiser votre allocation.
            </p>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                gap: '10px',
                marginBottom: '32px',
              }}
            >
              {[0, 11, 30, 41, 45].map(t => (
                <div
                  key={t}
                  role="button"
                  tabIndex={0}
                  onClick={() => setS(prev => ({ ...prev, tmi: t }))}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setS(prev => ({ ...prev, tmi: t }))
                    }
                  }}
                  style={{
                    padding: '16px 8px',
                    border: `2px solid ${s.tmi === t ? GOLD : '#d4c9a8'}`,
                    borderRadius: '10px',
                    cursor: 'pointer',
                    background: s.tmi === t ? '#fdf6e8' : 'white',
                    fontSize: '16px',
                    fontWeight: 500,
                    color: FOREST,
                    textAlign: 'center',
                  }}
                >
                  {t}%
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button type="button" style={btnOutline} onClick={back}>
                ← Retour
              </button>
              <button type="button" style={btnGold} onClick={next} disabled={!canNext5}>
                Voir mes solutions →
              </button>
            </div>
          </div>
        )}

        {/* Step 6 — Solutions */}
        {s.step === 6 && (
          <div style={{ ...cardStyle, maxWidth: '720px' }}>
            <div
              style={{
                fontSize: '12px',
                color: GOLD,
                fontWeight: 500,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                marginBottom: '12px',
              }}
            >
              Étape 6 · Vos solutions
            </div>
            <h2
              style={{
                fontFamily: 'Georgia, serif',
                fontSize: '28px',
                color: FOREST,
                margin: '0 0 8px',
              }}
            >
              Recommandation personnalisée
            </h2>
            <p style={{ color: '#6d7368', fontSize: '14px', margin: '0 0 16px' }}>
              Finance islamique · Conformité éthique
            </p>

            <div
              style={{
                padding: '16px 20px',
                background: '#fdf6e8',
                border: `1px solid ${GOLD}`,
                borderRadius: '12px',
                marginBottom: '24px',
                fontSize: '14px',
                color: FOREST,
              }}
            >
              <strong>Cashback partenaire</strong> : avec{' '}
              {[s.montantAV, s.montantSCPI, s.montantCTO].filter(m => m > 0).length} produit(s) au
              montant &gt; 0, taux <strong>{cashback.pct}%</strong> du montant SCPI →{' '}
              <strong>
                {new Intl.NumberFormat('fr-FR', {
                  style: 'currency',
                  currency: 'EUR',
                  maximumFractionDigits: 0,
                }).format(cashback.montant)}
              </strong>
              {cashback.pct === 0 && (
                <span style={{ color: '#6d7368', display: 'block', marginTop: '8px' }}>
                  Règle : 2 produits = 1% du SCPI · 3 produits = 2% du SCPI.
                </span>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
              <div style={{ border: '1px solid #d4c9a8', borderRadius: '12px', padding: '20px 24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 500, color: FOREST, marginBottom: '4px' }}>Assurance-vie</div>
                    <div style={{ fontSize: '12px', color: '#6d7368' }}>
                      Enveloppe long terme, allocation conforme
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: '11px',
                      padding: '3px 10px',
                      background: 'rgba(68,75,63,0.08)',
                      borderRadius: '20px',
                      color: FOREST,
                    }}
                  >
                    Halal
                  </span>
                </div>
                <label style={{ ...labelStyle, marginTop: '16px' }}>Montant AV (€)</label>
                <input
                  type="number"
                  min={0}
                  value={s.montantAV || ''}
                  onChange={e =>
                    setS(prev => ({ ...prev, montantAV: parseInt(e.target.value, 10) || 0 }))
                  }
                  style={inputStyle}
                  placeholder="Ex : 20 000"
                />
              </div>

              <div style={{ border: '1px solid #d4c9a8', borderRadius: '12px', padding: '20px 24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 500, color: FOREST, marginBottom: '4px' }}>SCPI</div>
                    <div style={{ fontSize: '12px', color: '#6d7368' }}>
                      Immobilier de rendement, sélection conforme
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: '11px',
                      padding: '3px 10px',
                      background: 'rgba(68,75,63,0.08)',
                      borderRadius: '20px',
                      color: FOREST,
                    }}
                  >
                    Halal
                  </span>
                </div>
                <label style={{ ...labelStyle, marginTop: '16px' }}>Montant SCPI (€)</label>
                <input
                  type="number"
                  min={0}
                  value={s.montantSCPI || ''}
                  onChange={e =>
                    setS(prev => ({ ...prev, montantSCPI: parseInt(e.target.value, 10) || 0 }))
                  }
                  style={inputStyle}
                  placeholder="Ex : 30 000"
                />
              </div>

              <div style={{ border: '1px solid #d4c9a8', borderRadius: '12px', padding: '20px 24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 500, color: FOREST, marginBottom: '4px' }}>
                      Compte-titres (CTO)
                    </div>
                    <div style={{ fontSize: '12px', color: '#6d7368' }}>
                      Actions éligibles, filtre éthique
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: '11px',
                      padding: '3px 10px',
                      background: 'rgba(68,75,63,0.08)',
                      borderRadius: '20px',
                      color: FOREST,
                    }}
                  >
                    Halal
                  </span>
                </div>
                <label style={{ ...labelStyle, marginTop: '16px' }}>Montant CTO (€)</label>
                <input
                  type="number"
                  min={0}
                  value={s.montantCTO || ''}
                  onChange={e =>
                    setS(prev => ({ ...prev, montantCTO: parseInt(e.target.value, 10) || 0 }))
                  }
                  style={inputStyle}
                  placeholder="Ex : 10 000"
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <button type="button" style={btnOutline} onClick={back}>
                ← Retour
              </button>
              <button
                type="button"
                style={{ ...btnGold, opacity: saving ? 0.7 : 1 }}
                onClick={handleCreateDossier}
                disabled={saving}
              >
                {saving ? 'Enregistrement...' : 'Créer mon compte →'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}