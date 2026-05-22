'use client'

// app/profile/page.tsx
// Espace profil unifié — remplace /kyc comme formulaire principal.
// • Pré-remplit depuis onboarding_sessions si aucun KYC en base
// • Sauvegarde section par section via /api/profile/save-section
// • Sections accordion éditables indépendamment

import { useEffect, useState, type ChangeEvent } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import AmanaHeader from '@/components/amana-header'

const FOREST = '#3a4d39'
const GOLD   = '#c9a55a'
const CREAM  = '#f8f4ec'
const DARK   = '#2a3829'

// ─── types ────────────────────────────────────────────────────────────────────

type SectionId = 'identite' | 'coordonnees' | 'situation' | 'patrimoine' | 'profil_investisseur' | 'banque' | 'documents'

type ProfileData = {
  // identite
  qualite_declarant: string
  civilite: string
  prenom: string
  nom: string
  date_naissance: string
  pays_naissance: string
  ville_naissance: string
  nationalite: string
  capacite_juridique: string
  // coordonnees
  telephone: string
  telephone_fixe: string
  adresse: string
  code_postal: string
  ville: string
  pays: string
  adresse_fiscale_identique: boolean
  adresse_fiscale: string
  // situation
  situation_familiale: string
  regime_matrimonial: string
  enfants_a_charge: number
  nb_personnes_charge: number
  situation_pro: string
  secteur_activite: string
  csp: string
  // patrimoine
  revenu_foyer: string
  patrimoine_financier: string
  patrimoine_net: string
  ifi_assujetti: boolean
  numero_fiscal: string
  fatca_us_person: boolean
  ppe: boolean
  ppe_entourage: boolean
  // profil investisseur
  objectif_investissement: string
  horizon_placement: string
  tolerance_risque: number
  perte_acceptable: string
  // banque
  titulaire_compte: string
  nom_banque: string
  iban: string
  bic_swift: string
  // documents (URLs depuis storage)
  doc_identite_url: string
  doc_justif_url: string
  doc_rib_url: string
  doc_avis_imposition_url: string
  doc_origine_fonds_url: string
}

const EMPTY: ProfileData = {
  qualite_declarant: 'client', civilite: 'M.', prenom: '', nom: '',
  date_naissance: '', pays_naissance: 'France', ville_naissance: '', nationalite: 'Française',
  capacite_juridique: 'majeur',
  telephone: '', telephone_fixe: '', adresse: '', code_postal: '', ville: '', pays: 'France',
  adresse_fiscale_identique: true, adresse_fiscale: '',
  situation_familiale: '', regime_matrimonial: '', enfants_a_charge: 0, nb_personnes_charge: 0,
  situation_pro: '', secteur_activite: '', csp: '',
  revenu_foyer: '', patrimoine_financier: '', patrimoine_net: '',
  ifi_assujetti: false, numero_fiscal: '', fatca_us_person: false, ppe: false, ppe_entourage: false,
  objectif_investissement: '', horizon_placement: '', tolerance_risque: 2, perte_acceptable: '',
  titulaire_compte: '', nom_banque: '', iban: '', bic_swift: '',
  doc_identite_url: '', doc_justif_url: '', doc_rib_url: '', doc_avis_imposition_url: '', doc_origine_fonds_url: '',
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function isSectionComplete(id: SectionId, d: ProfileData): boolean {
  switch (id) {
    case 'identite':           return !!(d.prenom && d.nom && d.date_naissance && d.ville_naissance)
    case 'coordonnees':        return !!(d.telephone && d.adresse && d.code_postal && d.ville)
    case 'situation':          return !!(d.situation_familiale && d.situation_pro)
    case 'patrimoine':         return !!(d.revenu_foyer && d.patrimoine_net)
    case 'profil_investisseur':return !!(d.objectif_investissement && d.horizon_placement)
    case 'banque':             return !!(d.titulaire_compte && d.nom_banque)
    case 'documents':          return !!(d.doc_identite_url && d.doc_justif_url && d.doc_avis_imposition_url)
  }
}

const SECTIONS: { id: SectionId; label: string; desc: string }[] = [
  { id: 'identite',            label: 'Identité',              desc: 'État civil, nationalité, date de naissance' },
  { id: 'coordonnees',         label: 'Coordonnées',           desc: 'Adresse, téléphone, résidence fiscale' },
  { id: 'situation',           label: 'Situation personnelle', desc: 'Famille, profession, secteur d\'activité' },
  { id: 'patrimoine',          label: 'Patrimoine & Conformité', desc: 'Revenus, patrimoine, FATCA, PPE' },
  { id: 'profil_investisseur', label: 'Profil investisseur',   desc: 'Objectifs, horizon, tolérance au risque' },
  { id: 'banque',              label: 'Coordonnées bancaires', desc: 'IBAN, BIC, titulaire' },
  { id: 'documents',           label: 'Pièces justificatives', desc: 'Identité, domicile, RIB, avis d\'imposition' },
]

// ─── styles ───────────────────────────────────────────────────────────────────

const inp = {
  width: '100%', padding: '10px 13px', border: '1.5px solid #ddd5c8', borderRadius: 8,
  fontSize: 14, boxSizing: 'border-box' as const, background: CREAM, color: DARK,
  fontFamily: "'Inter', system-ui, sans-serif",
}
const sel = { ...inp, background: 'white', cursor: 'pointer' }
const lbl = {
  display: 'block', fontSize: 11, fontWeight: 600, color: '#5a6a59',
  textTransform: 'uppercase' as const, letterSpacing: '0.1em',
  marginBottom: 5, marginTop: 14, fontFamily: "'Inter', system-ui, sans-serif",
}
const grid2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label style={lbl}>{label}</label>{children}</div>
}

function Radio({ options, value, onChange }: {
  options: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
      {options.map(o => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)} style={{
          padding: '7px 16px', borderRadius: 20, fontSize: 13, cursor: 'pointer',
          border: value === o.value ? `2px solid ${FOREST}` : '1.5px solid #ddd5c8',
          background: value === o.value ? FOREST : 'white',
          color: value === o.value ? 'white' : '#4a5e49',
          fontFamily: "'Inter', system-ui, sans-serif",
        }}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

// ─── section accordion ────────────────────────────────────────────────────────

function SectionCard({
  section, data, isOpen, onToggle, onSave, saving,
}: {
  section: typeof SECTIONS[0]
  data: ProfileData
  isOpen: boolean
  onToggle: () => void
  onSave: (section: SectionId, patch: Partial<ProfileData>) => Promise<void>
  saving: boolean
}) {
  const complete = isSectionComplete(section.id, data)
  const [local, setLocal] = useState<ProfileData>(data)
  const [docFiles, setDocFiles] = useState<Record<string, File | null>>({})
  const [uploading, setUploading] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => { setLocal(data) }, [data])

  const set = (k: keyof ProfileData) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setLocal(p => ({ ...p, [k]: e.target.value }))
  const setV = <K extends keyof ProfileData>(k: K, v: ProfileData[K]) =>
    setLocal(p => ({ ...p, [k]: v }))

  async function handleSave() {
    if (section.id === 'documents') {
      await saveDocuments()
      return
    }
    await onSave(section.id, local)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  async function saveDocuments() {
    setUploading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const uploads: Record<string, string> = {}
      for (const [key, file] of Object.entries(docFiles)) {
        if (!file) continue
        const ext = file.name.split('.').pop()
        const path = `${user.id}/${key}.${ext}`
        const { error } = await supabase.storage.from('kyc-documents').upload(path, file, { upsert: true })
        if (!error) uploads[`${key}_url`] = path
      }

      if (Object.keys(uploads).length > 0) {
        await supabase.from('kyc').upsert(
          { user_id: user.id, ...uploads, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' }
        )
        setLocal(p => ({ ...p, ...uploads }))
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
      }
    } finally {
      setUploading(false)
    }
  }

  return (
    <div style={{
      background: 'white', borderRadius: 14,
      border: `1px solid ${isOpen ? GOLD : complete ? '#c8dac8' : '#e8e0d0'}`,
      overflow: 'hidden', transition: 'border-color 0.2s',
      boxShadow: isOpen ? '0 4px 24px rgba(201,165,90,0.1)' : '0 1px 4px rgba(0,0,0,0.04)',
    }}>
      {/* Header */}
      <button
        onClick={onToggle}
        style={{
          width: '100%', padding: '18px 22px', background: 'none', border: 'none',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 12, textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
            background: complete ? '#e8f5e9' : isOpen ? 'rgba(201,165,90,0.1)' : '#f5f3ef',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14,
          }}>
            {complete ? '✓' : <span style={{ color: GOLD }}>○</span>}
          </div>
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 17, color: FOREST, fontWeight: 500 }}>
              {section.label}
            </div>
            <div style={{ fontSize: 12, color: '#8a9a89', fontFamily: "'Inter', system-ui, sans-serif", marginTop: 2 }}>
              {section.desc}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {complete && !isOpen && (
            <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: '#e8f5e9', color: '#2e7d32', fontWeight: 700, fontFamily: "'Inter', system-ui, sans-serif" }}>
              Complété
            </span>
          )}
          <span style={{ fontSize: 18, color: '#aaa', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>⌄</span>
        </div>
      </button>

      {/* Body */}
      {isOpen && (
        <div style={{ padding: '0 22px 24px', borderTop: '1px solid #f0ebe0' }}>

          {/* ── IDENTITÉ ── */}
          {section.id === 'identite' && (<>
            <F label="Qualité du déclarant">
              <Radio
                options={[
                  { value: 'client', label: 'Client (pour moi-même)' },
                  { value: 'mandataire', label: 'Mandataire' },
                  { value: 'beneficiaire_effectif', label: 'Bénéficiaire effectif' },
                ]}
                value={local.qualite_declarant}
                onChange={v => setV('qualite_declarant', v)}
              />
            </F>
            <F label="Civilité">
              <Radio
                options={[{ value: 'M.', label: 'M.' }, { value: 'Mme', label: 'Mme' }]}
                value={local.civilite}
                onChange={v => setV('civilite', v)}
              />
            </F>
            <div style={grid2}>
              <F label="Nom *"><input style={inp} value={local.nom} onChange={set('nom')} placeholder="Mosbahi" /></F>
              <F label="Prénom *"><input style={inp} value={local.prenom} onChange={set('prenom')} placeholder="Mohamed" /></F>
            </div>
            <F label="Date de naissance *">
              <input type="date" style={inp} value={local.date_naissance} onChange={set('date_naissance')} />
            </F>
            <div style={grid2}>
              <F label="Pays de naissance *">
                <input style={inp} value={local.pays_naissance} onChange={set('pays_naissance')} placeholder="France" />
              </F>
              <F label="Ville de naissance *">
                <input style={inp} value={local.ville_naissance} onChange={set('ville_naissance')} placeholder="Paris" />
              </F>
            </div>
            <F label="Nationalité *">
              <select style={sel} value={local.nationalite} onChange={set('nationalite')}>
                {['Française','Marocaine','Algérienne','Tunisienne','Sénégalaise','Mauritanienne','Autre'].map(n => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </F>
            <F label="Capacité juridique">
              <select style={sel} value={local.capacite_juridique} onChange={set('capacite_juridique')}>
                <option value="majeur">Majeur(e) capable</option>
                <option value="tutelle">Sous tutelle</option>
                <option value="curatelle">Sous curatelle</option>
              </select>
            </F>
          </>)}

          {/* ── COORDONNÉES ── */}
          {section.id === 'coordonnees' && (<>
            <div style={grid2}>
              <F label="Téléphone mobile *">
                <input style={inp} value={local.telephone} onChange={set('telephone')} placeholder="+33 6 00 00 00 00" />
              </F>
              <F label="Téléphone fixe">
                <input style={inp} value={local.telephone_fixe} onChange={set('telephone_fixe')} placeholder="+33 1 00 00 00 00" />
              </F>
            </div>
            <F label="Adresse *">
              <input style={inp} value={local.adresse} onChange={set('adresse')} placeholder="12 rue de la Paix" />
            </F>
            <div style={grid2}>
              <F label="Code postal *"><input style={inp} value={local.code_postal} onChange={set('code_postal')} placeholder="75001" /></F>
              <F label="Ville *"><input style={inp} value={local.ville} onChange={set('ville')} placeholder="Paris" /></F>
            </div>
            <F label="Pays de résidence">
              <select style={sel} value={local.pays} onChange={set('pays')}>
                {['France','Belgique','Suisse','Luxembourg','Maroc','Algérie','Tunisie','Autre'].map(p => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </F>
            <F label="Adresse fiscale identique à l'adresse postale">
              <Radio
                options={[{ value: 'oui', label: 'Oui' }, { value: 'non', label: 'Non — adresse différente' }]}
                value={local.adresse_fiscale_identique ? 'oui' : 'non'}
                onChange={v => setV('adresse_fiscale_identique', v === 'oui')}
              />
            </F>
            {!local.adresse_fiscale_identique && (
              <F label="Adresse fiscale complète *">
                <input style={inp} value={local.adresse_fiscale} onChange={set('adresse_fiscale')} placeholder="Adresse fiscale à l'étranger" />
              </F>
            )}
          </>)}

          {/* ── SITUATION ── */}
          {section.id === 'situation' && (<>
            <F label="Situation familiale *">
              <select style={sel} value={local.situation_familiale} onChange={set('situation_familiale')}>
                <option value="">— Choisir —</option>
                <option value="celibataire">Célibataire</option>
                <option value="marie_communaute_reduite">Marié(e) — communauté réduite aux acquêts</option>
                <option value="marie_separation_biens">Marié(e) — séparation de biens</option>
                <option value="marie_communaute_universelle">Marié(e) — communauté universelle</option>
                <option value="pacs">Pacsé(e)</option>
                <option value="divorce">Divorcé(e)</option>
                <option value="veuf">Veuf / Veuve</option>
              </select>
            </F>
            <div style={grid2}>
              <F label="Enfants à charge">
                <input type="number" min={0} max={20} style={inp} value={local.enfants_a_charge}
                  onChange={e => setV('enfants_a_charge', parseInt(e.target.value) || 0)} />
              </F>
              <F label="Autres personnes à charge">
                <input type="number" min={0} max={20} style={inp} value={local.nb_personnes_charge}
                  onChange={e => setV('nb_personnes_charge', parseInt(e.target.value) || 0)} />
              </F>
            </div>
            <F label="Situation professionnelle *">
              <select style={sel} value={local.situation_pro} onChange={set('situation_pro')}>
                <option value="">— Choisir —</option>
                <option value="salarie">Salarié(e)</option>
                <option value="fonctionnaire">Fonctionnaire</option>
                <option value="independant">Indépendant / Freelance</option>
                <option value="dirigeant">Dirigeant(e) d'entreprise</option>
                <option value="profession_liberale">Profession libérale</option>
                <option value="retraite">Retraité(e)</option>
                <option value="etudiant">Étudiant(e)</option>
                <option value="sans_emploi">Sans emploi</option>
                <option value="autre">Autre</option>
              </select>
            </F>
            <F label="Secteur d'activité">
              <input style={inp} value={local.secteur_activite} onChange={set('secteur_activite')} placeholder="Finance, Santé, Éducation…" />
            </F>
            <F label="Catégorie socio-professionnelle (CSP)">
              <select style={sel} value={local.csp} onChange={set('csp')}>
                <option value="">— Optionnel —</option>
                <option value="cadre">Cadre</option>
                <option value="employe">Employé</option>
                <option value="ouvrier">Ouvrier</option>
                <option value="artisan">Artisan / Commerçant</option>
                <option value="profession_liberale">Profession libérale</option>
                <option value="retraite">Retraité</option>
                <option value="etudiant">Étudiant</option>
              </select>
            </F>
          </>)}

          {/* ── PATRIMOINE & CONFORMITÉ ── */}
          {section.id === 'patrimoine' && (<>
            <div style={{ background: '#fef9ee', border: '1px solid #e8dfc8', borderRadius: 8, padding: '10px 14px', marginTop: 14, fontSize: 12, color: '#7a6a3a', lineHeight: 1.6, fontFamily: "'Inter', system-ui, sans-serif" }}>
              Ces informations sont requises par la réglementation LCB-FT (anti-blanchiment). Elles sont strictement confidentielles et ne sont jamais partagées avec des tiers.
            </div>
            <F label="Revenus annuels du foyer *">
              <select style={sel} value={local.revenu_foyer} onChange={set('revenu_foyer')}>
                <option value="">— Choisir une tranche —</option>
                <option value="lt25k">Moins de 25 000 €</option>
                <option value="25-50k">25 000 — 50 000 €</option>
                <option value="50-75k">50 000 — 75 000 €</option>
                <option value="75-150k">75 000 — 150 000 €</option>
                <option value="gt150k">Plus de 150 000 €</option>
              </select>
            </F>
            <div style={grid2}>
              <F label="Patrimoine financier (€)">
                <input type="number" min={0} style={inp} value={local.patrimoine_financier}
                  onChange={set('patrimoine_financier')} placeholder="Ex: 50000" />
              </F>
              <F label="Patrimoine net total (€) *">
                <input type="number" min={0} style={inp} value={local.patrimoine_net}
                  onChange={set('patrimoine_net')} placeholder="Ex: 150000" />
              </F>
            </div>
            <F label="Assujetti(e) à l'IFI (Impôt sur la Fortune Immobilière) ?">
              <Radio
                options={[{ value: 'non', label: 'Non' }, { value: 'oui', label: 'Oui' }]}
                value={local.ifi_assujetti ? 'oui' : 'non'}
                onChange={v => setV('ifi_assujetti', v === 'oui')}
              />
            </F>
            <F label="Numéro fiscal (NIF)">
              <input style={inp} value={local.numero_fiscal} onChange={set('numero_fiscal')} placeholder="13 chiffres — sur votre avis d'imposition" />
            </F>
            <div style={{ marginTop: 20, borderTop: '1px solid #f0ebe0', paddingTop: 16 }}>
              <div style={{ fontSize: 12, color: '#8a9a89', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12, fontFamily: "'Inter', system-ui, sans-serif" }}>
                Questions de conformité obligatoires
              </div>
              <F label="Êtes-vous un ressortissant ou résident fiscal américain (FATCA) ?">
                <Radio
                  options={[{ value: 'non', label: 'Non' }, { value: 'oui', label: 'Oui — US Person' }]}
                  value={local.fatca_us_person ? 'oui' : 'non'}
                  onChange={v => setV('fatca_us_person', v === 'oui')}
                />
              </F>
              <F label="Êtes-vous une Personne Politiquement Exposée (PPE) ?">
                <Radio
                  options={[{ value: 'non', label: 'Non' }, { value: 'oui', label: 'Oui' }]}
                  value={local.ppe ? 'oui' : 'non'}
                  onChange={v => setV('ppe', v === 'oui')}
                />
                {local.ppe && (
                  <div style={{ background: '#fde8e8', border: '1px solid #f5c6c6', borderRadius: 8, padding: '8px 12px', marginTop: 8, fontSize: 12, color: '#c0392b', fontFamily: "'Inter', system-ui, sans-serif" }}>
                    Un entretien complémentaire sera nécessaire avant toute souscription.
                  </div>
                )}
              </F>
              <F label="Un membre proche de votre entourage est-il PPE ?">
                <Radio
                  options={[{ value: 'non', label: 'Non' }, { value: 'oui', label: 'Oui' }]}
                  value={local.ppe_entourage ? 'oui' : 'non'}
                  onChange={v => setV('ppe_entourage', v === 'oui')}
                />
              </F>
            </div>
          </>)}

          {/* ── PROFIL INVESTISSEUR ── */}
          {section.id === 'profil_investisseur' && (<>
            <div style={{ background: '#f0f5f0', border: '1px solid #c8dac8', borderRadius: 8, padding: '10px 14px', marginTop: 14, fontSize: 12, color: '#4a5e49', lineHeight: 1.6, fontFamily: "'Inter', system-ui, sans-serif" }}>
              Ces informations permettent à votre conseiller de vous proposer une allocation adaptée à votre profil (MIF2, article L.533-13 CMF).
            </div>
            <F label="Objectif principal d'investissement *">
              <select style={sel} value={local.objectif_investissement} onChange={set('objectif_investissement')}>
                <option value="">— Choisir —</option>
                <option value="protection_capital">Protection du capital</option>
                <option value="revenus_reguliers">Revenus réguliers</option>
                <option value="valorisation_capital">Valorisation du capital</option>
                <option value="transmission">Transmission patrimoniale</option>
                <option value="retraite">Préparation retraite</option>
                <option value="projet">Financement d'un projet</option>
              </select>
            </F>
            <F label="Horizon de placement *">
              <select style={sel} value={local.horizon_placement} onChange={set('horizon_placement')}>
                <option value="">— Choisir —</option>
                <option value="lt3">Court terme — moins de 3 ans</option>
                <option value="3-5">Moyen terme — 3 à 5 ans</option>
                <option value="5-10">Long terme — 5 à 10 ans</option>
                <option value="gt10">Très long terme — plus de 10 ans</option>
              </select>
            </F>
            <F label={`Tolérance au risque — ${local.tolerance_risque} / 5`}>
              <input
                type="range" min={1} max={5} step={1}
                value={local.tolerance_risque}
                onChange={e => setV('tolerance_risque', parseInt(e.target.value))}
                style={{ width: '100%', accentColor: FOREST, marginTop: 8 }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#8a9a89', marginTop: 4, fontFamily: "'Inter', system-ui, sans-serif" }}>
                <span>Très prudent</span><span>Prudent</span><span>Équilibré</span><span>Dynamique</span><span>Très dynamique</span>
              </div>
            </F>
            <F label="Perte maximale acceptable">
              <select style={sel} value={local.perte_acceptable} onChange={set('perte_acceptable')}>
                <option value="">— Choisir —</option>
                <option value="0">0% — Je ne tolère aucune perte</option>
                <option value="10">Jusqu'à 10% de perte temporaire</option>
                <option value="20">Jusqu'à 20% de perte temporaire</option>
                <option value="30">Jusqu'à 30% de perte temporaire</option>
                <option value="50">Plus de 30% — je vise la performance long terme</option>
              </select>
            </F>
          </>)}

          {/* ── BANQUE ── */}
          {section.id === 'banque' && (<>
            <div style={{ background: '#f0f5f0', border: '1px solid #c8dac8', borderRadius: 8, padding: '10px 14px', marginTop: 14, fontSize: 12, color: '#4a5e49', lineHeight: 1.6, fontFamily: "'Inter', system-ui, sans-serif" }}>
              Votre RIB est utilisé uniquement pour les versements et remboursements liés à vos investissements.
            </div>
            <F label="Titulaire du compte">
              <input style={inp} value={local.titulaire_compte} onChange={set('titulaire_compte')} placeholder="Nom complet tel qu'il apparaît sur le RIB" />
            </F>
            <F label="Nom de la banque">
              <input style={inp} value={local.nom_banque} onChange={set('nom_banque')} placeholder="Ex: BNP Paribas" />
            </F>
            <F label="IBAN (facultatif)">
              <input style={inp} value={local.iban} onChange={set('iban')} placeholder="FR76 XXXX XXXX XXXX XXXX XXXX XXX" />
            </F>
            <F label="BIC / SWIFT">
              <input style={inp} value={local.bic_swift} onChange={set('bic_swift')} placeholder="Ex: BNPAFRPP" />
            </F>
          </>)}

          {/* ── DOCUMENTS ── */}
          {section.id === 'documents' && (<>
            <div style={{ background: '#fef9ee', border: '1px solid #e8dfc8', borderRadius: 8, padding: '10px 14px', marginTop: 14, fontSize: 12, color: '#7a6a3a', lineHeight: 1.6, fontFamily: "'Inter', system-ui, sans-serif" }}>
              Formats acceptés : JPG, PNG, PDF. Taille max 10 Mo par document. Vos fichiers sont chiffrés et stockés en sécurité.
            </div>
            {[
              { key: 'doc_identite',       label: "Pièce d'identité *",          desc: "Carte d'identité ou passeport en cours de validité", required: true  },
              { key: 'doc_justif',         label: 'Justificatif de domicile *',   desc: 'Facture de moins de 3 mois (eau, électricité, internet…)', required: true  },
              { key: 'doc_rib',            label: 'RIB',                          desc: 'Relevé d\'identité bancaire — requis pour toute souscription', required: false },
              { key: 'doc_avis_imposition',label: "Avis d'imposition *",          desc: 'Avis d\'imposition ou de non-imposition — article L.561-5 CMF', required: true  },
              { key: 'doc_origine_fonds',  label: 'Justificatif d\'origine des fonds', desc: 'Bulletin de salaire, acte de vente, donation…', required: false },
            ].map(({ key, label, desc, required }) => {
              const hasUrl = !!(local as Record<string, unknown>)[`${key}_url`]
              return (
                <div key={key} style={{
                  border: `1.5px dashed ${docFiles[key] || hasUrl ? GOLD : '#ddd5c8'}`,
                  borderRadius: 12, padding: 16, marginTop: 14,
                  background: docFiles[key] || hasUrl ? 'rgba(201,165,90,0.04)' : 'white',
                }}>
                  <div style={{ fontWeight: 600, color: FOREST, fontSize: 14, marginBottom: 3, fontFamily: "'Inter', system-ui, sans-serif" }}>
                    {label}
                  </div>
                  <div style={{ fontSize: 12, color: '#8a9a89', marginBottom: 10, lineHeight: 1.5, fontFamily: "'Inter', system-ui, sans-serif" }}>
                    {desc}
                  </div>
                  {hasUrl && !docFiles[key] && (
                    <div style={{ fontSize: 12, color: '#2e7d32', fontWeight: 600, marginBottom: 8, fontFamily: "'Inter', system-ui, sans-serif" }}>
                      ✓ Document déjà fourni
                    </div>
                  )}
                  <input
                    type="file" accept=".jpg,.jpeg,.png,.pdf"
                    onChange={e => setDocFiles(p => ({ ...p, [key]: e.target.files?.[0] ?? null }))}
                    style={{ fontSize: 13, color: FOREST, fontFamily: "'Inter', system-ui, sans-serif" }}
                  />
                  {docFiles[key] && (
                    <div style={{ marginTop: 6, fontSize: 12, color: GOLD, fontWeight: 600, fontFamily: "'Inter', system-ui, sans-serif" }}>
                      ✓ {(docFiles[key] as File).name}
                    </div>
                  )}
                </div>
              )
            })}
          </>)}

          {/* Save button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24, gap: 10, alignItems: 'center' }}>
            {saved && (
              <span style={{ fontSize: 13, color: '#2e7d32', fontWeight: 600, fontFamily: "'Inter', system-ui, sans-serif" }}>
                ✓ Sauvegardé
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={saving || uploading}
              style={{
                padding: '10px 24px', background: FOREST, color: 'white',
                border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600,
                cursor: 'pointer', fontFamily: "'Inter', system-ui, sans-serif",
                opacity: saving || uploading ? 0.6 : 1,
              }}
            >
              {uploading ? 'Upload…' : saving ? 'Sauvegarde…' : 'Enregistrer'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── page principale ───────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router = useRouter()
  const [data,        setData]        = useState<ProfileData>(EMPTY)
  const [openSection, setOpenSection] = useState<SectionId | null>('identite')
  const [saving,      setSaving]      = useState(false)
  const [loading,     setLoading]     = useState(true)
  const [kycExists,   setKycExists]   = useState(false)
  const [submitted,   setSubmitted]   = useState(false)
  const [submitting,  setSubmitting]  = useState(false)
  const [submitErr,   setSubmitErr]   = useState('')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }

      // 1. Charger KYC existant
      const { data: kyc } = await supabase
        .from('kyc')
        .select('*,statut')
        .eq('user_id', user.id)
        .maybeSingle()

      if (kyc) {
        setKycExists(true)
        if (kyc.statut === 'soumis' || kyc.statut === 'valide') setSubmitted(true)
        setData(prev => ({
          ...prev,
          qualite_declarant:          kyc.qualite_declarant ?? prev.qualite_declarant,
          civilite:                   kyc.civilite ?? prev.civilite,
          prenom:                     kyc.prenom ?? prev.prenom,
          nom:                        kyc.nom ?? prev.nom,
          date_naissance:             kyc.date_naissance ?? prev.date_naissance,
          pays_naissance:             kyc.pays_naissance ?? prev.pays_naissance,
          ville_naissance:            kyc.ville_naissance ?? prev.ville_naissance,
          nationalite:                kyc.nationalite ?? prev.nationalite,
          capacite_juridique:         kyc.capacite_juridique ?? prev.capacite_juridique,
          telephone:                  kyc.telephone ?? prev.telephone,
          telephone_fixe:             kyc.telephone_fixe ?? prev.telephone_fixe,
          adresse:                    kyc.adresse ?? prev.adresse,
          code_postal:                kyc.code_postal ?? prev.code_postal,
          ville:                      kyc.ville ?? prev.ville,
          pays:                       kyc.pays ?? prev.pays,
          adresse_fiscale_identique:  kyc.adresse_fiscale_identique ?? true,
          adresse_fiscale:            kyc.adresse_fiscale ?? '',
          situation_familiale:        kyc.situation_familiale ?? '',
          regime_matrimonial:         kyc.regime_matrimonial ?? '',
          enfants_a_charge:           kyc.enfants_a_charge ?? 0,
          nb_personnes_charge:        kyc.nb_personnes_charge ?? 0,
          situation_pro:              kyc.situation_pro ?? '',
          secteur_activite:           kyc.secteur_activite ?? '',
          csp:                        kyc.csp ?? '',
          revenu_foyer:               kyc.revenu_foyer ?? '',
          patrimoine_financier:       String(kyc.patrimoine_financier ?? ''),
          patrimoine_net:             String(kyc.patrimoine_net ?? ''),
          ifi_assujetti:              kyc.ifi_assujetti ?? false,
          numero_fiscal:              kyc.numero_fiscal ?? '',
          fatca_us_person:            kyc.fatca_us_person ?? false,
          ppe:                        kyc.ppe ?? false,
          ppe_entourage:              kyc.ppe_entourage ?? false,
          objectif_investissement:    kyc.objectif_investissement ?? '',
          horizon_placement:          kyc.horizon_placement ?? '',
          tolerance_risque:           kyc.tolerance_risque ?? 2,
          perte_acceptable:           kyc.perte_acceptable ?? '',
          titulaire_compte:           kyc.titulaire_compte ?? '',
          nom_banque:                 kyc.nom_banque ?? '',
          iban:                       kyc.iban ?? '',
          bic_swift:                  kyc.bic_swift ?? '',
          doc_identite_url:           kyc.doc_identite_url ?? '',
          doc_justif_url:             kyc.doc_justif_url ?? '',
          doc_rib_url:                kyc.doc_rib_url ?? '',
          doc_avis_imposition_url:    kyc.doc_avis_imposition_url ?? '',
          doc_origine_fonds_url:      kyc.doc_origine_fonds_url ?? '',
        }))
      } else {
        // 2. Pas de KYC → pré-remplir depuis onboarding_sessions
        const { data: onb } = await supabase
          .from('onboarding_sessions')
          .select('prenom, nom, telephone, situation_familiale, patrimoine_net_eur, revenus_annuels_eur, objectif_principal, horizon_annees, capacite_pertes')
          .eq('email', user.email ?? '')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (onb) {
          const meta = user.user_metadata ?? {}
          setData(prev => ({
            ...prev,
            prenom:                  meta.prenom ?? onb.prenom ?? '',
            nom:                     meta.nom ?? onb.nom ?? '',
            telephone:               onb.telephone ?? '',
            situation_familiale:     onb.situation_familiale ?? '',
            patrimoine_net:          String(onb.patrimoine_net_eur ?? ''),
            revenu_foyer:            onb.revenus_annuels_eur ? (onb.revenus_annuels_eur > 150000 ? 'gt150k' : onb.revenus_annuels_eur > 75000 ? '75-150k' : onb.revenus_annuels_eur > 50000 ? '50-75k' : onb.revenus_annuels_eur > 25000 ? '25-50k' : 'lt25k') : '',
            objectif_investissement: onb.objectif_principal ?? '',
            horizon_placement:       onb.horizon_annees ? (onb.horizon_annees < 3 ? 'lt3' : onb.horizon_annees <= 5 ? '3-5' : onb.horizon_annees <= 10 ? '5-10' : 'gt10') : '',
            tolerance_risque:        onb.capacite_pertes === 'elevee' ? 4 : onb.capacite_pertes === 'faible' ? 1 : 2,
          }))
        } else {
          // Pré-remplir au moins depuis les user_metadata
          const meta = user.user_metadata ?? {}
          setData(prev => ({
            ...prev,
            prenom: meta.prenom ?? '',
            nom:    meta.nom ?? '',
          }))
        }
      }
      setLoading(false)
    }
    load()
  }, [router])

  async function handleSubmit() {
    setSubmitting(true)
    setSubmitErr('')
    try {
      const res = await fetch('/api/profile/submit', { method: 'POST' })
      const json = await res.json()
      if (json.ok) {
        setSubmitted(true)
      } else {
        setSubmitErr(json.error ?? 'Erreur lors de la soumission')
      }
    } catch {
      setSubmitErr('Erreur réseau. Réessayez.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSave(sectionId: SectionId, patch: Partial<ProfileData>) {
    setSaving(true)
    try {
      const res = await fetch('/api/profile/save-section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section: sectionId, data: patch }),
      })
      const json = await res.json()
      if (json.ok) {
        setData(prev => ({ ...prev, ...patch }))
        setKycExists(true)
      }
    } finally {
      setSaving(false)
    }
  }

  const completedCount = SECTIONS.filter(s => isSectionComplete(s.id, data)).length

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: CREAM, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 20, color: FOREST }}>Chargement…</div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: CREAM, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`input:focus,select:focus{border-color:${FOREST}!important;outline:none;}input[type=range]{cursor:pointer;}`}</style>

      <AmanaHeader backHref="/dashboard" backLabel="Mon espace" />

      {/* Hero */}
      <div style={{ background: FOREST, padding: '24px 24px 32px' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 600, marginBottom: 4 }}>
            Mon profil patrimonial
          </div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 26, fontWeight: 400, color: 'white', margin: '0 0 6px' }}>
            {data.prenom ? `${data.prenom} ${data.nom}` : 'Votre profil'}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
              <div style={{ height: '100%', background: GOLD, borderRadius: 2, width: `${(completedCount / SECTIONS.length) * 100}%`, transition: 'width 0.4s' }} />
            </div>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', whiteSpace: 'nowrap' }}>
              {completedCount} / {SECTIONS.length} sections
            </span>
          </div>
          {!kycExists && (
            <div style={{ marginTop: 10, fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
              Certains champs ont été pré-remplis depuis votre inscription. Vérifiez et complétez chaque section.
            </div>
          )}
        </div>
      </div>

      {/* Sections */}
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px 80px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {SECTIONS.map(section => (
          <SectionCard
            key={section.id}
            section={section}
            data={data}
            isOpen={openSection === section.id}
            onToggle={() => setOpenSection(p => p === section.id ? null : section.id)}
            onSave={handleSave}
            saving={saving}
          />
        ))}

        {/* ── PANNEAU DE SOUMISSION ── */}
        {submitted ? (
          <div style={{
            background: 'linear-gradient(135deg, #2a3829 0%, #4d6349 100%)',
            borderRadius: 14, padding: '24px 28px', marginTop: 8,
            border: '1px solid rgba(201,165,90,0.25)',
            boxShadow: '0 4px 24px rgba(42,56,41,0.12)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(201,165,90,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 20 }}>✓</div>
              <div>
                <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 20, color: 'white', fontWeight: 400 }}>
                  Dossier soumis pour validation
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 3, fontFamily: "'Inter', system-ui, sans-serif", lineHeight: 1.5 }}>
                  Votre conseiller AMANA va examiner votre dossier. Vous recevrez un email de confirmation dès validation.
                </div>
              </div>
            </div>
            <a href="https://calendly.com/amana-patrimoine/30min" target="_blank" rel="noopener noreferrer" style={{
              display: 'inline-block', marginTop: 18,
              padding: '10px 22px', background: GOLD, color: 'white',
              borderRadius: 8, textDecoration: 'none', fontSize: 13, fontWeight: 600,
              fontFamily: "'Inter', system-ui, sans-serif",
            }}>
              Prendre rendez-vous rapidement →
            </a>
          </div>
        ) : (
          <div style={{
            background: 'white', borderRadius: 14, padding: '22px 24px', marginTop: 8,
            border: `1.5px solid ${completedCount >= 4 ? GOLD : '#e8e0d0'}`,
            boxShadow: completedCount >= 4 ? '0 4px 20px rgba(201,165,90,0.12)' : '0 1px 4px rgba(0,0,0,0.04)',
          }}>
            <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 18, color: FOREST, marginBottom: 6 }}>
              Soumettre mon dossier pour validation
            </div>
            <p style={{ fontSize: 13, color: '#7a8a79', margin: '0 0 16px', lineHeight: 1.65, fontFamily: "'Inter', system-ui, sans-serif" }}>
              {completedCount < 4
                ? `Complétez au moins 4 sections avant de soumettre (${completedCount}/6 complétées — documents optionnels pour l'envoi initial).`
                : `Votre dossier sera envoyé à Mohamed pour vérification. ${completedCount < SECTIONS.length ? `Il manque encore ${SECTIONS.length - completedCount} section(s) — vous pouvez les compléter après soumission.` : 'Toutes les sections sont complètes.'}`
              }
            </p>
            {submitErr && (
              <div style={{ background: '#fde8e8', border: '1px solid #f5c6c6', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#c0392b', fontFamily: "'Inter', system-ui, sans-serif" }}>
                {submitErr}
              </div>
            )}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                onClick={handleSubmit}
                disabled={submitting || completedCount < 4}
                style={{
                  padding: '11px 26px', background: completedCount >= 4 ? FOREST : '#ccc',
                  color: 'white', border: 'none', borderRadius: 8,
                  fontSize: 14, fontWeight: 600, cursor: completedCount >= 4 ? 'pointer' : 'not-allowed',
                  fontFamily: "'Inter', system-ui, sans-serif",
                  opacity: submitting ? 0.7 : 1,
                }}
              >
                {submitting ? 'Envoi en cours…' : 'Envoyer pour validation →'}
              </button>
              <span style={{ fontSize: 12, color: '#aaa', fontFamily: "'Inter', system-ui, sans-serif" }}>
                {completedCount}/7 sections · Documents requis : pièce d'identité + justificatif + avis d'imposition
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
