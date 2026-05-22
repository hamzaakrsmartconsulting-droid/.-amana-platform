'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const FOREST = '#3a4d39'
const GOLD = '#c9a55a'
const CREAM = '#f8f4ec'

// ─── Types ────────────────────────────────────────────────────────────────────

type KycData = {
  prenom: string; nom: string; civilite: string
  date_naissance: string; nationalite: string
  adresse: string; code_postal: string; ville: string
  telephone: string
  situation_familiale: string; situation_pro: string
  revenu_foyer: string; patrimoine_financier: string; patrimoine_net: number | null
  ifi_assujetti: boolean; fatca_us_person: boolean; ppe: boolean
  objectif_investissement: string; horizon_placement: string
  tolerance_risque: number; perte_acceptable: string
  kyc_note_risque: number; statut: string
}

type Mif2Data = {
  formation_financiere: string; experience_investissement: string
  produits_utilises: string[]
  frequence_operations: string; montant_moyen_operation: string
  comprehension_risque: number
  connaissance_scpi: string; connaissance_assurance_vie: string
  score_mif2: number; profil_mif2: string
}

// ─── Libellés ─────────────────────────────────────────────────────────────────

const L = {
  situation_familiale: { celibataire: 'Célibataire', marie: 'Marié(e)', pacse: 'Pacsé(e)', divorce: 'Divorcé(e)', veuf: 'Veuf / Veuve', separe: 'Séparé(e)' },
  situation_pro: { salarie: 'Salarié(e)', independant: 'Indépendant / Entrepreneur', liberal: 'Profession libérale', fonctionnaire: 'Fonctionnaire', retraite: 'Retraité(e)', sans_emploi: 'Sans emploi', etudiant: 'Étudiant(e)' },
  revenu: { lt25k: '< 25 000 €', '25-50k': '25 001 – 50 000 €', '50-75k': '50 001 – 75 000 €', '75-150k': '75 001 – 150 000 €', gt150k: '> 150 000 €' },
  patrimoine_fin: { lt25k: '< 25 000 €', '25-75k': '25 001 – 75 000 €', gt75k: '> 75 000 €' },
  objectif: { revenu_complementaire: 'Revenu complémentaire', valorisation_capital: 'Valorisation du capital', retraite: 'Préparation retraite', diversification: 'Diversification', transmission: 'Transmission', optimisation_fiscale: 'Optimisation fiscale' },
  horizon: { lt1y: '< 1 an', '1-3y': '1 – 3 ans', '3-5y': '3 – 5 ans', '5-8y': '5 – 8 ans', gt8y: '> 8 ans' },
  tolerance: { 1: 'Très prudent', 2: 'Prudent', 3: 'Équilibré', 4: 'Dynamique', 5: 'Agressif' },
  formation: { aucune: 'Pas de formation spécifique', generale: 'Formation générale', specialisee: 'Formation spécialisée en finance', professionnel: 'Professionnel du secteur financier' },
  experience: { aucune: 'Aucune expérience', limitee: 'Limitée (< 3 ans)', moderee: 'Modérée (3 – 10 ans)', etendue: 'Étendue (> 10 ans)' },
  frequence: { jamais: 'Jamais', rarement: 'Rarement (1 – 3/an)', regulierement: 'Régulièrement (4 – 10/an)', frequemment: 'Fréquemment (> 10/an)' },
  montant: { lt5k: '< 5 000 €', '5-25k': '5 000 – 25 000 €', '25-100k': '25 000 – 100 000 €', gt100k: '> 100 000 €' },
  connaissance: { aucune: 'Ne connaît pas', entendu: 'A entendu parler', comprend: 'Comprend et a souscrit', maitrise: 'Maîtrise (exp. significative)' },
  profil_mif2: { debutant: 'Débutant', averti: 'Averti', expert: 'Expert' },
  produits: {
    livrets: 'Livrets réglementés', fonds_euros: 'Fonds en euros',
    opcvm: 'OPCVM / ETF', actions_directs: 'Actions / obligations en direct',
    scpi: 'SCPI / OPCI', structures: 'Produits structurés / dérivés',
  },
}

const get = (map: Record<string, string>, key: string) => map[key] ?? key

// ─── Adéquation produits ─────────────────────────────────────────────────────

function evaluerAdequation(kyc: KycData, mif2: Mif2Data) {
  const score = mif2.score_mif2 ?? 0
  const tolerance = kyc.tolerance_risque ?? 2
  const horizon = kyc.horizon_placement

  const produits = []

  const scpiOk = score >= 5 && tolerance >= 2 && ['3-5y', '5-8y', 'gt8y'].includes(horizon)
  produits.push({
    nom: 'SCPI à capital variable',
    sous_titre: 'Immobilier pierre-papier halal',
    adequat: scpiOk,
    raison: scpiOk
      ? 'Votre profil investisseur et votre horizon de placement sont compatibles avec ce produit.'
      : 'Un horizon de placement minimum de 3 ans et un profil au moins prudent sont requis.',
    risque: 'Faible à modéré (SRI 3/7)',
    rendement: '4 – 6 % / an (non garanti)',
    halal: true,
  })

  const avOk = score >= 3 && tolerance >= 1
  produits.push({
    nom: 'Assurance-vie multisupport',
    sous_titre: 'Contrat halal — Vie Plus / Intencial',
    adequat: avOk,
    raison: avOk
      ? 'Ce produit convient à votre objectif et votre profil de risque.'
      : 'Un profil minimum est requis pour accéder aux unités de compte.',
    risque: 'Variable selon allocation (SRI 2 – 6/7)',
    rendement: 'Variable selon supports',
    halal: true,
  })

  return produits
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const section: React.CSSProperties = {
  marginBottom: '32px',
  borderBottom: '1px solid #e8dfc8',
  paddingBottom: '28px',
}

const sectionTitle: React.CSSProperties = {
  fontSize: '11px', fontWeight: 700, color: GOLD,
  textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '16px',
}

const row: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
  marginBottom: '8px', fontSize: '13px',
}

const rowLabel: React.CSSProperties = { color: '#6b7f6a', flexShrink: 0, marginRight: '12px' }
const rowValue: React.CSSProperties = { color: FOREST, fontWeight: 500, textAlign: 'right' as const }

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function RapportAdequationPage() {
  const [kyc, setKyc] = useState<KycData | null>(null)
  const [mif2, setMif2] = useState<Mif2Data | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isConseillerView, setIsConseillerView] = useState(false)
  const [clientUid, setClientUid] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const uid = new URLSearchParams(window.location.search).get('uid')

      if (uid) {
        // ── Vue conseiller : charger via API admin ──
        setIsConseillerView(true)
        setClientUid(uid)
        try {
          const res = await fetch(`/api/admin/client-data?uid=${uid}`)
          const data = await res.json()
          if (!res.ok) { setError(data.error ?? 'Accès refusé'); setLoading(false); return }
          if (!data.kyc) { setError('KYC introuvable pour ce client.'); setLoading(false); return }
          if (!data.mif2) { setError('Ce client n\'a pas encore complété le questionnaire MIF2.'); setLoading(false); return }
          setKyc(data.kyc)
          setMif2(data.mif2)
        } catch {
          setError('Erreur lors du chargement du rapport.')
        }
        setLoading(false)
      } else {
        // ── Vue client : charger depuis sa session ──
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setError('Non connecté'); setLoading(false); return }

        const [{ data: kycData, error: e1 }, { data: mif2Data, error: e2 }] = await Promise.all([
          supabase.from('kyc').select('*').eq('user_id', user.id).single(),
          supabase.from('mif2').select('*').eq('user_id', user.id).single(),
        ])

        if (e1 || !kycData) { setError('KYC introuvable. Veuillez compléter votre dossier.'); setLoading(false); return }
        if (e2 || !mif2Data) { setError('Questionnaire MIF2 introuvable. Veuillez le compléter.'); setLoading(false); return }

        setKyc(kycData)
        setMif2(mif2Data)
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: CREAM, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: FOREST, fontSize: '14px' }}>Chargement du rapport…</div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: CREAM, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: 'white', borderRadius: '16px', padding: '48px', maxWidth: '480px', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '16px' }}>⚠️</div>
          <p style={{ color: '#c0392b', fontSize: '14px', marginBottom: '24px' }}>{error}</p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            {isConseillerView ? (
              <a href={clientUid ? `/conseiller/dossier/${clientUid}` : '/conseiller'}
                style={{ padding: '10px 20px', background: FOREST, color: 'white', borderRadius: '8px', textDecoration: 'none', fontSize: '14px' }}>
                ← Retour au dossier
              </a>
            ) : (
              <>
                <a href="/kyc" style={{ padding: '10px 20px', background: GOLD, color: 'white', borderRadius: '8px', textDecoration: 'none', fontSize: '14px' }}>
                  Compléter le KYC
                </a>
                <a href="/mif2" style={{ padding: '10px 20px', background: FOREST, color: 'white', borderRadius: '8px', textDecoration: 'none', fontSize: '14px' }}>
                  Questionnaire MIF2
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  const produits = evaluerAdequation(kyc!, mif2!)
  const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
  const profilColor = { debutant: '#c9a55a', averti: '#3a6e8a', expert: '#3a4d39' }[mif2!.profil_mif2] ?? FOREST

  return (
    <>
      <style>{`
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          .rapport-container { box-shadow: none !important; margin: 0 !important; max-width: 100% !important; }
          @page { margin: 20mm; size: A4 portrait; }
        }
      `}</style>

      <div style={{ minHeight: '100vh', background: CREAM }}>

        {/* Header */}
        <div className="no-print" style={{ background: '#2b3a2a', padding: '0 52px', height: '68px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <a href="/" style={{ fontFamily: 'Georgia, serif', fontSize: '20px', color: CREAM, letterSpacing: '0.06em', textDecoration: 'none' }}>
            AMANA <span style={{ color: GOLD }}>PATRIMOINE</span>
          </a>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {isConseillerView && (
              <span style={{
                padding: '4px 12px', borderRadius: '20px',
                background: 'rgba(201,165,90,0.2)', color: GOLD,
                fontSize: '12px', fontWeight: 500, border: '1px solid rgba(201,165,90,0.4)',
              }}>
                👁 Vue conseiller
              </span>
            )}
            <a
              href={isConseillerView && clientUid ? `/conseiller/dossier/${clientUid}` : '/dashboard'}
              style={{ color: 'rgba(248,244,236,0.6)', fontSize: '13px', textDecoration: 'none' }}
            >
              {isConseillerView ? '← Retour au dossier' : '← Mon espace'}
            </a>
            <button
              onClick={() => window.print()}
              style={{ padding: '8px 20px', background: GOLD, color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: 500 }}
            >
              Télécharger PDF
            </button>
          </div>
        </div>

        {/* Rapport */}
        <div style={{ padding: '40px 24px', display: 'flex', justifyContent: 'center' }}>
          <div
            className="rapport-container"
            style={{ background: 'white', borderRadius: '16px', padding: '56px', maxWidth: '800px', width: '100%', boxShadow: '0 4px 40px rgba(58,77,57,0.10)' }}
          >

            {/* En-tête rapport */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px', paddingBottom: '32px', borderBottom: `2px solid ${FOREST}` }}>
              <div>
                <div style={{ fontFamily: 'Georgia, serif', fontSize: '22px', color: FOREST, letterSpacing: '0.06em', marginBottom: '4px' }}>
                  AMANA <span style={{ color: GOLD }}>PATRIMOINE</span>
                </div>
                <div style={{ fontSize: '11px', color: '#6b7f6a', letterSpacing: '0.05em' }}>
                  CGPI — Conseil en Gestion de Patrimoine Indépendant
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '11px', color: GOLD, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Rapport d'Adéquation
                </div>
                <div style={{ fontSize: '12px', color: '#6b7f6a' }}>Établi le {today}</div>
                <div style={{ fontSize: '11px', color: '#9aab9a', marginTop: '2px' }}>Document confidentiel — Directive MIF2</div>
              </div>
            </div>

            {/* Identité client */}
            <div style={{ background: '#f8f4ec', borderRadius: '12px', padding: '20px 24px', marginBottom: '36px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '18px', fontWeight: 600, color: FOREST, fontFamily: 'Georgia, serif' }}>
                  {kyc!.civilite} {kyc!.prenom} {kyc!.nom}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7f6a', marginTop: '4px' }}>
                  {kyc!.adresse} — {kyc!.code_postal} {kyc!.ville}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{
                  display: 'inline-block', padding: '6px 16px', borderRadius: '20px',
                  background: profilColor, color: 'white',
                  fontSize: '12px', fontWeight: 600, letterSpacing: '0.05em',
                }}>
                  Profil {get(L.profil_mif2, mif2!.profil_mif2)} — Score {mif2!.score_mif2}/25
                </div>
              </div>
            </div>

            {/* 1. Situation personnelle */}
            <div style={section}>
              <div style={sectionTitle}>1. Situation personnelle et financière</div>
              <div style={row}><span style={rowLabel}>Situation familiale</span><span style={rowValue}>{get(L.situation_familiale, kyc!.situation_familiale)}</span></div>
              <div style={row}><span style={rowLabel}>Situation professionnelle</span><span style={rowValue}>{get(L.situation_pro, kyc!.situation_pro)}</span></div>
              <div style={row}><span style={rowLabel}>Revenu net annuel du foyer</span><span style={rowValue}>{get(L.revenu, kyc!.revenu_foyer)}</span></div>
              <div style={row}><span style={rowLabel}>Patrimoine financier estimé</span><span style={rowValue}>{get(L.patrimoine_fin, kyc!.patrimoine_financier)}</span></div>
              {kyc!.patrimoine_net != null && (
                <div style={row}><span style={rowLabel}>Patrimoine net global</span><span style={rowValue}>{kyc!.patrimoine_net.toLocaleString('fr-FR')} €</span></div>
              )}
              <div style={row}><span style={rowLabel}>Assujetti IFI</span><span style={rowValue}>{kyc!.ifi_assujetti ? 'Oui' : 'Non'}</span></div>
              <div style={row}><span style={rowLabel}>US Person (FATCA)</span><span style={rowValue}>{kyc!.fatca_us_person ? 'Oui' : 'Non'}</span></div>
              <div style={row}><span style={rowLabel}>PPE</span><span style={rowValue}>{kyc!.ppe ? 'Oui — surveillance renforcée' : 'Non'}</span></div>
            </div>

            {/* 2. Objectifs & profil risque */}
            <div style={section}>
              <div style={sectionTitle}>2. Objectifs d'investissement et tolérance au risque</div>
              <div style={row}><span style={rowLabel}>Objectif principal</span><span style={rowValue}>{get(L.objectif, kyc!.objectif_investissement)}</span></div>
              <div style={row}><span style={rowLabel}>Horizon de placement</span><span style={rowValue}>{get(L.horizon, kyc!.horizon_placement)}</span></div>
              <div style={row}><span style={rowLabel}>Montant envisagé à investir</span><span style={rowValue}>{get(L.montant, kyc!.perte_acceptable)}</span></div>
              <div style={row}><span style={rowLabel}>Tolérance au risque</span><span style={rowValue}>{get(L.tolerance, String(kyc!.tolerance_risque))} ({kyc!.tolerance_risque}/5)</span></div>
              <div style={row}>
                <span style={rowLabel}>Score LCB-FT</span>
                <span style={{
                  ...rowValue,
                  padding: '2px 10px', borderRadius: '12px',
                  background: kyc!.kyc_note_risque >= 7 ? '#fde8e8' : kyc!.kyc_note_risque >= 4 ? '#fef9ee' : '#f0f5f0',
                  color: kyc!.kyc_note_risque >= 7 ? '#c0392b' : kyc!.kyc_note_risque >= 4 ? '#7a6a3a' : FOREST,
                }}>
                  {kyc!.kyc_note_risque}/10 — {kyc!.kyc_note_risque >= 7 ? 'Risque élevé' : kyc!.kyc_note_risque >= 4 ? 'Risque modéré' : 'Risque faible'}
                </span>
              </div>
            </div>

            {/* 3. Connaissance & Expérience MIF2 */}
            <div style={section}>
              <div style={sectionTitle}>3. Connaissance et expérience financière (MIF2)</div>
              <div style={row}><span style={rowLabel}>Formation financière</span><span style={rowValue}>{get(L.formation, mif2!.formation_financiere)}</span></div>
              <div style={row}><span style={rowLabel}>Expérience en investissement</span><span style={rowValue}>{get(L.experience, mif2!.experience_investissement)}</span></div>
              <div style={row}><span style={rowLabel}>Fréquence des opérations</span><span style={rowValue}>{get(L.frequence, mif2!.frequence_operations)}</span></div>
              <div style={row}><span style={rowLabel}>Montant moyen par opération</span><span style={rowValue}>{get(L.montant, mif2!.montant_moyen_operation)}</span></div>
              <div style={row}><span style={rowLabel}>Compréhension du risque</span><span style={rowValue}>{mif2!.comprehension_risque}/5</span></div>
              <div style={row}>
                <span style={rowLabel}>Produits déjà utilisés</span>
                <span style={{ ...rowValue, maxWidth: '300px' }}>
                  {mif2!.produits_utilises?.length > 0
                    ? mif2!.produits_utilises.map(p => get(L.produits, p)).join(', ')
                    : 'Aucun'}
                </span>
              </div>
              <div style={row}><span style={rowLabel}>Connaissance SCPI</span><span style={rowValue}>{get(L.connaissance, mif2!.connaissance_scpi)}</span></div>
              <div style={row}><span style={rowLabel}>Connaissance Assurance-vie</span><span style={rowValue}>{get(L.connaissance, mif2!.connaissance_assurance_vie)}</span></div>
            </div>

            {/* 4. Adéquation produits */}
            <div style={section}>
              <div style={sectionTitle}>4. Adéquation des produits proposés</div>
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '16px' }}>
                {produits.map(p => (
                  <div key={p.nom} style={{
                    border: `1px solid ${p.adequat ? '#c8dac8' : '#f5c6c6'}`,
                    borderRadius: '10px', padding: '18px 20px',
                    background: p.adequat ? '#f0f5f0' : '#fff5f5',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div>
                        <div style={{ fontWeight: 600, color: FOREST, fontSize: '14px' }}>{p.nom}</div>
                        <div style={{ fontSize: '12px', color: '#6b7f6a' }}>{p.sous_titre}</div>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', flexShrink: 0, marginLeft: '12px' }}>
                        <span style={{
                          padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600,
                          background: p.adequat ? FOREST : '#c0392b', color: 'white',
                        }}>
                          {p.adequat ? '✓ Adéquat' : '✗ Non adéquat'}
                        </span>
                        {p.halal && (
                          <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, background: GOLD, color: 'white' }}>
                            ☽ Halal
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ fontSize: '12px', color: p.adequat ? '#4a5e49' : '#c0392b', marginBottom: '8px' }}>
                      {p.raison}
                    </div>
                    <div style={{ display: 'flex', gap: '20px', fontSize: '11px', color: '#6b7f6a' }}>
                      <span>Risque : {p.risque}</span>
                      <span>Rendement cible : {p.rendement}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 5. Avertissements réglementaires */}
            <div style={{ ...section, borderBottom: 'none', paddingBottom: 0 }}>
              <div style={sectionTitle}>5. Avertissements et mentions légales</div>
              <div style={{ fontSize: '11px', color: '#6b7f6a', lineHeight: 1.7 }}>
                <p style={{ margin: '0 0 8px' }}>
                  Ce rapport d'adéquation a été établi conformément aux exigences de la Directive 2014/65/UE (MIF2) et de son règlement délégué (UE) 2017/565 sur la base des informations communiquées par le client. Il ne constitue pas un conseil en investissement au sens de l'article L541-1 du Code monétaire et financier.
                </p>
                <p style={{ margin: '0 0 8px' }}>
                  Les performances passées ne préjugent pas des performances futures. La valeur des investissements peut fluctuer à la hausse comme à la baisse. Le capital investi n'est pas garanti sauf mention contraire explicite.
                </p>
                <p style={{ margin: '0' }}>
                  AMANA PATRIMOINE — ORIAS n° {process.env.NEXT_PUBLIC_ORIAS_NUM ?? '25009552'} — Courtier en assurances et intermédiaire en opérations de banque. Sous le contrôle de l'ACPR et de l'AMF.
                </p>
              </div>
            </div>

            {/* Zone signature */}
            <div style={{ marginTop: '40px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
              {['Le Conseiller AMANA', `${kyc!.civilite} ${kyc!.prenom} ${kyc!.nom}`].map((name, i) => (
                <div key={i} style={{ borderTop: '1px solid #d4c9a8', paddingTop: '12px' }}>
                  <div style={{ fontSize: '11px', color: '#6b7f6a', marginBottom: '40px' }}>{name}</div>
                  <div style={{ fontSize: '11px', color: '#9aab9a' }}>Signature et date</div>
                </div>
              ))}
            </div>

          </div>
        </div>
      </div>
    </>
  )
}
