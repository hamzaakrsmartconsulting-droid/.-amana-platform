'use client'

import type { CSSProperties, ChangeEvent } from 'react'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import AmanaHeader from '@/components/amana-header'

const FOREST = '#444b3f'
const GOLD   = '#c9a55a'
const CREAM  = '#f8f4ec'
const DARK   = '#353b32'

const TOTAL_STEPS = 7

type KycState = {
  step: number
  // Étape 1 — Qualité & Identité (Q3.1 spec)
  qualite_declarant:  'client' | 'mandataire' | 'beneficiaire_effectif' | 'payeur_prime'
  civilite:           string
  prenom:             string
  nom:                string
  date_naissance:     string
  pays_naissance:     string
  ville_naissance:    string
  nationalite:        string
  capacite_juridique: string
  // Étape 2 — Coordonnées
  telephone:                  string
  telephone_fixe:             string
  adresse:                    string
  code_postal:                string
  ville:                      string
  pays:                       string
  adresse_fiscale_identique:  boolean
  adresse_fiscale:            string
  // Étape 3 — Situation personnelle
  situation_familiale: string
  regime_matrimonial:  string
  enfants_a_charge:    number
  nb_personnes_charge: number
  situation_pro:       string
  secteur_activite:    string
  csp:                 string
  // Étape 4 — Patrimoine & Conformité
  revenu_foyer:        string
  patrimoine_financier: string
  patrimoine_net:      string
  ifi_assujetti:       boolean
  numero_fiscal:       string
  fatca_us_person:     boolean
  ppe:                 boolean
  ppe_entourage:       boolean
  // Étape 5 — Profil investisseur
  objectif_investissement: string
  horizon_placement:       string
  tolerance_risque:        number
  perte_acceptable:        string
  // Étape 6 — Coordonnées bancaires
  titulaire_compte: string
  nom_banque:       string
  iban:             string
  bic_swift:        string
  // Étape 7 — Documents
  doc_identite:            File | null
  doc_justif:              File | null
  doc_rib:                 File | null
  doc_residence_fiscale:   File | null
  doc_avis_imposition:     File | null  // Q3.7 spec
  doc_origine_fonds:       File | null  // Q3.7 spec — justif source des fonds
}

const init: KycState = {
  step: 1,
  qualite_declarant: 'client',
  civilite: 'M.', prenom: '', nom: '', date_naissance: '',
  pays_naissance: 'France', ville_naissance: '', nationalite: 'Française',
  capacite_juridique: 'majeur',
  telephone: '', telephone_fixe: '',
  adresse: '', code_postal: '', ville: '', pays: 'France',
  adresse_fiscale_identique: true, adresse_fiscale: '',
  situation_familiale: '', regime_matrimonial: '',
  enfants_a_charge: 0, nb_personnes_charge: 0,
  situation_pro: '', secteur_activite: '', csp: '',
  revenu_foyer: '', patrimoine_financier: '', patrimoine_net: '',
  ifi_assujetti: false, numero_fiscal: '',
  fatca_us_person: false, ppe: false, ppe_entourage: false,
  objectif_investissement: '', horizon_placement: '',
  tolerance_risque: 2, perte_acceptable: '',
  titulaire_compte: '', nom_banque: '', iban: '', bic_swift: '',
  doc_identite: null, doc_justif: null, doc_rib: null,
  doc_residence_fiscale: null, doc_avis_imposition: null, doc_origine_fonds: null,
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
  letterSpacing: '0.04em', transition: 'background 0.15s',
}

const btnSecondary: CSSProperties = {
  padding: '13px 32px', background: 'transparent', color: FOREST,
  border: `1.5px solid #ddd5c8`, borderRadius: 8,
  fontSize: 15, cursor: 'pointer', fontWeight: 500,
  fontFamily: "'Inter', system-ui, sans-serif",
}

const inp: CSSProperties = {
  width: '100%', padding: '11px 14px',
  border: '1.5px solid #ddd5c8', borderRadius: 8,
  fontSize: 14, boxSizing: 'border-box',
  background: CREAM, color: DARK,
  fontFamily: "'Inter', system-ui, sans-serif",
  outline: 'none', transition: 'border-color 0.15s',
}

const lbl: CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 600, color: '#5a6a59',
  textTransform: 'uppercase', letterSpacing: '0.1em',
  marginBottom: 6, marginTop: 18,
  fontFamily: "'Inter', system-ui, sans-serif",
}

const sel: CSSProperties = { ...inp, background: 'white', cursor: 'pointer' }

const infoBox: CSSProperties = {
  background: '#f0f5f0', border: '1px solid #c8dac8', borderRadius: 8,
  padding: '12px 14px', fontSize: 12, color: '#4a5e49', marginTop: 8, lineHeight: 1.6,
  fontFamily: "'Inter', system-ui, sans-serif",
}

const alertBox: CSSProperties = {
  background: '#fef9ee', border: '1px solid #e8dfc8', borderRadius: 8,
  padding: '12px 14px', fontSize: 12, color: '#7a6a3a', marginTop: 8, lineHeight: 1.6,
  fontFamily: "'Inter', system-ui, sans-serif",
}

const grid2: CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }

// ── Helpers ───────────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={lbl}>{label}</label>
      {children}
    </div>
  )
}

function StepBadge({ step, label }: { step: number; label: string }) {
  return (
    <div style={{
      fontSize: 10, color: GOLD, fontWeight: 700,
      letterSpacing: '0.12em', textTransform: 'uppercase',
      marginBottom: 10, fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      Étape {step} / {TOTAL_STEPS} — {label}
    </div>
  )
}

function H({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{
      fontFamily: "'Cormorant Garamond', Georgia, serif",
      fontSize: 28, color: FOREST, fontWeight: 400,
      margin: '0 0 8px', lineHeight: 1.15,
    }}>
      {children}
    </h2>
  )
}

function Sub({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      color: '#6d7368', fontSize: 14, margin: '0 0 24px',
      fontFamily: "'Inter', system-ui, sans-serif", lineHeight: 1.6,
    }}>
      {children}
    </p>
  )
}

function RadioGroup({ options, value, onChange }: {
  options: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          style={{
            padding: '8px 18px', borderRadius: 20, fontSize: 13, cursor: 'pointer',
            border: value === o.value ? `2px solid ${FOREST}` : '1.5px solid #ddd5c8',
            background: value === o.value ? FOREST : 'white',
            color: value === o.value ? 'white' : '#4a5e49',
            fontWeight: value === o.value ? 600 : 400,
            fontFamily: "'Inter', system-ui, sans-serif",
            transition: 'all 0.12s',
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function BoolToggle({ value, onChange, yesLabel = 'Oui', noLabel = 'Non' }: {
  value: boolean; onChange: (v: boolean) => void; yesLabel?: string; noLabel?: string
}) {
  return (
    <RadioGroup
      options={[{ value: 'oui', label: yesLabel }, { value: 'non', label: noLabel }]}
      value={value ? 'oui' : 'non'}
      onChange={v => onChange(v === 'oui')}
    />
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
        {saving ? 'Envoi…' : nextLabel}
      </button>
    </div>
  )
}

// ── Score LCB-FT (1–10) ───────────────────────────────────────────────────────

function calculerScoreRisque(s: KycState): number {
  let score = 2
  if (s.revenu_foyer === 'gt150k') score += 2
  else if (s.revenu_foyer === '75-150k') score += 1
  if (s.nationalite !== 'Française') score += 1
  if (s.pays !== 'France') score += 1
  if (s.fatca_us_person) score += 2
  if (s.ppe) score += 3
  if (s.ppe_entourage) score += 2
  if (s.tolerance_risque >= 4) score += 1
  if (s.objectif_investissement === 'valorisation_capital') score += 1
  const pat = parseInt(s.patrimoine_net || '0')
  if (pat > 500000 && s.revenu_foyer === 'lt25k') score += 2
  if (!s.adresse_fiscale_identique) score += 1
  return Math.min(10, score)
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function KycPage() {
  const router = useRouter()
  const [s, setS]       = useState<KycState>(init)
  const [saving, setSaving] = useState(false)
  const [done,   setDone]   = useState(false)
  const [error,  setError]  = useState('')

  const next = () => setS(p => ({ ...p, step: p.step + 1 }))
  const back = () => setS(p => ({ ...p, step: p.step - 1 }))

  const set = (k: keyof KycState) =>
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setS(p => ({ ...p, [k]: e.target.value }))

  const setVal = <K extends keyof KycState>(k: K, v: KycState[K]) =>
    setS(p => ({ ...p, [k]: v }))

  const setFile = (k: 'doc_identite' | 'doc_justif' | 'doc_rib' | 'doc_residence_fiscale' | 'doc_avis_imposition' | 'doc_origine_fonds') =>
    (e: ChangeEvent<HTMLInputElement>) =>
      setS(p => ({ ...p, [k]: e.target.files?.[0] ?? null }))

  const handleSubmit = async () => {
    setSaving(true); setError('')
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Non connecté')

      async function uploadDoc(file: File | null, name: string): Promise<string> {
        if (!file) return ''
        const ext = file.name.split('.').pop()
        const path = `${user!.id}/${name}.${ext}`
        const { error: e } = await supabase.storage
          .from('kyc-documents').upload(path, file, { upsert: true })
        if (e) throw e
        return path
      }

      const [doc_identite_url, doc_justif_url, doc_rib_url, doc_residence_fiscale_url, doc_avis_imposition_url, doc_origine_fonds_url] =
        await Promise.all([
          uploadDoc(s.doc_identite,          'identite'),
          uploadDoc(s.doc_justif,            'justificatif'),
          uploadDoc(s.doc_rib,               'rib'),
          uploadDoc(s.doc_residence_fiscale, 'residence_fiscale'),
          uploadDoc(s.doc_avis_imposition,   'avis_imposition'),
          uploadDoc(s.doc_origine_fonds,     'origine_fonds'),
        ])

      const kyc_note_risque = calculerScoreRisque(s)
      const toBool = (value: unknown) => {
        if (typeof value === 'boolean') return value
        if (typeof value === 'number') return value > 0
        if (typeof value === 'string') {
          const v = value.trim().toLowerCase()
          return v === 'true' || v === '1' || v === 'yes' || v === 'oui' || v === 'y'
        }
        return false
      }

      const { error: e } = await supabase.from('kyc').upsert({
        user_id: user.id,
        // Qualité & Identité (Q3.1)
        qualite_declarant:  s.qualite_declarant,
        civilite:           s.civilite,
        prenom:             s.prenom,
        nom:                s.nom,
        date_naissance:     s.date_naissance || null,
        pays_naissance:     s.pays_naissance,
        ville_naissance:    s.ville_naissance,
        nationalite:        s.nationalite,
        capacite_juridique: s.capacite_juridique,
        // Coordonnées
        telephone:               s.telephone,
        telephone_fixe:          s.telephone_fixe || null,
        adresse:                 s.adresse,
        code_postal:             s.code_postal,
        ville:                   s.ville,
        pays:                    s.pays,
        adresse_fiscale_identique: s.adresse_fiscale_identique,
        adresse_fiscale:         s.adresse_fiscale_identique ? null : s.adresse_fiscale,
        // Situation
        situation_familiale: s.situation_familiale,
        regime_matrimonial:  null,
        enfants_a_charge:    toBool(s.enfants_a_charge),
        nb_personnes_charge: s.nb_personnes_charge,
        situation_pro:       s.situation_pro,
        secteur_activite:    s.secteur_activite,
        csp:                 s.csp,
        // Patrimoine & Fiscalité
        revenu_foyer:        s.revenu_foyer,
        revenu_annuel:       s.revenu_foyer,  // compat legacy
        patrimoine_financier: s.patrimoine_financier,
        patrimoine_net:      s.patrimoine_net ? parseInt(s.patrimoine_net) : null,
        ifi_assujetti:       toBool(s.ifi_assujetti),
        numero_fiscal:       s.numero_fiscal || null,
        // Compliance
        fatca_us_person: toBool(s.fatca_us_person),
        ppe:             toBool(s.ppe),
        ppe_entourage:   toBool(s.ppe_entourage),
        // Profil investisseur
        objectif_investissement: s.objectif_investissement,
        horizon_placement:       s.horizon_placement,
        tolerance_risque:        s.tolerance_risque,
        perte_acceptable:        s.perte_acceptable,
        // Bancaire
        titulaire_compte: s.titulaire_compte || null,
        nom_banque:       s.nom_banque || null,
        iban:             s.iban || null,
        bic_swift:        s.bic_swift || null,
        // Documents
        ...(doc_identite_url          && { doc_identite_url }),
        ...(doc_justif_url            && { doc_justif_url }),
        ...(doc_rib_url               && { doc_rib_url }),
        ...(doc_residence_fiscale_url && { doc_residence_fiscale_url }),
        ...(doc_avis_imposition_url   && { doc_avis_imposition_url }),
        ...(doc_origine_fonds_url     && { doc_origine_fonds_url }),
        // Score & statut
        kyc_note_risque,
        statut:     'soumis',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })

      if (e) throw e

      // Rend le dossier visible dans /admin/dossiers et /admin/pipeline
      const emailClient = user.email ?? null
      const { data: existingDossier } = await supabase
        .from('dossiers')
        .select('id')
        .eq('conseiller_id', user.id)
        .eq('email_client', emailClient ?? '')
        .maybeSingle()

      let dossierId: string | null = existingDossier?.id ?? null

      if (existingDossier?.id) {
        const { error: dossierUpdateError } = await supabase
          .from('dossiers')
          .update({
            nom: s.nom,
            prenom: s.prenom,
            telephone: s.telephone || null,
            statut: 'actif',
            pipeline_stage: 'kyc_attente',
            pipeline_stage_updated_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingDossier.id)
        if (dossierUpdateError) throw dossierUpdateError
      } else {
        const { data: newDossier, error: dossierInsertError } = await supabase
          .from('dossiers')
          .insert({
            conseiller_id: user.id,
            nom: s.nom,
            prenom: s.prenom,
            email_client: emailClient,
            telephone: s.telephone || null,
            statut: 'actif',
            pipeline_stage: 'kyc_attente',
            pipeline_stage_updated_at: new Date().toISOString(),
          })
          .select('id')
          .single()
        if (dossierInsertError) throw dossierInsertError
        dossierId = newDossier?.id ?? null
      }

      // Créer le verrou V1 (kyc_validation) si pas déjà actif.
      if (dossierId) {
        const { data: existingGate } = await supabase
          .from('validation_gates')
          .select('id')
          .eq('dossier_id', dossierId)
          .eq('gate_type', 'kyc_validation')
          .in('decision', ['pending', 'approved'])
          .maybeSingle()
        if (!existingGate) {
          await supabase.from('validation_gates').insert({
            dossier_id: dossierId,
            gate_type: 'kyc_validation',
            decision: 'pending',
          })
        }
      }

      setDone(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la soumission')
    } finally {
      setSaving(false)
    }
  }

  // ── Done ─────────────────────────────────────────────────────────────────────

  if (done) {
    return (
      <div style={{ minHeight: '100vh', background: CREAM }}>
        <AmanaHeader backHref="/dashboard" backLabel="Dashboard" />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 24px' }}>
          <div style={{ ...card, textAlign: 'center', maxWidth: 480 }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'rgba(68,75,63,0.1)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 24px', fontSize: 28, color: FOREST,
            }}>✓</div>
            <h2 style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: 32, color: FOREST, fontWeight: 400, margin: '0 0 12px',
            }}>
              Dossier soumis
            </h2>
            <p style={{ color: '#6d7368', fontSize: 14, marginBottom: 32, lineHeight: 1.7, fontFamily: "'Inter', system-ui, sans-serif" }}>
              Votre dossier KYC est en cours de vérification.<br />
              Vous recevrez une confirmation sous 24–48h.
            </p>
            <a
              href="/dashboard"
              style={{ ...btnPrimary, textDecoration: 'none', display: 'inline-block' }}
            >
              Retour à mon espace
            </a>
          </div>
        </div>
      </div>
    )
  }

  // ── Layout ───────────────────────────────────────────────────────────────────

  const progress = (s.step / TOTAL_STEPS) * 100

  return (
    <div style={{ minHeight: '100vh', background: CREAM, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        input:focus, select:focus { border-color: ${FOREST} !important; box-shadow: 0 0 0 3px rgba(68,75,63,0.1) !important; outline: none; }
        @media (max-width: 640px) { .kyc-card { padding: 32px 20px !important; } .kyc-grid2 { grid-template-columns: 1fr !important; } }
      `}</style>

      <AmanaHeader />

      {/* Barre de progression */}
      <div style={{ height: 3, background: '#e8dfc8' }}>
        <div style={{ height: '100%', background: GOLD, width: `${progress}%`, transition: 'width 0.35s ease' }} />
      </div>

      {/* Sous-header hero */}
      <div style={{ background: FOREST, padding: '20px 24px 24px' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>
            Dossier KYC
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 22, color: 'white', fontWeight: 400 }}>
              {[
                '', 'Identité', 'Coordonnées', 'Situation personnelle',
                'Patrimoine & Conformité', 'Profil investisseur',
                'Coordonnées bancaires', 'Justificatifs',
              ][s.step]}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em' }}>
              {s.step} / {TOTAL_STEPS}
            </div>
          </div>
          {/* Dots */}
          <div style={{ display: 'flex', gap: 6, marginTop: 16 }}>
            {Array.from({ length: TOTAL_STEPS }, (_, i) => (
              <div key={i} style={{
                height: 4, flex: 1, borderRadius: 2,
                background: i < s.step ? GOLD : 'rgba(255,255,255,0.15)',
                transition: 'background 0.3s',
              }} />
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 24px 72px' }}>

        {/* ── ÉTAPE 1 — IDENTITÉ ──────────────────────────────────────────── */}
        {s.step === 1 && (
          <div className="kyc-card" style={card}>
            <StepBadge step={1} label="Identité" />
            <H>Votre identité</H>
            <Sub>Informations requises pour la conformité réglementaire (LCB-FT / DDA).</Sub>

            {/* Q3.1 — Qualité du déclarant */}
            <Field label="Qualité du déclarant *">
              <RadioGroup
                options={[
                  { value: 'client',               label: 'Client (pour moi-même)' },
                  { value: 'mandataire',            label: 'Mandataire (pour le compte d\'un tiers)' },
                  { value: 'beneficiaire_effectif', label: 'Bénéficiaire effectif' },
                  { value: 'payeur_prime',          label: 'Payeur de prime' },
                ]}
                value={s.qualite_declarant}
                onChange={v => setVal('qualite_declarant', v as KycState['qualite_declarant'])}
              />
              {s.qualite_declarant === 'mandataire' && (
                <div style={{ ...alertBox, marginTop: 8 }}>
                  Un pouvoir de représentation signé sera requis à l'étape Documents.
                </div>
              )}
            </Field>

            <Field label="Civilité">
              <RadioGroup
                options={[{ value: 'M.', label: 'M.' }, { value: 'Mme', label: 'Mme' }]}
                value={s.civilite}
                onChange={v => setVal('civilite', v)}
              />
            </Field>

            <div className="kyc-grid2" style={grid2}>
              <Field label="Nom *"><input style={inp} value={s.nom} onChange={set('nom')} placeholder="Mosbahi" /></Field>
              <Field label="Prénom *"><input style={inp} value={s.prenom} onChange={set('prenom')} placeholder="Mohamed" /></Field>
            </div>

            <Field label="Date de naissance *">
              <input type="date" style={inp} value={s.date_naissance} onChange={set('date_naissance')} />
            </Field>

            <div className="kyc-grid2" style={grid2}>
              <Field label="Pays de naissance *">
                <input style={inp} value={s.pays_naissance} onChange={set('pays_naissance')} placeholder="France" />
              </Field>
              <Field label="Ville de naissance *">
                <input style={inp} value={s.ville_naissance} onChange={set('ville_naissance')} placeholder="Paris" />
              </Field>
            </div>

            <Field label="Nationalité *">
              <select style={sel} value={s.nationalite} onChange={set('nationalite')}>
                <option>Française</option>
                <option>Marocaine</option>
                <option>Algérienne</option>
                <option>Tunisienne</option>
                <option>Sénégalaise</option>
                <option>Mauritanienne</option>
                <option>Autre</option>
              </select>
            </Field>

            <Field label="Capacité juridique">
              <select style={sel} value={s.capacite_juridique} onChange={set('capacite_juridique')}>
                <option value="majeur">Majeur(e) capable</option>
                <option value="tutelle">Sous tutelle</option>
                <option value="curatelle">Sous curatelle</option>
              </select>
            </Field>

            <Nav
              onNext={next}
              disabled={!s.nom || !s.prenom || !s.date_naissance || !s.ville_naissance}
            />
          </div>
        )}

        {/* ── ÉTAPE 2 — COORDONNÉES ───────────────────────────────────────── */}
        {s.step === 2 && (
          <div className="kyc-card" style={card}>
            <StepBadge step={2} label="Coordonnées" />
            <H>Vos coordonnées</H>
            <Sub>Adresse et téléphone utilisés pour l'envoi de documents et la facturation.</Sub>

            <div className="kyc-grid2" style={grid2}>
              <Field label="Téléphone mobile *">
                <input style={inp} value={s.telephone} onChange={set('telephone')} placeholder="+33 6 00 00 00 00" />
              </Field>
              <Field label="Téléphone fixe">
                <input style={inp} value={s.telephone_fixe} onChange={set('telephone_fixe')} placeholder="+33 1 00 00 00 00" />
              </Field>
            </div>

            <Field label="Adresse *">
              <input style={inp} value={s.adresse} onChange={set('adresse')} placeholder="12 rue de la Paix" />
            </Field>

            <div className="kyc-grid2" style={grid2}>
              <Field label="Code postal *">
                <input style={inp} value={s.code_postal} onChange={set('code_postal')} placeholder="75001" />
              </Field>
              <Field label="Ville *">
                <input style={inp} value={s.ville} onChange={set('ville')} placeholder="Paris" />
              </Field>
            </div>

            <Field label="Pays de résidence">
              <select style={sel} value={s.pays} onChange={set('pays')}>
                <option>France</option>
                <option>Belgique</option>
                <option>Suisse</option>
                <option>Luxembourg</option>
                <option>Maroc</option>
                <option>Algérie</option>
                <option>Tunisie</option>
                <option>Autre</option>
              </select>
            </Field>

            <Field label="Adresse fiscale identique à l'adresse principale ?">
              <BoolToggle value={s.adresse_fiscale_identique} onChange={v => setVal('adresse_fiscale_identique', v)} />
            </Field>

            {!s.adresse_fiscale_identique && (
              <Field label="Adresse fiscale complète">
                <input style={inp} value={s.adresse_fiscale} onChange={set('adresse_fiscale')} placeholder="Adresse fiscale complète" />
              </Field>
            )}

            <Nav
              onBack={back}
              onNext={next}
              disabled={!s.telephone || !s.adresse || !s.code_postal || !s.ville}
            />
          </div>
        )}

        {/* ── ÉTAPE 3 — SITUATION PERSONNELLE ─────────────────────────────── */}
        {s.step === 3 && (
          <div className="kyc-card" style={card}>
            <StepBadge step={3} label="Situation personnelle" />
            <H>Votre situation</H>
            <Sub>Situation familiale et professionnelle pour l'établissement de votre profil.</Sub>

            <Field label="Situation familiale *">
              <select style={sel} value={s.situation_familiale} onChange={set('situation_familiale')}>
                <option value="">Sélectionnez</option>
                <option value="celibataire">Célibataire</option>
                <option value="marie">Marié(e)</option>
                <option value="pacse">Pacsé(e)</option>
                <option value="divorce">Divorcé(e)</option>
                <option value="veuf">Veuf / Veuve</option>
                <option value="separe">Séparé(e)</option>
              </select>
            </Field>

            <div className="kyc-grid2" style={grid2}>
              <Field label="Enfants à charge">
                <input type="number" style={inp} min={0} max={20}
                  value={s.enfants_a_charge}
                  onChange={e => setVal('enfants_a_charge', parseInt(e.target.value) || 0)} />
              </Field>
              <Field label="Total personnes à charge">
                <input type="number" style={inp} min={0} max={20}
                  value={s.nb_personnes_charge}
                  onChange={e => setVal('nb_personnes_charge', parseInt(e.target.value) || 0)} />
              </Field>
            </div>

            <Field label="Situation professionnelle *">
              <select style={sel} value={s.situation_pro} onChange={set('situation_pro')}>
                <option value="">Sélectionnez</option>
                <option value="salarie">Salarié(e)</option>
                <option value="independant">Indépendant / Entrepreneur</option>
                <option value="liberal">Profession libérale</option>
                <option value="fonctionnaire">Fonctionnaire</option>
                <option value="retraite">Retraité(e)</option>
                <option value="sans_emploi">Sans emploi</option>
                <option value="etudiant">Étudiant(e)</option>
              </select>
            </Field>

            <Field label="Secteur d'activité">
              <input style={inp} value={s.secteur_activite} onChange={set('secteur_activite')} placeholder="ex : Finance, Santé, BTP…" />
            </Field>

            <Field label="Catégorie socio-professionnelle (CSP)">
              <select style={sel} value={s.csp} onChange={set('csp')}>
                <option value="">Sélectionnez</option>
                <option value="23">Chef d'entreprise (10+ salariés)</option>
                <option value="21">Artisan</option>
                <option value="22">Commerçant</option>
                <option value="31">Profession libérale</option>
                <option value="37">Cadre administratif et commercial</option>
                <option value="38">Ingénieur et cadre technique</option>
                <option value="33">Cadre de la fonction publique</option>
                <option value="34">Professeur, scientifique</option>
                <option value="46">Profession intermédiaire</option>
                <option value="54">Employé administratif</option>
                <option value="62">Ouvrier qualifié</option>
                <option value="71">Retraité ex-cadre</option>
                <option value="75">Retraité ex-employé / ouvrier</option>
                <option value="83">Sans activité professionnelle</option>
              </select>
            </Field>

            <Nav
              onBack={back}
              onNext={next}
              disabled={!s.situation_familiale || !s.situation_pro}
            />
          </div>
        )}

        {/* ── ÉTAPE 4 — PATRIMOINE & CONFORMITÉ ──────────────────────────── */}
        {s.step === 4 && (
          <div className="kyc-card" style={card}>
            <StepBadge step={4} label="Patrimoine & Conformité" />
            <H>Situation patrimoniale</H>
            <Sub>Ces informations sont couvertes par notre secret professionnel et utilisées uniquement à des fins réglementaires.</Sub>

            <Field label="Revenu net annuel du foyer fiscal *">
              <select style={sel} value={s.revenu_foyer} onChange={set('revenu_foyer')}>
                <option value="">Sélectionnez</option>
                <option value="lt25k">Inférieur à 25 000 €</option>
                <option value="25-50k">Entre 25 001 € et 50 000 €</option>
                <option value="50-75k">Entre 50 001 € et 75 000 €</option>
                <option value="75-150k">Entre 75 001 € et 150 000 €</option>
                <option value="gt150k">Supérieur à 150 000 €</option>
              </select>
            </Field>

            <Field label="Patrimoine financier estimé *">
              <select style={sel} value={s.patrimoine_financier} onChange={set('patrimoine_financier')}>
                <option value="">Sélectionnez</option>
                <option value="lt25k">Inférieur à 25 000 €</option>
                <option value="25-75k">De 25 001 € à 75 000 €</option>
                <option value="75-250k">De 75 001 € à 250 000 €</option>
                <option value="gt250k">Supérieur à 250 000 €</option>
              </select>
            </Field>

            <Field label="Patrimoine net global estimé (€)">
              <input type="number" style={inp} value={s.patrimoine_net}
                onChange={set('patrimoine_net')} placeholder="ex : 150 000" min={0} />
            </Field>

            <Field label="Êtes-vous assujetti à l'IFI ?">
              <BoolToggle value={s.ifi_assujetti} onChange={v => setVal('ifi_assujetti', v)} />
            </Field>

            <Field label="Numéro fiscal (NIF)">
              <input style={inp} value={s.numero_fiscal} onChange={set('numero_fiscal')}
                placeholder="13 chiffres — requis pour les contrats d'assurance-vie" />
            </Field>

            <div style={{ margin: '28px 0 6px', borderTop: '1px solid #e8dfc8', paddingTop: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: FOREST, letterSpacing: '0.05em', textTransform: 'uppercase', fontFamily: "'Inter', system-ui, sans-serif" }}>
                Conformité LCB-FT
              </div>
            </div>

            <Field label="Êtes-vous une US Person (FATCA) ?">
              <BoolToggle value={s.fatca_us_person} onChange={v => setVal('fatca_us_person', v)} />
              <div style={infoBox}>
                Vous êtes US Person si vous êtes citoyen américain, résident fiscal américain, ou avez séjourné +183 jours aux États-Unis sur les 3 dernières années.
              </div>
            </Field>

            <Field label="Êtes-vous une Personne Politiquement Exposée (PPE) ?">
              <BoolToggle value={s.ppe} onChange={v => setVal('ppe', v)} />
              <div style={infoBox}>
                Une PPE exerce ou a exercé (moins d'un an) des fonctions publiques importantes : chef d'État, parlementaire, dirigeant d'institution internationale…
              </div>
            </Field>

            <Field label="Votre entourage proche est-il une PPE ?">
              <BoolToggle value={s.ppe_entourage} onChange={v => setVal('ppe_entourage', v)} />
            </Field>

            <Nav
              onBack={back}
              onNext={next}
              disabled={!s.revenu_foyer || !s.patrimoine_financier}
            />
          </div>
        )}

        {/* ── ÉTAPE 5 — PROFIL INVESTISSEUR ──────────────────────────────── */}
        {s.step === 5 && (
          <div className="kyc-card" style={card}>
            <StepBadge step={5} label="Profil investisseur" />
            <H>Votre profil</H>
            <Sub>Requis par la directive MIF2 pour adapter nos recommandations.</Sub>
            <div style={alertBox}>
              Ces informations servent à établir votre Rapport d'Adéquation, document réglementaire attestant que les produits conseillés correspondent à votre situation et vos objectifs.
            </div>

            <Field label="Objectif principal d'investissement *">
              <select style={sel} value={s.objectif_investissement} onChange={set('objectif_investissement')}>
                <option value="">Sélectionnez</option>
                <option value="revenu_complementaire">Revenu complémentaire</option>
                <option value="valorisation_capital">Valorisation du capital</option>
                <option value="retraite">Préparation de la retraite</option>
                <option value="diversification">Construction / Diversification</option>
                <option value="transmission">Transmission de patrimoine</option>
                <option value="optimisation_fiscale">Optimisation fiscale</option>
              </select>
            </Field>

            <Field label="Montant envisagé à investir *">
              <select style={sel} value={s.perte_acceptable} onChange={set('perte_acceptable')}>
                <option value="">Sélectionnez</option>
                <option value="5-25k">De 5 000 € à 25 000 €</option>
                <option value="25-50k">De 25 001 € à 50 000 €</option>
                <option value="50-100k">De 50 001 € à 100 000 €</option>
                <option value="100-150k">De 100 001 € à 150 000 €</option>
                <option value="gt150k">Supérieur à 150 000 €</option>
              </select>
            </Field>

            <Field label="Durée envisagée de placement *">
              <select style={sel} value={s.horizon_placement} onChange={set('horizon_placement')}>
                <option value="">Sélectionnez</option>
                <option value="lt1y">Moins d'1 an</option>
                <option value="1-3y">De 1 à 3 ans</option>
                <option value="3-5y">De 3 à 5 ans</option>
                <option value="5-8y">De 5 à 8 ans</option>
                <option value="gt8y">Plus de 8 ans</option>
              </select>
            </Field>

            <div style={{ marginTop: 20 }}>
              <label style={lbl}>
                Tolérance au risque —&nbsp;
                <span style={{ color: GOLD }}>
                  {['', 'Très prudent', 'Prudent', 'Équilibré', 'Dynamique', 'Agressif'][s.tolerance_risque]}
                </span>
              </label>
              <input
                type="range" min={1} max={5} step={1}
                value={s.tolerance_risque}
                onChange={e => setVal('tolerance_risque', parseInt(e.target.value))}
                style={{ width: '100%', accentColor: GOLD, marginTop: 8, cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#8a9a89', marginTop: 4, fontFamily: "'Inter', system-ui, sans-serif" }}>
                <span>Très prudent</span><span>Agressif</span>
              </div>
            </div>

            <Nav
              onBack={back}
              onNext={next}
              disabled={!s.objectif_investissement || !s.horizon_placement || !s.perte_acceptable}
            />
          </div>
        )}

        {/* ── ÉTAPE 6 — COORDONNÉES BANCAIRES ────────────────────────────── */}
        {s.step === 6 && (
          <div className="kyc-card" style={card}>
            <StepBadge step={6} label="Coordonnées bancaires" />
            <H>Vos coordonnées bancaires</H>
            <Sub>Nécessaires pour les versements de revenus et les remboursements éventuels.</Sub>

            <Field label="Titulaire du compte *">
              <input style={inp} value={s.titulaire_compte} onChange={set('titulaire_compte')} placeholder="Prénom Nom" />
            </Field>

            <Field label="Nom de la banque *">
              <input style={inp} value={s.nom_banque} onChange={set('nom_banque')} placeholder="ex : BNP Paribas, Crédit Agricole…" />
            </Field>

            <Field label="IBAN (facultatif)">
              <input
                value={s.iban} onChange={set('iban')}
                placeholder="FR76 0000 0000 0000 0000 0000 000"
                style={{ ...inp, letterSpacing: '0.06em', fontFamily: 'monospace' }}
              />
            </Field>

            <Field label="BIC / SWIFT">
              <input
                value={s.bic_swift} onChange={set('bic_swift')}
                placeholder="ex : BNPAFRPP"
                style={{ ...inp, textTransform: 'uppercase', fontFamily: 'monospace' }}
              />
            </Field>

            <div style={infoBox}>Un RIB vous sera demandé à l'étape suivante pour confirmer ces informations.</div>

            <Nav
              onBack={back}
              onNext={next}
              disabled={!s.titulaire_compte || !s.nom_banque}
            />
          </div>
        )}

        {/* ── ÉTAPE 7 — DOCUMENTS ─────────────────────────────────────────── */}
        {s.step === 7 && (
          <div className="kyc-card" style={card}>
            <StepBadge step={7} label="Justificatifs" />
            <H>Vos documents</H>
            <Sub>PDF, JPG ou PNG — max 7 Mo par fichier.</Sub>
            <div style={alertBox}>
              Vous pouvez soumettre votre dossier même si certains documents ne sont pas encore disponibles. La validation n'interviendra qu'une fois tous les justificatifs reçus.
            </div>

            {[
              {
                key:      'doc_identite' as const,
                title:    "Pièce d'identité *",
                desc:     "Carte nationale d'identité (recto-verso) ou passeport en cours de validité",
                required: true,
                show:     true,
              },
              {
                key:      'doc_justif' as const,
                title:    'Justificatif de domicile *',
                desc:     'Facture de moins de 3 mois (eau, électricité, gaz, internet, téléphone fixe)',
                required: true,
                show:     true,
              },
              {
                key:      'doc_rib' as const,
                title:    'RIB — Relevé d\'Identité Bancaire',
                desc:     'Requis pour toute souscription (versements et remboursements)',
                required: false,
                show:     true,
              },
              {
                key:      'doc_residence_fiscale' as const,
                title:    'Justificatif de résidence fiscale',
                desc:     'Requis si votre résidence fiscale est hors de France',
                required: false,
                show:     !s.adresse_fiscale_identique,
              },
              {
                key:      'doc_avis_imposition' as const,
                title:    'Dernier avis d\'imposition *',
                desc:     'Avis d\'imposition sur le revenu (ou de non-imposition) — article L.561-5 CMF',
                required: true,
                show:     true,
              },
              {
                key:      'doc_origine_fonds' as const,
                title:    'Justificatif d\'origine des fonds',
                desc:     'Tout document attestant l\'origine licite des fonds à investir (bulletin de salaire, acte de vente, donation notariée…)',
                required: false,
                show:     true,
              },
            ].filter(d => d.show).map(({ key, title, desc }) => (
              <div key={key} style={{
                border: `1.5px dashed ${s[key] ? GOLD : '#ddd5c8'}`,
                borderRadius: 12, padding: 20, marginTop: 16,
                background: s[key] ? 'rgba(201,165,90,0.04)' : 'white',
                transition: 'border-color 0.15s',
              }}>
                <div style={{ fontWeight: 600, color: FOREST, marginBottom: 4, fontSize: 14, fontFamily: "'Inter', system-ui, sans-serif" }}>
                  {title}
                </div>
                <div style={{ fontSize: 12, color: '#8a9a89', marginBottom: 12, lineHeight: 1.5, fontFamily: "'Inter', system-ui, sans-serif" }}>
                  {desc}
                </div>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={setFile(key)}
                  style={{ fontSize: 13, color: FOREST, fontFamily: "'Inter', system-ui, sans-serif" }}
                />
                {s[key] && (
                  <div style={{ marginTop: 8, fontSize: 12, color: GOLD, fontWeight: 600 }}>
                    ✓ {(s[key] as File).name}
                  </div>
                )}
              </div>
            ))}

            {error && (
              <div style={{
                background: '#fde8e8', border: '1px solid #f5c6c6',
                borderRadius: 8, padding: '12px 16px', marginTop: 20,
                fontSize: 13, color: '#c0392b',
                fontFamily: "'Inter', system-ui, sans-serif",
              }}>
                {error}
              </div>
            )}

            <Nav
              onBack={back}
              onNext={handleSubmit}
              nextLabel="Soumettre mon dossier"
              disabled={!s.doc_identite || !s.doc_justif || !s.doc_avis_imposition}
              saving={saving}
            />
          </div>
        )}

      </div>
    </div>
  )
}
