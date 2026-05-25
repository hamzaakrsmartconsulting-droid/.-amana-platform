'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import AmanaHeader, { UserAvatar } from '@/components/amana-header'
import { CALENDLY_BOOKING_URL } from '@/lib/calendly-url'

const FOREST = '#444b3f'
const GOLD   = '#c9a55a'
const CREAM  = '#f8f4ec'

type Status = 'loading' | 'complete' | 'incomplete'

interface StepCard {
  id:     string
  label:  string
  desc:   string
  href:   string
  cta:    string
  status: Status
  detail?: string
}

function StatusBadge({ status }: { status: Status }) {
  if (status === 'loading') return (
    <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: '#eee', color: '#999', fontWeight: 600, fontFamily: "'Inter', system-ui, sans-serif" }}>…</span>
  )
  if (status === 'complete') return (
    <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: '#e8f5e9', color: '#2e7d32', fontWeight: 700, fontFamily: "'Inter', system-ui, sans-serif", letterSpacing: '0.03em' }}>✓ Complété</span>
  )
  return (
    <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: '#fff8e1', color: '#b35900', fontWeight: 700, fontFamily: "'Inter', system-ui, sans-serif", letterSpacing: '0.03em' }}>À compléter</span>
  )
}

function OnboardingCard({ card }: { card: StepCard }) {
  const isLocked = card.status === 'incomplete' && !card.href
  return (
    <div style={{
      background: 'white', borderRadius: 14, padding: '22px 24px',
      border: `1px solid ${card.status === 'incomplete' && card.cta ? '#e8d8a0' : '#e8e0d0'}`,
      boxShadow: card.status === 'incomplete' && card.cta
        ? '0 2px 16px rgba(201,165,90,0.12)'
        : '0 1px 4px rgba(68,75,63,0.05)',
      display: 'flex', flexDirection: 'column', gap: 12,
      opacity: isLocked ? 0.55 : 1,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <h3 style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: 17, color: FOREST, margin: 0, fontWeight: 500,
        }}>
          {card.label}
        </h3>
        <StatusBadge status={card.status} />
      </div>
      <p style={{ fontSize: 13, color: '#7a8a79', margin: 0, lineHeight: 1.65, fontFamily: "'Inter', system-ui, sans-serif" }}>
        {card.desc}
      </p>
      {card.detail && card.status === 'complete' && (
        <div style={{
          fontSize: 12, color: '#5a6354', fontWeight: 600,
          padding: '6px 12px', background: '#f0f6f0', borderRadius: 8,
          fontFamily: "'Inter', system-ui, sans-serif",
          display: 'inline-block', width: 'fit-content',
        }}>
          {card.detail}
        </div>
      )}
      {!isLocked && (
        <a
          href={card.href}
          style={{
            display: 'inline-block', padding: '9px 20px',
            background: card.status === 'complete' ? 'transparent' : FOREST,
            color: card.status === 'complete' ? FOREST : 'white',
            border: `1.5px solid ${card.status === 'complete' ? '#c5b8a0' : FOREST}`,
            borderRadius: 8, fontSize: 13, fontWeight: 600,
            textDecoration: 'none', alignSelf: 'flex-start',
            fontFamily: "'Inter', system-ui, sans-serif",
            letterSpacing: '0.03em',
            transition: 'all 0.15s',
          }}
        >
          {card.status === 'complete' ? 'Consulter' : card.cta}
        </a>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser]             = useState<{ email: string; prenom?: string; nom?: string } | null>(null)
  const [cards, setCards]           = useState<StepCard[]>([])
  const [allDone, setAllDone]       = useState(false)
  const [loading, setLoading]       = useState(true)
  const [projects, setProjects]     = useState<{ id: string; type: string; montant: number; statut: string }[]>([])
  const [profileSections, setProfileSections] = useState(0)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user: u } } = await supabase.auth.getUser()
      if (!u) { router.push('/auth'); return }

      const meta = u.user_metadata ?? {}
      setUser({ email: u.email ?? '', prenom: meta.prenom, nom: meta.nom })

      const [kycRes, mif2Res, projectsRes] = await Promise.all([
        supabase.from('kyc').select('prenom,nom,date_naissance,ville_naissance,telephone,adresse,code_postal,ville,situation_familiale,situation_pro,revenu_foyer,patrimoine_net,objectif_investissement,horizon_placement,titulaire_compte,nom_banque,iban,doc_identite_url,doc_justif_url,doc_avis_imposition_url').eq('user_id', u.id).maybeSingle(),
        supabase.from('mif2').select('profil_mif2,score_mif2').eq('user_id', u.id).maybeSingle(),
        supabase.from('projects').select('id,type,montant,statut').eq('user_id', u.id).order('created_at', { ascending: false }).limit(5),
      ])

      const kyc         = kycRes.data
      const kycDone     = !!kyc
      const mif2Done    = !!mif2Res.data
      const mif2Data    = mif2Res.data

      // Calcul de la progression des sections du profil
      const profileSections = [
        !!(kyc?.prenom && kyc?.nom && kyc?.date_naissance && kyc?.ville_naissance),
        !!(kyc?.telephone && kyc?.adresse && kyc?.code_postal && kyc?.ville),
        !!(kyc?.situation_familiale && kyc?.situation_pro),
        !!(kyc?.revenu_foyer && kyc?.patrimoine_net),
        !!(kyc?.objectif_investissement && kyc?.horizon_placement),
        !!(kyc?.titulaire_compte && kyc?.nom_banque),
        !!(kyc?.doc_identite_url && kyc?.doc_justif_url && kyc?.doc_avis_imposition_url),
      ]
      const profileSectionsCompleted = profileSections.filter(Boolean).length

      setProjects(projectsRes.data ?? [])
      setAllDone(kycDone && mif2Done)
      setProfileSections(profileSectionsCompleted)

      setCards([
        {
          id: 'kyc',
          label: kycDone ? 'Mon profil patrimonial' : 'Compléter mon profil',
          status: profileSectionsCompleted === 7 ? 'complete' : kycDone ? 'incomplete' : 'incomplete',
          desc: kycDone
            ? `${profileSectionsCompleted}/7 sections renseignées — état civil, patrimoine, documents justificatifs.`
            : 'Remplissez votre profil complet : identité, coordonnées, situation, patrimoine, documents.',
          href: '/profile',
          cta: 'Compléter mon profil',
          detail: kycDone && profileSectionsCompleted === 7 ? 'Profil 100% complété' : undefined,
        },
        {
          id: 'mif2', label: 'Profilage investisseur MIF2', status: mif2Done ? 'complete' : 'incomplete',
          desc: 'Questionnaire réglementaire pour évaluer votre profil risque et vos objectifs financiers.',
          href: '/mif2', cta: 'Compléter le MIF2',
          detail: mif2Data ? `Profil ${mif2Data.profil_mif2 ?? ''} · Score ${mif2Data.score_mif2 ?? '—'}` : undefined,
        },
      ])
      setLoading(false)
    }
    load()
  }, [router])

  const prenom   = user?.prenom || user?.nom || user?.email?.split('@')[0] || 'vous'
  const initials = ((user?.prenom?.[0] ?? '') + (user?.nom?.[0] ?? '')).toUpperCase() || 'U'

  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const todayLabel = today.charAt(0).toUpperCase() + today.slice(1)

  const totalInvested = projects.reduce((sum, p) => sum + (p.montant || 0), 0)

  const TYPE_LABEL: Record<string, string> = {
    assurance_vie: 'Assurance-vie', scpi: 'SCPI', cto: 'CTO',
    retraite: 'PER', pee: 'PEE/PERCO', don: 'Don/Waqf', immobilier: 'Immobilier',
  }

  return (
    <div style={{ minHeight: '100vh', background: CREAM, fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* Header */}
      <AmanaHeader showLogout={true}
        rightContent={<UserAvatar initials={initials} />}
      />

      {/* Greeting hero */}
      <div style={{ background: FOREST, padding: '28px 24px 36px' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <div style={{
            fontSize: 11, color: 'rgba(255,255,255,0.38)',
            textTransform: 'uppercase', letterSpacing: '0.12em',
            fontWeight: 500, marginBottom: 6,
          }}>
            {todayLabel}
          </div>
          <h1 style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: 30, fontWeight: 400, color: 'white',
            margin: 0, lineHeight: 1.15,
          }}>
            {loading ? 'Chargement…' : `Bonjour${prenom !== 'vous' ? `, ${prenom}` : ''}`}
          </h1>
          {allDone && (
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 6 }}>
              Votre espace patrimonial est à jour.
            </p>
          )}
          {!allDone && !loading && (
            <>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 6, marginBottom: 14 }}>
                Finalisez votre dossier pour accéder à nos solutions d'investissement.
              </p>
              <a href="/profile" style={{ textDecoration: 'none' }}>
                <div style={{
                  background: 'rgba(255,255,255,0.07)', borderRadius: 10,
                  padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 14,
                  border: '1px solid rgba(201,165,90,0.2)',
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 5, fontFamily: "'Inter', system-ui, sans-serif" }}>
                      Mon profil patrimonial
                    </div>
                    <div style={{ height: 5, background: 'rgba(255,255,255,0.1)', borderRadius: 3 }}>
                      <div style={{ height: '100%', background: GOLD, borderRadius: 3, width: `${(profileSections / 7) * 100}%`, transition: 'width 0.4s' }} />
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: GOLD, fontWeight: 700, whiteSpace: 'nowrap', fontFamily: "'Inter', system-ui, sans-serif" }}>
                    {profileSections}/7
                  </div>
                  <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.4)' }}>›</div>
                </div>
              </a>
            </>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '0 16px 80px' }}>

        {/* Wealth summary card */}
        <div style={{
          background: `linear-gradient(135deg, #353b32 0%, #5a6354 100%)`,
          borderRadius: 18, padding: '24px 28px',
          margin: '-20px 0 24px',
          border: '1px solid rgba(201,165,90,0.2)',
          boxShadow: '0 8px 32px rgba(68,75,63,0.18)',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Gold orb */}
          <div style={{
            position: 'absolute', right: -32, bottom: -32,
            width: 120, height: 120, borderRadius: '50%',
            background: `rgba(201,165,90,0.07)`,
          }}/>
          <div style={{
            fontSize: 10, color: 'rgba(201,165,90,0.6)',
            textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 600, marginBottom: 6,
          }}>
            Patrimoine en gestion
          </div>
          <div style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: 42, fontWeight: 500, color: 'white',
            lineHeight: 1, marginBottom: 4,
          }}>
            {totalInvested > 0 ? `${totalInvested.toLocaleString('fr-FR')} €` : '0 €'}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
            {projects.length === 0
              ? 'Aucun investissement actif'
              : `${projects.length} investissement${projects.length > 1 ? 's' : ''} · Valeur indicative`}
          </div>

          {allDone && (
            <a
              href="/catalogue"
              style={{
                display: 'inline-block', marginTop: 20,
                padding: '9px 20px',
                background: GOLD, color: 'white',
                borderRadius: 8, fontSize: 13, fontWeight: 600,
                textDecoration: 'none', letterSpacing: '0.03em',
              }}
            >
              {projects.length === 0 ? 'Découvrir le catalogue →' : 'Voir le catalogue →'}
            </a>
          )}
        </div>

        {/* Active projects */}
        {projects.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <h2 style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: 20, color: FOREST, fontWeight: 500,
              margin: '0 0 16px',
            }}>
              Mes investissements
            </h2>
            {projects.map(p => (
              <div key={p.id} style={{
                background: 'white', borderRadius: 12, padding: '16px 20px',
                border: '1px solid #e8e0d0', marginBottom: 10,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div>
                  <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 16, color: FOREST }}>
                    {TYPE_LABEL[p.type] ?? p.type}
                  </div>
                  <div style={{ fontSize: 12, color: '#8a9a89', marginTop: 2 }}>
                    {p.montant.toLocaleString('fr-FR')} €
                  </div>
                </div>
                <span style={{
                  fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 700,
                  background: p.statut === 'soumis' ? '#fff8e1' : p.statut === 'signé' ? '#e8f5e9' : '#f3e8ff',
                  color: p.statut === 'soumis' ? '#b35900' : p.statut === 'signé' ? '#2e7d32' : '#6a1a8a',
                  letterSpacing: '0.04em',
                }}>
                  {p.statut.charAt(0).toUpperCase() + p.statut.slice(1)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Onboarding section */}
        {!allDone && (
          <>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              marginBottom: 20,
            }}>
              <h2 style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: 22, color: FOREST, fontWeight: 500,
                margin: 0,
              }}>
                Compléter votre dossier
              </h2>
              <div style={{
                flex: 1, height: 4, background: '#e8e0d0', borderRadius: 2, overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%', borderRadius: 2,
                  background: GOLD,
                  width: `${(cards.filter(c => c.status === 'complete').length / 2) * 100}%`,
                  transition: 'width 0.4s ease',
                }}/>
              </div>
              <span style={{ fontSize: 12, color: '#8a9a89', whiteSpace: 'nowrap', fontWeight: 500 }}>
                {cards.filter(c => c.status === 'complete').length}/2
              </span>
            </div>

            <div className="dashboard-steps-grid" style={{ marginBottom: 32 }}>
              {cards.map(card => <OnboardingCard key={card.id} card={card} />)}
            </div>
          </>
        )}

        {/* All done */}
        {allDone && projects.length === 0 && (
          <div style={{
            background: 'white', borderRadius: 16, padding: '32px 28px',
            border: '1px solid #d4e8d4', textAlign: 'center',
            boxShadow: '0 2px 12px rgba(76,175,80,0.08)',
          }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🎉</div>
            <h2 style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: 22, color: FOREST, fontWeight: 500, margin: '0 0 10px',
            }}>
              Dossier complet
            </h2>
            <p style={{ fontSize: 14, color: '#6a7a69', margin: '0 0 24px', lineHeight: 1.65 }}>
              Votre profil est finalisé. Explorez notre sélection de produits d'investissement conformes aux principes islamiques.
            </p>
            <a
              href="/catalogue"
              style={{
                display: 'inline-block', padding: '13px 32px',
                background: FOREST, color: 'white',
                borderRadius: 10, fontSize: 14, fontWeight: 600,
                textDecoration: 'none', letterSpacing: '0.04em',
              }}
            >
              Explorer le catalogue →
            </a>
          </div>
        )}

        {/* Conseiller CTA */}
        <div style={{
          marginTop: 8,
          background: `linear-gradient(135deg, ${FOREST} 0%, #5a6354 100%)`,
          borderRadius: 14, padding: '20px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
        }}>
          <div>
            <div style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: 18, color: 'white', fontWeight: 500, marginBottom: 4,
            }}>
              Besoin d'un conseil ?
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
              Votre conseiller AMANA vous répond
            </div>
          </div>
          <a
            href={CALENDLY_BOOKING_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-block', padding: '10px 18px',
              background: GOLD, color: 'white',
              borderRadius: 8, fontSize: 13, fontWeight: 600,
              textDecoration: 'none', whiteSpace: 'nowrap',
              letterSpacing: '0.03em',
            }}
          >
            Contacter →
          </a>
        </div>

      </div>
    </div>
  )
}
