import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import NouveauProjetForm from '@/components/NouveauProjetForm'

const FOREST = '#3a4d39'
const GOLD = '#c9a55a'
const CREAM = '#f8f4ec'

const STATUT_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  en_attente: { label: 'Non soumis',  color: '#92400e', bg: '#fef3c7' },
  soumis:     { label: 'A verifier',  color: '#1e40af', bg: '#dbeafe' },
  valide:     { label: 'Valide',      color: '#065f46', bg: '#d1fae5' },
  rejete:     { label: 'Rejete',      color: '#991b1b', bg: '#fee2e2' },
}

const PROJET_STATUT: Record<string, { label: string; color: string; bg: string }> = {
  en_cours: { label: 'En cours',  color: '#1e40af', bg: '#dbeafe' },
  soumis:   { label: 'Soumis',    color: '#92400e', bg: '#fef3c7' },
  signe:    { label: 'Signe',     color: '#065f46', bg: '#d1fae5' },
  actif:    { label: 'Actif',     color: '#065f46', bg: '#d1fae5' },
  cloture:  { label: 'Cloture',   color: '#6b7280', bg: '#f3f4f6' },
}

const TYPE_LABEL: Record<string, string> = {
  assurance_vie: 'Assurance-vie',
  scpi:          'SCPI',
  cto:           'CTO',
  immobilier:    'Immobilier',
  pee:           'PEE / PERCO',
  retraite:      'Retraite',
  don:           'Don / Waqf',
}

const REVENUS_LABEL: Record<string, string> = {
  lt30k:    'Moins de 30 000 EUR/an',
  '30-60k': '30 000 - 60 000 EUR/an',
  '60-100k':'60 000 - 100 000 EUR/an',
  gt100k:   'Plus de 100 000 EUR/an',
}

const SIT_LABEL: Record<string, string> = {
  salarie:     'Salarie',
  independant: 'Independant / Entrepreneur',
  liberal:     'Profession liberale',
  retraite:    'Retraite',
  sans_emploi: 'Sans emploi',
}

const OBJECTIF_LABEL: Record<string, string> = {
  capital_preservation: 'Preservation du capital',
  income:               'Revenus reguliers',
  growth:               'Croissance patrimoniale',
  speculation:          'Performance maximale',
}

const HORIZON_LABEL: Record<string, string> = {
  lt2y:   'Moins de 2 ans',
  '2-5y': '2 a 5 ans',
  '5-10y':'5 a 10 ans',
  gt10y:  'Plus de 10 ans',
}

const PERTE_LABEL: Record<string, string> = {
  '0-10': 'Moins de 10%',
  '10-25':'10% a 25%',
  '25-50':'25% a 50%',
  'gt50': 'Plus de 50%',
}

const RISQUE_LABEL = ['', 'Tres prudent', 'Prudent', 'Equilibre', 'Dynamique', 'Agressif']

function scoreColor(score: number) {
  if (score <= 3) return { color: '#065f46', bg: '#d1fae5' }
  if (score <= 6) return { color: '#92400e', bg: '#fef3c7' }
  return { color: '#991b1b', bg: '#fee2e2' }
}

export default async function DossierDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role, full_name').eq('id', user.id).single()
  if (profile?.role !== 'conseiller') redirect('/dashboard')

  const { data: kyc } = await supabase
    .from('kyc').select('*').eq('id', id).single()
  if (!kyc) redirect('/conseiller')

  const [{ data: sim }, { data: projects }, { data: tenant }] = await Promise.all([
    supabase.from('simulations').select('*').eq('user_id', kyc.user_id)
      .order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('projects').select('*').eq('user_id', kyc.user_id)
      .order('created_at', { ascending: false }),
    supabase.from('tenants').select('id').eq('slug', 'amana').single(),
  ])

  const getUrl = async (path: string | null) => {
    if (!path) return null
    const { data } = await supabase.storage
      .from('kyc-documents').createSignedUrl(path, 3600)
    return data?.signedUrl ?? null
  }

  const [urlId, urlJustif] = await Promise.all([
    getUrl(kyc.doc_identite_url),
    getUrl(kyc.doc_justif_url),
  ])

  const st = STATUT_STYLE[kyc.statut] ?? STATUT_STYLE['en_attente']
  const total = sim ? (sim.montant_av + sim.montant_scpi + sim.montant_cto) : 0
  const sc = kyc.kyc_note_risque ? scoreColor(kyc.kyc_note_risque) : null

  const row = (label: string, val: string | null) => val ? (
    <div style={{ display: 'flex', gap: '16px', padding: '12px 0', borderBottom: '1px solid #f0ebe0' }}>
      <div style={{ width: '180px', fontSize: '12px', color: '#6b7f6a', textTransform: 'uppercase' as const, letterSpacing: '0.06em', flexShrink: 0, paddingTop: '2px' }}>
        {label}
      </div>
      <div style={{ fontSize: '15px', color: FOREST }}>{val}</div>
    </div>
  ) : null

  const section = (title: string, children: React.ReactNode) => (
    <div style={{ background: 'white', borderRadius: '16px', padding: '28px 32px', boxShadow: '0 2px 12px rgba(58,77,57,0.06)', marginBottom: '20px' }}>
      <p style={{ fontSize: '12px', color: '#6b7f6a', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px' }}>
        {title}
      </p>
      {children}
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: CREAM, display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ background: '#2b3a2a', padding: '0 52px', height: '68px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <a href="/" style={{ fontFamily: 'Georgia, serif', fontSize: '20px', color: CREAM, letterSpacing: '0.06em', textDecoration: 'none' }}>
          AMANA <span style={{ color: GOLD }}>PATRIMOINE</span>
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <a href="/conseiller" style={{ color: 'rgba(248,244,236,0.6)', fontSize: '13px', textDecoration: 'none' }}>
            Retour aux dossiers
          </a>
          <form action="/api/logout" method="POST">
            <button type="submit" style={{ padding: '8px 20px', background: 'transparent', color: 'rgba(248,244,236,0.7)', border: '1px solid rgba(248,244,236,0.3)', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>
              Deconnexion
            </button>
          </form>
        </div>
      </div>

      <div style={{ flex: 1, maxWidth: '860px', margin: '0 auto', padding: '48px 24px', width: '100%' }}>

        {/* En-tete */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <p style={{ fontSize: '13px', color: '#6b7f6a', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
              Dossier client
            </p>
            <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '32px', color: FOREST, margin: '0' }}>
              {kyc.prenom} {kyc.nom}
            </h1>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            {sc && kyc.kyc_note_risque && (
              <span style={{ display: 'inline-block', padding: '8px 18px', borderRadius: '20px', background: sc.bg, color: sc.color, fontSize: '13px', fontWeight: 500 }}>
                Risque LCB-FT : {kyc.kyc_note_risque}/10
              </span>
            )}
            <span style={{ display: 'inline-block', padding: '8px 18px', borderRadius: '20px', background: st.bg, color: st.color, fontSize: '14px', fontWeight: 500 }}>
              {st.label}
            </span>
          </div>
        </div>

        {/* Identite */}
        {section('Identite', <>
          {row('Prenom', kyc.prenom)}
          {row('Nom', kyc.nom)}
          {row('Date de naissance', kyc.date_naissance)}
          {row('Nationalite', kyc.nationalite)}
          {row('Adresse', [kyc.adresse, kyc.code_postal, kyc.ville].filter(Boolean).join(', '))}
        </>)}

        {/* Situation */}
        {section('Situation professionnelle', <>
          {row('Situation', SIT_LABEL[kyc.situation_pro] ?? kyc.situation_pro)}
          {row('Revenus annuels', REVENUS_LABEL[kyc.revenu_annuel] ?? kyc.revenu_annuel)}
          {row('Patrimoine net', kyc.patrimoine_net ? `${Number(kyc.patrimoine_net).toLocaleString('fr-FR')} EUR` : null)}
        </>)}

        {/* Profil MIF2 */}
        {kyc.objectif_investissement && section('Profil investisseur (MIF2)', <>
          {row('Objectif', OBJECTIF_LABEL[kyc.objectif_investissement] ?? kyc.objectif_investissement)}
          {row("Horizon", HORIZON_LABEL[kyc.horizon_placement] ?? kyc.horizon_placement)}
          {row('Tolerance risque', kyc.tolerance_risque ? `${RISQUE_LABEL[kyc.tolerance_risque]} (${kyc.tolerance_risque}/5)` : null)}
          {row('Perte acceptable', PERTE_LABEL[kyc.perte_acceptable] ?? kyc.perte_acceptable)}
        </>)}

        {/* Simulation */}
        {sim && (
          <div style={{ background: 'white', borderRadius: '16px', padding: '28px 32px', boxShadow: '0 2px 12px rgba(58,77,57,0.06)', marginBottom: '20px' }}>
            <p style={{ fontSize: '12px', color: '#6b7f6a', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px' }}>
              Simulation patrimoniale
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
              {[
                { label: 'Assurance-vie', val: sim.montant_av },
                { label: 'SCPI', val: sim.montant_scpi },
                { label: 'CTO', val: sim.montant_cto },
              ].map(p => (
                <div key={p.label} style={{ textAlign: 'center', padding: '16px', background: CREAM, borderRadius: '10px' }}>
                  <div style={{ fontSize: '11px', color: '#6b7f6a', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: '8px' }}>{p.label}</div>
                  <div style={{ fontFamily: 'Georgia, serif', fontSize: '20px', color: FOREST }}>
                    {p.val > 0 ? `${p.val.toLocaleString('fr-FR')} EUR` : '-'}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: '13px', color: '#6b7f6a' }}>
              Total : {total.toLocaleString('fr-FR')} EUR &middot; TMI {sim.tmi}%
            </div>
          </div>
        )}

        {/* Projets existants */}
        {projects && projects.length > 0 && section(`Projets (${projects.length})`, (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {projects.map(p => {
              const ps = PROJET_STATUT[p.statut] ?? PROJET_STATUT['en_cours']
              return (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid #f0ebe0', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: FOREST, fontSize: '15px' }}>
                      {TYPE_LABEL[p.type] ?? p.type}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7f6a', marginTop: '2px' }}>
                      {new Date(p.created_at).toLocaleDateString('fr-FR')}
                      {p.metadata?.notes && ` · ${p.metadata.notes}`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontFamily: 'Georgia, serif', fontSize: '16px', color: FOREST }}>
                      {Number(p.montant).toLocaleString('fr-FR')} EUR
                    </span>
                    <span style={{ padding: '4px 12px', borderRadius: '20px', background: ps.bg, color: ps.color, fontSize: '12px', fontWeight: 500 }}>
                      {ps.label}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        ))}

        {/* Nouveau projet (seulement si KYC valide) */}
        {kyc.statut === 'valide' && tenant && section('Nouveau projet', (
          <NouveauProjetForm
            kycId={kyc.id}
            userId={kyc.user_id}
            tenantId={tenant.id}
            conseillerName={profile?.full_name ?? 'Conseiller'}
          />
        ))}

        {/* Pieces justificatives */}
        {section('Pieces justificatives', (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            {urlId ? (
              <a href={urlId} target="_blank" rel="noopener noreferrer" style={{ padding: '12px 20px', background: CREAM, borderRadius: '8px', color: FOREST, textDecoration: 'none', fontSize: '14px', fontWeight: 500, border: '1px solid #d4c9a8' }}>
                Piece d identite
              </a>
            ) : (
              <span style={{ padding: '12px 20px', background: '#f5f5f5', borderRadius: '8px', color: '#999', fontSize: '14px' }}>
                Non fournie
              </span>
            )}
            {urlJustif ? (
              <a href={urlJustif} target="_blank" rel="noopener noreferrer" style={{ padding: '12px 20px', background: CREAM, borderRadius: '8px', color: FOREST, textDecoration: 'none', fontSize: '14px', fontWeight: 500, border: '1px solid #d4c9a8' }}>
                Justificatif de domicile
              </a>
            ) : (
              <span style={{ padding: '12px 20px', background: '#f5f5f5', borderRadius: '8px', color: '#999', fontSize: '14px' }}>
                Non fourni
              </span>
            )}
          </div>
        ))}

        {/* Actions KYC */}
        {kyc.statut === 'soumis' && (
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginBottom: '20px' }}>
            <form action="/api/kyc/rejeter" method="POST">
              <input type="hidden" name="kyc_id" value={kyc.id} />
              <button type="submit" style={{ padding: '13px 28px', background: '#991b1b', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', cursor: 'pointer', fontWeight: 500 }}>
                Rejeter le dossier
              </button>
            </form>
            <form action="/api/kyc/valider" method="POST">
              <input type="hidden" name="kyc_id" value={kyc.id} />
              <button type="submit" style={{ padding: '13px 28px', background: '#065f46', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', cursor: 'pointer', fontWeight: 500 }}>
                Valider le dossier
              </button>
            </form>
          </div>
        )}

        {kyc.statut === 'valide' && (
          <div style={{ padding: '20px 24px', background: '#d1fae5', borderRadius: '12px', color: '#065f46', fontSize: '14px', fontWeight: 500, textAlign: 'center' }}>
            Dossier valide le {new Date(kyc.updated_at).toLocaleDateString('fr-FR')}
          </div>
        )}

        {kyc.statut === 'rejete' && (
          <div style={{ padding: '20px 24px', background: '#fee2e2', borderRadius: '12px', color: '#991b1b', fontSize: '14px', fontWeight: 500, textAlign: 'center' }}>
            Dossier rejete — client notifie
          </div>
        )}

      </div>
    </div>
  )
}
