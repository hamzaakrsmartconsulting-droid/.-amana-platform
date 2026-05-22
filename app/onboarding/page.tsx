'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import AmanaHeader from '@/components/amana-header'

const FOREST = '#3a4d39'
const GOLD   = '#c9a55a'
const CREAM  = '#f8f4ec'

interface Step {
  id:    string
  label: string
  desc:  string
  href:  string
  cta:   string
  done:  boolean
  time:  string
}

export default function OnboardingPage() {
  const router = useRouter()
  const [steps,   setSteps]   = useState<Step[]>([])
  const [prenom,  setPrenom]  = useState('')
  const [loading, setLoading] = useState(true)
  const [allDone, setAllDone] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }

      const meta = user.user_metadata ?? {}
      setPrenom(meta.prenom ?? meta.nom ?? '')
      const offreAmana: string = (meta.offre_amana as string) ?? ''

      const [kycRes, mif2Res, consentsRes, docsRemisRes] = await Promise.all([
        supabase.from('kyc').select('id').eq('user_id', user.id).maybeSingle(),
        supabase.from('mif2').select('id').eq('user_id', user.id).maybeSingle(),
        supabase.from('user_consents').select('document_type').eq('user_id', user.id).in('document_type', ['der', 'lettre_mission']),
        supabase.from('documents_remis').select('id').eq('user_id', user.id).eq('document_type', 'der_generique').maybeSingle(),
      ])

      const consents = new Set((consentsRes.data ?? []).map(r => r.document_type))
      const kycDone    = !!kycRes.data
      const mif2Done   = !!mif2Res.data
      let derDone      = consents.has('der')
      const lettreDone = consents.has('lettre_mission')

      // Preuve formelle de remise du DER (article L.541-8-1 CMF)
      // Enregistrée dans documents_remis dès la première visite post magic-link.
      const derDejaRemis = !!docsRemisRes.data
      if (!derDejaRemis && meta.source === 'funnel_onboarding') {
        // Table documents_remis (traçabilité réglementaire)
        await supabase.from('documents_remis').insert({
          user_id: user.id,
          document_type: 'der_generique',
          source: 'funnel_onboarding_email_click',
          remis_at: new Date().toISOString(),
          metadata: { offre_amana: offreAmana, ua: navigator.userAgent.slice(0, 200) },
        })
        // user_consents (compatibilité legacy)
        const { error: consentErr } = await supabase
          .from('user_consents')
          .upsert(
            {
              user_id: user.id,
              document_type: 'der',
              version: '1.0',
              accepted_at: new Date().toISOString(),
              source: 'funnel_onboarding_email_click',
            },
            { onConflict: 'user_id,document_type' }
          )
        if (!consentErr) derDone = true

        // Redirect par offre (spec étape 2) :
        // Mass → /kyc | Patrimoniale → /onboard/result/patrimoniale | Premium → /onboard/result/premium
        if (offreAmana === 'mass') {
          router.push('/kyc')
          return
        }
        if (offreAmana === 'patrimoniale' || offreAmana === 'premium') {
          router.push(`/onboard/result/${offreAmana}`)
          return
        }
      }

      const s: Step[] = [
        {
          id: 'kyc', label: 'Vérification d\'identité',
          desc: 'Formulaire KYC — état civil, situation professionnelle, patrimoine net et documents justificatifs. Conforme LCB-FT.',
          href: '/kyc', cta: 'Compléter le KYC', done: kycDone, time: '~10 min',
        },
        {
          id: 'mif2', label: 'Profilage investisseur MIF2',
          desc: 'Questionnaire réglementaire pour évaluer votre expérience financière, vos objectifs et votre tolérance au risque.',
          href: '/mif2', cta: 'Répondre au questionnaire', done: mif2Done, time: '~5 min',
        },
        {
          id: 'der', label: 'Document d\'entrée en relation',
          desc: 'Présentation d\'AMANA Patrimoine, de ses services, de sa politique tarifaire et de ses partenaires.',
          href: '/der', cta: 'Lire et accepter', done: derDone, time: '~3 min',
        },
        {
          id: 'lettre', label: 'Lettre de mission',
          desc: 'Convention d\'honoraires personnalisée définissant la nature et le coût de l\'accompagnement AMANA.',
          href: '/lettre-de-mission', cta: 'Signer la lettre', done: lettreDone, time: '~3 min',
        },
      ]

      setSteps(s)
      const done = kycDone && mif2Done && derDone && lettreDone
      setAllDone(done)
      if (done) { router.push('/dashboard'); return }
      setLoading(false)
    }
    load()
  }, [router])

  const doneCount  = steps.filter(s => s.done).length
  const currentIdx = steps.findIndex(s => !s.done)
  const currentStep = steps[currentIdx] ?? null

  const remainingTime = steps.filter(s => !s.done)
    .reduce((acc, s) => acc + parseInt(s.time), 0)

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: CREAM, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', border: `3px solid ${GOLD}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }}/>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          <div style={{ fontSize: 13, color: '#7a8a79', fontFamily: "'Inter', system-ui, sans-serif" }}>Chargement…</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: CREAM, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <AmanaHeader />

      {/* Hero */}
      <div style={{ background: FOREST, padding: '28px 24px 0' }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <div style={{
            fontSize: 11, color: 'rgba(255,255,255,0.35)',
            textTransform: 'uppercase', letterSpacing: '0.12em',
            fontWeight: 500, marginBottom: 6,
          }}>
            Activation du compte
          </div>
          <h1 style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: 28, fontWeight: 400, color: 'white',
            margin: '0 0 4px',
          }}>
            {prenom ? `Bienvenue, ${prenom}` : 'Finalisez votre inscription'}
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.42)', margin: '0 0 24px', lineHeight: 1.6 }}>
            4 étapes réglementaires · Durée estimée {remainingTime} min
          </p>

          {/* Progress bar */}
          <div style={{
            height: 4, background: 'rgba(255,255,255,0.1)',
            borderRadius: 2, overflow: 'hidden', marginBottom: -2,
          }}>
            <div style={{
              height: '100%', borderRadius: 2,
              background: GOLD,
              width: `${(doneCount / 4) * 100}%`,
              transition: 'width 0.5s ease',
            }}/>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '28px 16px 72px' }}>

        {/* Stepper */}
        <div style={{
          display: 'flex', alignItems: 'flex-start',
          marginBottom: 32, gap: 0, padding: '0 4px',
        }}>
          {steps.map((s, i) => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : 'none' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 800,
                  background: s.done ? '#4caf50' : i === currentIdx ? FOREST : '#ddd5c8',
                  color: s.done || i === currentIdx ? 'white' : '#8a9a89',
                  boxShadow: i === currentIdx ? `0 0 0 4px rgba(58,77,57,0.15)` : 'none',
                  transition: 'all 0.2s',
                }}>
                  {s.done ? '✓' : i + 1}
                </div>
                <div style={{
                  fontSize: 10, whiteSpace: 'nowrap',
                  color: i === currentIdx ? FOREST : s.done ? '#4caf50' : '#9a9a9a',
                  fontWeight: i === currentIdx ? 700 : s.done ? 600 : 400,
                  letterSpacing: '0.03em',
                }}>
                  {s.label.split(' ')[0]}
                </div>
              </div>
              {i < steps.length - 1 && (
                <div style={{
                  flex: 1, height: 2, margin: '-10px 6px 0',
                  background: s.done ? '#4caf50' : '#e8e0d0',
                  transition: 'background 0.3s',
                }}/>
              )}
            </div>
          ))}
        </div>

        {/* Current step — hero card */}
        {currentStep && (
          <div style={{
            background: 'white', borderRadius: 18, padding: '32px 28px',
            border: `1px solid #ddd5c8`,
            boxShadow: '0 4px 24px rgba(42,56,41,0.08)',
            marginBottom: 20,
          }}>
            <div style={{
              fontSize: 10, color: GOLD, textTransform: 'uppercase',
              letterSpacing: '0.15em', fontWeight: 700, marginBottom: 12,
            }}>
              ÉTAPE {currentIdx + 1} / 4 · {currentStep.time}
            </div>
            <h2 style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: 26, color: FOREST, fontWeight: 500,
              margin: '0 0 12px',
            }}>
              {currentStep.label}
            </h2>
            <p style={{
              fontSize: 14, color: '#6a7a69',
              margin: '0 0 28px', lineHeight: 1.7,
            }}>
              {currentStep.desc}
            </p>
            <a
              href={currentStep.href}
              style={{
                display: 'inline-block', padding: '13px 28px',
                background: FOREST, color: 'white',
                borderRadius: 10, fontSize: 14, fontWeight: 600,
                textDecoration: 'none', letterSpacing: '0.04em',
              }}
            >
              {currentStep.cta} →
            </a>
          </div>
        )}

        {/* Remaining steps list */}
        {steps.filter(s => !s.done && s !== currentStep).length > 0 && (
          <div>
            <div style={{
              fontSize: 11, color: '#8a9a89', textTransform: 'uppercase',
              letterSpacing: '0.1em', fontWeight: 600, marginBottom: 12,
            }}>
              Étapes suivantes
            </div>
            {steps.filter(s => !s.done && s !== currentStep).map((s, i) => (
              <div key={s.id} style={{
                background: 'white', borderRadius: 12, padding: '16px 20px',
                border: '1px solid #e8e0d0', marginBottom: 10, opacity: 0.65,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div>
                  <div style={{
                    fontFamily: "'Cormorant Garamond', Georgia, serif",
                    fontSize: 16, color: FOREST, fontWeight: 500,
                  }}>
                    {s.label}
                  </div>
                  <div style={{ fontSize: 12, color: '#8a9a89', marginTop: 2 }}>{s.time}</div>
                </div>
                <span style={{
                  fontSize: 11, padding: '3px 10px', borderRadius: 20,
                  background: '#f0f0f0', color: '#9a9a9a', fontWeight: 600,
                }}>
                  Bloqué
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Completed steps */}
        {steps.filter(s => s.done).length > 0 && (
          <div style={{ marginTop: 24 }}>
            <div style={{
              fontSize: 11, color: '#4caf50', textTransform: 'uppercase',
              letterSpacing: '0.1em', fontWeight: 600, marginBottom: 12,
            }}>
              ✓ Complétées
            </div>
            {steps.filter(s => s.done).map(s => (
              <div key={s.id} style={{
                background: '#f8fef8', borderRadius: 10, padding: '12px 18px',
                border: '1px solid #d4e8d4', marginBottom: 8,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div style={{
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontSize: 15, color: '#4a5a49', fontWeight: 500,
                }}>
                  {s.label}
                </div>
                <span style={{
                  fontSize: 11, padding: '3px 10px', borderRadius: 20,
                  background: '#e8f5e9', color: '#2e7d32', fontWeight: 700,
                }}>
                  ✓
                </span>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}
