import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const FOREST = '#444b3f'
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

const TYPE_COLOR: Record<string, string> = {
  assurance_vie: '#444b3f',
  scpi:          '#c9a55a',
  cto:           '#1e40af',
  immobilier:    '#92400e',
  pee:           '#065f46',
  retraite:      '#6b21a8',
  don:           '#be185d',
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div style={{ background: 'white', borderRadius: '12px', padding: '20px 24px', boxShadow: '0 2px 12px rgba(68,75,63,0.06)' }}>
      <div style={{ fontSize: '11px', color: '#6d7368', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>{label}</div>
      <div style={{ fontFamily: 'Georgia, serif', fontSize: '26px', color: color ?? FOREST, fontWeight: 600 }}>{value}</div>
      {sub && <div style={{ fontSize: '12px', color: '#6d7368', marginTop: '4px' }}>{sub}</div>}
    </div>
  )
}

export default async function ReportingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'conseiller') redirect('/dashboard')

  // Données
  const [{ data: projects }, { data: kycList }] = await Promise.all([
    supabase.from('projects').select('*').order('created_at', { ascending: false }),
    supabase.from('kyc').select('id, statut, created_at'),
  ])

  const proj = projects ?? []
  const kycs = kycList ?? []

  // KPIs
  const aumTotal   = proj.reduce((s, p) => s + (p.montant ?? 0), 0)
  const aumActif   = proj.filter(p => p.statut === 'actif').reduce((s, p) => s + (p.montant ?? 0), 0)
  const kycValides = kycs.filter(k => k.statut === 'valide').length
  const kycTotal   = kycs.length
  const txConv     = kycTotal > 0 ? Math.round((proj.length / kycTotal) * 100) : 0

  // Pipeline funnel
  const funnel = [
    { key: 'en_cours', label: 'En cours',  color: '#1e40af' },
    { key: 'soumis',   label: 'Soumis',    color: '#92400e' },
    { key: 'signe',    label: 'Signés',    color: '#065f46' },
    { key: 'actif',    label: 'Actifs',    color: '#444b3f' },
    { key: 'cloture',  label: 'Clôturés',  color: '#6b7280' },
  ].map(f => ({ ...f, count: proj.filter(p => p.statut === f.key).length }))

  const maxFunnel = Math.max(...funnel.map(f => f.count), 1)

  // Répartition AUM par type
  const byType = Object.entries(
    proj.filter(p => p.statut === 'actif').reduce<Record<string, number>>((acc, p) => {
      acc[p.type] = (acc[p.type] ?? 0) + (p.montant ?? 0)
      return acc
    }, {})
  ).sort((a, b) => b[1] - a[1])

  const maxType = Math.max(...byType.map(([, v]) => v), 1)

  // 10 derniers projets actifs
  const recents = proj.filter(p => p.statut === 'actif').slice(0, 8)

  return (
    <div style={{ minHeight: '100vh', background: CREAM, display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ background: '#353b32', padding: '0 52px', height: '68px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <a href="/" style={{ fontFamily: 'Georgia, serif', fontSize: '20px', color: CREAM, letterSpacing: '0.06em', textDecoration: 'none' }}>
          AMANA <span style={{ color: GOLD }}>PATRIMOINE</span>
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <a href="/conseiller"        style={{ color: 'rgba(248,244,236,0.6)', fontSize: '13px', textDecoration: 'none' }}>Dossiers</a>
          <a href="/conseiller/projets" style={{ color: 'rgba(248,244,236,0.6)', fontSize: '13px', textDecoration: 'none' }}>Projets</a>
          <span style={{ color: CREAM, fontSize: '13px' }}>Reporting</span>
          <form action="/api/logout" method="POST">
            <button type="submit" style={{ padding: '8px 20px', background: 'transparent', color: 'rgba(248,244,236,0.7)', border: '1px solid rgba(248,244,236,0.3)', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>
              Déconnexion
            </button>
          </form>
        </div>
      </div>

      <div style={{ flex: 1, maxWidth: '1100px', margin: '0 auto', padding: '48px 24px', width: '100%' }}>

        {/* Titre */}
        <div style={{ marginBottom: '40px' }}>
          <p style={{ fontSize: '13px', color: '#6d7368', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>Tableau de bord</p>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '32px', color: FOREST, margin: '0' }}>
            Reporting
          </h1>
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '40px' }}>
          <StatCard label="AUM Total" value={`${aumTotal.toLocaleString('fr-FR')} €`} sub="tous projets confondus" />
          <StatCard label="AUM Actif" value={`${aumActif.toLocaleString('fr-FR')} €`} sub="projets actifs uniquement" color="#065f46" />
          <StatCard label="Clients KYC validés" value={`${kycValides}`} sub={`sur ${kycTotal} dossiers`} />
          <StatCard label="Taux de conversion" value={`${txConv}%`} sub="KYC → projet" color={GOLD} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>

          {/* Pipeline funnel */}
          <div style={{ background: 'white', borderRadius: '16px', padding: '28px', boxShadow: '0 2px 12px rgba(68,75,63,0.06)' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: FOREST, marginBottom: '24px' }}>Pipeline projets</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {funnel.map(f => (
                <div key={f.key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '13px', color: '#4b5563' }}>{f.label}</span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: f.color }}>{f.count}</span>
                  </div>
                  <div style={{ height: '8px', background: '#f3f4f6', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${(f.count / maxFunnel) * 100}%`,
                      background: f.color,
                      borderRadius: '4px',
                      transition: 'width 0.3s',
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Répartition AUM par produit */}
          <div style={{ background: 'white', borderRadius: '16px', padding: '28px', boxShadow: '0 2px 12px rgba(68,75,63,0.06)' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: FOREST, marginBottom: '24px' }}>AUM actif par produit</div>
            {byType.length === 0 ? (
              <div style={{ color: '#6d7368', fontSize: '13px', textAlign: 'center', paddingTop: '32px' }}>
                Aucun projet actif
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {byType.map(([type, montant]) => (
                  <div key={type}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '13px', color: '#4b5563' }}>{TYPE_LABEL[type] ?? type}</span>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: TYPE_COLOR[type] ?? FOREST }}>
                        {montant.toLocaleString('fr-FR')} €
                      </span>
                    </div>
                    <div style={{ height: '8px', background: '#f3f4f6', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${(montant / maxType) * 100}%`,
                        background: TYPE_COLOR[type] ?? FOREST,
                        borderRadius: '4px',
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Derniers projets actifs */}
        {recents.length > 0 && (
          <div style={{ background: 'white', borderRadius: '16px', padding: '28px', boxShadow: '0 2px 12px rgba(68,75,63,0.06)' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: FOREST, marginBottom: '20px' }}>Projets actifs récents</div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #f0ebe0' }}>
                  {['Produit', 'Montant', 'Activé le'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 0', fontSize: '11px', color: '#6d7368', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recents.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f9f6f0' }}>
                    <td style={{ padding: '12px 0', fontSize: '14px', color: FOREST, fontWeight: 500 }}>
                      {TYPE_LABEL[p.type] ?? p.type}
                    </td>
                    <td style={{ padding: '12px 0', fontFamily: 'Georgia, serif', fontSize: '15px', color: FOREST }}>
                      {Number(p.montant).toLocaleString('fr-FR')} €
                    </td>
                    <td style={{ padding: '12px 0', fontSize: '13px', color: '#6d7368' }}>
                      {new Date(p.updated_at).toLocaleDateString('fr-FR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  )
}
