'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import AmanaHeader, { UserAvatar } from '@/components/amana-header'

const FOREST = '#3a4d39'
const GOLD   = '#c9a55a'
const CREAM  = '#f8f4ec'

interface Product {
  id:                  string
  nom:                 string
  type:                string
  gestionnaire:        string
  ticket_min:          number
  rendement_min:       number
  rendement_max:       number
  halal_certifie:      boolean
  actif:               boolean
  risque_sri?:         number
  horizon_min_ans?:    number
}

const TYPE_LABEL: Record<string, string> = {
  assurance_vie: 'Assurance-vie',
  scpi:          'SCPI',
  cto:           'CTO',
  retraite:      'PER',
  pee:           'PEE / PERCO',
  don:           'Don / Waqf',
  immobilier:    'Immobilier',
}

const LIQUIDITY: Record<string, string> = {
  assurance_vie: 'Élevée',
  scpi:          'Faible',
  cto:           'Immédiate',
  retraite:      'Bloqué',
  pee:           'Conditionnelle',
  don:           'Définie',
  immobilier:    'Faible',
}

const ALL_TYPES = ['Tous', 'scpi', 'assurance_vie', 'retraite', 'cto', 'immobilier', 'don']

function ProductCard({ p }: { p: Product }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'white', borderRadius: 16,
        border: hovered ? `1px solid ${GOLD}` : '1px solid #e8e0d0',
        overflow: 'hidden',
        boxShadow: hovered ? '0 8px 32px rgba(42,56,41,0.12)' : '0 1px 4px rgba(42,56,41,0.05)',
        transform: hovered ? 'translateY(-2px)' : 'none',
        transition: 'all 0.18s ease',
        display: 'flex', flexDirection: 'column',
      }}
    >
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #f0ece4' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <span style={{
            fontSize: 10, padding: '3px 9px', borderRadius: 20,
            background: 'rgba(58,77,57,0.08)', color: FOREST,
            fontWeight: 700, letterSpacing: '0.06em',
            fontFamily: "'Inter', system-ui, sans-serif",
          }}>
            {TYPE_LABEL[p.type] ?? p.type}
          </span>
        </div>
        <h3 style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: 18, color: FOREST, margin: '0 0 3px', fontWeight: 500, lineHeight: 1.25,
        }}>
          {p.nom}
        </h3>
        <div style={{ fontSize: 12, color: '#8a9a89', fontFamily: "'Inter', system-ui, sans-serif" }}>
          {p.gestionnaire}
        </div>
      </div>

      <div style={{ padding: '14px 20px', flex: 1 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          <div>
            <div style={{ fontSize: 9, color: '#8a9a89', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 3, fontFamily: "'Inter', system-ui, sans-serif" }}>Rendement</div>
            <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 16, fontWeight: 600, color: GOLD }}>
              {p.rendement_min && p.rendement_max
                ? `${p.rendement_min}–${p.rendement_max}%`
                : p.rendement_max ? `~${p.rendement_max}%` : '—'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: '#8a9a89', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 3, fontFamily: "'Inter', system-ui, sans-serif" }}>Ticket min.</div>
            <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 16, fontWeight: 600, color: FOREST }}>
              {p.ticket_min > 0 ? `${p.ticket_min.toLocaleString('fr-FR')} €` : 'Libre'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: '#8a9a89', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 3, fontFamily: "'Inter', system-ui, sans-serif" }}>Liquidité</div>
            <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 16, fontWeight: 600, color: FOREST }}>
              {LIQUIDITY[p.type] ?? '—'}
            </div>
          </div>
        </div>
        {(p.risque_sri || p.horizon_min_ans) && (
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            {p.risque_sri && (
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: '#f0f0f0', color: '#6a7a69', fontWeight: 500, fontFamily: "'Inter', system-ui, sans-serif" }}>
                SRI {p.risque_sri}/7
              </span>
            )}
            {p.horizon_min_ans && (
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: '#f0f0f0', color: '#6a7a69', fontWeight: 500, fontFamily: "'Inter', system-ui, sans-serif" }}>
                ≥ {p.horizon_min_ans} ans
              </span>
            )}
          </div>
        )}
      </div>

      <div style={{ padding: '12px 20px 18px', background: CREAM }}>
        <a
          href={`/souscription/${p.id}`}
          style={{
            display: 'block', padding: '11px', background: FOREST, color: 'white',
            borderRadius: 8, fontSize: 13, fontWeight: 600,
            textDecoration: 'none', textAlign: 'center',
            fontFamily: "'Inter', system-ui, sans-serif",
            letterSpacing: '0.04em', transition: 'background 0.15s',
          }}
        >
          Souscrire →
        </a>
      </div>
    </div>
  )
}

/** Écran affiché si le dossier n'est pas encore actif. */
function CatalogueBloque({ initials }: { initials: string }) {
  return (
    <div style={{ minHeight: '100vh', background: CREAM, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <AmanaHeader
        backHref="/dashboard"
        backLabel="Dashboard"
        rightContent={<UserAvatar initials={initials} />}
      />
      <div style={{ maxWidth: 520, margin: '80px auto', padding: '0 20px', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 20 }}>🔒</div>
        <h1 style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: 28, color: FOREST, fontWeight: 400, margin: '0 0 16px',
        }}>
          Catalogue réservé aux clients actifs
        </h1>
        <p style={{ fontSize: 15, color: '#6a7a69', lineHeight: 1.7, margin: '0 0 32px' }}>
          L'accès au catalogue de produits est réservé aux clients dont le dossier est en phase <strong>Actif</strong> ou <strong>Suivi</strong>.
        </p>
        <div style={{
          background: 'white', borderRadius: 14, border: '1px solid #e8e0d0',
          padding: '20px 24px', marginBottom: 28, textAlign: 'left',
        }}>
          <p style={{ fontSize: 13, color: '#6a7a69', margin: '0 0 8px', fontWeight: 600 }}>Prochaines étapes</p>
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: '#6a7a69', lineHeight: 1.9 }}>
            <li>Complétez votre dossier KYC si ce n'est pas encore fait.</li>
            <li>Signez vos documents réglementaires (DER, Lettre de Mission).</li>
            <li>Votre conseiller activera votre accès au catalogue dès validation.</li>
          </ul>
        </div>
        <a
          href="/dashboard"
          style={{
            display: 'inline-block', padding: '13px 32px',
            background: FOREST, color: 'white', borderRadius: 8,
            fontSize: 14, fontWeight: 600, textDecoration: 'none',
            fontFamily: "'Inter', system-ui, sans-serif",
          }}
        >
          Retour à mon espace →
        </a>
      </div>
    </div>
  )
}

export default function CataloguePage() {
  const router   = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [loading,  setLoading]  = useState(true)
  const [filter,   setFilter]   = useState('Tous')
  const [kyc,      setKyc]      = useState(false)
  const [isActive, setIsActive] = useState<boolean | null>(null)
  const [user,     setUser]     = useState<{ prenom?: string; nom?: string } | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user: u } } = await supabase.auth.getUser()
      if (!u) { router.push('/auth'); return }

      const meta = u.user_metadata ?? {}
      setUser({ prenom: meta.prenom, nom: meta.nom })

      const [statusRes, prodRes, kycRes] = await Promise.all([
        fetch('/api/me/dossier-status').then(r => r.json()).catch(() => ({ is_active: false })),
        supabase.from('products').select('*').eq('actif', true).order('nom'),
        supabase.from('kyc').select('id').eq('user_id', u.id).maybeSingle(),
      ])

      setIsActive(statusRes.is_active === true)
      setProducts(prodRes.data ?? [])
      setKyc(!!kycRes.data)
      setLoading(false)
    }
    load()
  }, [router])

  const initials = ((user?.prenom?.[0] ?? '') + (user?.nom?.[0] ?? '')).toUpperCase() || 'M'
  const filtered = filter === 'Tous' ? products : products.filter(p => p.type === filter)

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: CREAM, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#8a9a89', fontSize: 14, fontFamily: "'Inter', system-ui, sans-serif" }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', border: `2px solid ${GOLD}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }}/>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          Chargement…
        </div>
      </div>
    )
  }

  // Dossier pas encore actif → page bloquée
  if (isActive === false) {
    return <CatalogueBloque initials={initials} />
  }

  return (
    <div style={{ minHeight: '100vh', background: CREAM, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <AmanaHeader
        backHref="/dashboard"
        backLabel="Dashboard"
        rightContent={<UserAvatar initials={initials} />}
      />

      <div style={{ background: FOREST, padding: '28px 24px 32px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 600, marginBottom: 8 }}>
            Solutions d'investissement
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 30, fontWeight: 400, color: 'white', margin: 0 }}>
              Notre catalogue
            </h1>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
              {products.length} produit{products.length > 1 ? 's' : ''} disponible{products.length > 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px 72px' }}>

        {!kyc && (
          <div style={{
            background: 'white', border: '1px solid #e8d8a0', borderRadius: 12,
            padding: '16px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <div style={{ fontSize: 20 }}>⚠️</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 16, color: FOREST, fontWeight: 500, marginBottom: 2 }}>
                Dossier KYC requis
              </div>
              <div style={{ fontSize: 12, color: '#7a8a79', lineHeight: 1.5 }}>
                Vous pouvez explorer le catalogue, mais la souscription nécessite un dossier KYC validé.
              </div>
            </div>
            <a href="/kyc" style={{ padding: '8px 14px', background: FOREST, color: 'white', borderRadius: 8, fontSize: 12, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}>
              Compléter →
            </a>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
          {ALL_TYPES.map(t => {
            const label = t === 'Tous' ? 'Tous' : (TYPE_LABEL[t] ?? t)
            const active = filter === t
            return (
              <button
                key={t}
                onClick={() => setFilter(t)}
                style={{
                  padding: '7px 16px', borderRadius: 20, cursor: 'pointer',
                  border: `1.5px solid ${active ? FOREST : '#ddd5c8'}`,
                  background: active ? FOREST : 'white',
                  color: active ? 'white' : '#6a7a69',
                  fontSize: 12, fontWeight: 600,
                  fontFamily: "'Inter', system-ui, sans-serif",
                  letterSpacing: '0.03em', transition: 'all 0.12s',
                }}
              >
                {label}
              </button>
            )
          })}
        </div>

        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', background: 'white', borderRadius: 16, border: '1px solid #e8e0d0' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
            <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 20, color: FOREST, marginBottom: 8 }}>
              Aucun produit dans cette catégorie
            </div>
            <button onClick={() => setFilter('Tous')} style={{ marginTop: 4, padding: '9px 20px', background: FOREST, color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: "'Inter', system-ui, sans-serif" }}>
              Voir tous les produits
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
            {filtered.map(p => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        )}

        <div style={{ marginTop: 40, padding: '16px 20px', background: 'white', borderRadius: 10, border: '1px solid #e8e0d0' }}>
          <p style={{ fontSize: 11, color: '#9a9a9a', margin: 0, lineHeight: 1.7, fontFamily: "'Inter', system-ui, sans-serif" }}>
            <strong style={{ color: '#6a7a69' }}>Avertissement :</strong> Les rendements indiqués sont indicatifs et basés sur les performances historiques. Ils ne constituent pas une garantie de performance future. Tout investissement comporte un risque de perte en capital. Veuillez lire attentivement les documents d'information clés (DICI/DIP) avant toute souscription. AMANA Patrimoine est enregistré à l'ORIAS sous le n° {process.env.NEXT_PUBLIC_ORIAS_NUM ?? '25009552'}.
          </p>
        </div>
      </div>
    </div>
  )
}
