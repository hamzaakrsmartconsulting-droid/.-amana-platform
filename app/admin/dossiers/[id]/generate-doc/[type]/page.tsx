// app/admin/dossiers/[id]/generate-doc/[type]/page.tsx — v5 COMPLET
// Sprint Agents IA v11c · 30 avril 2026
//
// Couvre les 7 types de documents :
//   DER / LM / RA / Bilan Mizan / Préco / Zakat / Succession
//
// Évolutions v5 vs v4 :
//   + Ajout du type 'succession' avec SuccessionForm dédié
//   + Types StatutMatrimonial, HeritierLine, ActionSuccessorale

'use client'

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useParams, usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  SUPPORTS_CATALOG,
  ENVELOPPE_LABEL,
  type Enveloppe,
} from '@/lib/data/supports-catalog'

type DocType = 'der' | 'lm' | 'ra' | 'bilan' | 'preco' | 'zakat' | 'succession' | 'bulletin'

// ------- Types Succession (v5) -------
type StatutMatrimonial =
  | 'celibataire'
  | 'marie_communaute_reduite'
  | 'marie_separation_biens'
  | 'marie_communaute_universelle'
  | 'pacs'
  | 'divorce'
  | 'veuf'

const STATUT_MATRIMONIAL_LABEL: Record<StatutMatrimonial, string> = {
  celibataire: 'Célibataire',
  marie_communaute_reduite: 'Marié(e) — communauté réduite aux acquêts',
  marie_separation_biens: 'Marié(e) — séparation de biens',
  marie_communaute_universelle: 'Marié(e) — communauté universelle',
  pacs: 'Pacsé(e)',
  divorce: 'Divorcé(e)',
  veuf: 'Veuf / veuve',
}

type HeritierLien =
  | 'epoux' | 'epouse' | 'fils' | 'fille'
  | 'pere' | 'mere' | 'frere' | 'soeur' | 'autre'

const HERITIER_LIEN_LABEL: Record<HeritierLien, string> = {
  epoux: 'Époux', epouse: 'Épouse', fils: 'Fils', fille: 'Fille',
  pere: 'Père', mere: 'Mère', frere: 'Frère', soeur: 'Sœur', autre: 'Autre',
}

type HeritierLine = {
  lien: HeritierLien
  nom: string
  part_sharia_pct?: string
  part_droit_fr_pct?: string
  ecart_commentaire?: string
}

type OutilSuccessoral =
  | 'donation_entre_epoux' | 'donation_partage' | 'demembrement'
  | 'av_beneficiaires' | 'testament' | 'waqf' | 'autre'

const OUTIL_LABEL: Record<OutilSuccessoral, string> = {
  donation_entre_epoux: 'Donation entre époux',
  donation_partage: 'Donation-partage',
  demembrement: 'Démembrement (usufruit / nue-propriété)',
  av_beneficiaires: 'Clause bénéficiaire AV',
  testament: 'Testament authentique ou olographe',
  waqf: 'Waqf',
  autre: 'Autre',
}

type ActionSuccessorale = {
  outil: OutilSuccessoral
  titre: string
  description?: string
  effet_attendu?: string
  horizon?: 'immediat' | '6_mois' | '12_mois' | 'long_terme'
}

type SuccessionInputs = {
  synthese_situation?: string
  date_reference?: string
  statut_matrimonial?: StatutMatrimonial
  regime_matrimonial_detail?: string
  composition_familiale?: string
  patrimoine_succession_eur?: string
  heritiers?: HeritierLine[]
  synthese_parts_coraniques?: string
  synthese_parts_droit_francais?: string
  ecarts_explication?: string
  actions_proposees?: ActionSuccessorale[]
  points_attention?: string
  notaire_referent?: string
  prochaine_etape?: string
}

// ------- Types ré-exposés en local -------
type AllocationLine = {
  classe: string
  pourcentage: string
  montant_eur?: string
  supports?: string
}
type StatutSharia = 'halal' | 'a_verifier' | 'douteux' | 'haram'
type AllocationLineBilan = {
  classe: string
  detail?: string
  montant_eur: string
  pourcentage?: string
  statut_sharia: 'halal' | 'douteux' | 'haram'
  commentaire?: string
}
type RecommandationLine = {
  action: string
  horizon: 'immediat' | '6_mois' | '12_mois'
  justification?: string
}
type AllocationCibleLine = {
  classe: string
  pourcentage: string
  montant_eur: string
  support_nom?: string
  support_isin?: string
  enveloppe?: Enveloppe
  statut_sharia?: StatutSharia
  justification?: string
}
type EnveloppeLine = {
  type: Enveloppe
  montant_eur: string
  justification_fiscale?: string
}
type FreqVersement = 'unique' | 'mensuel' | 'trimestriel' | 'annuel'
type FreqArbitrage = 'aucun' | 'semestriel' | 'annuel'
type FreqRevision = 'semestrielle' | 'annuelle' | 'biennale'

type NisabRetenu = 'or' | 'argent'
type ZakatBaseLine = {
  classe: string
  montant_zakatable_eur: string
  taux: string
  zakat_due_eur: string
  commentaire?: string
}
type ProjectionLine = {
  annee: string
  patrimoine_zakatable_eur: string
  zakat_estimee_eur: string
  hypotheses?: string
}

// ------- Inputs -------
type LmInputs = {
  objectifs_client?: string
  duree_mission?: string
  honoraires_estimes?: string
  perimetre_specifique?: string
}
type RaInputs = {
  bilan_mizan_resume?: string
  bilan_mizan_date?: string
  allocation_cible?: AllocationLine[]
  capacite_financiere?: string
  connaissances_investissement?: string
  justification_adequation?: string
}
type BilanInputs = {
  synthese_patrimoine_resume?: string
  bilan_date?: string
  domiciliation_fiscale?: string
  revenus_annuels_eur?: string
  charges_annuelles_eur?: string
  capacite_epargne_mensuelle_eur?: string
  patrimoine_net_eur?: string
  allocation_actuelle?: AllocationLineBilan[]
  purification_estimee_eur?: string
  purification_commentaire?: string
  zakat_base_eur?: string
  zakat_estimee_eur?: string
  zakat_date_hawl?: string
  zakat_nisab_reference?: string
  points_vigilance?: string
  recommandations_prioritaires?: RecommandationLine[]
}
type PrecoInputs = {
  mission_synthese?: string
  preco_date?: string
  allocation_cible_detaillee?: AllocationCibleLine[]
  enveloppes_choisies?: EnveloppeLine[]
  versement_initial_eur?: string
  versements_programmes_eur?: string
  versements_frequence?: FreqVersement
  arbitrage_frequence?: FreqArbitrage
  frais_entree_pct?: string
  frais_gestion_annuel_pct?: string
  honoraires_amana?: string
  rendement_cible_annuel_pct?: string
  rendement_horizon?: string
  risques_identifies?: string
  prochaine_revision_frequence?: FreqRevision
  prochaine_revision_date?: string
}
type ZakatInputs = {
  synthese_zakat_client?: string
  zakat_date_reference?: string
  nisab_or_eur?: string
  nisab_argent_eur?: string
  nisab_date_reference?: string
  nisab_retenu?: NisabRetenu
  hawl_date_anniversaire?: string
  bases_par_classe?: ZakatBaseLine[]
  dettes_deductibles_eur?: string
  total_zakat_due_eur?: string
  beneficiaires_choisis?: string
  prochaine_echeance_paiement?: string
  projection_pluriannuelle?: ProjectionLine[]
  vigilance_specificites?: string
}

const TYPE_LABELS: Record<DocType, string> = {
  der:        "Document d'Entrée en Relation (DER)",
  lm:         'Lettre de Mission (LM)',
  ra:         "Rapport d'Adéquation (RA)",
  bilan:      'Bilan Patrimonial Mizan',
  preco:      'Préconisation patrimoniale',
  zakat:      'Calendrier Zakat',
  succession: 'Stratégie successorale',
  bulletin:   'Bulletin de souscription',
}

const VALID_TYPES: DocType[] = ['der', 'lm', 'ra', 'bilan', 'preco', 'zakat', 'succession', 'bulletin']

export default function GenerateDocPage() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams<{ id: string; type: string }>()
  const dossierId = params.id
  const dossiersBasePath = pathname?.startsWith('/conseiller')
    ? '/conseiller/dossiers'
    : '/admin/dossiers'
  const docType = params.type as DocType
  const isValidType = VALID_TYPES.includes(docType)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [lm, setLm] = useState<LmInputs>({})
  const [ra, setRa] = useState<RaInputs>({
    allocation_cible: [{ classe: '', pourcentage: '' }],
  })
  const [bilan, setBilan] = useState<BilanInputs>({
    allocation_actuelle: [{ classe: '', montant_eur: '', statut_sharia: 'halal' }],
    recommandations_prioritaires: [{ action: '', horizon: 'immediat' }],
  })
  const [preco, setPreco] = useState<PrecoInputs>({
    allocation_cible_detaillee: [
      { classe: '', pourcentage: '', montant_eur: '', statut_sharia: 'halal' },
    ],
    enveloppes_choisies: [{ type: 'av_vie_plus', montant_eur: '' }],
    prochaine_revision_frequence: 'annuelle',
  })
  const [zakat, setZakat] = useState<ZakatInputs>({
    nisab_retenu: 'or',
    bases_par_classe: [
      {
        classe: '',
        montant_zakatable_eur: '',
        taux: '2,5%',
        zakat_due_eur: '',
      },
    ],
  })
  const [succession, setSuccession] = useState<SuccessionInputs>({
    statut_matrimonial: 'celibataire',
    heritiers: [{ lien: 'epoux', nom: '' }],
    actions_proposees: [{ outil: 'donation_entre_epoux', titre: '' }],
  })
  const [bulletin, setBulletin] = useState<Record<string, unknown>>({
    produit: '',
    versement_initial_eur: 0,
  })

  useEffect(() => {
    if (!isValidType) {
      setLoading(false)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const r = await fetch(
          `/api/dossiers/${dossierId}/document-inputs?type=${docType}`,
          { cache: 'no-store' }
        )
        const data = await r.json()
        if (cancelled) return
        const existing = (data?.row?.inputs ?? {}) as Record<string, unknown>
        if (docType === 'lm') setLm(existing as LmInputs)
        if (docType === 'ra') {
          const r0 = existing as RaInputs
          // Si aucun input sauvegardé, pré-remplir depuis KYC + MIF2
          if (!data?.row) {
            try {
              const prefillRes = await fetch(`/api/dossiers/${dossierId}/ra-prefill`, { cache: 'no-store' })
              if (prefillRes.ok) {
                const prefillData = await prefillRes.json()
                const p = prefillData?.prefill ?? {}
                setRa(prev => ({
                  ...prev,
                  bilan_mizan_resume:          p.profil_mif2 ? `Client ${p.client_nom} — Profil MIF II : ${p.profil_mif2} (score ${p.score_mif2}). Objectif : ${p.objectif_investissement}. Horizon : ${p.horizon_placement}.` : prev.bilan_mizan_resume,
                  bilan_mizan_date:            p.bilan_mizan_date ?? prev.bilan_mizan_date,
                  capacite_financiere:         p.capacite_financiere ?? prev.capacite_financiere,
                  connaissances_investissement: p.connaissances_investissement ?? prev.connaissances_investissement,
                  allocation_cible:            [{ classe: '', pourcentage: '' }],
                }))
              }
            } catch {
              // Prefill non bloquant
            }
          } else {
            setRa({
              ...r0,
              allocation_cible:
                r0.allocation_cible && r0.allocation_cible.length > 0
                  ? r0.allocation_cible
                  : [{ classe: '', pourcentage: '' }],
            })
          }
        }
        if (docType === 'bilan') {
          const b0 = existing as BilanInputs
          setBilan({
            ...b0,
            allocation_actuelle:
              b0.allocation_actuelle && b0.allocation_actuelle.length > 0
                ? b0.allocation_actuelle
                : [{ classe: '', montant_eur: '', statut_sharia: 'halal' }],
            recommandations_prioritaires:
              b0.recommandations_prioritaires &&
              b0.recommandations_prioritaires.length > 0
                ? b0.recommandations_prioritaires
                : [{ action: '', horizon: 'immediat' }],
          })
        }
        if (docType === 'preco') {
          const p0 = existing as PrecoInputs
          setPreco({
            ...p0,
            allocation_cible_detaillee:
              p0.allocation_cible_detaillee && p0.allocation_cible_detaillee.length > 0
                ? p0.allocation_cible_detaillee
                : [
                    {
                      classe: '',
                      pourcentage: '',
                      montant_eur: '',
                      statut_sharia: 'halal',
                    },
                  ],
            enveloppes_choisies:
              p0.enveloppes_choisies && p0.enveloppes_choisies.length > 0
                ? p0.enveloppes_choisies
                : [{ type: 'av_vie_plus', montant_eur: '' }],
            prochaine_revision_frequence:
              p0.prochaine_revision_frequence ?? 'annuelle',
          })
        }
        if (docType === 'zakat') {
          const z0 = existing as ZakatInputs
          setZakat({
            ...z0,
            nisab_retenu: z0.nisab_retenu ?? 'or',
            bases_par_classe:
              z0.bases_par_classe && z0.bases_par_classe.length > 0
                ? z0.bases_par_classe
                : [
                    {
                      classe: '',
                      montant_zakatable_eur: '',
                      taux: '2,5%',
                      zakat_due_eur: '',
                    },
                  ],
          })
        }
        if (docType === 'succession') {
          const s0 = existing as SuccessionInputs
          setSuccession({
            ...s0,
            statut_matrimonial: s0.statut_matrimonial ?? 'celibataire',
            heritiers:
              s0.heritiers && s0.heritiers.length > 0
                ? s0.heritiers
                : [{ lien: 'epoux', nom: '' }],
            actions_proposees:
              s0.actions_proposees && s0.actions_proposees.length > 0
                ? s0.actions_proposees
                : [{ outil: 'donation_entre_epoux', titre: '' }],
          })
        }
        if (docType === 'bulletin') {
          setBulletin({ produit: '', versement_initial_eur: 0, ...existing })
        }
      } catch (e) {
        console.error(e)
        if (!cancelled) setError('Impossible de charger les données existantes')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [dossierId, docType, isValidType])

  const saveInputs = async (status: 'draft' | 'ready' = 'draft') => {
    setError(null)
    setSuccess(null)
    setSaving(true)
    try {
      const inputs =
        docType === 'lm'
          ? lm
          : docType === 'ra'
            ? ra
            : docType === 'bilan'
              ? bilan
              : docType === 'preco'
                ? preco
                : docType === 'zakat'
                  ? zakat
                  : docType === 'succession'
                    ? succession
                    : docType === 'bulletin'
                      ? bulletin
                      : {}
      const r = await fetch(`/api/dossiers/${dossierId}/document-inputs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document_type: docType, inputs, status }),
      })
      const data = await r.json()
      if (!r.ok || !data.ok) {
        setError(data.error || 'Erreur de sauvegarde')
        return false
      }
      setSuccess('Données enregistrées')
      return true
    } catch (e) {
      setError('Erreur réseau')
      console.error(e)
      return false
    } finally {
      setSaving(false)
    }
  }

  const handleGenerate = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    const saved = await saveInputs('ready')
    if (!saved) return
    setGenerating(true)
    try {
      const r = await fetch('/api/documents/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: docType, dossier_id: dossierId }),
      })
      const data = await r.json()
      if (!r.ok) {
        setError(data.error || 'Erreur de génération')
        if (r.status === 422 && data.missingInputs) return
        return
      }
      router.push(`${dossiersBasePath}/${dossierId}?generated=${docType}`)
    } catch (e) {
      setError('Erreur réseau lors de la génération')
      console.error(e)
    } finally {
      setGenerating(false)
    }
  }

  const lmMissing = useMemo(() => {
    const m: string[] = []
    if (!lm.objectifs_client?.trim()) m.push('objectifs_client')
    if (!lm.duree_mission?.trim()) m.push('duree_mission')
    return m
  }, [lm])
  const raMissing = useMemo(() => {
    const m: string[] = []
    if (!ra.bilan_mizan_resume?.trim()) m.push('bilan_mizan_resume')
    if (!ra.allocation_cible || ra.allocation_cible.length === 0)
      m.push('allocation_cible')
    else if (
      ra.allocation_cible.some((a) => !a.classe?.trim() || !a.pourcentage?.trim())
    )
      m.push('allocation_cible (lignes incomplètes)')
    if (!ra.justification_adequation?.trim()) m.push('justification_adequation')
    return m
  }, [ra])
  const bilanMissing = useMemo(() => {
    const m: string[] = []
    if (!bilan.synthese_patrimoine_resume?.trim())
      m.push('synthese_patrimoine_resume')
    if (!bilan.allocation_actuelle || bilan.allocation_actuelle.length === 0)
      m.push('allocation_actuelle')
    else if (
      bilan.allocation_actuelle.some(
        (a) => !a.classe?.trim() || !a.montant_eur?.trim()
      )
    )
      m.push('allocation_actuelle (lignes incomplètes)')
    if (
      !bilan.recommandations_prioritaires ||
      bilan.recommandations_prioritaires.length === 0
    )
      m.push('recommandations_prioritaires')
    else if (bilan.recommandations_prioritaires.some((r) => !r.action?.trim()))
      m.push('recommandations_prioritaires (actions vides)')
    return m
  }, [bilan])
  const precoMissing = useMemo(() => {
    const m: string[] = []
    if (!preco.mission_synthese?.trim()) m.push('mission_synthese')
    if (
      !preco.allocation_cible_detaillee ||
      preco.allocation_cible_detaillee.length === 0
    )
      m.push('allocation_cible_detaillee')
    else if (
      preco.allocation_cible_detaillee.some(
        (a) =>
          !a.classe?.trim() || !a.pourcentage?.trim() || !a.montant_eur?.trim()
      )
    )
      m.push('allocation_cible_detaillee (lignes incomplètes)')
    if (!preco.enveloppes_choisies || preco.enveloppes_choisies.length === 0)
      m.push('enveloppes_choisies')
    else if (preco.enveloppes_choisies.some((e) => !e.montant_eur?.trim()))
      m.push('enveloppes_choisies (montants manquants)')
    if (!preco.prochaine_revision_frequence) m.push('prochaine_revision_frequence')
    return m
  }, [preco])
  const zakatMissing = useMemo(() => {
    const m: string[] = []
    if (!zakat.synthese_zakat_client?.trim()) m.push('synthese_zakat_client')
    if (!zakat.nisab_retenu) m.push('nisab_retenu')
    if (!zakat.hawl_date_anniversaire?.trim()) m.push('hawl_date_anniversaire')
    if (!zakat.bases_par_classe || zakat.bases_par_classe.length === 0)
      m.push('bases_par_classe')
    else if (
      zakat.bases_par_classe.some(
        (b) =>
          !b.classe?.trim() ||
          !b.montant_zakatable_eur?.trim() ||
          !b.taux?.trim() ||
          !b.zakat_due_eur?.trim()
      )
    )
      m.push('bases_par_classe (lignes incomplètes)')
    return m
  }, [zakat])

  const successionMissing = useMemo(() => {
    const m: string[] = []
    if (!succession.synthese_situation?.trim()) m.push('synthese_situation')
    if (!succession.statut_matrimonial) m.push('statut_matrimonial')
    if (!succession.heritiers || succession.heritiers.length === 0)
      m.push('heritiers')
    else if (succession.heritiers.some((h) => !h.lien || !h.nom?.trim()))
      m.push('heritiers (lignes incomplètes)')
    if (!succession.actions_proposees || succession.actions_proposees.length === 0)
      m.push('actions_proposees')
    else if (succession.actions_proposees.some((a) => !a.titre?.trim() || !a.outil))
      m.push('actions_proposees (lignes incomplètes)')
    return m
  }, [succession])

  const canGenerate =
    docType === 'der'
      ? true
      : docType === 'bulletin'
        ? true  // bulletin has minimal required fields; validate server-side
        : docType === 'lm'
          ? lmMissing.length === 0
          : docType === 'ra'
            ? raMissing.length === 0
            : docType === 'bilan'
              ? bilanMissing.length === 0
              : docType === 'preco'
                ? precoMissing.length === 0
                : docType === 'zakat'
                  ? zakatMissing.length === 0
                  : successionMissing.length === 0

  if (!isValidType) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Type de document inconnu</h1>
        <Link
          href={`${dossiersBasePath}/${dossierId}`}
          className="text-amana-forest underline"
        >
          Retour au dossier
        </Link>
      </div>
    )
  }
  if (loading) return <div className="p-6 text-amana-grey">Chargement…</div>

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-6">
        <Link
          href={`${dossiersBasePath}/${dossierId}`}
          className="text-sm text-amana-grey hover:text-amana-forest"
        >
          ← Retour au dossier
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-amana-forest">
          Génération · {TYPE_LABELS[docType]}
        </h1>
        <p className="mt-1 text-sm text-amana-grey">
          Renseignez les données obligatoires avant la génération du PDF officiel.
          Vos saisies sont sauvegardées et réutilisées en cas de régénération.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded border-l-4 border-red-500 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 rounded border-l-4 border-green-500 bg-green-50 p-3 text-sm text-green-800">
          {success}
        </div>
      )}

      <form onSubmit={handleGenerate} className="space-y-6">
        {docType === 'der' && <DerRecap />}
        {docType === 'lm' && (
          <LmForm value={lm} onChange={setLm} missing={lmMissing} />
        )}
        {docType === 'ra' && (
          <RaForm value={ra} onChange={setRa} missing={raMissing} />
        )}
        {docType === 'bilan' && (
          <BilanForm value={bilan} onChange={setBilan} missing={bilanMissing} />
        )}
        {docType === 'preco' && (
          <PrecoForm value={preco} onChange={setPreco} missing={precoMissing} />
        )}
        {docType === 'zakat' && (
          <ZakatForm value={zakat} onChange={setZakat} missing={zakatMissing} />
        )}
        {docType === 'succession' && (
          <SuccessionForm
            value={succession}
            onChange={setSuccession}
            missing={successionMissing}
          />
        )}
        {docType === 'bulletin' && (
          <BulletinForm value={bulletin} onChange={setBulletin} />
        )}

        <div className="flex flex-col gap-3 border-t border-amana-grey-light pt-4 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={() => saveInputs('draft')}
            disabled={saving || generating}
            className="rounded border border-amana-forest px-4 py-2 text-sm text-amana-forest hover:bg-amana-cream disabled:opacity-50"
          >
            {saving ? 'Sauvegarde…' : 'Sauvegarder en brouillon'}
          </button>
          <button
            type="submit"
            disabled={!canGenerate || saving || generating}
            className="rounded bg-amana-forest px-4 py-2 text-sm font-semibold text-white hover:bg-amana-dark disabled:opacity-50"
          >
            {generating ? 'Génération en cours…' : 'Générer le PDF'}
          </button>
        </div>

        {!canGenerate && docType !== 'der' && docType !== 'bulletin' && (
          <p className="text-xs text-red-700">
            Champs obligatoires manquants :{' '}
            {(docType === 'lm'
              ? lmMissing
              : docType === 'ra'
                ? raMissing
                : docType === 'bilan'
                  ? bilanMissing
                  : docType === 'preco'
                    ? precoMissing
                    : docType === 'zakat'
                      ? zakatMissing
                      : successionMissing
            ).join(', ')}
          </p>
        )}
      </form>
    </div>
  )
}

// =====================================================================
// DER / LM / RA / Bilan / Préco — inchangés vs v3 (sprint v11b)
// (copie identique aux versions précédentes pour cohérence du fichier)
// =====================================================================
function DerRecap() {
  return (
    <div className="rounded border border-amana-gold bg-amana-cream p-4 text-sm text-amana-dark">
      <p className="font-semibold text-amana-forest">DER · génération directe</p>
      <p className="mt-2">
        Le DER est généré à partir des données légales d'AMANA Patrimoine
        (ORIAS, RC pro, médiateurs, statuts CIF/COA/COBSP) et des informations
        d'identité du client.
      </p>
    </div>
  )
}

function LmForm({
  value,
  onChange,
  missing,
}: {
  value: LmInputs
  onChange: (v: LmInputs) => void
  missing: string[]
}) {
  return (
    <div className="space-y-4">
      <Field
        label="Objectifs du client *"
        error={missing.includes('objectifs_client')}
      >
        <textarea
          value={value.objectifs_client ?? ''}
          onChange={(e) => onChange({ ...value, objectifs_client: e.target.value })}
          rows={4}
          className="w-full rounded border border-amana-grey-light p-2 text-sm"
        />
      </Field>
      <Field
        label="Durée prévisionnelle de la mission *"
        error={missing.includes('duree_mission')}
      >
        <input
          type="text"
          value={value.duree_mission ?? ''}
          onChange={(e) => onChange({ ...value, duree_mission: e.target.value })}
          className="w-full rounded border border-amana-grey-light p-2 text-sm"
        />
      </Field>
      <Field label="Honoraires estimés">
        <input
          type="text"
          value={value.honoraires_estimes ?? ''}
          onChange={(e) => onChange({ ...value, honoraires_estimes: e.target.value })}
          className="w-full rounded border border-amana-grey-light p-2 text-sm"
        />
      </Field>
      <Field label="Périmètre spécifique">
        <textarea
          value={value.perimetre_specifique ?? ''}
          onChange={(e) =>
            onChange({ ...value, perimetre_specifique: e.target.value })
          }
          rows={2}
          className="w-full rounded border border-amana-grey-light p-2 text-sm"
        />
      </Field>
    </div>
  )
}

function RaForm({
  value,
  onChange,
  missing,
}: {
  value: RaInputs
  onChange: (v: RaInputs) => void
  missing: string[]
}) {
  const allocation = value.allocation_cible ?? []
  const update = (i: number, patch: Partial<AllocationLine>) =>
    onChange({
      ...value,
      allocation_cible: allocation.map((row, idx) =>
        idx === i ? { ...row, ...patch } : row
      ),
    })
  const add = () =>
    onChange({
      ...value,
      allocation_cible: [...allocation, { classe: '', pourcentage: '' }],
    })
  const remove = (i: number) => {
    const next = allocation.filter((_, idx) => idx !== i)
    onChange({
      ...value,
      allocation_cible: next.length > 0 ? next : [{ classe: '', pourcentage: '' }],
    })
  }
  return (
    <div className="space-y-5">
      <Field
        label="Résumé du bilan Mizan *"
        error={missing.includes('bilan_mizan_resume')}
      >
        <textarea
          value={value.bilan_mizan_resume ?? ''}
          onChange={(e) =>
            onChange({ ...value, bilan_mizan_resume: e.target.value })
          }
          rows={5}
          className="w-full rounded border border-amana-grey-light p-2 text-sm"
        />
      </Field>
      <Field label="Date du bilan Mizan">
        <input
          type="text"
          value={value.bilan_mizan_date ?? ''}
          onChange={(e) =>
            onChange({ ...value, bilan_mizan_date: e.target.value })
          }
          className="w-full rounded border border-amana-grey-light p-2 text-sm"
        />
      </Field>
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-sm font-semibold text-amana-forest">
            Allocation cible *
          </label>
          <button
            type="button"
            onClick={add}
            className="text-xs text-amana-forest underline"
          >
            + Ajouter une ligne
          </button>
        </div>
        <div className="space-y-2">
          {allocation.map((row, i) => (
            <div
              key={i}
              className="grid grid-cols-1 gap-2 rounded border border-amana-grey-light p-2 sm:grid-cols-12"
            >
              <input
                type="text"
                placeholder="Classe"
                value={row.classe}
                onChange={(e) => update(i, { classe: e.target.value })}
                className="rounded border border-amana-grey-light p-2 text-sm sm:col-span-3"
              />
              <input
                type="text"
                placeholder="%"
                value={row.pourcentage}
                onChange={(e) => update(i, { pourcentage: e.target.value })}
                className="rounded border border-amana-grey-light p-2 text-sm sm:col-span-2"
              />
              <input
                type="text"
                placeholder="Montant €"
                value={row.montant_eur ?? ''}
                onChange={(e) => update(i, { montant_eur: e.target.value })}
                className="rounded border border-amana-grey-light p-2 text-sm sm:col-span-3"
              />
              <input
                type="text"
                placeholder="Supports"
                value={row.supports ?? ''}
                onChange={(e) => update(i, { supports: e.target.value })}
                list="supports-halal-list"
                className="rounded border border-amana-grey-light p-2 text-sm sm:col-span-3"
              />
              <button
                type="button"
                onClick={() => remove(i)}
                className="text-xs text-red-600 sm:col-span-1"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <SupportsDatalist />
      </div>
      <Field label="Capacité financière à supporter des pertes">
        <textarea
          value={value.capacite_financiere ?? ''}
          onChange={(e) =>
            onChange({ ...value, capacite_financiere: e.target.value })
          }
          rows={3}
          className="w-full rounded border border-amana-grey-light p-2 text-sm"
        />
      </Field>
      <Field label="Connaissances et expérience">
        <textarea
          value={value.connaissances_investissement ?? ''}
          onChange={(e) =>
            onChange({ ...value, connaissances_investissement: e.target.value })
          }
          rows={3}
          className="w-full rounded border border-amana-grey-light p-2 text-sm"
        />
      </Field>
      <Field
        label="Justification d'adéquation *"
        error={missing.includes('justification_adequation')}
      >
        <textarea
          value={value.justification_adequation ?? ''}
          onChange={(e) =>
            onChange({ ...value, justification_adequation: e.target.value })
          }
          rows={5}
          className="w-full rounded border border-amana-grey-light p-2 text-sm"
        />
      </Field>
    </div>
  )
}

function BilanForm({
  value,
  onChange,
  missing,
}: {
  value: BilanInputs
  onChange: (v: BilanInputs) => void
  missing: string[]
}) {
  const allocation = value.allocation_actuelle ?? []
  const reco = value.recommandations_prioritaires ?? []
  const updateAlloc = (i: number, patch: Partial<AllocationLineBilan>) =>
    onChange({
      ...value,
      allocation_actuelle: allocation.map((row, idx) =>
        idx === i ? { ...row, ...patch } : row
      ),
    })
  const addAlloc = () =>
    onChange({
      ...value,
      allocation_actuelle: [
        ...allocation,
        { classe: '', montant_eur: '', statut_sharia: 'halal' },
      ],
    })
  const removeAlloc = (i: number) => {
    const next = allocation.filter((_, idx) => idx !== i)
    onChange({
      ...value,
      allocation_actuelle:
        next.length > 0
          ? next
          : [{ classe: '', montant_eur: '', statut_sharia: 'halal' }],
    })
  }
  const updateReco = (i: number, patch: Partial<RecommandationLine>) =>
    onChange({
      ...value,
      recommandations_prioritaires: reco.map((row, idx) =>
        idx === i ? { ...row, ...patch } : row
      ),
    })
  const addReco = () =>
    onChange({
      ...value,
      recommandations_prioritaires: [
        ...reco,
        { action: '', horizon: 'immediat' },
      ],
    })
  const removeReco = (i: number) => {
    const next = reco.filter((_, idx) => idx !== i)
    onChange({
      ...value,
      recommandations_prioritaires:
        next.length > 0 ? next : [{ action: '', horizon: 'immediat' }],
    })
  }
  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <SectionTitle>1. Synthèse</SectionTitle>
        <Field
          label="Synthèse patrimoniale (3-6 lignes) *"
          error={missing.includes('synthese_patrimoine_resume')}
        >
          <textarea
            value={value.synthese_patrimoine_resume ?? ''}
            onChange={(e) =>
              onChange({ ...value, synthese_patrimoine_resume: e.target.value })
            }
            rows={5}
            className="w-full rounded border border-amana-grey-light p-2 text-sm"
          />
        </Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Date du bilan">
            <input
              type="text"
              value={value.bilan_date ?? ''}
              onChange={(e) => onChange({ ...value, bilan_date: e.target.value })}
              className="w-full rounded border border-amana-grey-light p-2 text-sm"
            />
          </Field>
          <Field label="Domiciliation fiscale">
            <input
              type="text"
              value={value.domiciliation_fiscale ?? ''}
              onChange={(e) =>
                onChange({ ...value, domiciliation_fiscale: e.target.value })
              }
              className="w-full rounded border border-amana-grey-light p-2 text-sm"
            />
          </Field>
        </div>
      </section>
      <section className="space-y-3">
        <SectionTitle>2. Situation financière</SectionTitle>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Revenus annuels">
            <input
              type="text"
              value={value.revenus_annuels_eur ?? ''}
              onChange={(e) =>
                onChange({ ...value, revenus_annuels_eur: e.target.value })
              }
              className="w-full rounded border border-amana-grey-light p-2 text-sm"
            />
          </Field>
          <Field label="Charges annuelles">
            <input
              type="text"
              value={value.charges_annuelles_eur ?? ''}
              onChange={(e) =>
                onChange({ ...value, charges_annuelles_eur: e.target.value })
              }
              className="w-full rounded border border-amana-grey-light p-2 text-sm"
            />
          </Field>
          <Field label="Capacité d'épargne mensuelle">
            <input
              type="text"
              value={value.capacite_epargne_mensuelle_eur ?? ''}
              onChange={(e) =>
                onChange({
                  ...value,
                  capacite_epargne_mensuelle_eur: e.target.value,
                })
              }
              className="w-full rounded border border-amana-grey-light p-2 text-sm"
            />
          </Field>
          <Field label="Patrimoine net">
            <input
              type="text"
              value={value.patrimoine_net_eur ?? ''}
              onChange={(e) =>
                onChange({ ...value, patrimoine_net_eur: e.target.value })
              }
              className="w-full rounded border border-amana-grey-light p-2 text-sm"
            />
          </Field>
        </div>
      </section>
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <SectionTitle>3. Allocation actuelle *</SectionTitle>
          <button
            type="button"
            onClick={addAlloc}
            className="text-xs text-amana-forest underline"
          >
            + Ajouter un poste
          </button>
        </div>
        <div className="space-y-2">
          {allocation.map((row, i) => (
            <div
              key={i}
              className="rounded border border-amana-grey-light p-3 space-y-2"
            >
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-12">
                <input
                  type="text"
                  placeholder="Classe"
                  value={row.classe}
                  onChange={(e) => updateAlloc(i, { classe: e.target.value })}
                  className="rounded border border-amana-grey-light p-2 text-sm sm:col-span-3"
                />
                <input
                  type="text"
                  placeholder="Détail"
                  value={row.detail ?? ''}
                  onChange={(e) => updateAlloc(i, { detail: e.target.value })}
                  list="supports-halal-list"
                  className="rounded border border-amana-grey-light p-2 text-sm sm:col-span-3"
                />
                <input
                  type="text"
                  placeholder="Montant €"
                  value={row.montant_eur}
                  onChange={(e) =>
                    updateAlloc(i, { montant_eur: e.target.value })
                  }
                  className="rounded border border-amana-grey-light p-2 text-sm sm:col-span-2"
                />
                <input
                  type="text"
                  placeholder="%"
                  value={row.pourcentage ?? ''}
                  onChange={(e) =>
                    updateAlloc(i, { pourcentage: e.target.value })
                  }
                  className="rounded border border-amana-grey-light p-2 text-sm sm:col-span-1"
                />
                <select
                  value={row.statut_sharia}
                  onChange={(e) =>
                    updateAlloc(i, {
                      statut_sharia: e.target.value as
                        | 'halal'
                        | 'douteux'
                        | 'haram',
                    })
                  }
                  className="rounded border border-amana-grey-light p-2 text-sm sm:col-span-2"
                >
                  <option value="halal">✓ Halal</option>
                  <option value="douteux">⚠ Douteux</option>
                  <option value="haram">✗ Haram</option>
                </select>
                <button
                  type="button"
                  onClick={() => removeAlloc(i)}
                  className="text-xs text-red-600 sm:col-span-1"
                >
                  ✕
                </button>
              </div>
              <input
                type="text"
                placeholder="Commentaire"
                value={row.commentaire ?? ''}
                onChange={(e) =>
                  updateAlloc(i, { commentaire: e.target.value })
                }
                className="w-full rounded border border-amana-grey-light p-2 text-xs"
              />
            </div>
          ))}
        </div>
        <SupportsDatalist />
      </section>
      <section className="space-y-3">
        <SectionTitle>4. Purification estimée</SectionTitle>
        <Field label="Intérêts à donner en charité (€)">
          <input
            type="text"
            value={value.purification_estimee_eur ?? ''}
            onChange={(e) =>
              onChange({ ...value, purification_estimee_eur: e.target.value })
            }
            className="w-full rounded border border-amana-grey-light p-2 text-sm"
          />
        </Field>
        <Field label="Commentaire">
          <textarea
            value={value.purification_commentaire ?? ''}
            onChange={(e) =>
              onChange({ ...value, purification_commentaire: e.target.value })
            }
            rows={2}
            className="w-full rounded border border-amana-grey-light p-2 text-sm"
          />
        </Field>
      </section>
      <section className="space-y-3">
        <SectionTitle>5. Zakat estimée</SectionTitle>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Base zakatable">
            <input
              type="text"
              value={value.zakat_base_eur ?? ''}
              onChange={(e) =>
                onChange({ ...value, zakat_base_eur: e.target.value })
              }
              className="w-full rounded border border-amana-grey-light p-2 text-sm"
            />
          </Field>
          <Field label="Zakat estimée">
            <input
              type="text"
              value={value.zakat_estimee_eur ?? ''}
              onChange={(e) =>
                onChange({ ...value, zakat_estimee_eur: e.target.value })
              }
              className="w-full rounded border border-amana-grey-light p-2 text-sm"
            />
          </Field>
          <Field label="Date hawl">
            <input
              type="text"
              value={value.zakat_date_hawl ?? ''}
              onChange={(e) =>
                onChange({ ...value, zakat_date_hawl: e.target.value })
              }
              className="w-full rounded border border-amana-grey-light p-2 text-sm"
            />
          </Field>
          <Field label="Nisab de référence">
            <input
              type="text"
              value={value.zakat_nisab_reference ?? ''}
              onChange={(e) =>
                onChange({ ...value, zakat_nisab_reference: e.target.value })
              }
              className="w-full rounded border border-amana-grey-light p-2 text-sm"
            />
          </Field>
        </div>
      </section>
      <section className="space-y-3">
        <SectionTitle>6. Points de vigilance</SectionTitle>
        <Field label="Points de vigilance" hint="Une ligne par point">
          <textarea
            value={value.points_vigilance ?? ''}
            onChange={(e) =>
              onChange({ ...value, points_vigilance: e.target.value })
            }
            rows={5}
            className="w-full rounded border border-amana-grey-light p-2 text-sm"
          />
        </Field>
      </section>
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <SectionTitle>7. Recommandations prioritaires *</SectionTitle>
          <button
            type="button"
            onClick={addReco}
            className="text-xs text-amana-forest underline"
          >
            + Ajouter
          </button>
        </div>
        <div className="space-y-2">
          {reco.map((row, i) => (
            <div
              key={i}
              className="grid grid-cols-1 gap-2 rounded border border-amana-grey-light p-3 sm:grid-cols-12"
            >
              <input
                type="text"
                placeholder="Action"
                value={row.action}
                onChange={(e) => updateReco(i, { action: e.target.value })}
                className="rounded border border-amana-grey-light p-2 text-sm sm:col-span-5"
              />
              <select
                value={row.horizon}
                onChange={(e) =>
                  updateReco(i, {
                    horizon: e.target.value as
                      | 'immediat'
                      | '6_mois'
                      | '12_mois',
                  })
                }
                className="rounded border border-amana-grey-light p-2 text-sm sm:col-span-2"
              >
                <option value="immediat">Immédiat</option>
                <option value="6_mois">6 mois</option>
                <option value="12_mois">12 mois</option>
              </select>
              <input
                type="text"
                placeholder="Justification"
                value={row.justification ?? ''}
                onChange={(e) =>
                  updateReco(i, { justification: e.target.value })
                }
                className="rounded border border-amana-grey-light p-2 text-sm sm:col-span-4"
              />
              <button
                type="button"
                onClick={() => removeReco(i)}
                className="text-xs text-red-600 sm:col-span-1"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function PrecoForm({
  value,
  onChange,
  missing,
}: {
  value: PrecoInputs
  onChange: (v: PrecoInputs) => void
  missing: string[]
}) {
  const allocation = value.allocation_cible_detaillee ?? []
  const enveloppes = value.enveloppes_choisies ?? []
  const updateAlloc = (i: number, patch: Partial<AllocationCibleLine>) =>
    onChange({
      ...value,
      allocation_cible_detaillee: allocation.map((row, idx) =>
        idx === i ? { ...row, ...patch } : row
      ),
    })
  const addAlloc = () =>
    onChange({
      ...value,
      allocation_cible_detaillee: [
        ...allocation,
        { classe: '', pourcentage: '', montant_eur: '', statut_sharia: 'halal' },
      ],
    })
  const removeAlloc = (i: number) => {
    const next = allocation.filter((_, idx) => idx !== i)
    onChange({
      ...value,
      allocation_cible_detaillee:
        next.length > 0
          ? next
          : [
              {
                classe: '',
                pourcentage: '',
                montant_eur: '',
                statut_sharia: 'halal',
              },
            ],
    })
  }
  const updateEnv = (i: number, patch: Partial<EnveloppeLine>) =>
    onChange({
      ...value,
      enveloppes_choisies: enveloppes.map((row, idx) =>
        idx === i ? { ...row, ...patch } : row
      ),
    })
  const addEnv = () =>
    onChange({
      ...value,
      enveloppes_choisies: [
        ...enveloppes,
        { type: 'av_vie_plus', montant_eur: '' },
      ],
    })
  const removeEnv = (i: number) => {
    const next = enveloppes.filter((_, idx) => idx !== i)
    onChange({
      ...value,
      enveloppes_choisies:
        next.length > 0 ? next : [{ type: 'av_vie_plus', montant_eur: '' }],
    })
  }
  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <SectionTitle>1. Cadrage de la mission</SectionTitle>
        <Field
          label="Synthèse mission *"
          error={missing.includes('mission_synthese')}
        >
          <textarea
            value={value.mission_synthese ?? ''}
            onChange={(e) =>
              onChange({ ...value, mission_synthese: e.target.value })
            }
            rows={4}
            className="w-full rounded border border-amana-grey-light p-2 text-sm"
          />
        </Field>
        <Field label="Date de la préco">
          <input
            type="text"
            value={value.preco_date ?? ''}
            onChange={(e) => onChange({ ...value, preco_date: e.target.value })}
            className="w-full rounded border border-amana-grey-light p-2 text-sm"
          />
        </Field>
      </section>
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <SectionTitle>2. Allocation cible détaillée *</SectionTitle>
          <button
            type="button"
            onClick={addAlloc}
            className="text-xs text-amana-forest underline"
          >
            + Ajouter
          </button>
        </div>
        <div className="space-y-2">
          {allocation.map((row, i) => (
            <div
              key={i}
              className="rounded border border-amana-grey-light p-3 space-y-2"
            >
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-12">
                <input
                  type="text"
                  placeholder="Classe"
                  value={row.classe}
                  onChange={(e) => updateAlloc(i, { classe: e.target.value })}
                  className="rounded border border-amana-grey-light p-2 text-sm sm:col-span-2"
                />
                <input
                  type="text"
                  placeholder="Support (nom)"
                  value={row.support_nom ?? ''}
                  onChange={(e) =>
                    updateAlloc(i, { support_nom: e.target.value })
                  }
                  list="supports-halal-list"
                  className="rounded border border-amana-grey-light p-2 text-sm sm:col-span-3"
                />
                <input
                  type="text"
                  placeholder="ISIN"
                  value={row.support_isin ?? ''}
                  onChange={(e) =>
                    updateAlloc(i, { support_isin: e.target.value })
                  }
                  className="rounded border border-amana-grey-light p-2 text-sm sm:col-span-2"
                />
                <select
                  value={row.enveloppe ?? 'av_vie_plus'}
                  onChange={(e) =>
                    updateAlloc(i, { enveloppe: e.target.value as Enveloppe })
                  }
                  className="rounded border border-amana-grey-light p-2 text-sm sm:col-span-2"
                >
                  <option value="av_vie_plus">AV Vie Plus</option>
                  <option value="cto_intencial">CTO Intencial</option>
                  <option value="hors_enveloppe">Hors enveloppe</option>
                </select>
                <input
                  type="text"
                  placeholder="Montant €"
                  value={row.montant_eur}
                  onChange={(e) =>
                    updateAlloc(i, { montant_eur: e.target.value })
                  }
                  className="rounded border border-amana-grey-light p-2 text-sm sm:col-span-1"
                />
                <input
                  type="text"
                  placeholder="%"
                  value={row.pourcentage}
                  onChange={(e) =>
                    updateAlloc(i, { pourcentage: e.target.value })
                  }
                  className="rounded border border-amana-grey-light p-2 text-sm sm:col-span-1"
                />
                <button
                  type="button"
                  onClick={() => removeAlloc(i)}
                  className="text-xs text-red-600 sm:col-span-1"
                >
                  ✕
                </button>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-12">
                <select
                  value={row.statut_sharia ?? 'halal'}
                  onChange={(e) =>
                    updateAlloc(i, {
                      statut_sharia: e.target.value as StatutSharia,
                    })
                  }
                  className="rounded border border-amana-grey-light p-2 text-xs sm:col-span-2"
                >
                  <option value="halal">✓ Halal</option>
                  <option value="a_verifier">? À vérifier</option>
                  <option value="douteux">⚠ Douteux</option>
                  <option value="haram">✗ Haram</option>
                </select>
                <input
                  type="text"
                  placeholder="Justification"
                  value={row.justification ?? ''}
                  onChange={(e) =>
                    updateAlloc(i, { justification: e.target.value })
                  }
                  className="rounded border border-amana-grey-light p-2 text-xs sm:col-span-10"
                />
              </div>
            </div>
          ))}
        </div>
        <SupportsDatalist />
      </section>
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <SectionTitle>3. Enveloppes choisies *</SectionTitle>
          <button
            type="button"
            onClick={addEnv}
            className="text-xs text-amana-forest underline"
          >
            + Ajouter
          </button>
        </div>
        <div className="space-y-2">
          {enveloppes.map((row, i) => (
            <div
              key={i}
              className="grid grid-cols-1 gap-2 rounded border border-amana-grey-light p-3 sm:grid-cols-12"
            >
              <select
                value={row.type}
                onChange={(e) =>
                  updateEnv(i, { type: e.target.value as Enveloppe })
                }
                className="rounded border border-amana-grey-light p-2 text-sm sm:col-span-3"
              >
                <option value="av_vie_plus">AV Vie Plus</option>
                <option value="cto_intencial">CTO Intencial</option>
                <option value="hors_enveloppe">Hors enveloppe</option>
              </select>
              <input
                type="text"
                placeholder="Montant €"
                value={row.montant_eur}
                onChange={(e) => updateEnv(i, { montant_eur: e.target.value })}
                className="rounded border border-amana-grey-light p-2 text-sm sm:col-span-2"
              />
              <input
                type="text"
                placeholder="Justification fiscale"
                value={row.justification_fiscale ?? ''}
                onChange={(e) =>
                  updateEnv(i, { justification_fiscale: e.target.value })
                }
                className="rounded border border-amana-grey-light p-2 text-sm sm:col-span-6"
              />
              <button
                type="button"
                onClick={() => removeEnv(i)}
                className="text-xs text-red-600 sm:col-span-1"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </section>
      <section className="space-y-3">
        <SectionTitle>4. Calendrier d'exécution</SectionTitle>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Versement initial">
            <input
              type="text"
              value={value.versement_initial_eur ?? ''}
              onChange={(e) =>
                onChange({ ...value, versement_initial_eur: e.target.value })
              }
              className="w-full rounded border border-amana-grey-light p-2 text-sm"
            />
          </Field>
          <Field label="Versements programmés">
            <input
              type="text"
              value={value.versements_programmes_eur ?? ''}
              onChange={(e) =>
                onChange({
                  ...value,
                  versements_programmes_eur: e.target.value,
                })
              }
              className="w-full rounded border border-amana-grey-light p-2 text-sm"
            />
          </Field>
          <Field label="Fréquence des versements">
            <select
              value={value.versements_frequence ?? 'mensuel'}
              onChange={(e) =>
                onChange({
                  ...value,
                  versements_frequence: e.target.value as FreqVersement,
                })
              }
              className="w-full rounded border border-amana-grey-light p-2 text-sm"
            >
              <option value="unique">Versement unique</option>
              <option value="mensuel">Mensuel</option>
              <option value="trimestriel">Trimestriel</option>
              <option value="annuel">Annuel</option>
            </select>
          </Field>
          <Field label="Fréquence d'arbitrage">
            <select
              value={value.arbitrage_frequence ?? 'annuel'}
              onChange={(e) =>
                onChange({
                  ...value,
                  arbitrage_frequence: e.target.value as FreqArbitrage,
                })
              }
              className="w-full rounded border border-amana-grey-light p-2 text-sm"
            >
              <option value="aucun">Aucun</option>
              <option value="semestriel">Semestriel</option>
              <option value="annuel">Annuel</option>
            </select>
          </Field>
        </div>
      </section>
      <section className="space-y-3">
        <SectionTitle>5. Frais & coûts</SectionTitle>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Frais d'entrée">
            <input
              type="text"
              value={value.frais_entree_pct ?? ''}
              onChange={(e) =>
                onChange({ ...value, frais_entree_pct: e.target.value })
              }
              className="w-full rounded border border-amana-grey-light p-2 text-sm"
            />
          </Field>
          <Field label="Frais de gestion annuels">
            <input
              type="text"
              value={value.frais_gestion_annuel_pct ?? ''}
              onChange={(e) =>
                onChange({
                  ...value,
                  frais_gestion_annuel_pct: e.target.value,
                })
              }
              className="w-full rounded border border-amana-grey-light p-2 text-sm"
            />
          </Field>
          <Field label="Honoraires AMANA">
            <input
              type="text"
              value={value.honoraires_amana ?? ''}
              onChange={(e) =>
                onChange({ ...value, honoraires_amana: e.target.value })
              }
              className="w-full rounded border border-amana-grey-light p-2 text-sm"
            />
          </Field>
        </div>
      </section>
      <section className="space-y-3">
        <SectionTitle>6. Impact attendu & risques</SectionTitle>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Rendement annualisé cible">
            <input
              type="text"
              value={value.rendement_cible_annuel_pct ?? ''}
              onChange={(e) =>
                onChange({
                  ...value,
                  rendement_cible_annuel_pct: e.target.value,
                })
              }
              className="w-full rounded border border-amana-grey-light p-2 text-sm"
            />
          </Field>
          <Field label="Horizon">
            <input
              type="text"
              value={value.rendement_horizon ?? ''}
              onChange={(e) =>
                onChange({ ...value, rendement_horizon: e.target.value })
              }
              className="w-full rounded border border-amana-grey-light p-2 text-sm"
            />
          </Field>
        </div>
        <Field label="Risques identifiés" hint="Une ligne par risque">
          <textarea
            value={value.risques_identifies ?? ''}
            onChange={(e) =>
              onChange({ ...value, risques_identifies: e.target.value })
            }
            rows={5}
            className="w-full rounded border border-amana-grey-light p-2 text-sm"
          />
        </Field>
      </section>
      <section className="space-y-3">
        <SectionTitle>7. Suivi & révision *</SectionTitle>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field
            label="Fréquence de revue *"
            error={missing.includes('prochaine_revision_frequence')}
          >
            <select
              value={value.prochaine_revision_frequence ?? 'annuelle'}
              onChange={(e) =>
                onChange({
                  ...value,
                  prochaine_revision_frequence: e.target.value as FreqRevision,
                })
              }
              className="w-full rounded border border-amana-grey-light p-2 text-sm"
            >
              <option value="semestrielle">Semestrielle</option>
              <option value="annuelle">Annuelle</option>
              <option value="biennale">Biennale</option>
            </select>
          </Field>
          <Field label="Prochaine revue (date)">
            <input
              type="text"
              value={value.prochaine_revision_date ?? ''}
              onChange={(e) =>
                onChange({
                  ...value,
                  prochaine_revision_date: e.target.value,
                })
              }
              className="w-full rounded border border-amana-grey-light p-2 text-sm"
            />
          </Field>
        </div>
      </section>
    </div>
  )
}

// =====================================================================
// ZAKAT (NEW v4)
// =====================================================================
function ZakatForm({
  value,
  onChange,
  missing,
}: {
  value: ZakatInputs
  onChange: (v: ZakatInputs) => void
  missing: string[]
}) {
  const bases = value.bases_par_classe ?? []
  const projection = value.projection_pluriannuelle ?? []

  const updateBase = (i: number, patch: Partial<ZakatBaseLine>) =>
    onChange({
      ...value,
      bases_par_classe: bases.map((row, idx) =>
        idx === i ? { ...row, ...patch } : row
      ),
    })
  const addBase = () =>
    onChange({
      ...value,
      bases_par_classe: [
        ...bases,
        {
          classe: '',
          montant_zakatable_eur: '',
          taux: '2,5%',
          zakat_due_eur: '',
        },
      ],
    })
  const removeBase = (i: number) => {
    const next = bases.filter((_, idx) => idx !== i)
    onChange({
      ...value,
      bases_par_classe:
        next.length > 0
          ? next
          : [
              {
                classe: '',
                montant_zakatable_eur: '',
                taux: '2,5%',
                zakat_due_eur: '',
              },
            ],
    })
  }

  const updateProj = (i: number, patch: Partial<ProjectionLine>) =>
    onChange({
      ...value,
      projection_pluriannuelle: projection.map((row, idx) =>
        idx === i ? { ...row, ...patch } : row
      ),
    })
  const addProj = () =>
    onChange({
      ...value,
      projection_pluriannuelle: [
        ...projection,
        { annee: '', patrimoine_zakatable_eur: '', zakat_estimee_eur: '' },
      ],
    })
  const removeProj = (i: number) =>
    onChange({
      ...value,
      projection_pluriannuelle: projection.filter((_, idx) => idx !== i),
    })

  return (
    <div className="space-y-6">
      {/* SECTION 1 — Synthèse */}
      <section className="space-y-3">
        <SectionTitle>1. Synthèse client</SectionTitle>
        <Field
          label="Synthèse situation zakatable *"
          hint="3-6 lignes : composition zakatable du patrimoine, particularités (or de famille, parts SARL, créances, etc.)"
          error={missing.includes('synthese_zakat_client')}
        >
          <textarea
            value={value.synthese_zakat_client ?? ''}
            onChange={(e) =>
              onChange({ ...value, synthese_zakat_client: e.target.value })
            }
            rows={5}
            className="w-full rounded border border-amana-grey-light p-2 text-sm"
          />
        </Field>
        <Field label="Date de référence du document">
          <input
            type="text"
            value={value.zakat_date_reference ?? ''}
            onChange={(e) =>
              onChange({ ...value, zakat_date_reference: e.target.value })
            }
            className="w-full rounded border border-amana-grey-light p-2 text-sm"
            placeholder="30 avril 2026"
          />
        </Field>
      </section>

      {/* SECTION 2 — Nisab & hawl */}
      <section className="space-y-3">
        <SectionTitle>2. Nisab & hawl *</SectionTitle>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Nisab-or (85 g) en €">
            <input
              type="text"
              value={value.nisab_or_eur ?? ''}
              onChange={(e) =>
                onChange({ ...value, nisab_or_eur: e.target.value })
              }
              className="w-full rounded border border-amana-grey-light p-2 text-sm"
              placeholder="≈ 5 950 €"
            />
          </Field>
          <Field label="Nisab-argent (595 g) en €">
            <input
              type="text"
              value={value.nisab_argent_eur ?? ''}
              onChange={(e) =>
                onChange({ ...value, nisab_argent_eur: e.target.value })
              }
              className="w-full rounded border border-amana-grey-light p-2 text-sm"
              placeholder="≈ 480 €"
            />
          </Field>
          <Field label="Cours de référence" hint="Date / source du cours retenu">
            <input
              type="text"
              value={value.nisab_date_reference ?? ''}
              onChange={(e) =>
                onChange({ ...value, nisab_date_reference: e.target.value })
              }
              className="w-full rounded border border-amana-grey-light p-2 text-sm"
              placeholder="Cours LBMA au 30/04/2026"
            />
          </Field>
          <Field
            label="Nisab retenu *"
            error={missing.includes('nisab_retenu')}
          >
            <select
              value={value.nisab_retenu ?? 'or'}
              onChange={(e) =>
                onChange({ ...value, nisab_retenu: e.target.value as NisabRetenu })
              }
              className="w-full rounded border border-amana-grey-light p-2 text-sm"
            >
              <option value="or">Nisab-or (85 g)</option>
              <option value="argent">Nisab-argent (595 g)</option>
            </select>
          </Field>
          <Field
            label="Date hawl (anniversaire) *"
            hint="Date à laquelle le patrimoine zakatable a 1 an lunaire"
            error={missing.includes('hawl_date_anniversaire')}
          >
            <input
              type="text"
              value={value.hawl_date_anniversaire ?? ''}
              onChange={(e) =>
                onChange({
                  ...value,
                  hawl_date_anniversaire: e.target.value,
                })
              }
              className="w-full rounded border border-amana-grey-light p-2 text-sm"
              placeholder="15 ramadan 1447 / 14 mars 2027"
            />
          </Field>
        </div>
      </section>

      {/* SECTION 3 — Bases par classe */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <SectionTitle>3. Calcul par classe d'actif *</SectionTitle>
          <button
            type="button"
            onClick={addBase}
            className="text-xs text-amana-forest underline"
          >
            + Ajouter une classe
          </button>
        </div>
        <p className="text-xs text-amana-grey">
          Renseigner classe / base zakatable / taux applicable / zakat due. Le
          taux par défaut est 2,5%, à ajuster pour les cas particuliers (ex:
          loyers SCPI = 10% du net selon certaines écoles).
        </p>
        <div className="space-y-2">
          {bases.map((row, i) => (
            <div
              key={i}
              className="rounded border border-amana-grey-light p-3 space-y-2"
            >
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-12">
                <input
                  type="text"
                  placeholder="Classe (cash, or, sukuk, AV, actions, SCPI…)"
                  value={row.classe}
                  onChange={(e) => updateBase(i, { classe: e.target.value })}
                  className="rounded border border-amana-grey-light p-2 text-sm sm:col-span-4"
                />
                <input
                  type="text"
                  placeholder="Base zakatable €"
                  value={row.montant_zakatable_eur}
                  onChange={(e) =>
                    updateBase(i, { montant_zakatable_eur: e.target.value })
                  }
                  className="rounded border border-amana-grey-light p-2 text-sm sm:col-span-3"
                />
                <input
                  type="text"
                  placeholder="Taux"
                  value={row.taux}
                  onChange={(e) => updateBase(i, { taux: e.target.value })}
                  className="rounded border border-amana-grey-light p-2 text-sm sm:col-span-1"
                />
                <input
                  type="text"
                  placeholder="Zakat due €"
                  value={row.zakat_due_eur}
                  onChange={(e) =>
                    updateBase(i, { zakat_due_eur: e.target.value })
                  }
                  className="rounded border border-amana-grey-light p-2 text-sm sm:col-span-3"
                />
                <button
                  type="button"
                  onClick={() => removeBase(i)}
                  className="text-xs text-red-600 sm:col-span-1"
                >
                  ✕
                </button>
              </div>
              <input
                type="text"
                placeholder="Commentaire (optionnel — école, traitement spécifique, etc.)"
                value={row.commentaire ?? ''}
                onChange={(e) =>
                  updateBase(i, { commentaire: e.target.value })
                }
                className="w-full rounded border border-amana-grey-light p-2 text-xs"
              />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Dettes déductibles (€)">
            <input
              type="text"
              value={value.dettes_deductibles_eur ?? ''}
              onChange={(e) =>
                onChange({ ...value, dettes_deductibles_eur: e.target.value })
              }
              className="w-full rounded border border-amana-grey-light p-2 text-sm"
            />
          </Field>
          <Field label="Total zakat due cette année (€)">
            <input
              type="text"
              value={value.total_zakat_due_eur ?? ''}
              onChange={(e) =>
                onChange({ ...value, total_zakat_due_eur: e.target.value })
              }
              className="w-full rounded border border-amana-grey-light p-2 text-sm"
            />
          </Field>
        </div>
      </section>

      {/* SECTION 4 — Plan annuel */}
      <section className="space-y-3">
        <SectionTitle>4. Plan annuel</SectionTitle>
        <Field label="Bénéficiaires identifiés" hint="Associations, personnes, projets…">
          <textarea
            value={value.beneficiaires_choisis ?? ''}
            onChange={(e) =>
              onChange({ ...value, beneficiaires_choisis: e.target.value })
            }
            rows={3}
            className="w-full rounded border border-amana-grey-light p-2 text-sm"
            placeholder="Ex: Secours Islamique France (50%), Islamic Relief (30%), proches éligibles (20%)"
          />
        </Field>
        <Field label="Prochaine échéance de paiement">
          <input
            type="text"
            value={value.prochaine_echeance_paiement ?? ''}
            onChange={(e) =>
              onChange({
                ...value,
                prochaine_echeance_paiement: e.target.value,
              })
            }
            className="w-full rounded border border-amana-grey-light p-2 text-sm"
            placeholder="Ramadan 1447 / mars 2027"
          />
        </Field>
      </section>

      {/* SECTION 5 — Projection */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <SectionTitle>5. Projection pluriannuelle</SectionTitle>
          <button
            type="button"
            onClick={addProj}
            className="text-xs text-amana-forest underline"
          >
            + Ajouter une année
          </button>
        </div>
        <p className="text-xs text-amana-grey">
          Optionnel — utile pour donner au client une vision sur 3-5 ans.
        </p>
        <div className="space-y-2">
          {projection.map((row, i) => (
            <div
              key={i}
              className="grid grid-cols-1 gap-2 rounded border border-amana-grey-light p-3 sm:grid-cols-12"
            >
              <input
                type="text"
                placeholder="Année"
                value={row.annee}
                onChange={(e) => updateProj(i, { annee: e.target.value })}
                className="rounded border border-amana-grey-light p-2 text-sm sm:col-span-2"
              />
              <input
                type="text"
                placeholder="Patrimoine zakatable €"
                value={row.patrimoine_zakatable_eur}
                onChange={(e) =>
                  updateProj(i, { patrimoine_zakatable_eur: e.target.value })
                }
                className="rounded border border-amana-grey-light p-2 text-sm sm:col-span-3"
              />
              <input
                type="text"
                placeholder="Zakat estimée €"
                value={row.zakat_estimee_eur}
                onChange={(e) =>
                  updateProj(i, { zakat_estimee_eur: e.target.value })
                }
                className="rounded border border-amana-grey-light p-2 text-sm sm:col-span-2"
              />
              <input
                type="text"
                placeholder="Hypothèses"
                value={row.hypotheses ?? ''}
                onChange={(e) =>
                  updateProj(i, { hypotheses: e.target.value })
                }
                className="rounded border border-amana-grey-light p-2 text-sm sm:col-span-4"
              />
              <button
                type="button"
                onClick={() => removeProj(i)}
                className="text-xs text-red-600 sm:col-span-1"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 6 — Vigilance */}
      <section className="space-y-3">
        <SectionTitle>6. Notes spécifiques au dossier</SectionTitle>
        <Field
          label="Cas particuliers"
          hint="Or de bijouterie, parts SARL, cryptos, créances douteuses, métiers à zakat spécifique…"
        >
          <textarea
            value={value.vigilance_specificites ?? ''}
            onChange={(e) =>
              onChange({ ...value, vigilance_specificites: e.target.value })
            }
            rows={4}
            className="w-full rounded border border-amana-grey-light p-2 text-sm"
          />
        </Field>
      </section>
    </div>
  )
}

// =====================================================================
// SUCCESSION (NEW v5)
// =====================================================================
function SuccessionForm({
  value,
  onChange,
  missing,
}: {
  value: SuccessionInputs
  onChange: (v: SuccessionInputs) => void
  missing: string[]
}) {
  const heritiers = value.heritiers ?? []
  const actions = value.actions_proposees ?? []

  const updateHeritier = (i: number, patch: Partial<HeritierLine>) =>
    onChange({
      ...value,
      heritiers: heritiers.map((row, idx) =>
        idx === i ? { ...row, ...patch } : row
      ),
    })
  const addHeritier = () =>
    onChange({
      ...value,
      heritiers: [...heritiers, { lien: 'fils', nom: '' }],
    })
  const removeHeritier = (i: number) => {
    const next = heritiers.filter((_, idx) => idx !== i)
    onChange({
      ...value,
      heritiers: next.length > 0 ? next : [{ lien: 'epoux', nom: '' }],
    })
  }

  const updateAction = (i: number, patch: Partial<ActionSuccessorale>) =>
    onChange({
      ...value,
      actions_proposees: actions.map((row, idx) =>
        idx === i ? { ...row, ...patch } : row
      ),
    })
  const addAction = () =>
    onChange({
      ...value,
      actions_proposees: [
        ...actions,
        { outil: 'donation_entre_epoux', titre: '' },
      ],
    })
  const removeAction = (i: number) => {
    const next = actions.filter((_, idx) => idx !== i)
    onChange({
      ...value,
      actions_proposees:
        next.length > 0 ? next : [{ outil: 'donation_entre_epoux', titre: '' }],
    })
  }

  return (
    <div className="space-y-6">
      {/* SECTION 1 — Cadrage */}
      <section className="space-y-3">
        <SectionTitle>1. Cadrage situation</SectionTitle>
        <Field
          label="Synthèse situation *"
          hint="3-6 lignes : état civil, composition familiale, patrimoine global, intentions"
          error={missing.includes('synthese_situation')}
        >
          <textarea
            value={value.synthese_situation ?? ''}
            onChange={(e) =>
              onChange({ ...value, synthese_situation: e.target.value })
            }
            rows={5}
            className="w-full rounded border border-amana-grey-light p-2 text-sm"
          />
        </Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Date de référence">
            <input
              type="text"
              value={value.date_reference ?? ''}
              onChange={(e) =>
                onChange({ ...value, date_reference: e.target.value })
              }
              className="w-full rounded border border-amana-grey-light p-2 text-sm"
            />
          </Field>
          <Field label="Patrimoine successoral estimé (€)">
            <input
              type="text"
              value={value.patrimoine_succession_eur ?? ''}
              onChange={(e) =>
                onChange({
                  ...value,
                  patrimoine_succession_eur: e.target.value,
                })
              }
              className="w-full rounded border border-amana-grey-light p-2 text-sm"
            />
          </Field>
        </div>
      </section>

      {/* SECTION 2 — Statut matrimonial */}
      <section className="space-y-3">
        <SectionTitle>2. Statut & régime matrimonial *</SectionTitle>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field
            label="Statut matrimonial *"
            error={missing.includes('statut_matrimonial')}
          >
            <select
              value={value.statut_matrimonial ?? 'celibataire'}
              onChange={(e) =>
                onChange({
                  ...value,
                  statut_matrimonial: e.target.value as StatutMatrimonial,
                })
              }
              className="w-full rounded border border-amana-grey-light p-2 text-sm"
            >
              {(Object.keys(STATUT_MATRIMONIAL_LABEL) as StatutMatrimonial[]).map(
                (k) => (
                  <option key={k} value={k}>
                    {STATUT_MATRIMONIAL_LABEL[k]}
                  </option>
                )
              )}
            </select>
          </Field>
          <Field label="Détail régime / contrat de mariage">
            <input
              type="text"
              value={value.regime_matrimonial_detail ?? ''}
              onChange={(e) =>
                onChange({
                  ...value,
                  regime_matrimonial_detail: e.target.value,
                })
              }
              className="w-full rounded border border-amana-grey-light p-2 text-sm"
              placeholder="Ex: contrat sép. biens du 12/03/2018"
            />
          </Field>
        </div>
        <Field label="Composition familiale (texte libre)">
          <textarea
            value={value.composition_familiale ?? ''}
            onChange={(e) =>
              onChange({ ...value, composition_familiale: e.target.value })
            }
            rows={4}
            className="w-full rounded border border-amana-grey-light p-2 text-sm"
          />
        </Field>
      </section>

      {/* SECTION 3 — Héritiers */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <SectionTitle>3. Héritiers identifiés *</SectionTitle>
          <button
            type="button"
            onClick={addHeritier}
            className="text-xs text-amana-forest underline"
          >
            + Ajouter
          </button>
        </div>
        <div className="space-y-2">
          {heritiers.map((row, i) => (
            <div
              key={i}
              className="rounded border border-amana-grey-light p-3 space-y-2"
            >
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-12">
                <select
                  value={row.lien}
                  onChange={(e) =>
                    updateHeritier(i, { lien: e.target.value as HeritierLien })
                  }
                  className="rounded border border-amana-grey-light p-2 text-sm sm:col-span-2"
                >
                  {(Object.keys(HERITIER_LIEN_LABEL) as HeritierLien[]).map((k) => (
                    <option key={k} value={k}>
                      {HERITIER_LIEN_LABEL[k]}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Nom"
                  value={row.nom}
                  onChange={(e) => updateHeritier(i, { nom: e.target.value })}
                  className="rounded border border-amana-grey-light p-2 text-sm sm:col-span-3"
                />
                <input
                  type="text"
                  placeholder="Part Sharia (ex: 1/8)"
                  value={row.part_sharia_pct ?? ''}
                  onChange={(e) =>
                    updateHeritier(i, { part_sharia_pct: e.target.value })
                  }
                  className="rounded border border-amana-grey-light p-2 text-sm sm:col-span-2"
                />
                <input
                  type="text"
                  placeholder="Part Droit FR"
                  value={row.part_droit_fr_pct ?? ''}
                  onChange={(e) =>
                    updateHeritier(i, { part_droit_fr_pct: e.target.value })
                  }
                  className="rounded border border-amana-grey-light p-2 text-sm sm:col-span-2"
                />
                <input
                  type="text"
                  placeholder="Commentaire"
                  value={row.ecart_commentaire ?? ''}
                  onChange={(e) =>
                    updateHeritier(i, { ecart_commentaire: e.target.value })
                  }
                  className="rounded border border-amana-grey-light p-2 text-sm sm:col-span-2"
                />
                <button
                  type="button"
                  onClick={() => removeHeritier(i)}
                  className="text-xs text-red-600 sm:col-span-1"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 4 — Cadres juridiques */}
      <section className="space-y-3">
        <SectionTitle>4. Cadres juridiques</SectionTitle>
        <Field
          label="Synthèse parts coraniques retenues"
          hint="Validation Sakina obligatoire"
        >
          <textarea
            value={value.synthese_parts_coraniques ?? ''}
            onChange={(e) =>
              onChange({ ...value, synthese_parts_coraniques: e.target.value })
            }
            rows={4}
            className="w-full rounded border border-amana-grey-light p-2 text-sm"
          />
        </Field>
        <Field label="Synthèse parts droit français retenues">
          <textarea
            value={value.synthese_parts_droit_francais ?? ''}
            onChange={(e) =>
              onChange({
                ...value,
                synthese_parts_droit_francais: e.target.value,
              })
            }
            rows={4}
            className="w-full rounded border border-amana-grey-light p-2 text-sm"
          />
        </Field>
        <Field label="Écarts identifiés et explication">
          <textarea
            value={value.ecarts_explication ?? ''}
            onChange={(e) =>
              onChange({ ...value, ecarts_explication: e.target.value })
            }
            rows={5}
            className="w-full rounded border border-amana-grey-light p-2 text-sm"
          />
        </Field>
      </section>

      {/* SECTION 5 — Actions proposées */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <SectionTitle>5. Actions proposées *</SectionTitle>
          <button
            type="button"
            onClick={addAction}
            className="text-xs text-amana-forest underline"
          >
            + Ajouter
          </button>
        </div>
        <div className="space-y-2">
          {actions.map((row, i) => (
            <div
              key={i}
              className="rounded border border-amana-grey-light p-3 space-y-2"
            >
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-12">
                <select
                  value={row.outil}
                  onChange={(e) =>
                    updateAction(i, {
                      outil: e.target.value as OutilSuccessoral,
                    })
                  }
                  className="rounded border border-amana-grey-light p-2 text-sm sm:col-span-3"
                >
                  {(Object.keys(OUTIL_LABEL) as OutilSuccessoral[]).map((k) => (
                    <option key={k} value={k}>
                      {OUTIL_LABEL[k]}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Titre de l'action"
                  value={row.titre}
                  onChange={(e) => updateAction(i, { titre: e.target.value })}
                  className="rounded border border-amana-grey-light p-2 text-sm sm:col-span-5"
                />
                <select
                  value={row.horizon ?? 'immediat'}
                  onChange={(e) =>
                    updateAction(i, {
                      horizon: e.target.value as ActionSuccessorale['horizon'],
                    })
                  }
                  className="rounded border border-amana-grey-light p-2 text-sm sm:col-span-3"
                >
                  <option value="immediat">Immédiat</option>
                  <option value="6_mois">6 mois</option>
                  <option value="12_mois">12 mois</option>
                  <option value="long_terme">Long terme</option>
                </select>
                <button
                  type="button"
                  onClick={() => removeAction(i)}
                  className="text-xs text-red-600 sm:col-span-1"
                >
                  ✕
                </button>
              </div>
              <input
                type="text"
                placeholder="Description (optionnel)"
                value={row.description ?? ''}
                onChange={(e) =>
                  updateAction(i, { description: e.target.value })
                }
                className="w-full rounded border border-amana-grey-light p-2 text-xs"
              />
              <input
                type="text"
                placeholder="Effet attendu (optionnel)"
                value={row.effet_attendu ?? ''}
                onChange={(e) =>
                  updateAction(i, { effet_attendu: e.target.value })
                }
                className="w-full rounded border border-amana-grey-light p-2 text-xs"
              />
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 6 — Notaire & attention */}
      <section className="space-y-3">
        <SectionTitle>6. Points d'attention & notaire</SectionTitle>
        <Field label="Points d'attention" hint="Une ligne par point">
          <textarea
            value={value.points_attention ?? ''}
            onChange={(e) =>
              onChange({ ...value, points_attention: e.target.value })
            }
            rows={4}
            className="w-full rounded border border-amana-grey-light p-2 text-sm"
          />
        </Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Notaire référent">
            <input
              type="text"
              value={value.notaire_referent ?? ''}
              onChange={(e) =>
                onChange({ ...value, notaire_referent: e.target.value })
              }
              className="w-full rounded border border-amana-grey-light p-2 text-sm"
              placeholder="Cabinet / nom"
            />
          </Field>
          <Field label="Prochaine étape">
            <input
              type="text"
              value={value.prochaine_etape ?? ''}
              onChange={(e) =>
                onChange({ ...value, prochaine_etape: e.target.value })
              }
              className="w-full rounded border border-amana-grey-light p-2 text-sm"
              placeholder="Ex: rdv notaire le 20/05"
            />
          </Field>
        </div>
      </section>
    </div>
  )
}

// =====================================================================
// BulletinForm — Bulletin de souscription
// =====================================================================
function BulletinForm({
  value,
  onChange,
}: {
  value: Record<string, unknown>
  onChange: (v: Record<string, unknown>) => void
}) {
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    onChange({ ...value, [k]: e.target.value })

  return (
    <div className="space-y-4">
      <Field label="Produit *">
        <input
          type="text"
          value={(value.produit as string) ?? ''}
          onChange={set('produit')}
          placeholder="ex : Vie Plus, Intencial Vie, NCap"
          className="w-full rounded border border-amana-grey-light p-2 text-sm"
        />
      </Field>
      <Field label="Assureur / Gestionnaire">
        <input
          type="text"
          value={(value.assureur as string) ?? ''}
          onChange={set('assureur')}
          placeholder="ex : Suravenir, Spirica, Nortia"
          className="w-full rounded border border-amana-grey-light p-2 text-sm"
        />
      </Field>
      <Field label="Code ISIN (UC)">
        <input
          type="text"
          value={(value.isin as string) ?? ''}
          onChange={set('isin')}
          placeholder="ex : FR0010959676"
          className="w-full rounded border border-amana-grey-light p-2 text-sm"
        />
      </Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Versement initial (€) *">
          <input
            type="number"
            min={0}
            value={(value.versement_initial_eur as number) ?? 0}
            onChange={(e) => onChange({ ...value, versement_initial_eur: parseFloat(e.target.value) || 0 })}
            className="w-full rounded border border-amana-grey-light p-2 text-sm"
          />
        </Field>
        <Field label="Versements programmés (€)">
          <input
            type="number"
            min={0}
            value={(value.versements_programmes_eur as number) ?? ''}
            onChange={(e) => onChange({ ...value, versements_programmes_eur: parseFloat(e.target.value) || 0 })}
            className="w-full rounded border border-amana-grey-light p-2 text-sm"
          />
        </Field>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Fréquence versements">
          <select
            value={(value.frequence_versements as string) ?? 'unique'}
            onChange={set('frequence_versements')}
            className="w-full rounded border border-amana-grey-light p-2 text-sm"
          >
            <option value="unique">Versement unique</option>
            <option value="mensuel">Mensuel</option>
            <option value="trimestriel">Trimestriel</option>
            <option value="semestriel">Semestriel</option>
            <option value="annuel">Annuel</option>
          </select>
        </Field>
        <Field label="Durée envisagée (ans)">
          <input
            type="number"
            min={1}
            value={(value.duree_contrat_ans as number) ?? ''}
            onChange={(e) => onChange({ ...value, duree_contrat_ans: parseInt(e.target.value) || undefined })}
            className="w-full rounded border border-amana-grey-light p-2 text-sm"
          />
        </Field>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Frais d'entrée (%)">
          <input
            type="number"
            min={0}
            max={10}
            step={0.01}
            value={(value.frais_entree_pct as number) ?? ''}
            onChange={(e) => onChange({ ...value, frais_entree_pct: parseFloat(e.target.value) || undefined })}
            className="w-full rounded border border-amana-grey-light p-2 text-sm"
          />
        </Field>
        <Field label="Frais de gestion annuels (%)">
          <input
            type="number"
            min={0}
            max={5}
            step={0.01}
            value={(value.frais_gestion_annuel_pct as number) ?? ''}
            onChange={(e) => onChange({ ...value, frais_gestion_annuel_pct: parseFloat(e.target.value) || undefined })}
            className="w-full rounded border border-amana-grey-light p-2 text-sm"
          />
        </Field>
      </div>
      <Field label="Objectif de gestion">
        <textarea
          value={(value.objectif_gestion as string) ?? ''}
          onChange={set('objectif_gestion')}
          rows={3}
          placeholder="ex : Épargne moyen terme, gestion pilotée halal"
          className="w-full rounded border border-amana-grey-light p-2 text-sm"
        />
      </Field>
      <Field label="Unité de compte / Support halal">
        <input
          type="text"
          value={(value.unite_compte as string) ?? ''}
          onChange={set('unite_compte')}
          placeholder="ex : Actions monde ISR halal, Fonds obligataire sukuk"
          className="w-full rounded border border-amana-grey-light p-2 text-sm"
        />
      </Field>
      <Field label="N° de police (si connu)">
        <input
          type="text"
          value={(value.numero_police as string) ?? ''}
          onChange={set('numero_police')}
          className="w-full rounded border border-amana-grey-light p-2 text-sm"
        />
      </Field>
    </div>
  )
}

// =====================================================================
// Helpers UI
// =====================================================================
function SupportsDatalist() {
  return (
    <datalist id="supports-halal-list">
      {SUPPORTS_CATALOG.filter((s) => s.statut_sharia === 'halal').map((s) => (
        <option key={s.isin || s.nom} value={s.nom}>
          {s.isin
            ? `${s.isin} · ${s.enveloppes
                .map((e) => ENVELOPPE_LABEL[e as Enveloppe])
                .join(', ')}`
            : s.enveloppes
                .map((e) => ENVELOPPE_LABEL[e as Enveloppe])
                .join(', ')}
        </option>
      ))}
    </datalist>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-bold uppercase tracking-wide text-amana-forest">
      {children}
    </h2>
  )
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string
  hint?: string
  error?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label
        className={`block text-sm font-semibold ${
          error ? 'text-red-700' : 'text-amana-forest'
        }`}
      >
        {label}
      </label>
      {hint && <p className="mt-0.5 text-xs text-amana-grey">{hint}</p>}
      <div className="mt-1">{children}</div>
    </div>
  )
}
