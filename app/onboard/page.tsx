// app/onboard/page.tsx
// Sprint Agents IA v18 · 30 avril 2026
//
// Page PUBLIQUE (sans auth) du funnel d'onboarding AMANA.
// 4 étapes :
//   1. Objectifs + horizon + capacité de pertes
//   2. Situation patrimoniale + complexité
//   3. Sensibilité Sharia
//   4. Identité + email + finalisation
//
// Aiguillage automatique Mass / Patrimoniale / Premium calculé après étape 3,
// affiché en page de transition avant étape 4.

'use client'

import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AmanaLogo from '@/components/amana-logo'
import { createClient } from '@/lib/supabase/client'
import { normalizePhoneForYousign } from '@/lib/yousign/phone'
import {
  ONBOARDING_OBJECTIF_OPTIONS,
  type OnboardingObjectifCode,
} from '@/lib/onboarding/objectifs'

type Step = 1 | 2 | 3 | 4 | 5

type Step1Data = {
  objectifs_principaux: OnboardingObjectifCode[]
  objectif_autre_precision: string
  horizon_annees: number
  capacite_pertes: 'faible' | 'moyenne' | 'elevee'
}

type Step2Data = {
  patrimoine_net_eur: number
  revenus_annuels_eur?: number
  charges_annuelles_eur?: number
  capacite_epargne_mensuelle_eur?: number
  situation_familiale: string
  nb_enfants: number
  detient_parts_societe: boolean
  detient_sci: boolean
  expatrie_ou_non_resident: boolean
  succession_active: boolean
  plus_de_deux_immeubles: boolean
  entrepreneur_ou_liberal: boolean
}

type Step3Data = {
  sensibilite_sharia: 'elevee' | 'moyenne' | 'principielle'
  patrimoine_haram_a_purifier: boolean
  pratique_zakat: boolean
  // Q1.6 ESG/SFDR
  esg_preference: 'article8' | 'article9' | 'label_isr' | 'sans_preference'
  esg_pct_min: number
  esg_indicateurs: string[]
}

type Step4Data = {
  prenom: string
  nom: string
  email: string
  telephone: string
  password: string
  confirmPassword: string
  consentRgpd: boolean
  consentCgu: boolean
  consentCom: boolean
}

const MIN_PASSWORD_LENGTH = 8

function isStep4PasswordValid(value: Step4Data): boolean {
  return (
    value.password.length >= MIN_PASSWORD_LENGTH &&
    value.password === value.confirmPassword
  )
}

function isStep4ConsentsValid(value: Step4Data): boolean {
  return value.consentRgpd && value.consentCgu
}

function isStep4Ready(value: Step4Data): boolean {
  return (
    !!value.prenom.trim() &&
    !!value.nom.trim() &&
    !!value.email.trim() &&
    !!normalizePhoneForYousign(value.telephone) &&
    isStep4PasswordValid(value) &&
    isStep4ConsentsValid(value)
  )
}

type AiguillageResult = {
  offre: 'mass' | 'patrimoniale' | 'premium'
  recommendation_message: string
}

export default function OnboardPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [sessionToken, setSessionToken] = useState<string | null>(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [aiguillage, setAiguillage] = useState<AiguillageResult | null>(null)

  // États locaux pour chaque étape
  const [step1, setStep1] = useState<Step1Data>({
    objectifs_principaux: [],
    objectif_autre_precision: '',
    horizon_annees: 10,
    capacite_pertes: 'moyenne',
  })
  const [step2, setStep2] = useState<Step2Data>({
    patrimoine_net_eur: 0,
    situation_familiale: 'celibataire',
    nb_enfants: 0,
    detient_parts_societe: false,
    detient_sci: false,
    expatrie_ou_non_resident: false,
    succession_active: false,
    plus_de_deux_immeubles: false,
    entrepreneur_ou_liberal: false,
  })
  const [step3, setStep3] = useState<Step3Data>({
    sensibilite_sharia: 'moyenne',
    patrimoine_haram_a_purifier: false,
    pratique_zakat: false,
    esg_preference: 'sans_preference',
    esg_pct_min: 0,
    esg_indicateurs: [],
  })
  const [step4, setStep4] = useState<Step4Data>({
    prenom: '',
    nom: '',
    email: '',
    telephone: '',
    password: '',
    confirmPassword: '',
    consentRgpd: false,
    consentCgu: false,
    consentCom: false,
  })

  // Initialiser la session au chargement
  useEffect(() => {
    void initSession()
  }, [])

  const initSession = async () => {
    setSessionLoading(true)
    setError(null)
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 15_000)
    try {
      const utm = new URLSearchParams(window.location.search)
      const r = await fetch('/api/onboard/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          utm_source: utm.get('utm_source') ?? undefined,
          utm_medium: utm.get('utm_medium') ?? undefined,
          utm_campaign: utm.get('utm_campaign') ?? undefined,
        }),
        signal: controller.signal,
      })
      const d = (await r.json()) as { ok?: boolean; session_token?: string; error?: string }
      if (!r.ok || !d.session_token) {
        setSessionToken(null)
        setError(
          d.error ??
            'Impossible de démarrer la session. Vérifiez que Supabase est démarré (ex. npx supabase start), puis rechargez la page.'
        )
        return
      }
      setSessionToken(d.session_token)
    } catch (e) {
      console.error(e)
      setSessionToken(null)
      setError(
        e instanceof Error && e.name === 'AbortError'
          ? 'Délai dépassé. Vérifiez que le serveur Next.js et Supabase tournent, puis cliquez sur Réessayer.'
          : 'Impossible de joindre le serveur ou Supabase. Vérifiez votre connexion, que Docker tourne si vous êtes en local, puis rechargez la page.'
      )
    } finally {
      window.clearTimeout(timeout)
      setSessionLoading(false)
    }
  }

  const submitStep1 = async (e: FormEvent) => {
    e.preventDefault()
    if (step1.objectifs_principaux.length === 0) return
    if (
      step1.objectifs_principaux.includes('autre') &&
      step1.objectif_autre_precision.trim().length < 2
    ) {
      return
    }
    if (!sessionToken) {
      setError(
        'Session non initialisée. Vérifiez que Supabase est démarré, puis cliquez sur « Réessayer » ou rechargez la page.'
      )
      return
    }
    setLoading(true)
    setError(null)
    try {
      const r = await fetch('/api/onboard/step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 1, session_token: sessionToken, data: step1 }),
      })
      const d = await r.json()
      if (!d.ok) throw new Error(d.error || 'Erreur')
      setStep(2)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  const submitStep2 = async (e: FormEvent) => {
    e.preventDefault()
    if (!sessionToken) {
      setError('Session perdue. Rechargez la page pour recommencer.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const r = await fetch('/api/onboard/step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 2, session_token: sessionToken, data: step2 }),
      })
      const d = await r.json()
      if (!d.ok) throw new Error(d.error || 'Erreur')
      setStep(3)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  const submitStep3 = async (e: FormEvent) => {
    e.preventDefault()
    if (!sessionToken) {
      setError('Session perdue. Rechargez la page pour recommencer.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const r = await fetch('/api/onboard/step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 3, session_token: sessionToken, data: step3 }),
      })
      const d = await r.json()
      if (!d.ok) throw new Error(d.error || 'Erreur')
      setAiguillage(d.aiguillage as AiguillageResult)
      setStep(4)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  const submitStep4 = async (e: FormEvent) => {
    e.preventDefault()
    if (!sessionToken) {
      setError('Session perdue. Rechargez la page pour recommencer.')
      return
    }
    if (step4.password.length < MIN_PASSWORD_LENGTH) {
      setError(`Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`)
      return
    }
    if (step4.password !== step4.confirmPassword) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }
    if (!step4.consentRgpd || !step4.consentCgu) {
      setError('Vous devez accepter la politique de confidentialité et les CGU.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const r = await fetch('/api/onboard/step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: 4,
          session_token: sessionToken,
          data: {
            prenom: step4.prenom,
            nom: step4.nom,
            email: step4.email,
            telephone: step4.telephone,
          },
        }),
      })
      const d = await r.json()
      if (!d.ok) throw new Error(d.error || 'Erreur')

      const fr = await fetch('/api/onboard/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_token: sessionToken,
          password: step4.password,
          consent_rgpd: step4.consentRgpd,
          consent_cgu: step4.consentCgu,
          consent_communication: step4.consentCom,
        }),
      })
      const fd = await fr.json()
      if (!fd.ok) throw new Error(fd.error || 'Erreur finalisation')

      const supabase = createClient()
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: step4.email.trim().toLowerCase(),
        password: step4.password,
      })
      if (signInErr) {
        console.warn('[onboard] auto-login après finalisation', signInErr.message)
      }

      router.push(`/onboard/result/${fd.offre}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-amana-cream font-sans">
      <div className="mx-auto max-w-2xl p-6">
        <header className="mb-8 text-center">
          <div className="flex justify-center">
            <AmanaLogo height={72} href="/" variant="dark" />
          </div>
          <p className="mt-3 text-sm text-amana-grey">
            Gestion de patrimoine spécialisée en finance islamique
          </p>
        </header>

        {/* Progress bar */}
        <div className="mb-8 flex items-center gap-2">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className={`h-1 flex-1 rounded ${
                step >= (n as Step) ? 'bg-amana-forest' : 'bg-amana-grey-light'
              }`}
            />
          ))}
        </div>
        <p className="mb-6 text-center text-sm text-amana-grey">
          Étape {step} sur 4
        </p>

        {error && (
          <div className="mb-4 rounded border-l-4 border-red-500 bg-red-50 p-3 text-sm text-red-800">
            <p>{error}</p>
            <button
              type="button"
              onClick={() => void initSession()}
              className="mt-2 rounded bg-red-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-900"
            >
              Réessayer
            </button>
          </div>
        )}

        {sessionLoading && (
          <div className="mb-4 rounded border border-amana-grey-light bg-amana-cream p-3 text-sm text-amana-dark">
            Préparation de votre parcours…
          </div>
        )}

        <main className="rounded-lg border border-amana-grey-light bg-white p-6 shadow-sm">
          {step === 1 && (
            <Step1
              value={step1}
              onChange={setStep1}
              onSubmit={submitStep1}
              loading={loading}
              sessionReady={!!sessionToken && !sessionLoading}
              sessionLoading={sessionLoading}
              showSessionHint={!error}
            />
          )}
          {step === 2 && <Step2 value={step2} onChange={setStep2} onSubmit={submitStep2} loading={loading} />}
          {step === 3 && <Step3 value={step3} onChange={setStep3} onSubmit={submitStep3} loading={loading} />}
          {step === 4 && (
            <Step4
              value={step4}
              onChange={setStep4}
              onSubmit={submitStep4}
              loading={loading}
              aiguillage={aiguillage}
            />
          )}
        </main>

        <footer className="mt-8 text-center text-xs text-amana-grey">
          AMANA Patrimoine · SAS · ORIAS 25009552 (CIF/COA/COBSP) ·{' '}
          <Link href="/mentions-legales" className="underline">
            Mentions légales
          </Link>{' '}
          ·{' '}
          <Link href="/rgpd" className="underline">
            RGPD
          </Link>
        </footer>
      </div>
    </div>
  )
}

// =====================================================================
// STEP 1 — Objectifs
// =====================================================================
function Step1({
  value,
  onChange,
  onSubmit,
  loading,
  sessionReady,
  sessionLoading,
  showSessionHint,
}: {
  value: Step1Data
  onChange: (v: Step1Data) => void
  onSubmit: (e: FormEvent) => void
  loading: boolean
  sessionReady: boolean
  sessionLoading: boolean
  showSessionHint: boolean
}) {
  const selected = new Set(value.objectifs_principaux)
  const showAutreField = selected.has('autre')

  const toggleObjectif = (code: OnboardingObjectifCode) => {
    const next = new Set(value.objectifs_principaux)
    if (next.has(code)) {
      next.delete(code)
    } else {
      next.add(code)
    }
    onChange({
      ...value,
      objectifs_principaux: [...next],
      objectif_autre_precision: next.has('autre') ? value.objectif_autre_precision : '',
    })
  }

  const canSubmit =
    value.objectifs_principaux.length > 0 &&
    (!showAutreField || value.objectif_autre_precision.trim().length >= 2)

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-amana-forest">Quels sont vos objectifs ?</h2>
        <p className="mt-1 text-sm text-amana-grey">
          Plusieurs réponses possibles — vous pourrez préciser plus tard.
        </p>
      </div>

      <div className="space-y-2">
        {ONBOARDING_OBJECTIF_OPTIONS.map((o) => {
          const isAutre = o.value === 'autre'
          const isChecked = selected.has(o.value)
          return (
            <div key={o.value} className="space-y-2">
              <label
                className={`block cursor-pointer rounded border p-3 ${
                  isChecked
                    ? 'border-amana-forest bg-amana-cream'
                    : 'border-amana-grey-light'
                }`}
              >
                <input
                  type="checkbox"
                  name="objectif"
                  value={o.value}
                  checked={isChecked}
                  onChange={() => toggleObjectif(o.value)}
                  className="mr-2"
                />
                {o.label}
              </label>
              {isAutre && isChecked && (
                <div className="rounded border border-amana-forest/30 bg-amana-cream/50 px-3 py-3">
                  <label
                    htmlFor="objectif-autre-precision"
                    className="block text-sm font-semibold text-amana-forest"
                  >
                    Précisez votre objectif *
                  </label>
                  <input
                    id="objectif-autre-precision"
                    type="text"
                    value={value.objectif_autre_precision}
                    onChange={(e) =>
                      onChange({ ...value, objectif_autre_precision: e.target.value })
                    }
                    placeholder="Ex. financer les études de mes enfants"
                    className="mt-2 w-full rounded border border-amana-grey-light bg-white p-2 text-sm"
                    required
                    minLength={2}
                    maxLength={500}
                    autoFocus
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div>
        <label className="block text-sm font-semibold text-amana-forest">
          Horizon de votre projet (en années)
        </label>
        <input
          type="number"
          min={1}
          max={60}
          value={value.horizon_annees}
          onChange={(e) =>
            onChange({ ...value, horizon_annees: parseInt(e.target.value, 10) || 0 })
          }
          className="mt-1 w-full rounded border border-amana-grey-light p-2 text-sm"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-amana-forest">
          Quelle est votre tolérance au risque ?
        </label>
        <select
          value={value.capacite_pertes}
          onChange={(e) =>
            onChange({ ...value, capacite_pertes: e.target.value as Step1Data['capacite_pertes'] })
          }
          className="mt-1 w-full rounded border border-amana-grey-light p-2 text-sm"
        >
          <option value="faible">Faible — je veux protéger mon capital</option>
          <option value="moyenne">Moyenne — j'accepte de petites variations</option>
          <option value="elevee">Élevée — je vise la performance long terme</option>
        </select>
      </div>

      {showSessionHint && !sessionReady && !sessionLoading && (
        <p className="text-center text-xs text-amber-800">
          Connexion au service en attente — cliquez sur « Réessayer » en haut de page si le bouton reste
          inactif.
        </p>
      )}

      {showAutreField && value.objectif_autre_precision.trim().length < 2 && (
        <p className="text-center text-xs text-amana-grey">
          Renseignez le champ « Précisez votre objectif » pour continuer.
        </p>
      )}

      <button
        type="submit"
        disabled={loading || sessionLoading || !sessionReady || !canSubmit}
        className="w-full rounded bg-amana-forest p-3 font-semibold text-white hover:bg-amana-dark disabled:opacity-50"
      >
        {loading
          ? 'Sauvegarde…'
          : sessionLoading
            ? 'Préparation…'
            : !sessionReady
              ? 'En attente du service…'
              : 'Continuer'}
      </button>
    </form>
  )
}

// =====================================================================
// STEP 2 — Situation patrimoniale
// =====================================================================
function Step2({
  value,
  onChange,
  onSubmit,
  loading,
}: {
  value: Step2Data
  onChange: (v: Step2Data) => void
  onSubmit: (e: FormEvent) => void
  loading: boolean
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-amana-forest">Votre situation patrimoniale</h2>
        <p className="mt-1 text-sm text-amana-grey">
          Estimations approximatives suffisantes — données strictement confidentielles, traitées selon le RGPD.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Patrimoine net total estimé (€) *">
          <input
            type="number"
            min={0}
            value={value.patrimoine_net_eur || ''}
            onChange={(e) => onChange({ ...value, patrimoine_net_eur: parseFloat(e.target.value) || 0 })}
            className="w-full rounded border border-amana-grey-light p-2 text-sm"
            placeholder="Ex: 75000"
            required
          />
        </Field>
        <Field label="Revenus annuels nets (€)">
          <input
            type="number"
            min={0}
            value={value.revenus_annuels_eur || ''}
            onChange={(e) => onChange({ ...value, revenus_annuels_eur: parseFloat(e.target.value) || undefined })}
            className="w-full rounded border border-amana-grey-light p-2 text-sm"
            placeholder="Ex: 45000"
          />
        </Field>
        <Field label="Charges annuelles (€)">
          <input
            type="number"
            min={0}
            value={value.charges_annuelles_eur || ''}
            onChange={(e) => onChange({ ...value, charges_annuelles_eur: parseFloat(e.target.value) || undefined })}
            className="w-full rounded border border-amana-grey-light p-2 text-sm"
            placeholder="Ex: 30000"
          />
        </Field>
        <Field label="Capacité d'épargne mensuelle (€)">
          <input
            type="number"
            min={0}
            value={value.capacite_epargne_mensuelle_eur || ''}
            onChange={(e) => onChange({ ...value, capacite_epargne_mensuelle_eur: parseFloat(e.target.value) || undefined })}
            className="w-full rounded border border-amana-grey-light p-2 text-sm"
            placeholder="Ex: 500"
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Situation familiale *">
          <select
            value={value.situation_familiale}
            onChange={(e) => onChange({ ...value, situation_familiale: e.target.value })}
            className="w-full rounded border border-amana-grey-light p-2 text-sm"
            required
          >
            <option value="celibataire">Célibataire</option>
            <option value="pacs">Pacsé(e)</option>
            <option value="marie_communaute_reduite">Marié(e) — communauté réduite aux acquêts</option>
            <option value="marie_separation_biens">Marié(e) — séparation de biens</option>
            <option value="marie_communaute_universelle">Marié(e) — communauté universelle</option>
            <option value="divorce">Divorcé(e)</option>
            <option value="veuf">Veuf / veuve</option>
          </select>
        </Field>
        <Field label="Nombre d'enfants à charge">
          <input
            type="number"
            min={0}
            max={20}
            value={value.nb_enfants}
            onChange={(e) => onChange({ ...value, nb_enfants: parseInt(e.target.value, 10) || 0 })}
            className="w-full rounded border border-amana-grey-light p-2 text-sm"
          />
        </Field>
      </div>

      <fieldset className="space-y-2 rounded border border-amana-grey-light p-3">
        <legend className="px-2 text-sm font-semibold text-amana-forest">Spécificités de votre situation</legend>
        <p className="text-xs text-amana-grey">Cochez tout ce qui s'applique :</p>
        <CheckboxField checked={value.detient_parts_societe} onChange={(b) => onChange({ ...value, detient_parts_societe: b })} label="Je détiens des parts d'entreprise (SARL, SAS, etc.)" />
        <CheckboxField checked={value.detient_sci} onChange={(b) => onChange({ ...value, detient_sci: b })} label="Je détiens une SCI" />
        <CheckboxField checked={value.expatrie_ou_non_resident} onChange={(b) => onChange({ ...value, expatrie_ou_non_resident: b })} label="Je suis expatrié ou non-résident fiscal France" />
        <CheckboxField checked={value.succession_active} onChange={(b) => onChange({ ...value, succession_active: b })} label="Une succession est en cours dans ma famille" />
        <CheckboxField checked={value.plus_de_deux_immeubles} onChange={(b) => onChange({ ...value, plus_de_deux_immeubles: b })} label="Je détiens plus de 2 biens immobiliers" />
        <CheckboxField checked={value.entrepreneur_ou_liberal} onChange={(b) => onChange({ ...value, entrepreneur_ou_liberal: b })} label="Je suis entrepreneur ou profession libérale" />
      </fieldset>

      <button
        type="submit"
        disabled={loading || !value.patrimoine_net_eur}
        className="w-full rounded bg-amana-forest p-3 font-semibold text-white hover:bg-amana-dark disabled:opacity-50"
      >
        {loading ? 'Sauvegarde…' : 'Continuer'}
      </button>
    </form>
  )
}

// =====================================================================
// STEP 3 — Sensibilité Sharia + Préférences ESG/SFDR (Q1.6)
// =====================================================================
function Step3({
  value,
  onChange,
  onSubmit,
  loading,
}: {
  value: Step3Data
  onChange: (v: Step3Data) => void
  onSubmit: (e: FormEvent) => void
  loading: boolean
}) {
  const esgIndicateursOptions = [
    { value: 'emissions_co2', label: 'Réduction des émissions CO₂' },
    { value: 'biodiversite', label: 'Protection de la biodiversité' },
    { value: 'droits_sociaux', label: 'Droits sociaux & conditions de travail' },
    { value: 'gouvernance', label: 'Bonne gouvernance d\'entreprise' },
    { value: 'egalite_genre', label: 'Égalité femmes / hommes' },
  ]

  function toggleIndicateur(val: string) {
    const current = value.esg_indicateurs
    const next = current.includes(val) ? current.filter((v) => v !== val) : [...current, val]
    onChange({ ...value, esg_indicateurs: next })
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* === Section Sharia === */}
      <div>
        <h2 className="text-xl font-bold text-amana-forest">Sensibilité & Durabilité</h2>
        <p className="mt-1 text-sm text-amana-grey">
          AMANA applique la conformité Sharia AAOIFI sur l'ensemble de ses recommandations.
          Indiquez ci-dessous vos préférences de durabilité et, le cas échéant, purification ou zakat.
        </p>
      </div>

      <div className="rounded border border-amana-grey-light p-4">
        <p className="mb-3 text-sm font-semibold text-amana-forest">Patrimoine & obligations islamiques</p>
        <div className="space-y-2">
          <CheckboxField
            checked={value.patrimoine_haram_a_purifier}
            onChange={(b) => onChange({ ...value, patrimoine_haram_a_purifier: b })}
            label="Mon patrimoine comporte des éléments non-conformes à purifier"
          />
          <CheckboxField
            checked={value.pratique_zakat}
            onChange={(b) => onChange({ ...value, pratique_zakat: b })}
            label="Je verse la zakat al-mâl annuellement et souhaite l'intégrer à mon plan"
          />
        </div>
      </div>

      {/* === Section ESG/SFDR (Q1.6) === */}
      <div className="rounded border border-amana-grey-light p-4">
        <p className="mb-1 text-sm font-semibold text-amana-forest">
          Préférences de durabilité ESG / SFDR <span className="text-xs font-normal text-amana-grey">(article L.533-22-1 CMF)</span>
        </p>
        <p className="mb-3 text-xs text-amana-grey">
          En plus de la conformité Sharia, souhaitez-vous intégrer des critères environnementaux, sociaux et de gouvernance ?
        </p>

        <div className="space-y-2">
          {([
            { value: 'article9', label: 'Article 9 SFDR — objectif d\'investissement durable explicite' },
            { value: 'article8', label: 'Article 8 SFDR — promotion de caractéristiques durables' },
            { value: 'label_isr', label: 'Label ISR français uniquement' },
            { value: 'sans_preference', label: 'Sans préférence ESG particulière' },
          ] as const).map((o) => (
            <label
              key={o.value}
              className={`block cursor-pointer rounded border p-3 text-sm ${
                value.esg_preference === o.value
                  ? 'border-amana-forest bg-amana-cream'
                  : 'border-amana-grey-light'
              }`}
            >
              <input
                type="radio"
                name="esg_pref"
                value={o.value}
                checked={value.esg_preference === o.value}
                onChange={() => onChange({ ...value, esg_preference: o.value })}
                className="mr-2"
              />
              {o.label}
            </label>
          ))}
        </div>

        {value.esg_preference !== 'sans_preference' && (
          <div className="mt-4 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-amana-forest">
                % minimum d'investissements durables dans mon portefeuille : {value.esg_pct_min}%
              </label>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={value.esg_pct_min}
                onChange={(e) => onChange({ ...value, esg_pct_min: parseInt(e.target.value) })}
                className="mt-1 w-full"
              />
              <div className="flex justify-between text-xs text-amana-grey">
                <span>0 %</span><span>100 %</span>
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold text-amana-forest">Indicateurs prioritaires (facultatif)</p>
              <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                {esgIndicateursOptions.map((opt) => (
                  <label key={opt.value} className="flex cursor-pointer items-start gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={value.esg_indicateurs.includes(opt.value)}
                      onChange={() => toggleIndicateur(opt.value)}
                      className="mt-0.5"
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded bg-amana-forest p-3 font-semibold text-white hover:bg-amana-dark disabled:opacity-50"
      >
        {loading ? 'Calcul de votre profil…' : 'Voir mon profil AMANA'}
      </button>
    </form>
  )
}

// =====================================================================
// STEP 4 — Identité + finalisation
// =====================================================================
function Step4({
  value,
  onChange,
  onSubmit,
  loading,
  aiguillage,
}: {
  value: Step4Data
  onChange: (v: Step4Data) => void
  onSubmit: (e: FormEvent) => void
  loading: boolean
  aiguillage: AiguillageResult | null
}) {
  const offreLabel = {
    mass: 'Mass — parcours 100% digital',
    patrimoniale: 'Patrimoniale — parcours assisté avec rdv visio',
    premium: 'Premium — accompagnement sur-mesure',
  }
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {aiguillage && (
        <div className="rounded border-l-4 border-amana-gold bg-amana-cream p-4">
          <p className="font-semibold text-amana-forest">
            Votre profil : {offreLabel[aiguillage.offre]}
          </p>
          <p className="mt-2 text-sm text-amana-dark">{aiguillage.recommendation_message}</p>
        </div>
      )}

      <div>
        <h2 className="text-xl font-bold text-amana-forest">
          Créons votre espace AMANA
        </h2>
        <p className="mt-1 text-sm text-amana-grey">
          Choisissez un mot de passe pour accéder à votre espace AMANA à tout moment.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Prénom *" htmlFor="onboard-prenom">
          <input
            id="onboard-prenom"
            type="text"
            value={value.prenom}
            onChange={(e) => onChange({ ...value, prenom: e.target.value })}
            className="w-full rounded border border-amana-grey-light p-2 text-sm"
            required
          />
        </Field>
        <Field label="Nom *" htmlFor="onboard-nom">
          <input
            id="onboard-nom"
            type="text"
            value={value.nom}
            onChange={(e) => onChange({ ...value, nom: e.target.value })}
            className="w-full rounded border border-amana-grey-light p-2 text-sm"
            required
          />
        </Field>
        <Field label="Email *" htmlFor="onboard-email">
          <input
            id="onboard-email"
            type="email"
            value={value.email}
            onChange={(e) => onChange({ ...value, email: e.target.value })}
            className="w-full rounded border border-amana-grey-light p-2 text-sm"
            required
            autoComplete="email"
          />
        </Field>
        <Field label="Téléphone *" htmlFor="onboard-telephone">
          <input
            id="onboard-telephone"
            type="tel"
            value={value.telephone}
            onChange={(e) => onChange({ ...value, telephone: e.target.value })}
            className="w-full rounded border border-amana-grey-light p-2 text-sm"
            placeholder="+33 6 12 34 56 78"
            required
            minLength={9}
            autoComplete="tel"
          />
        </Field>
        <Field label="Mot de passe *" htmlFor="onboard-password">
          <input
            id="onboard-password"
            type="password"
            value={value.password}
            onChange={(e) => onChange({ ...value, password: e.target.value })}
            className="w-full rounded border border-amana-grey-light p-2 text-sm"
            placeholder="8 caractères minimum"
            required
            minLength={MIN_PASSWORD_LENGTH}
            autoComplete="new-password"
          />
        </Field>
        <Field label="Confirmer le mot de passe *" htmlFor="onboard-confirm-password">
          <input
            id="onboard-confirm-password"
            type="password"
            value={value.confirmPassword}
            onChange={(e) => onChange({ ...value, confirmPassword: e.target.value })}
            className="w-full rounded border border-amana-grey-light p-2 text-sm"
            placeholder="Retapez votre mot de passe"
            required
            minLength={MIN_PASSWORD_LENGTH}
            autoComplete="new-password"
          />
        </Field>
      </div>

      {value.confirmPassword.length > 0 && value.password !== value.confirmPassword && (
        <p className="text-xs text-red-700">Les mots de passe ne correspondent pas.</p>
      )}

      <div className="flex flex-col gap-3">
        <ConsentCheckbox
          checked={value.consentRgpd}
          onChange={(consentRgpd) => onChange({ ...value, consentRgpd })}
          label={
            <>
              <Link href="/confidentialite" className="font-semibold text-amana-forest underline">
                Politique de confidentialité
              </Link>{' '}
              et traitement RGPD. <span className="text-red-700">*</span>
            </>
          }
        />
        <ConsentCheckbox
          checked={value.consentCgu}
          onChange={(consentCgu) => onChange({ ...value, consentCgu })}
          label={
            <>
              <Link href="/cgu" className="font-semibold text-amana-forest underline">
                Conditions générales d&apos;utilisation
              </Link>
              . <span className="text-red-700">*</span>
            </>
          }
        />
        <ConsentCheckbox
          checked={value.consentCom}
          onChange={(consentCom) => onChange({ ...value, consentCom })}
          label="Recevoir les actualités AMANA (facultatif)."
          optional
        />
      </div>

      <button
        type="submit"
        disabled={loading || !isStep4Ready(value)}
        className="w-full rounded bg-amana-forest p-3 font-semibold text-white hover:bg-amana-dark disabled:opacity-50"
      >
        {loading ? 'Création de votre espace…' : 'Créer mon espace AMANA'}
      </button>
    </form>
  )
}

// =====================================================================
// Helpers UI
// =====================================================================
function Field({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor?: string
  children: ReactNode
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-amana-forest">
        {label}
      </label>
      <div className="mt-1">{children}</div>
    </div>
  )
}

function ConsentCheckbox({
  checked,
  onChange,
  label,
  optional,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: ReactNode
  optional?: boolean
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-amana-forest"
      />
      <span className={`text-xs leading-relaxed ${optional ? 'text-amana-grey' : 'text-amana-dark'}`}>
        {label}
      </span>
    </label>
  )
}

function CheckboxField({ checked, onChange, label }: { checked: boolean; onChange: (b: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5"
      />
      <span>{label}</span>
    </label>
  )
}
