'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AmanaHeader, { UserAvatar } from '@/components/amana-header'

const FOREST = '#3a4d39'
const GOLD   = '#c9a55a'
const CREAM  = '#f8f4ec'
const DARK   = '#2a3829'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Product {
  id:                   string
  nom:                  string
  type:                 string
  gestionnaire:         string
  description:          string | null
  rendement_min:        number | null
  rendement_max:        number | null
  ticket_min:           number
  halal_certifie:       boolean
  halal_details:        string | null
  frais_entree_pct:     number
  frais_gestion_pct:    number
  document_kid_url:     string | null
  document_dip_url:     string | null
  document_prospectus_url: string | null
  sharia_certificate_url:  string | null
}

interface KycInfo {
  id:     string
  statut: string
  prenom: string | null
  nom:    string | null
}

const TYPE_LABEL: Record<string, string> = {
  assurance_vie: 'Assurance-vie',
  scpi:          'SCPI',
  cto:           'Compte-titres',
  retraite:      'PER',
  pee:           'PEE / PERCO',
  don:           'Don / Waqf',
  immobilier:    'Immobilier',
}

const HORIZON: Record<string, string> = {
  assurance_vie: '8 ans minimum',
  scpi:          '10 ans recommandés',
  cto:           'Libre',
  retraite:      "Jusqu'à la retraite",
  pee:           '5 ans minimum',
  don:           'Définitif',
  immobilier:    '10–15 ans',
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const card = {
  background: 'white', borderRadius: 16,
  boxShadow: '0 2px 20px rgba(42,56,41,0.07)',
  border: '1px solid #e8e0d0',
}

const lbl = {
  display: 'block' as const, fontSize: 11, fontWeight: 600,
  color: '#5a6a59', textTransform: 'uppercase' as const,
  letterSpacing: '0.1em', marginBottom: 6,
  fontFamily: "'Inter', system-ui, sans-serif",
}

const inp = {
  width: '100%', padding: '13px 16px',
  border: '1.5px solid #ddd5c8', borderRadius: 10,
  fontSize: 15, boxSizing: 'border-box' as const,
  background: CREAM, color: DARK,
  fontFamily: "'Inter', system-ui, sans-serif",
  outline: 'none', transition: 'border-color 0.15s',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600, marginBottom: 4, fontFamily: "'Inter', system-ui, sans-serif" }}>
        {label}
      </div>
      <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 22, fontWeight: 600, color: 'white' }}>
        {value}
      </div>
    </div>
  )
}

function DocLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 14px', background: CREAM,
        border: '1px solid #e8dfc8', borderRadius: 8,
        fontSize: 12, color: FOREST, textDecoration: 'none',
        fontFamily: "'Inter', system-ui, sans-serif", fontWeight: 500,
        transition: 'border-color 0.15s',
      }}
    >
      <span style={{ fontSize: 14 }}>📄</span>
      {label}
    </a>
  )
}

function CheckItem({
  checked, onChange, children,
}: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer' }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        style={{ marginTop: 3, accentColor: FOREST, width: 16, height: 16, flexShrink: 0 }}
      />
      <span style={{ fontSize: 13, color: '#5a6a59', lineHeight: 1.65, fontFamily: "'Inter', system-ui, sans-serif" }}>
        {children}
      </span>
    </label>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SouscriptionPage() {
  const params  = useParams()
  const router  = useRouter()
  const productId = params?.productId as string

  const [product, setProduct] = useState<Product | null>(null)
  const [kyc,     setKyc]     = useState<KycInfo | null>(null)
  const [user,    setUser]    = useState<{ id: string; initials: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  // Form state
  const [montant,    setMontant]    = useState('')
  const [ackKid,     setAckKid]     = useState(false)
  const [ackDer,     setAckDer]     = useState(false)
  const [ackKyc,     setAckKyc]     = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [saveError,  setSaveError]  = useState('')
  const [done,       setDone]       = useState(false)
  const [projetId,   setProjetId]   = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user: u } } = await supabase.auth.getUser()
      if (!u) { router.push('/auth'); return }

      const meta = u.user_metadata ?? {}
      const initials = ((meta.prenom?.[0] ?? '') + (meta.nom?.[0] ?? '')).toUpperCase() || u.email?.[0]?.toUpperCase() || '?'
      setUser({ id: u.id, initials })

      const [prodRes, kycRes] = await Promise.all([
        supabase.from('products').select('*').eq('id', productId).single(),
        supabase.from('kyc').select('id, statut, prenom, nom').eq('user_id', u.id).maybeSingle(),
      ])

      if (prodRes.error || !prodRes.data) {
        setError('Produit introuvable.')
        setLoading(false)
        return
      }

      setProduct(prodRes.data as Product)
      setKyc(kycRes.data ?? null)
      setLoading(false)
    }
    load()
  }, [productId, router])

  const montantNum    = parseInt(montant) || 0
  const ticketOk      = montantNum >= (product?.ticket_min ?? 0)
  const kycOk         = kyc?.statut === 'soumis' || kyc?.statut === 'valide'
  const allAck        = ackKid && ackDer && ackKyc
  const canSubmit     = ticketOk && allAck && !saving && kycOk

  const handleSubmit = async () => {
    if (!canSubmit || !product) return
    setSaving(true); setSaveError('')
    try {
      const resp = await fetch('/api/souscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: product.id,
          montant:    montantNum,
          type:       product.type,
        }),
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.error || 'Erreur lors de la souscription')
      setProjetId(data.projet_id)
      setDone(true)
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setSaving(false)
    }
  }

  // ── Loading ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: CREAM }}>
        <AmanaHeader backHref="/catalogue" backLabel="Catalogue" />
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
          <div style={{ textAlign: 'center', color: '#8a9a89', fontFamily: "'Inter', system-ui, sans-serif" }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', border: `2px solid ${GOLD}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
            Chargement…
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: CREAM }}>
        <AmanaHeader backHref="/catalogue" backLabel="Catalogue" />
        <div style={{ maxWidth: 560, margin: '60px auto', padding: '0 24px' }}>
          <div style={{ ...card, padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 16 }}>⚠️</div>
            <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 22, color: FOREST, marginBottom: 8 }}>
              {error}
            </div>
            <a href="/catalogue" style={{ display: 'inline-block', marginTop: 24, padding: '11px 28px', background: FOREST, color: 'white', borderRadius: 8, textDecoration: 'none', fontSize: 14, fontWeight: 600, fontFamily: "'Inter', system-ui, sans-serif" }}>
              Retour au catalogue
            </a>
          </div>
        </div>
      </div>
    )
  }

  if (!product) return null

  // ── Done ─────────────────────────────────────────────────────────────────────

  if (done) {
    return (
      <div style={{ minHeight: '100vh', background: CREAM }}>
        <AmanaHeader rightContent={user ? <UserAvatar initials={user.initials} /> : undefined} />
        <div style={{ display: 'flex', justifyContent: 'center', padding: '72px 24px' }}>
          <div style={{ ...card, padding: 48, maxWidth: 520, width: '100%', textAlign: 'center' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'rgba(58,77,57,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 24px', fontSize: 28, color: FOREST,
            }}>✓</div>
            <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 30, color: FOREST, fontWeight: 400, margin: '0 0 12px' }}>
              Demande enregistrée
            </h2>
            <p style={{ fontSize: 14, color: '#6b7f6a', lineHeight: 1.8, marginBottom: 8, fontFamily: "'Inter', system-ui, sans-serif" }}>
              Votre demande de souscription à <strong style={{ color: FOREST }}>{product.nom}</strong> pour{' '}
              <strong style={{ color: FOREST }}>{montantNum.toLocaleString('fr-FR')} €</strong> a bien été enregistrée.
            </p>
            <p style={{ fontSize: 13, color: '#8a9a89', lineHeight: 1.7, marginBottom: 36, fontFamily: "'Inter', system-ui, sans-serif" }}>
              Votre conseiller AMANA vous contactera sous 48h pour finaliser votre dossier.
            </p>
            {projetId && (
              <div style={{ fontSize: 11, color: '#aaa', marginBottom: 28, fontFamily: 'monospace' }}>
                Réf. {projetId.slice(0, 8).toUpperCase()}
              </div>
            )}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <a href="/dashboard" style={{
                padding: '11px 28px', background: FOREST, color: 'white',
                borderRadius: 8, textDecoration: 'none', fontSize: 14, fontWeight: 600,
                fontFamily: "'Inter', system-ui, sans-serif",
              }}>
                Mon espace
              </a>
              <a href="/catalogue" style={{
                padding: '11px 28px', background: 'transparent', color: FOREST,
                border: '1.5px solid #ddd5c8', borderRadius: 8, textDecoration: 'none',
                fontSize: 14, fontFamily: "'Inter', system-ui, sans-serif",
              }}>
                Retour au catalogue
              </a>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Main ─────────────────────────────────────────────────────────────────────

  const rendementStr = product.rendement_min && product.rendement_max
    ? `${product.rendement_min}–${product.rendement_max}%`
    : product.rendement_max ? `~${product.rendement_max}%` : '—'

  const docs = [
    product.document_kid_url     && { href: product.document_kid_url,     label: 'Document d\'Information Clé (DIC/DICI)' },
    product.document_dip_url     && { href: product.document_dip_url,     label: 'Document d\'Information Précontractuel (DIP)' },
    product.document_prospectus_url && { href: product.document_prospectus_url, label: 'Prospectus / Note d\'information' },
    product.sharia_certificate_url  && { href: product.sharia_certificate_url,  label: 'Certificat de conformité Sharia' },
  ].filter(Boolean) as { href: string; label: string }[]

  return (
    <div style={{ minHeight: '100vh', background: CREAM, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`input:focus { border-color: ${FOREST} !important; box-shadow: 0 0 0 3px rgba(58,77,57,0.1) !important; }`}</style>

      <AmanaHeader
        backHref="/catalogue"
        backLabel="Catalogue"
        rightContent={user ? <UserAvatar initials={user.initials} /> : undefined}
      />

      {/* Hero produit */}
      <div style={{ background: FOREST, padding: '24px 24px 28px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 10, padding: '3px 10px', borderRadius: 20,
              background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)',
              fontWeight: 700, letterSpacing: '0.07em',
            }}>
              {TYPE_LABEL[product.type] ?? product.type}
            </span>
            {/* Badge Halal supprimé — certification non encore ratifiée */}
          </div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 28, fontWeight: 400, color: 'white', margin: '0 0 4px' }}>
            {product.nom}
          </h1>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 20 }}>
            {product.gestionnaire}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, maxWidth: 480 }}>
            <StatBox label="Rendement estimé" value={rendementStr} />
            <StatBox label="Ticket min." value={product.ticket_min > 0 ? `${product.ticket_min.toLocaleString('fr-FR')} €` : 'Libre'} />
            <StatBox label="Horizon" value={HORIZON[product.type] ?? '—'} />
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 16px 72px' }}>

        {/* KYC manquant ou non soumis */}
        {!kyc && (
          <div style={{ ...card, padding: '20px 24px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16, border: '1px solid #e8d8a0' }}>
            <div style={{ fontSize: 24 }}>⚠️</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 17, color: FOREST, marginBottom: 3 }}>
                KYC requis pour souscrire
              </div>
              <div style={{ fontSize: 13, color: '#7a8a79', lineHeight: 1.5 }}>
                Vous pouvez consulter ce produit, mais la souscription nécessite un dossier KYC validé.
              </div>
            </div>
            <a href="/kyc" style={{ padding: '9px 18px', background: FOREST, color: 'white', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' as const }}>
              Compléter →
            </a>
          </div>
        )}

        {kyc && kyc.statut === 'en_attente' && (
          <div style={{ ...card, padding: '16px 24px', marginBottom: 24, border: '1px solid #c8dac8', display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ fontSize: 18, color: GOLD }}>⏳</div>
            <div style={{ fontSize: 13, color: '#4a6a49', fontFamily: "'Inter', system-ui, sans-serif" }}>
              Votre dossier KYC est en cours de vérification. La souscription sera disponible dès validation (24–48h).
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

          {/* ── Colonne gauche : détails produit ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Description */}
            {product.description && (
              <div style={{ ...card, padding: 24 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#8a9a89', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
                  À propos
                </div>
                <p style={{ fontSize: 13, color: '#5a6a59', lineHeight: 1.8, margin: 0 }}>
                  {product.description}
                </p>
              </div>
            )}

            {/* Frais */}
            <div style={{ ...card, padding: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#8a9a89', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>
                Frais
              </div>
              {[
                { label: "Frais d'entrée", value: `${product.frais_entree_pct ?? 0} %` },
                { label: 'Frais de gestion annuels', value: `${product.frais_gestion_pct ?? 0} %` },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f0ece4' }}>
                  <span style={{ fontSize: 13, color: '#6a7a69' }}>{label}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: FOREST, fontFamily: "'Cormorant Garamond', Georgia, serif" }}>{value}</span>
                </div>
              ))}
            </div>

            {/* Documents */}
            {docs.length > 0 && (
              <div style={{ ...card, padding: 24 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#8a9a89', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
                  Documents réglementaires
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {docs.map(d => <DocLink key={d.href} {...d} />)}
                </div>
              </div>
            )}
          </div>

          {/* ── Colonne droite : formulaire ── */}
          <div>
            <div style={{ ...card, padding: 28, position: 'sticky', top: 80 }}>
              <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 20, color: FOREST, marginBottom: 20, fontWeight: 400 }}>
                Votre souscription
              </div>

              {/* Montant */}
              <div style={{ marginBottom: 20 }}>
                <label style={lbl}>Montant à investir *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    value={montant}
                    onChange={e => setMontant(e.target.value)}
                    placeholder={product.ticket_min > 0 ? product.ticket_min.toLocaleString('fr-FR') : '5 000'}
                    min={product.ticket_min || 0}
                    style={{ ...inp, paddingRight: 48 }}
                  />
                  <span style={{
                    position: 'absolute', right: 14, top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: 13, color: '#8a9a89',
                    fontFamily: "'Inter', system-ui, sans-serif",
                  }}>EUR</span>
                </div>
                {product.ticket_min > 0 && (
                  <div style={{ fontSize: 11, color: montantNum > 0 && !ticketOk ? '#c0392b' : '#8a9a89', marginTop: 5 }}>
                    {montantNum > 0 && !ticketOk
                      ? `⚠ Minimum requis : ${product.ticket_min.toLocaleString('fr-FR')} €`
                      : `Minimum : ${product.ticket_min.toLocaleString('fr-FR')} €`}
                  </div>
                )}
                {montantNum >= (product.ticket_min ?? 0) && montantNum > 0 && (
                  <div style={{ fontSize: 11, color: GOLD, marginTop: 5, fontWeight: 600 }}>
                    ✓ {montantNum.toLocaleString('fr-FR')} €
                  </div>
                )}
              </div>

              {/* Simulation rapide */}
              {ticketOk && montantNum > 0 && product.rendement_max && (
                <div style={{ background: 'rgba(58,77,57,0.05)', borderRadius: 8, padding: '12px 14px', marginBottom: 20 }}>
                  <div style={{ fontSize: 11, color: '#6a7a69', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                    Estimation indicative / an
                  </div>
                  <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 20, color: GOLD, fontWeight: 600 }}>
                    {Math.round(montantNum * (product.rendement_max / 100)).toLocaleString('fr-FR')} €
                  </div>
                  <div style={{ fontSize: 10, color: '#9a9a9a', marginTop: 2 }}>
                    Sur la base d'un rendement de {product.rendement_max}% — non garanti
                  </div>
                </div>
              )}

              {/* Acknowledgments */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
                <CheckItem checked={ackKid} onChange={setAckKid}>
                  J'ai pris connaissance du{' '}
                  {product.document_kid_url
                    ? <a href={product.document_kid_url} target="_blank" rel="noopener noreferrer" style={{ color: FOREST, fontWeight: 600 }}>Document d'Information Clé</a>
                    : 'Document d\'Information Clé'}{' '}
                  et des risques associés à ce produit.
                </CheckItem>
                <CheckItem checked={ackDer} onChange={setAckDer}>
                  J'ai reçu et lu le <strong>DER</strong> (Document d'Entrée en Relation) et la lettre de mission AMANA.
                </CheckItem>
                <CheckItem checked={ackKyc} onChange={setAckKyc}>
                  Je confirme que les informations de mon dossier KYC sont exactes et à jour.
                </CheckItem>
              </div>

              {saveError && (
                <div style={{ background: '#fde8e8', border: '1px solid #f5c6c6', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#c0392b' }}>
                  {saveError}
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                style={{
                  width: '100%', padding: '14px',
                  background: canSubmit ? FOREST : '#b0bdb0',
                  color: 'white', border: 'none', borderRadius: 10,
                  fontSize: 15, fontWeight: 600,
                  cursor: canSubmit ? 'pointer' : 'not-allowed',
                  fontFamily: "'Inter', system-ui, sans-serif",
                  letterSpacing: '0.04em', transition: 'background 0.15s',
                }}
              >
                {saving ? 'Envoi en cours…' : 'Confirmer ma souscription'}
              </button>

              {!kycOk && (
                <p style={{ textAlign: 'center', fontSize: 12, color: '#c0392b', marginTop: 10, fontFamily: "'Inter', system-ui, sans-serif" }}>
                  KYC requis pour souscrire
                </p>
              )}

              <p style={{ fontSize: 11, color: '#9a9a9a', marginTop: 14, lineHeight: 1.6, textAlign: 'center', fontFamily: "'Inter', system-ui, sans-serif" }}>
                Votre conseiller AMANA vous contactera sous 48h pour finaliser.
                Les rendements affichés sont indicatifs et non garantis.
              </p>
            </div>
          </div>

        </div>

        {/* Avertissement légal */}
        <div style={{ ...card, padding: '14px 20px', marginTop: 24 }}>
          <p style={{ fontSize: 11, color: '#9a9a9a', margin: 0, lineHeight: 1.7, fontFamily: "'Inter', system-ui, sans-serif" }}>
            <strong style={{ color: '#6a7a69' }}>Avertissement :</strong> Tout investissement comporte un risque de perte en capital. Les performances passées ne préjugent pas des performances futures. Veuillez lire attentivement les documents réglementaires avant toute souscription. AMANA Patrimoine est enregistré à l'ORIAS sous le n° {process.env.NEXT_PUBLIC_ORIAS_NUM ?? '25009552'}. Conformité Sharia certifiée par Sakina Consulting.
          </p>
        </div>

      </div>
    </div>
  )
}
