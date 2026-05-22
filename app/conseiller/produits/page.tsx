import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const FOREST = '#3a4d39'
const GOLD = '#c9a55a'
const CREAM = '#f8f4ec'

const TYPE_LABEL: Record<string, string> = {
  assurance_vie: 'Assurance-vie',
  scpi:          'SCPI',
  cto:           'Actions Halal',
  immobilier:    'Immobilier',
  pee:           'PEE / PERCO',
  retraite:      'Retraite',
  don:           'Don / Waqf',
}

export default async function ProduitsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'conseiller') redirect('/dashboard')

  const { data: produits } = await supabase
    .from('products')
    .select('*')
    .order('type', { ascending: true })

  return (
    <div style={{ minHeight: '100vh', background: CREAM, display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ background: '#2b3a2a', padding: '0 52px', height: '68px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <a href="/" style={{ fontFamily: 'Georgia, serif', fontSize: '20px', color: CREAM, letterSpacing: '0.06em', textDecoration: 'none' }}>
          AMANA <span style={{ color: GOLD }}>PATRIMOINE</span>
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <a href="/conseiller"           style={{ color: 'rgba(248,244,236,0.6)', fontSize: '13px', textDecoration: 'none' }}>Dossiers</a>
          <a href="/conseiller/projets"   style={{ color: 'rgba(248,244,236,0.6)', fontSize: '13px', textDecoration: 'none' }}>Projets</a>
          <a href="/conseiller/reporting" style={{ color: 'rgba(248,244,236,0.6)', fontSize: '13px', textDecoration: 'none' }}>Reporting</a>
          <span style={{ color: CREAM, fontSize: '13px' }}>Produits</span>
          <form action="/api/logout" method="POST">
            <button type="submit" style={{ padding: '8px 20px', background: 'transparent', color: 'rgba(248,244,236,0.7)', border: '1px solid rgba(248,244,236,0.3)', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>
              Déconnexion
            </button>
          </form>
        </div>
      </div>

      <div style={{ flex: 1, maxWidth: '1100px', margin: '0 auto', padding: '48px 24px', width: '100%' }}>

        {/* Titre + bouton nouveau */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '40px' }}>
          <div>
            <p style={{ fontSize: '13px', color: '#6b7f6a', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>CMS</p>
            <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '32px', color: FOREST, margin: '0' }}>Produits</h1>
          </div>
          <a href="/conseiller/produits/nouveau" style={{
            padding: '10px 24px', background: GOLD, color: 'white',
            borderRadius: '8px', textDecoration: 'none', fontSize: '14px', fontWeight: 500,
          }}>
            + Nouveau produit
          </a>
        </div>

        {/* Liste */}
        {!produits || produits.length === 0 ? (
          <div style={{ background: 'white', borderRadius: '16px', padding: '48px', textAlign: 'center', color: '#6b7f6a' }}>
            Aucun produit. Créez le premier.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {produits.map(p => (
              <div key={p.id} style={{
                background: 'white', borderRadius: '14px', padding: '20px 28px',
                boxShadow: '0 2px 8px rgba(58,77,57,0.06)',
                display: 'flex', alignItems: 'center', gap: '20px',
                opacity: p.actif === false ? 0.55 : 1,
              }}>

                {/* Statut actif */}
                <div style={{
                  width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
                  background: p.actif !== false ? '#10b981' : '#d1d5db',
                }} />

                {/* Type badge */}
                <div style={{
                  padding: '4px 10px', borderRadius: '12px', background: CREAM,
                  fontSize: '11px', fontWeight: 600, color: '#6b7f6a',
                  textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap',
                }}>
                  {TYPE_LABEL[p.type] ?? p.type}
                </div>

                {/* Nom + gestionnaire */}
                <div style={{ flex: 2, minWidth: '200px' }}>
                  <div style={{ fontWeight: 600, color: FOREST, fontSize: '15px' }}>{p.nom}</div>
                  {p.gestionnaire && (
                    <div style={{ fontSize: '13px', color: '#6b7f6a', marginTop: '2px' }}>{p.gestionnaire}</div>
                  )}
                </div>

                {/* Rendement + ticket */}
                <div style={{ minWidth: '160px', textAlign: 'right' }}>
                  {(p.rendement_min > 0 || p.rendement_max > 0) && (
                    <div style={{ fontFamily: 'Georgia, serif', fontSize: '16px', color: FOREST }}>
                      {p.rendement_min === p.rendement_max
                        ? `${p.rendement_min}%`
                        : `${p.rendement_min} – ${p.rendement_max}%`}
                    </div>
                  )}
                  {p.ticket_min > 0 && (
                    <div style={{ fontSize: '12px', color: '#6b7f6a', marginTop: '2px' }}>
                      min. {Number(p.ticket_min).toLocaleString('fr-FR')} €
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <a href={`/conseiller/produits/${p.id}`} style={{
                    padding: '7px 16px', background: FOREST, color: 'white',
                    borderRadius: '6px', textDecoration: 'none', fontSize: '13px', fontWeight: 500,
                  }}>
                    Modifier
                  </a>
                  <form action={`/api/produits/${p.id}/toggle`} method="POST">
                    <button type="submit" style={{
                      padding: '7px 16px', background: 'white', color: '#6b7f6a',
                      border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px',
                      cursor: 'pointer', fontWeight: 500,
                    }}>
                      {p.actif !== false ? 'Désactiver' : 'Activer'}
                    </button>
                  </form>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
