'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import CoutsExAnte from '@/components/couts-ex-ante'

const FOREST = '#3a4d39'
const GOLD = '#c9a55a'

interface Product {
  id: string
  nom: string
  type: 'scpi' | 'assurance_vie' | 'per' | 'cto'
  document_kid_url?: string
  document_dip_url?: string
  frais_entree_pct?: number
  frais_gestion_pct?: number
  commission_amana_pct?: number
}

interface DocumentPrereqProps {
  product: Product
  montantSouscription: number
  onCompleted: () => void  // callback quand tous les documents sont confirmés
}

/**
 * Composant affiché avant souscription pour :
 * 1. Présenter le tableau des coûts ex-ante (MIF2 Art.24)
 * 2. Permettre le téléchargement et la confirmation du DICI/KID ou DIP
 * 3. Bloquer la souscription tant que non confirmé
 */
export default function DocumentPrereq({ product, montantSouscription, onCompleted }: DocumentPrereqProps) {
  const [kidConfirmed, setKidConfirmed] = useState(false)
  const [dipConfirmed, setDipConfirmed] = useState(false)
  const [coutsConfirmed, setCoutsConfirmed] = useState(false)
  const [alreadyDone, setAlreadyDone] = useState(false)
  const [saving, setSaving] = useState(false)
  const [checkLoading, setCheckLoading] = useState(true)

  const supabase = createClient()

  const needsKid = !!product.document_kid_url
  const needsDip = !!product.document_dip_url

  // Vérifier si les documents ont déjà été remis
  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setCheckLoading(false); return }

      const checks = []
      if (needsKid) checks.push('kid')
      if (needsDip) checks.push('dip')

      if (checks.length === 0) { setAlreadyDone(true); setCheckLoading(false); return }

      const { data } = await supabase
        .from('document_remis')
        .select('document_type')
        .eq('user_id', user.id)
        .eq('product_id', product.id)
        .in('document_type', checks)

      const done = (data ?? []).map(r => r.document_type)
      const allDone = checks.every(c => done.includes(c))
      if (allDone) {
        setAlreadyDone(true)
        onCompleted()
      }
      setCheckLoading(false)
    }
    check()
  }, [product.id])

  async function handleConfirm() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    const toInsert = []
    if (needsKid) toInsert.push({ user_id: user.id, product_id: product.id, document_type: 'kid' })
    if (needsDip) toInsert.push({ user_id: user.id, product_id: product.id, document_type: 'dip' })
    toInsert.push({ user_id: user.id, product_id: product.id, document_type: 'couts_ex_ante' })

    await supabase.from('document_remis').upsert(toInsert, {
      onConflict: 'user_id,product_id,document_type',
    })

    setAlreadyDone(true)
    setSaving(false)
    onCompleted()
  }

  const canConfirm =
    coutsConfirmed &&
    (!needsKid || kidConfirmed) &&
    (!needsDip || dipConfirmed)

  if (checkLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '32px', color: '#888', fontSize: '14px' }}>
        Vérification des documents…
      </div>
    )
  }

  if (alreadyDone) {
    return (
      <div style={{
        padding: '16px 20px',
        background: '#eef6ee',
        borderRadius: '8px',
        border: '1px solid #b8d4b8',
        fontSize: '13px',
        color: FOREST,
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      }}>
        <span style={{ fontSize: '20px' }}>✅</span>
        <span>Documents réglementaires confirmés — vous pouvez procéder à la souscription.</span>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: 'system-ui, sans-serif' }}>
      {/* Avertissement obligatoire */}
      <div style={{
        padding: '14px 18px',
        background: '#faeeda',
        borderRadius: '8px',
        border: '1px solid #f5c6a0',
        fontSize: '13px',
        color: '#854F0B',
        lineHeight: '1.6',
      }}>
        <strong>Avant de souscrire,</strong> vous devez prendre connaissance des documents réglementaires ci-dessous et confirmer les informations sur les coûts, conformément à la directive MIF2 (Art. 24) et aux obligations applicables.
      </div>

      {/* Tableau coûts ex-ante */}
      <CoutsExAnte
        produitNom={product.nom}
        produitType={product.type}
        montantSouscription={montantSouscription}
        fraisEntree={product.frais_entree_pct ?? 0}
        fraisGestion={product.frais_gestion_pct ?? 0}
        commissionCourtage={product.commission_amana_pct ?? 0}
      />

      {/* Documents à télécharger */}
      <div style={{
        padding: '20px 24px',
        background: 'white',
        borderRadius: '8px',
        border: '1px solid #d4c9a8',
      }}>
        <p style={{ fontSize: '13px', fontWeight: 700, color: FOREST, marginBottom: '16px', letterSpacing: '0.03em' }}>
          DOCUMENTS À CONSULTER AVANT SOUSCRIPTION
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {needsKid && product.document_kid_url && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: FOREST }}>
                  DICI / KID — Document d&apos;Information Clés
                </div>
                <div style={{ fontSize: '12px', color: '#888' }}>Obligatoire MIF2 — À lire avant toute souscription</div>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <a
                  href={product.document_kid_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: '7px 16px',
                    background: FOREST,
                    color: 'white',
                    borderRadius: '6px',
                    fontSize: '13px',
                    textDecoration: 'none',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                  }}
                >
                  Télécharger PDF
                </a>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', color: '#4a5a49' }}>
                  <input
                    type="checkbox"
                    checked={kidConfirmed}
                    onChange={e => setKidConfirmed(e.target.checked)}
                    style={{ accentColor: FOREST }}
                  />
                  Lu et compris
                </label>
              </div>
            </div>
          )}

          {needsDip && product.document_dip_url && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', paddingTop: needsKid ? '12px' : 0, borderTop: needsKid ? '1px solid #f0ebe0' : 'none' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: FOREST }}>
                  DIP — Document d&apos;Information Précontractuelle
                </div>
                <div style={{ fontSize: '12px', color: '#888' }}>Obligatoire assurance — Art. L522-5 Code des assurances</div>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <a
                  href={product.document_dip_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: '7px 16px',
                    background: FOREST,
                    color: 'white',
                    borderRadius: '6px',
                    fontSize: '13px',
                    textDecoration: 'none',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                  }}
                >
                  Télécharger PDF
                </a>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', color: '#4a5a49' }}>
                  <input
                    type="checkbox"
                    checked={dipConfirmed}
                    onChange={e => setDipConfirmed(e.target.checked)}
                    style={{ accentColor: FOREST }}
                  />
                  Lu et compris
                </label>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation finale */}
      <label style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        cursor: 'pointer',
        padding: '14px 18px',
        borderRadius: '8px',
        border: '1px solid #d4c9a8',
        background: '#f8f4ec',
        fontSize: '13px',
        color: '#4a5a49',
        lineHeight: '1.5',
      }}>
        <input
          type="checkbox"
          checked={coutsConfirmed}
          onChange={e => setCoutsConfirmed(e.target.checked)}
          style={{ width: '16px', height: '16px', marginTop: '1px', accentColor: FOREST, flexShrink: 0 }}
        />
        <span>
          J&apos;ai pris connaissance du tableau des coûts ex-ante et des informations sur la rémunération d&apos;AMANA Patrimoine.
          Je confirme avoir reçu et lu les documents réglementaires ci-dessus avant de procéder à ma souscription.
        </span>
      </label>

      <button
        onClick={handleConfirm}
        disabled={!canConfirm || saving}
        style={{
          padding: '13px',
          background: canConfirm && !saving ? FOREST : '#ccc',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '15px',
          fontWeight: 600,
          cursor: canConfirm && !saving ? 'pointer' : 'not-allowed',
          fontFamily: 'system-ui, sans-serif',
          transition: 'background 0.2s',
        }}
      >
        {saving ? 'Enregistrement...' : 'Confirmer et continuer vers la souscription →'}
      </button>
    </div>
  )
}
