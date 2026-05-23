import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SignatureButton from '@/components/SignatureButton'

const FOREST = '#444b3f'
const GOLD = '#c9a55a'
const CREAM = '#f8f4ec'

const TYPE_LABEL: Record<string, string> = {
  assurance_vie: 'Assurance-vie',
  scpi:          'SCPI',
  cto:           'CTO',
  immobilier:    'Immobilier',
  pee:           'PEE / PERCO',
  retraite:      'Retraite',
  don:           'Don / Waqf',
}

const STATUT_STYLE: Record<string, { label: string; color: string; bg: string; next: string | null; nextLabel: string | null }> = {
  en_cours: { label: 'En cours',  color: '#1e40af', bg: '#dbeafe', next: 'soumis',  nextLabel: 'Soumettre' },
  soumis:   { label: 'Soumis',    color: '#92400e', bg: '#fef3c7', next: null,      nextLabel: null },
  signe:    { label: 'Signe',     color: '#065f46', bg: '#d1fae5', next: 'actif',   nextLabel: 'Activer' },
  actif:    { label: 'Actif',     color: '#065f46', bg: '#d1fae5', next: 'cloture', nextLabel: 'Cloturer' },
  cloture:  { label: 'Cloture',   color: '#6b7280', bg: '#f3f4f6', next: null,      nextLabel: null },
}

const STATS_CONF = [
  { key: 'en_cours', label: 'En cours',  color: '#1e40af' },
  { key: 'soumis',   label: 'Soumis',    color: '#92400e' },
  { key: 'signe',    label: 'Signes',    color: '#065f46' },
  { key: 'actif',    label: 'Actifs',    color: '#065f46' },
]

export default async function ProjetsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'conseiller') redirect('/dashboard')

  const { data: projects } = await supabase
    .from('projects')
    .select('*, kyc:kyc_id(prenom, nom, ville)')
    .order('created_at', { ascending: false })

  const totalMontant = projects?.reduce((s, p) => s + (p.montant ?? 0), 0) ?? 0
  const totalActif = projects?.filter(p => p.statut === 'actif').reduce((s, p) => s + (p.montant ?? 0), 0) ?? 0

  return (
    <div style={{ minHeight: '100vh', background: CREAM, display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ background: '#353b32', padding: '0 52px', height: '68px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <a href="/" style={{ fontFamily: 'Georgia, serif', fontSize: '20px', color: CREAM, letterSpacing: '0.06em', textDecoration: 'none' }}>
          AMANA <span style={{ color: GOLD }}>PATRIMOINE</span>
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <a href="/conseiller"           style={{ color: 'rgba(248,244,236,0.6)', fontSize: '13px', textDecoration: 'none' }}>Dossiers</a>
          <span style={{ color: CREAM, fontSize: '13px' }}>Projets</span>
          <a href="/conseiller/reporting" style={{ color: 'rgba(248,244,236,0.6)', fontSize: '13px', textDecoration: 'none' }}>Reporting</a>
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
          <p style={{ fontSize: '13px', color: '#6d7368', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>Pipeline</p>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '32px', color: FOREST, margin: '0' }}>
            Projets patrimoniaux
          </h1>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr) repeat(4, 1fr)', gap: '16px', marginBottom: '40px' }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '20px 24px', boxShadow: '0 2px 12px rgba(68,75,63,0.06)' }}>
            <div style={{ fontSize: '11px', color: '#6d7368', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Total encours</div>
            <div style={{ fontFamily: 'Georgia, serif', fontSize: '22px', color: FOREST, fontWeight: 600 }}>
              {totalMontant.toLocaleString('fr-FR')} <span style={{ fontSize: '13px' }}>EUR</span>
            </div>
          </div>
          <div style={{ background: 'white', borderRadius: '12px', padding: '20px 24px', boxShadow: '0 2px 12px rgba(68,75,63,0.06)' }}>
            <div style={{ fontSize: '11px', color: '#6d7368', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Actifs</div>
            <div style={{ fontFamily: 'Georgia, serif', fontSize: '22px', color: '#065f46', fontWeight: 600 }}>
              {totalActif.toLocaleString('fr-FR')} <span style={{ fontSize: '13px' }}>EUR</span>
            </div>
          </div>
          {STATS_CONF.map(s => (
            <div key={s.key} style={{ background: 'white', borderRadius: '12px', padding: '20px 24px', boxShadow: '0 2px 12px rgba(68,75,63,0.06)' }}>
              <div style={{ fontSize: '11px', color: '#6d7368', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>{s.label}</div>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: '32px', color: s.color, fontWeight: 600 }}>
                {projects?.filter(p => p.statut === s.key).length ?? 0}
              </div>
            </div>
          ))}
        </div>

        {/* Liste projets */}
        {!projects || projects.length === 0 ? (
          <div style={{ background: 'white', borderRadius: '16px', padding: '48px', textAlign: 'center', color: '#6d7368' }}>
            Aucun projet. Validez un dossier KYC et créez le premier projet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {projects.map(p => {
              const st = STATUT_STYLE[p.statut] ?? STATUT_STYLE['en_cours']
              const client = p.kyc as { prenom: string; nom: string; ville: string } | null
              const nomClient = client ? `${client.prenom} ${client.nom}` : '—'

              return (
                <div key={p.id} style={{ background: 'white', borderRadius: '14px', padding: '20px 28px', boxShadow: '0 2px 8px rgba(68,75,63,0.06)', display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>

                  {/* Client + type */}
                  <div style={{ flex: 2, minWidth: '200px' }}>
                    <div style={{ fontWeight: 600, color: FOREST, fontSize: '15px', marginBottom: '3px' }}>
                      {nomClient}
                    </div>
                    <div style={{ fontSize: '13px', color: '#6d7368' }}>
                      {TYPE_LABEL[p.type] ?? p.type}
                      {client?.ville ? ` · ${client.ville}` : ''}
                    </div>
                  </div>

                  {/* Montant */}
                  <div style={{ minWidth: '140px', textAlign: 'right' }}>
                    <div style={{ fontFamily: 'Georgia, serif', fontSize: '18px', color: FOREST }}>
                      {Number(p.montant).toLocaleString('fr-FR')} EUR
                    </div>
                    <div style={{ fontSize: '11px', color: '#6d7368', marginTop: '2px' }}>
                      {new Date(p.created_at).toLocaleDateString('fr-FR')}
                    </div>
                  </div>

                  {/* Statut */}
                  <div style={{ minWidth: '90px', textAlign: 'center' }}>
                    <span style={{ display: 'inline-block', padding: '5px 12px', borderRadius: '20px', background: st.bg, color: st.color, fontSize: '12px', fontWeight: 500 }}>
                      {st.label}
                    </span>
                  </div>

                  {/* Actions */}
                  {p.statut === 'soumis' ? (
                    // Signature électronique via Yousign
                    <SignatureButton
                      projetId={p.id}
                      nomClient={nomClient}
                      nomProduit={TYPE_LABEL[p.type] ?? p.type}
                    />
                  ) : st.next ? (
                    // Avancement de statut standard
                    <form action="/api/projets/statut" method="POST">
                      <input type="hidden" name="projet_id" value={p.id} />
                      <input type="hidden" name="statut" value={st.next} />
                      <button type="submit" style={{
                        padding: '8px 16px', background: GOLD, color: 'white',
                        border: 'none', borderRadius: '6px', fontSize: '13px',
                        cursor: 'pointer', fontWeight: 500, whiteSpace: 'nowrap' as const,
                      }}>
                        {st.nextLabel}
                      </button>
                    </form>
                  ) : (
                    <div style={{ minWidth: '120px' }} />
                  )}

                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
