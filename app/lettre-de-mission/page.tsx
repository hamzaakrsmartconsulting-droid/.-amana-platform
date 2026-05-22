'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import FooterLegal from '@/components/footer-legal'

const FOREST = '#3a4d39'
const GOLD = '#c9a55a'
const CREAM = '#f8f4ec'

const VERSION = '1.0'
const DATE_DOC = '1er avril 2026'
const ORIAS_NUM = process.env.NEXT_PUBLIC_ORIAS_NUM ?? '00000000'

interface UserProfile {
  nom?: string
  prenom?: string
  email?: string
}

type LmYousignStatus = 'signed' | 'pending' | null

export default function LettreMissionPage() {
  const [accepted, setAccepted] = useState(false)
  const [alreadyAccepted, setAlreadyAccepted] = useState(false)
  const [acceptedAt, setAcceptedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [error, setError] = useState('')
  const [lmYousign, setLmYousign] = useState<LmYousignStatus>(null)
  const [lmSignedAt, setLmSignedAt] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      if (user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('nom, prenom')
          .eq('id', user.id)
          .maybeSingle()
        setProfile({ ...profileData, email: user.email })

        // Vérifier si une LM a déjà été signée via Yousign (via email_client)
        const { data: lmDoc } = await supabase
          .from('documents')
          .select('yousign_status, yousign_signed_at')
          .eq('type', 'lm')
          .in('yousign_status', ['signed', 'pending'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (lmDoc) {
          setLmYousign(lmDoc.yousign_status as LmYousignStatus)
          setLmSignedAt(lmDoc.yousign_signed_at ?? null)
        }

        // Consentement interne (trace complémentaire)
        const { data: consent } = await supabase
          .from('user_consents')
          .select('accepted_at')
          .eq('user_id', user.id)
          .eq('document_type', 'lettre_mission')
          .maybeSingle()
        if (consent) {
          setAlreadyAccepted(true)
          setAcceptedAt(consent.accepted_at)
        }
      }
      setLoading(false)
    }
    init()
  }, [])

  async function handleAccept() {
    if (!user) { setError('Vous devez être connecté.'); return }
    setSaving(true)
    setError('')
    const { error } = await supabase.from('user_consents').upsert({
      user_id: user.id,
      document_type: 'lettre_mission',
      version: VERSION,
      accepted_at: new Date().toISOString(),
    }, { onConflict: 'user_id,document_type' })
    if (error) {
      setError('Erreur lors de l\'enregistrement.')
      setSaving(false)
      return
    }
    setAlreadyAccepted(true)
    setAcceptedAt(new Date().toISOString())
    setSaving(false)
  }

  const clientName = profile
    ? `${profile.prenom ?? ''} ${profile.nom ?? ''}`.trim() || user?.email
    : user?.email ?? '[CLIENT]'

  return (
    <div style={{ minHeight: '100vh', background: CREAM, fontFamily: 'system-ui, sans-serif' }}>
      <div style={{
        background: '#2b3a2a',
        padding: '0 40px',
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <a href="/" style={{
          fontFamily: 'Georgia, serif',
          fontSize: '18px',
          color: CREAM,
          letterSpacing: '0.06em',
          textDecoration: 'none',
        }}>
          AMANA <span style={{ color: GOLD }}>PATRIMOINE</span>
        </a>
        {user && (
          <a href="/dashboard" style={{ fontSize: '13px', color: 'rgba(248,244,236,0.6)', textDecoration: 'none' }}>
            ← Mon espace
          </a>
        )}
      </div>

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '48px 24px 80px' }}>
        {/* En-tête officiel */}
        <div style={{
          background: 'white',
          border: `1px solid #d4c9a8`,
          borderRadius: '12px',
          padding: '32px 40px',
          marginBottom: '40px',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '32px',
            flexWrap: 'wrap',
            gap: '16px',
          }}>
            <div>
              <div style={{
                fontFamily: 'Georgia, serif',
                fontSize: '22px',
                color: FOREST,
                letterSpacing: '0.06em',
                marginBottom: '4px',
              }}>
                AMANA <span style={{ color: GOLD }}>PATRIMOINE</span>
              </div>
              <div style={{ fontSize: '12px', color: '#888', lineHeight: '1.6' }}>
                60 rue François 1er 75008 PARIS<br />
                ORIAS N° {ORIAS_NUM}<br />
                contact@amana-patrimoine.fr
              </div>
            </div>
            <div style={{ textAlign: 'right', fontSize: '13px', color: FOREST }}>
              <div style={{ fontWeight: 700, marginBottom: '4px' }}>LETTRE DE MISSION</div>
              <div style={{ color: '#888', fontSize: '12px' }}>
                Version {VERSION} — {DATE_DOC}<br />
                Ref. : AMANA/{new Date().getFullYear()}/LM-001
              </div>
            </div>
          </div>

          <div style={{ fontSize: '14px', color: FOREST, lineHeight: '1.7' }}>
            <strong>Adressée à :</strong> {clientName}
            {profile?.email && (
              <span style={{ color: '#888', marginLeft: '8px', fontSize: '13px' }}>({profile.email})</span>
            )}
          </div>
        </div>

        {/* Corps de la lettre de mission */}
        {[
          {
            titre: 'Article 1 — Objet de la mission',
            contenu: `Par la présente lettre de mission, AMANA Patrimoine s'engage à fournir à ${clientName} (ci-après "le Client") des services de conseil en gestion de patrimoine, dans le cadre réglementaire de ses statuts CIF, COA et COBSP/MIOBSP.

La mission comprend :
• Analyse complète de la situation patrimoniale, fiscale et familiale du Client
• Établissement d'un profil investisseur conforme à la directive MIF2
• Élaboration d'une stratégie patrimoniale personnalisée
• Sélection et présentation de solutions d'investissement halal adaptées
• Accompagnement dans la mise en œuvre des préconisations
• Suivi régulier et révision annuelle du portefeuille`,
          },
          {
            titre: 'Article 2 — Spécificité halal',
            contenu: `AMANA Patrimoine s'engage à sélectionner exclusivement des produits conformes aux principes de la finance islamique :
• Absence de riba (intérêt fixe ou variable garanti)
• Exclusion des secteurs haram (alcool, tabac, jeux, armement, pornographie, porc)
• Conformité aux avis des comités charaïques des sociétés de gestion partenaires
• Transparence sur la certification charaïque de chaque produit

La conformité charaïque des produits relève de la responsabilité des sociétés de gestion et est certifiée par leurs comités indépendants. AMANA Patrimoine s'assure de cette certification mais n'en est pas garante au sens juridique.`,
          },
          {
            titre: 'Article 3 — Honoraires',
            contenu: `La rémunération d'AMANA Patrimoine au titre du conseil (activité CIF) est la suivante :

Honoraires de conseil annuels :
• Formule Essentielle : [XXX] € HT / an — conseil et suivi annuel
• Formule Premium : [XXX] € HT / an — conseil, suivi trimestriel et révision de portefeuille
• Formule Sur Mesure : devis personnalisé pour patrimoine > [XXX XXX] €

Modalités de paiement : facturation annuelle, paiement par virement ou prélèvement SEPA.

Au titre du courtage (COA/COBSP), AMANA Patrimoine peut percevoir des commissions de la part des producteurs partenaires. Le montant ou le taux de ces commissions est communiqué dans le tableau des coûts ex-ante remis avant chaque souscription, conformément à l'article 24 de la directive MIF2.

Les tarifs sont exprimés hors TVA au taux en vigueur. Une facture est remise pour chaque paiement d'honoraires.`,
          },
          {
            titre: 'Article 4 — Obligations du Client',
            contenu: `Le Client s'engage à :
• Fournir des informations complètes, exactes et à jour sur sa situation patrimoniale, financière et familiale
• Compléter avec sincérité le questionnaire KYC et le questionnaire MIF2
• Informer AMANA Patrimoine de tout changement substantiel de situation dans les meilleurs délais
• Fournir les documents justificatifs demandés dans le cadre des obligations LCB-FT

Le Client reconnaît que la qualité des conseils dépend de l'exactitude des informations fournies.`,
          },
          {
            titre: 'Article 5 — Durée et résiliation',
            contenu: `La présente lettre de mission est conclue pour une durée indéterminée, à compter de la date d'acceptation électronique par le Client.

Elle peut être résiliée à tout moment :
• Par le Client : par email à contact@amana-patrimoine.fr, avec préavis de 30 jours
• Par AMANA Patrimoine : par email, avec préavis de 30 jours, sauf faute grave du Client

La résiliation met fin aux prestations futures mais n'affecte pas les souscriptions en cours.`,
          },
          {
            titre: 'Article 6 — Confidentialité',
            contenu: `AMANA Patrimoine s'engage à respecter la confidentialité de toutes les informations communiquées par le Client dans le cadre de la présente mission, conformément à sa Politique de Confidentialité (disponible sur /confidentialite) et aux obligations légales applicables.

Cette obligation de confidentialité ne s'applique pas aux déclarations obligatoires auprès des autorités de régulation (AMF, ACPR) ou de Tracfin dans le cadre des obligations LCB-FT.`,
          },
          {
            titre: 'Article 7 — Limitation de responsabilité',
            contenu: `Les conseils délivrés par AMANA Patrimoine sont fondés sur les informations fournies par le Client et les données disponibles au moment de la recommandation. AMANA Patrimoine ne saurait être tenue responsable des évolutions de marché postérieures à ses recommandations.

Tout investissement comporte un risque de perte en capital. Les performances passées ne préjugent pas des performances futures. AMANA Patrimoine n'offre aucune garantie de rendement.

La responsabilité d'AMANA Patrimoine est limitée au montant des honoraires versés au cours des 12 derniers mois.`,
          },
          {
            titre: 'Article 8 — Loi applicable',
            contenu: `La présente lettre de mission est régie par le droit français. Tout litige est soumis à la compétence des tribunaux du ressort du siège social d'AMANA Patrimoine, après tentative de résolution amiable et, le cas échéant, recours au médiateur de l'AMF.`,
          },
        ].map((section, i) => (
          <div key={i} style={{ marginBottom: '36px' }}>
            <h2 style={{
              fontSize: '15px',
              fontWeight: 700,
              color: FOREST,
              marginBottom: '12px',
              paddingBottom: '8px',
              borderBottom: `2px solid ${GOLD}`,
            }}>
              {section.titre}
            </h2>
            <div style={{
              fontSize: '14px',
              color: '#4a5a49',
              lineHeight: '1.9',
              whiteSpace: 'pre-line',
            }}>
              {section.contenu}
            </div>
          </div>
        ))}

        {/* Statut signature Yousign (source de vérité réglementaire) */}
        {!loading && lmYousign === 'signed' && (
          <div style={{
            marginTop: '48px',
            padding: '28px 32px',
            background: '#f0faf0',
            borderRadius: '12px',
            border: '2px solid #4caf50',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>✅</div>
            <p style={{ fontSize: '16px', fontWeight: 700, color: '#2e7d32', margin: '0 0 8px' }}>
              Lettre de mission signée électroniquement
            </p>
            <p style={{ fontSize: '13px', color: '#555', margin: 0 }}>
              Signée via Yousign{lmSignedAt ? ` le ${new Date(lmSignedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}` : ''}.
              Ce document constitue votre engagement contractuel avec AMANA Patrimoine.
            </p>
          </div>
        )}

        {!loading && lmYousign === 'pending' && (
          <div style={{
            marginTop: '48px',
            padding: '28px 32px',
            background: '#fff8e1',
            borderRadius: '12px',
            border: `2px solid ${GOLD}`,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>✉️</div>
            <p style={{ fontSize: '16px', fontWeight: 700, color: '#e65100', margin: '0 0 8px' }}>
              Signature électronique en attente
            </p>
            <p style={{ fontSize: '13px', color: '#555', margin: 0 }}>
              Vous avez reçu un e-mail de <strong>Yousign</strong> contenant le lien pour signer votre Lettre de mission.
              Veuillez consulter votre boîte e-mail et suivre le lien pour finaliser la signature.
            </p>
          </div>
        )}

        {/* Prise de connaissance (consentement interne complémentaire) */}
        {!loading && lmYousign === null && (
          <div style={{
            marginTop: '48px',
            padding: '28px 32px',
            background: 'white',
            borderRadius: '12px',
            border: `2px solid ${alreadyAccepted ? '#b8d4b8' : GOLD}`,
          }}>
            {alreadyAccepted ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '28px', marginBottom: '12px' }}>📋</div>
                <p style={{ fontSize: '15px', fontWeight: 700, color: FOREST, margin: '0 0 6px' }}>
                  Prise de connaissance enregistrée
                </p>
                <p style={{ fontSize: '13px', color: '#888', margin: '0 0 12px' }}>
                  Le {acceptedAt ? new Date(acceptedAt).toLocaleDateString('fr-FR', {
                    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                  }) : '—'} — Version {VERSION}
                </p>
                <div style={{
                  background: '#fff8e1',
                  border: `1px solid ${GOLD}`,
                  borderRadius: '8px',
                  padding: '12px 16px',
                  fontSize: '13px',
                  color: '#7a5800',
                  textAlign: 'left',
                }}>
                  <strong>Note :</strong> La signature électronique opposable de votre Lettre de mission sera effectuée
                  via <strong>Yousign</strong> après validation par votre conseiller AMANA (étape V3 du parcours réglementaire).
                  Vous recevrez un e-mail Yousign dès qu&apos;elle sera disponible.
                </div>
              </div>
            ) : user ? (
              <>
                <p style={{ fontSize: '14px', color: FOREST, marginBottom: '12px', lineHeight: '1.6', fontWeight: 600 }}>
                  Prise de connaissance de la lettre de mission
                </p>
                <div style={{
                  background: '#fff8e1',
                  border: `1px solid ${GOLD}`,
                  borderRadius: '8px',
                  padding: '12px 16px',
                  fontSize: '13px',
                  color: '#7a5800',
                  marginBottom: '20px',
                }}>
                  <strong>Information :</strong> Cette étape enregistre votre prise de connaissance du contenu.
                  La <strong>signature électronique opposable</strong> (Yousign) sera envoyée par votre conseiller
                  après validation interne de la Lettre de mission (parcours réglementaire — étape V3).
                </div>
                <p style={{ fontSize: '13px', color: '#666', marginBottom: '20px', lineHeight: '1.6' }}>
                  En cochant cette case, vous, <strong>{clientName}</strong>, confirmez avoir lu et pris connaissance
                  de la présente lettre de mission dans sa version {VERSION}.
                </p>
                <label style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  cursor: 'pointer',
                  marginBottom: '20px',
                }}>
                  <input
                    type="checkbox"
                    checked={accepted}
                    onChange={e => setAccepted(e.target.checked)}
                    style={{ width: '18px', height: '18px', marginTop: '2px', accentColor: FOREST, flexShrink: 0 }}
                  />
                  <span style={{ fontSize: '14px', color: '#4a5a49', lineHeight: '1.5' }}>
                    J&apos;ai lu et pris connaissance de la lettre de mission d&apos;AMANA Patrimoine
                    (version {VERSION} du {DATE_DOC}).
                  </span>
                </label>
                {error && (
                  <p style={{ fontSize: '13px', color: '#c0392b', marginBottom: '12px' }}>{error}</p>
                )}
                <button
                  onClick={handleAccept}
                  disabled={!accepted || saving}
                  style={{
                    padding: '12px 32px',
                    background: accepted && !saving ? FOREST : '#ccc',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '15px',
                    fontWeight: 600,
                    cursor: accepted && !saving ? 'pointer' : 'not-allowed',
                    fontFamily: 'system-ui, sans-serif',
                  }}
                >
                  {saving ? 'Enregistrement...' : 'Confirmer ma prise de connaissance'}
                </button>
              </>
            ) : (
              <p style={{ fontSize: '14px', color: FOREST, textAlign: 'center' }}>
                <a href="/auth" style={{ color: GOLD, fontWeight: 600 }}>Connectez-vous</a>
                {' '}pour prendre connaissance de la lettre de mission.
              </p>
            )}
          </div>
        )}
      </div>

      <FooterLegal />
    </div>
  )
}
