'use client'

import type { CSSProperties } from 'react'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import AmanaHeader from '@/components/amana-header'

const FOREST = '#444b3f'
const GOLD   = '#c9a55a'
const CREAM  = '#f8f4ec'

const TOTAL_STEPS = 7

type Mif2State = {
  step:                     number
  formation_financiere:     string
  experience_investissement: string
  produits_utilises:        string[]
  frequence_operations:     string
  montant_moyen_operation:  string
  comprehension_risque:     number
  connaissance_scpi:        string
  connaissance_assurance_vie: string
}

const init: Mif2State = {
  step: 1,
  formation_financiere:     '',
  experience_investissement: '',
  produits_utilises:        [],
  frequence_operations:     '',
  montant_moyen_operation:  '',
  comprehension_risque:     3,
  connaissance_scpi:        '',
  connaissance_assurance_vie: '',
}

// ── Score MIF2 ────────────────────────────────────────────────────────────────

function calculerScoreMif2(s: Mif2State): { score: number; profil: string } {
  let score = 0
  const formationScore: Record<string, number>    = { aucune: 0, generale: 1, specialisee: 2, professionnel: 3 }
  const experienceScore: Record<string, number>   = { aucune: 0, limitee: 1, moderee: 2, etendue: 3 }
  const frequenceScore: Record<string, number>    = { jamais: 0, rarement: 1, regulierement: 2, frequemment: 3 }
  const montantScore: Record<string, number>      = { lt5k: 0, '5-25k': 1, '25-100k': 2, gt100k: 3 }
  const connaissanceScore: Record<string, number> = { aucune: 0, entendu: 1, comprend: 2, maitrise: 3 }

  score += formationScore[s.formation_financiere] ?? 0
  score += experienceScore[s.experience_investissement] ?? 0
  score += Math.min(3, s.produits_utilises.length)
  score += frequenceScore[s.frequence_operations] ?? 0
  score += montantScore[s.montant_moyen_operation] ?? 0
  score += s.comprehension_risque - 1
  score += connaissanceScore[s.connaissance_scpi] ?? 0
  score += connaissanceScore[s.connaissance_assurance_vie] ?? 0

  let profil = 'debutant'
  if (score >= 10) profil = 'averti'
  if (score >= 18) profil = 'expert'

  return { score, profil }
}

// ── Styles ────────────────────────────────────────────────────────────────────

const card: CSSProperties = {
  background: 'white', borderRadius: 16, padding: 48,
  maxWidth: 640, width: '100%',
  boxShadow: '0 4px 40px rgba(68,75,63,0.10)',
}

const btnPrimary: CSSProperties = {
  padding: '13px 32px', background: FOREST, color: 'white',
  border: 'none', borderRadius: 8, fontSize: 15,
  cursor: 'pointer', fontWeight: 600,
  fontFamily: "'Inter', system-ui, sans-serif",
  letterSpacing: '0.04em',
}

const btnSecondary: CSSProperties = {
  padding: '13px 32px', background: 'transparent', color: FOREST,
  border: '1.5px solid #ddd5c8', borderRadius: 8,
  fontSize: 15, cursor: 'pointer', fontWeight: 500,
  fontFamily: "'Inter', system-ui, sans-serif",
}

const alertBox: CSSProperties = {
  background: '#fef9ee', border: '1px solid #e8dfc8', borderRadius: 8,
  padding: '12px 14px', fontSize: 12, color: '#7a6a3a', marginTop: 8, lineHeight: 1.6,
  fontFamily: "'Inter', system-ui, sans-serif",
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function StepBadge({ step, label }: { step: number; label: string }) {
  return (
    <div style={{ fontSize: 10, color: GOLD, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10, fontFamily: "'Inter', system-ui, sans-serif" }}>
      Question {step} / {TOTAL_STEPS} — {label}
    </div>
  )
}

function H({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 26, color: FOREST, fontWeight: 400, margin: '0 0 8px', lineHeight: 1.2 }}>
      {children}
    </h2>
  )
}

function Nav({ onBack, onNext, nextLabel = 'Continuer', disabled = false, saving = false }:
  { onBack?: () => void; onNext: () => void; nextLabel?: string; disabled?: boolean; saving?: boolean }
) {
  return (
    <div style={{ display: 'flex', justifyContent: onBack ? 'space-between' : 'flex-end', marginTop: 36 }}>
      {onBack && <button style={btnSecondary} onClick={onBack}>← Retour</button>}
      <button
        style={{ ...btnPrimary, opacity: (disabled || saving) ? 0.6 : 1 }}
        onClick={onNext}
        disabled={disabled || saving}
      >
        {saving ? 'Enregistrement…' : nextLabel}
      </button>
    </div>
  )
}

function RadioCards({ options, value, onChange }: {
  options: { value: string; label: string; desc?: string }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          style={{
            padding: '14px 18px', borderRadius: 10, fontSize: 14,
            cursor: 'pointer', textAlign: 'left',
            border: value === o.value ? `2px solid ${FOREST}` : '1.5px solid #ddd5c8',
            background: value === o.value ? 'rgba(68,75,63,0.05)' : 'white',
            color: FOREST, transition: 'all 0.12s',
            fontFamily: "'Inter', system-ui, sans-serif",
          }}
        >
          <div style={{ fontWeight: value === o.value ? 600 : 400 }}>{o.label}</div>
          {o.desc && <div style={{ fontSize: 12, color: '#8a9a89', marginTop: 2 }}>{o.desc}</div>}
        </button>
      ))}
    </div>
  )
}

function CheckboxGrid({ options, value, onChange }: {
  options: { value: string; label: string }[]
  value: string[]
  onChange: (v: string[]) => void
}) {
  const toggle = (v: string) =>
    value.includes(v) ? onChange(value.filter(x => x !== v)) : onChange([...value, v])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          onClick={() => toggle(o.value)}
          style={{
            padding: '12px 16px', borderRadius: 10, fontSize: 14,
            cursor: 'pointer', textAlign: 'left',
            border: value.includes(o.value) ? `2px solid ${FOREST}` : '1.5px solid #ddd5c8',
            background: value.includes(o.value) ? 'rgba(68,75,63,0.05)' : 'white',
            color: FOREST, display: 'flex', alignItems: 'center', gap: 12,
            fontFamily: "'Inter', system-ui, sans-serif", transition: 'all 0.12s',
          }}
        >
          <span style={{
            width: 18, height: 18, borderRadius: 4, flexShrink: 0,
            border: value.includes(o.value) ? `2px solid ${FOREST}` : '1.5px solid #ddd5c8',
            background: value.includes(o.value) ? FOREST : 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontSize: 11, fontWeight: 700,
          }}>
            {value.includes(o.value) ? '✓' : ''}
          </span>
          {o.label}
        </button>
      ))}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Mif2Page() {
  const router = useRouter()
  const [s, setS]           = useState<Mif2State>(init)
  const [saving, setSaving] = useState(false)
  const [done,   setDone]   = useState(false)
  const [error,  setError]  = useState('')

  const next = () => setS(p => ({ ...p, step: p.step + 1 }))
  const back = () => setS(p => ({ ...p, step: p.step - 1 }))
  const setVal = <K extends keyof Mif2State>(k: K, v: Mif2State[K]) =>
    setS(p => ({ ...p, [k]: v }))

  const handleSubmit = async () => {
    setSaving(true); setError('')
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }

      const { score, profil } = calculerScoreMif2(s)

      const { error: e } = await supabase.from('mif2').upsert({
        user_id:                   user.id,
        formation_financiere:      s.formation_financiere,
        experience_investissement: s.experience_investissement,
        produits_utilises:         s.produits_utilises,
        frequence_operations:      s.frequence_operations,
        montant_moyen_operation:   s.montant_moyen_operation,
        comprehension_risque:      s.comprehension_risque,
        connaissance_scpi:         s.connaissance_scpi,
        connaissance_assurance_vie: s.connaissance_assurance_vie,
        score_mif2:  score,
        profil_mif2: profil,
        statut:      'soumis',
        updated_at:  new Date().toISOString(),
      }, { onConflict: 'user_id' })

      if (e) throw e
      setDone(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la soumission')
    } finally {
      setSaving(false)
    }
  }

  // ── Done ─────────────────────────────────────────────────────────────────────

  if (done) {
    const { score, profil } = calculerScoreMif2(s)
    const PROFIL_LABEL: Record<string, { label: string; color: string; desc: string }> = {
      debutant: { label: 'Débutant', color: '#4a7a9b', desc: 'Nos conseils seront axés sur la pédagogie et les produits accessibles.' },
      averti:   { label: 'Averti',   color: FOREST,    desc: "Vous avez accès à l'ensemble de notre gamme de produits." },
      expert:   { label: 'Expert',   color: GOLD,      desc: 'Profil confirmé — vous pouvez accéder aux stratégies avancées.' },
    }
    const p = PROFIL_LABEL[profil]
    return (
      <div style={{ minHeight: '100vh', background: CREAM }}>
        <AmanaHeader backHref="/dashboard" backLabel="Dashboard" />
        <div style={{ display: 'flex', justifyContent: 'center', padding: '72px 24px' }}>
          <div style={{ ...card, textAlign: 'center', maxWidth: 480 }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'rgba(68,75,63,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 24px', fontSize: 28, color: FOREST,
            }}>✓</div>
            <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 30, color: FOREST, fontWeight: 400, margin: '0 0 16px' }}>
              Questionnaire soumis
            </h2>
            <div style={{
              display: 'inline-block', padding: '10px 24px',
              borderRadius: 24, background: 'rgba(68,75,63,0.06)',
              border: `1.5px solid ${p.color}`, marginBottom: 16,
            }}>
              <span style={{ fontSize: 14, color: p.color, fontWeight: 700, fontFamily: "'Inter', system-ui, sans-serif" }}>
                Profil {p.label} — Score {score} / 25
              </span>
            </div>
            <p style={{ fontSize: 13, color: '#6d7368', lineHeight: 1.7, marginBottom: 32, fontFamily: "'Inter', system-ui, sans-serif" }}>
              {p.desc}
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <a href="/rapport-adequation" style={{ ...btnPrimary, textDecoration: 'none', display: 'inline-block' }}>
                Voir mon rapport
              </a>
              <a href="/dashboard" style={{ ...btnSecondary, textDecoration: 'none', display: 'inline-block' }}>
                Mon espace
              </a>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Layout ───────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', background: CREAM, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <AmanaHeader />

      {/* Barre de progression */}
      <div style={{ height: 3, background: '#e8dfc8' }}>
        <div style={{ height: '100%', background: GOLD, width: `${(s.step / TOTAL_STEPS) * 100}%`, transition: 'width 0.35s ease' }} />
      </div>

      {/* Hero */}
      <div style={{ background: FOREST, padding: '20px 24px 24px' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>
            Questionnaire MIF2
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 22, color: 'white', fontWeight: 400 }}>
              {[
                '', 'Formation financière', 'Expérience', 'Produits utilisés',
                'Fréquence', 'Montant moyen', 'Compréhension du risque', 'Connaissance produits',
              ][s.step]}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{s.step} / {TOTAL_STEPS}</div>
          </div>
          <div style={{ display: 'flex', gap: 5, marginTop: 14 }}>
            {Array.from({ length: TOTAL_STEPS }, (_, i) => (
              <div key={i} style={{ height: 3, flex: 1, borderRadius: 2, background: i < s.step ? GOLD : 'rgba(255,255,255,0.15)', transition: 'background 0.3s' }} />
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 24px 72px' }}>

        {/* Q1 — Formation */}
        {s.step === 1 && (
          <div style={card}>
            <StepBadge step={1} label="Formation financière" />
            <H>Quel est votre niveau de formation en matière financière ?</H>
            <div style={alertBox}>
              Ce questionnaire est requis par la directive MIF2 pour adapter nos recommandations à votre profil et s'assurer qu'elles correspondent à vos connaissances et objectifs.
            </div>
            <RadioCards
              value={s.formation_financiere}
              onChange={v => setVal('formation_financiere', v)}
              options={[
                { value: 'aucune',        label: 'Pas de formation spécifique',          desc: 'Aucune formation particulière en finance ou économie' },
                { value: 'generale',      label: 'Formation générale',                   desc: 'Études en économie, gestion, droit ou comptabilité' },
                { value: 'specialisee',   label: 'Formation spécialisée en finance',     desc: 'Master finance, CFA, CGPI, IOBSP ou équivalent' },
                { value: 'professionnel', label: 'Professionnel du secteur financier',   desc: 'Banquier, conseiller financier, gérant de portefeuille…' },
              ]}
            />
            <Nav onNext={next} disabled={!s.formation_financiere} />
          </div>
        )}

        {/* Q2 — Expérience */}
        {s.step === 2 && (
          <div style={card}>
            <StepBadge step={2} label="Expérience" />
            <H>Quelle est votre expérience en matière d'investissement financier ?</H>
            <RadioCards
              value={s.experience_investissement}
              onChange={v => setVal('experience_investissement', v)}
              options={[
                { value: 'aucune',   label: 'Aucune expérience',      desc: "Je n'ai jamais investi en dehors des livrets bancaires" },
                { value: 'limitee',  label: 'Expérience limitée',     desc: "Quelques opérations, moins de 3 ans d'ancienneté" },
                { value: 'moderee',  label: 'Expérience modérée',     desc: "Plusieurs investissements, entre 3 et 10 ans d'ancienneté" },
                { value: 'etendue',  label: 'Expérience étendue',     desc: "Nombreux investissements réguliers, plus de 10 ans d'ancienneté" },
              ]}
            />
            <Nav onBack={back} onNext={next} disabled={!s.experience_investissement} />
          </div>
        )}

        {/* Q3 — Produits */}
        {s.step === 3 && (
          <div style={card}>
            <StepBadge step={3} label="Produits financiers" />
            <H>Quels produits financiers avez-vous déjà détenus ou utilisés ?</H>
            <p style={{ color: '#6d7368', fontSize: 13, margin: '0 0 4px', fontFamily: "'Inter', system-ui, sans-serif" }}>
              Sélectionnez tout ce qui s'applique.
            </p>
            <CheckboxGrid
              value={s.produits_utilises}
              onChange={v => setVal('produits_utilises', v)}
              options={[
                { value: 'livrets',        label: 'Livrets réglementés (Livret A, LDDS, PEL)' },
                { value: 'fonds_euros',    label: 'Fonds en euros (assurance-vie)' },
                { value: 'opcvm',          label: 'OPCVM / ETF (fonds actions, obligations)' },
                { value: 'actions_direct', label: 'Actions et obligations en direct (PEA, CTO)' },
                { value: 'scpi',           label: 'SCPI / OPCI (immobilier pierre-papier)' },
                { value: 'structures',     label: 'Produits structurés / produits dérivés' },
              ]}
            />
            <Nav onBack={back} onNext={next} />
          </div>
        )}

        {/* Q4 — Fréquence */}
        {s.step === 4 && (
          <div style={card}>
            <StepBadge step={4} label="Fréquence des opérations" />
            <H>Sur les 3 dernières années, à quelle fréquence avez-vous effectué des opérations d'investissement ?</H>
            <RadioCards
              value={s.frequence_operations}
              onChange={v => setVal('frequence_operations', v)}
              options={[
                { value: 'jamais',        label: 'Jamais',          desc: "Aucune opération d'investissement" },
                { value: 'rarement',      label: 'Rarement',        desc: '1 à 3 opérations par an' },
                { value: 'regulierement', label: 'Régulièrement',   desc: '4 à 10 opérations par an' },
                { value: 'frequemment',   label: 'Fréquemment',     desc: 'Plus de 10 opérations par an' },
              ]}
            />
            <Nav onBack={back} onNext={next} disabled={!s.frequence_operations} />
          </div>
        )}

        {/* Q5 — Montant */}
        {s.step === 5 && (
          <div style={card}>
            <StepBadge step={5} label="Montant moyen investi" />
            <H>Quel est le montant moyen de vos opérations d'investissement ?</H>
            <RadioCards
              value={s.montant_moyen_operation}
              onChange={v => setVal('montant_moyen_operation', v)}
              options={[
                { value: 'lt5k',    label: 'Moins de 5 000 €' },
                { value: '5-25k',   label: 'De 5 000 € à 25 000 €' },
                { value: '25-100k', label: 'De 25 000 € à 100 000 €' },
                { value: 'gt100k',  label: 'Plus de 100 000 €' },
              ]}
            />
            <Nav onBack={back} onNext={next} disabled={!s.montant_moyen_operation} />
          </div>
        )}

        {/* Q6 — Compréhension du risque */}
        {s.step === 6 && (
          <div style={card}>
            <StepBadge step={6} label="Compréhension du risque" />
            <H>Comment évaluez-vous votre compréhension des risques financiers ?</H>
            <p style={{ color: '#6d7368', fontSize: 13, margin: '0 0 20px', lineHeight: 1.6, fontFamily: "'Inter', system-ui, sans-serif" }}>
              Évaluation honnête de votre capacité à appréhender les risques liés aux investissements.
            </p>

            <div style={{ marginBottom: 4, fontSize: 11, fontWeight: 700, color: '#5a6a59', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: "'Inter', system-ui, sans-serif" }}>
              Niveau {s.comprehension_risque} / 5 —&nbsp;
              <span style={{ color: GOLD }}>
                {['', 'Très faible', 'Faible', 'Moyen', 'Bon', 'Excellent'][s.comprehension_risque]}
              </span>
            </div>
            <input
              type="range" min={1} max={5} step={1}
              value={s.comprehension_risque}
              onChange={e => setVal('comprehension_risque', parseInt(e.target.value))}
              style={{ width: '100%', accentColor: GOLD, marginBottom: 8, cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#8a9a89', marginBottom: 20, fontFamily: "'Inter', system-ui, sans-serif" }}>
              <span>Très faible</span><span>Excellent</span>
            </div>

            <div style={{ background: 'rgba(68,75,63,0.05)', borderRadius: 10, padding: 16, fontSize: 13, color: '#4a5e49', lineHeight: 1.7, fontFamily: "'Inter', system-ui, sans-serif" }}>
              <div style={{ fontWeight: 700, marginBottom: 8, color: FOREST }}>À ce niveau, je comprends que :</div>
              {s.comprehension_risque >= 1 && <div>• La valeur d'un investissement peut baisser et je peux perdre une partie de mon capital</div>}
              {s.comprehension_risque >= 2 && <div>• La diversification réduit les risques mais ne les élimine pas</div>}
              {s.comprehension_risque >= 3 && <div>• La durée de placement influence le rendement et le niveau de risque acceptable</div>}
              {s.comprehension_risque >= 4 && <div>• Je suis capable de lire et d'interpréter les indicateurs de risque (SRRI, VaR)</div>}
              {s.comprehension_risque >= 5 && <div>• Je peux analyser et comparer des produits financiers complexes de manière autonome</div>}
            </div>

            <Nav onBack={back} onNext={next} />
          </div>
        )}

        {/* Q7 — Connaissance produits */}
        {s.step === 7 && (
          <div style={card}>
            <StepBadge step={7} label="Connaissance des produits" />
            <H>Votre connaissance des produits proposés par AMANA</H>
            <p style={{ color: '#6d7368', fontSize: 13, margin: '0 0 20px', fontFamily: "'Inter', system-ui, sans-serif", lineHeight: 1.6 }}>
              Évaluez votre niveau de connaissance pour chaque famille de produits.
            </p>

            <div style={{ fontSize: 11, fontWeight: 700, color: '#5a6a59', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8, fontFamily: "'Inter', system-ui, sans-serif" }}>
              SCPI — Société Civile de Placement Immobilier
            </div>
            <RadioCards
              value={s.connaissance_scpi}
              onChange={v => setVal('connaissance_scpi', v)}
              options={[
                { value: 'aucune',   label: 'Je ne connais pas ce produit' },
                { value: 'entendu',  label: "J'en ai entendu parler sans jamais avoir souscrit" },
                { value: 'comprend', label: "Je comprends le fonctionnement et j'ai déjà souscrit" },
                { value: 'maitrise', label: "Je maîtrise ce produit et j'ai une expérience significative" },
              ]}
            />

            <div style={{ fontSize: 11, fontWeight: 700, color: '#5a6a59', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '24px 0 8px', fontFamily: "'Inter', system-ui, sans-serif" }}>
              Assurance-vie — Contrat multisupport halal
            </div>
            <RadioCards
              value={s.connaissance_assurance_vie}
              onChange={v => setVal('connaissance_assurance_vie', v)}
              options={[
                { value: 'aucune',   label: 'Je ne connais pas ce produit' },
                { value: 'entendu',  label: "J'en ai entendu parler sans jamais avoir souscrit" },
                { value: 'comprend', label: "Je comprends le fonctionnement et j'ai déjà souscrit" },
                { value: 'maitrise', label: "Je maîtrise ce produit et j'ai une expérience significative" },
              ]}
            />

            {error && (
              <div style={{ background: '#fde8e8', border: '1px solid #f5c6c6', borderRadius: 8, padding: '10px 14px', marginTop: 16, fontSize: 13, color: '#c0392b', fontFamily: "'Inter', system-ui, sans-serif" }}>
                {error}
              </div>
            )}

            <Nav
              onBack={back}
              onNext={handleSubmit}
              nextLabel="Valider le questionnaire"
              disabled={!s.connaissance_scpi || !s.connaissance_assurance_vie}
              saving={saving}
            />
          </div>
        )}

      </div>
    </div>
  )
}
