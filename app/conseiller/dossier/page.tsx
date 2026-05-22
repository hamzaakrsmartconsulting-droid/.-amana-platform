'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

const FOREST = '#2C4A3E'
const GOLD = '#C9A84C'
const CREAM = '#FAF7F2'

const SIT_PRO: Record<string, string> = {
  salarie: 'Salarié(e)',
  independant: 'Indépendant(e)',
  fonctionnaire: 'Fonctionnaire',
  retraite: 'Retraité(e)',
  sans_emploi: 'Sans emploi',
  etudiant: 'Étudiant(e)',
}

const SIT_FAM: Record<string, string> = {
  celibataire: 'Célibataire',
  marie: 'Marié(e)',
  pacse: 'Pacsé(e)',
  divorce: 'Divorcé(e)',
  veuf: 'Veuf/Veuve',
}

const REGIME: Record<string, string> = {
  communaute_reduite: 'Communauté réduite aux acquêts',
  separation_biens: 'Séparation de biens',
  communaute_universelle: 'Communauté universelle',
  participation_acquets: 'Participation aux acquêts',
}

const REVENU: Record<string, string> = {
  moins_30k: 'Moins de 30 000 €',
  '30k_60k': '30 000 – 60 000 €',
  '60k_100k': '60 000 – 100 000 €',
  '100k_200k': '100 000 – 200 000 €',
  plus_200k: 'Plus de 200 000 €',
}

const PATR_FIN: Record<string, string> = {
  moins_10k: 'Moins de 10 000 €',
  '10k_50k': '10 000 – 50 000 €',
  '50k_100k': '50 000 – 100 000 €',
  '100k_300k': '100 000 – 300 000 €',
  '300k_1m': '300 000 – 1 000 000 €',
  plus_1m: 'Plus de 1 000 000 €',
}

const OBJECTIF: Record<string, string> = {
  retraite: 'Préparer la retraite',
  patrimoine: 'Constituer un patrimoine',
  revenus: 'Générer des revenus',
  transmission: 'Transmettre un patrimoine',
  defiscalisation: 'Défiscalisation',
  epargne: 'Épargner à long terme',
}

const HORIZON: Record<string, string> = {
  moins_3: 'Moins de 3 ans',
  '3_5': '3 à 5 ans',
  '5_10': '5 à 10 ans',
  plus_10: 'Plus de 10 ans',
}

const MONTANT: Record<string, string> = {
  moins_5k: 'Moins de 5 000 €',
  '5k_20k': '5 000 – 20 000 €',
  '20k_50k': '20 000 – 50 000 €',
  '50k_100k': '50 000 – 100 000 €',
  plus_100k: 'Plus de 100 000 €',
}

const RISQUE_LBL: Record<number, string> = {
  1: '1 — Très prudent',
  2: '2 — Prudent',
  3: '3 — Équilibré',
  4: '4 — Dynamique',
  5: '5 — Très dynamique',
}

const PROFIL_COLOR: Record<string, string> = {
  prudent: '#3B82F6',
  equilibre: '#10B981',
  dynamique: '#F59E0B',
  offensif: '#EF4444',
}

const STATUT_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  brouillon:  { bg: '#F3F4F6', color: '#6B7280', label: 'Brouillon' },
  soumis:     { bg: '#FEF3C7', color: '#D97706', label: 'À valider' },
  valide:     { bg: '#D1FAE5', color: '#059669', label: 'Validé' },
  rejete:     { bg: '#FEE2E2', color: '#DC2626', label: 'Rejeté' },
}

function Row({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div style={{ display: 'flex', gap: 12, padding: '8px 0', borderBottom: '1px solid #F0EDE8' }}>
      <span style={{ width: 220, flexShrink: 0, color: '#6B7280', fontSize: 13 }}>{label}</span>
      <span style={{ color: '#1F2937', fontSize: 14, fontWeight: 500 }}>{value ?? '—'}</span>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 24, marginBottom: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
      <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: FOREST, letterSpacing: 0.3 }}>{title}</h2>
      {children}
    </div>
  )
}

interface KycData {
  statut: string
  nom: string
  prenom: string
  date_naissance: string
  lieu_naissance: string
  nationalite: string
  situation_familiale: string
  regime_matrimonial?: string
  nombre_enfants?: number
  adresse_ligne1: string
  adresse_ligne2?: string
  code_postal: string
  ville: string
  pays: string
  telephone: string
  situation_professionnelle: string
  employeur?: string
  revenu_annuel_brut: string
  patrimoine_financier: string
  patrimoine_immobilier?: string
  objectif_principal: string
  horizon_investissement: string
  montant_envisage?: string
  tolerance_risque: number
  profil_investisseur: string
  pep: boolean
  us_person: boolean
  adresse_fiscale_identique: boolean
  pays_residence_fiscale?: string
  iban?: string
  bic_swift?: string
  titulaire_compte?: string
  doc_cni?: string
  doc_justificatif_domicile?: string
  doc_rib?: string
  doc_residence_fiscale?: string
  created_at?: string
  updated_at?: string
}

interface Mif2Data {
  profil_final: string
  score_connaissance?: number
  score_experience?: number
  score_risque?: number
  capacite_pertes?: string
  created_at?: string
}

interface ClientInfo {
  email: string
  nom: string
  prenom: string
}

interface DossierData {
  kyc: KycData
  mif2: Mif2Data | null
  client: ClientInfo
  signed_urls?: Record<string, string>
}

const DOC_KEYS = [
  { key: 'doc_cni', label: "Carte nationale d'identité / Passeport" },
  { key: 'doc_justificatif_domicile', label: 'Justificatif de domicile' },
  { key: 'doc_rib', label: "RIB — Relevé d'Identité Bancaire" },
  { key: 'doc_residence_fiscale', label: 'Justificatif de résidence fiscale' },
] as const

export default function DossierPage() {
  const [data, setData] = useState<DossierData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uid, setUid] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionMsg, setActionMsg] = useState<string | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  async function loadData(userId: string) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/client-data?uid=${userId}`)
      if (!res.ok) {
        const j = await res.json()
        throw new Error(j.error ?? 'Erreur serveur')
      }
      const json = await res.json()
      setData(json)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const u = params.get('uid')
    if (!u) {
      setError("Paramètre uid manquant dans l'URL")
      setLoading(false)
      return
    }
    setUid(u)
    loadData(u)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleAction(statut: 'valide' | 'rejete') {
    if (!uid) return
    const label = statut === 'valide' ? 'valider' : 'rejeter'
    if (!confirm(`Confirmer : ${label} ce dossier ?`)) return
    setActionLoading(true)
    setActionMsg(null)
    try {
      const res = await fetch('/api/admin/kyc/statut', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, statut }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error ?? 'Erreur')
      setActionMsg(statut === 'valide' ? '✓ Dossier validé' : '✗ Dossier rejeté')
      loadData(uid)
    } catch (e: unknown) {
      setActionMsg(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/auth'
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: CREAM, display: 'flex', alignItems: 'center', justifyContent: 'center', colorScheme: 'light' }}>
        <p style={{ color: FOREST, fontSize: 16 }}>Chargement du dossier…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: CREAM, display: 'flex', alignItems: 'center', justifyContent: 'center', colorScheme: 'light' }}>
        <div style={{ background: '#fff', borderRadius: 12, padding: 32, textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <p style={{ color: '#DC2626', marginBottom: 16 }}>{error}</p>
          <button onClick={() => window.history.back()}
            style={{ background: FOREST, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', cursor: 'pointer', fontSize: 14 }}>
            ← Retour
          </button>
        </div>
      </div>
    )
  }

  if (!data) return null

  const { kyc, mif2, client, signed_urls } = data
  if (!kyc) {
    return (
      <div style={{ minHeight: '100vh', background: CREAM, colorScheme: 'light' }}>
        <div style={{ background: FOREST, padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button
              onClick={() => { window.location.href = '/conseiller' }}
              style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', borderRadius: 8, padding: '6px 16px', cursor: 'pointer', fontSize: 13 }}
            >
              ← Clients
            </button>
            <span style={{ color: '#fff', fontSize: 20, fontWeight: 700 }}>
              {client.prenom} {client.nom}
            </span>
          </div>
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{client.email}</span>
        </div>

        <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            <h2 style={{ margin: '0 0 10px', color: FOREST, fontSize: 22 }}>KYC non soumis</h2>
            <p style={{ margin: 0, color: '#6b7280', lineHeight: 1.6 }}>
              Ce client n&apos;a pas encore de dossier KYC. Demandez-lui de compléter son KYC depuis son espace client pour afficher les informations ici.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const statutInfo = STATUT_STYLE[kyc.statut] ?? STATUT_STYLE.brouillon
  const profilColor = PROFIL_COLOR[kyc.profil_investisseur] ?? FOREST

  return (
    <div style={{ minHeight: '100vh', background: CREAM, colorScheme: 'light' }}>

      {/* Header */}
      <div style={{ background: FOREST, padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={() => { window.location.href = '/conseiller' }}
            style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', borderRadius: 8, padding: '6px 16px', cursor: 'pointer', fontSize: 13 }}>
            ← Clients
          </button>
          <span style={{ color: '#fff', fontSize: 20, fontWeight: 700 }}>
            {client.prenom} {client.nom}
          </span>
          <span style={{ background: statutInfo.bg, color: statutInfo.color, borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 700 }}>
            {statutInfo.label}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{client.email}</span>
          <button onClick={handleLogout}
            style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 13 }}>
            Déconnexion
          </button>
        </div>
      </div>

      {/* Validation banner */}
      {kyc.statut === 'soumis' && (
        <div style={{ background: '#FEF3C7', borderBottom: '1px solid #FDE68A', padding: '12px 32px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ color: '#92400E', fontSize: 14, fontWeight: 600 }}>Ce dossier est en attente de validation.</span>
          <button disabled={actionLoading} onClick={() => handleAction('valide')}
            style={{ background: '#059669', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', cursor: 'pointer', fontSize: 14, fontWeight: 600, opacity: actionLoading ? 0.6 : 1 }}>
            ✓ Valider
          </button>
          <button disabled={actionLoading} onClick={() => handleAction('rejete')}
            style={{ background: '#DC2626', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', cursor: 'pointer', fontSize: 14, fontWeight: 600, opacity: actionLoading ? 0.6 : 1 }}>
            ✗ Rejeter
          </button>
          {actionMsg && <span style={{ fontSize: 14, fontWeight: 600, color: '#1F2937' }}>{actionMsg}</span>}
        </div>
      )}

      {kyc.statut !== 'soumis' && actionMsg && (
        <div style={{ background: '#D1FAE5', padding: '12px 32px' }}>
          <span style={{ color: '#065F46', fontSize: 14, fontWeight: 600 }}>{actionMsg}</span>
        </div>
      )}

      {/* Main content */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>

        <Section title="État civil">
          <Row label="Nom" value={kyc.nom} />
          <Row label="Prénom" value={kyc.prenom} />
          <Row label="Date de naissance" value={kyc.date_naissance} />
          <Row label="Lieu de naissance" value={kyc.lieu_naissance} />
          <Row label="Nationalité" value={kyc.nationalite} />
          <Row label="Situation familiale" value={SIT_FAM[kyc.situation_familiale]} />
          {kyc.regime_matrimonial && <Row label="Régime matrimonial" value={REGIME[kyc.regime_matrimonial]} />}
          {kyc.nombre_enfants !== undefined && kyc.nombre_enfants !== null && (
            <Row label="Nombre d'enfants" value={kyc.nombre_enfants} />
          )}
        </Section>

        <Section title="Coordonnées">
          <Row label="Email" value={client.email} />
          <Row label="Téléphone" value={kyc.telephone} />
          <Row label="Adresse" value={[kyc.adresse_ligne1, kyc.adresse_ligne2].filter(Boolean).join(', ')} />
          <Row label="Code postal / Ville" value={`${kyc.code_postal} ${kyc.ville}`} />
          <Row label="Pays de résidence" value={kyc.pays} />
          {!kyc.adresse_fiscale_identique && kyc.pays_residence_fiscale && (
            <Row label="Pays de résidence fiscale" value={kyc.pays_residence_fiscale} />
          )}
        </Section>

        <Section title="Situation professionnelle & Patrimoine">
          <Row label="Situation professionnelle" value={SIT_PRO[kyc.situation_professionnelle]} />
          {kyc.employeur && <Row label="Employeur" value={kyc.employeur} />}
          <Row label="Revenu annuel brut" value={REVENU[kyc.revenu_annuel_brut]} />
          <Row label="Patrimoine financier" value={PATR_FIN[kyc.patrimoine_financier]} />
          {kyc.patrimoine_immobilier && <Row label="Patrimoine immobilier" value={kyc.patrimoine_immobilier} />}
        </Section>

        <Section title="Conformité (LCB-FT)">
          <Row label="Personne Politiquement Exposée (PPE)" value={kyc.pep ? '⚠️ Oui' : 'Non'} />
          <Row label="US Person" value={kyc.us_person ? '⚠️ Oui' : 'Non'} />
          <Row label="Résidence fiscale = domicile" value={kyc.adresse_fiscale_identique ? 'Oui' : 'Non'} />
        </Section>

        <Section title="Profil investisseur">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
            <span style={{ background: profilColor, color: '#fff', borderRadius: 20, padding: '6px 20px', fontSize: 15, fontWeight: 700, textTransform: 'capitalize' }}>
              {kyc.profil_investisseur}
            </span>
          </div>
          <Row label="Objectif principal" value={OBJECTIF[kyc.objectif_principal]} />
          <Row label="Horizon d'investissement" value={HORIZON[kyc.horizon_investissement]} />
          {kyc.montant_envisage && <Row label="Montant envisagé" value={MONTANT[kyc.montant_envisage]} />}
          <Row label="Tolérance au risque" value={RISQUE_LBL[kyc.tolerance_risque]} />
        </Section>

        <Section title="Profil MIF2">
          {mif2 ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                <span style={{ background: PROFIL_COLOR[mif2.profil_final] ?? FOREST, color: '#fff', borderRadius: 20, padding: '6px 20px', fontSize: 15, fontWeight: 700, textTransform: 'capitalize' }}>
                  {mif2.profil_final}
                </span>
              </div>
              {mif2.score_connaissance !== undefined && <Row label="Score connaissance" value={`${mif2.score_connaissance} / 100`} />}
              {mif2.score_experience !== undefined && <Row label="Score expérience" value={`${mif2.score_experience} / 100`} />}
              {mif2.score_risque !== undefined && <Row label="Score risque" value={`${mif2.score_risque} / 100`} />}
              {mif2.capacite_pertes && <Row label="Capacité à supporter des pertes" value={mif2.capacite_pertes} />}
              {mif2.created_at && <Row label="Questionnaire complété le" value={new Date(mif2.created_at).toLocaleDateString('fr-FR')} />}
            </>
          ) : (
            <p style={{ color: '#6B7280', fontSize: 14, margin: 0 }}>Questionnaire MIF2 non encore complété.</p>
          )}
        </Section>

        <Section title="Coordonnées bancaires">
          {kyc.titulaire_compte && <Row label="Titulaire du compte" value={kyc.titulaire_compte} />}
          {kyc.iban ? (
            <>
              <Row label="IBAN" value={kyc.iban} />
              {kyc.bic_swift && <Row label="BIC / SWIFT" value={kyc.bic_swift} />}
            </>
          ) : (
            <p style={{ color: '#6B7280', fontSize: 14, margin: 0 }}>Aucun RIB renseigné.</p>
          )}
        </Section>

        <Section title="Documents transmis">
          {DOC_KEYS.map(({ key, label }) => {
            const filename = kyc[key as keyof KycData] as string | undefined
            const signedUrl = signed_urls?.[key]
            const provided = Boolean(filename || signedUrl)
            return (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #F0EDE8' }}>
                <span style={{ color: provided ? '#059669' : '#9CA3AF', fontSize: 18 }}>
                  {provided ? '✓' : '○'}
                </span>
                <span style={{ flex: 1, color: '#1F2937', fontSize: 14 }}>{label}</span>
                {signedUrl ? (
                  <a href={signedUrl} target="_blank" rel="noopener noreferrer"
                    style={{ background: FOREST, color: '#fff', borderRadius: 8, padding: '5px 14px', fontSize: 12, textDecoration: 'none', fontWeight: 600 }}>
                    Télécharger
                  </a>
                ) : provided ? (
                  <span style={{ color: '#6B7280', fontSize: 12 }}>Lien expiré</span>
                ) : (
                  <span style={{ color: '#9CA3AF', fontSize: 12 }}>Non fourni</span>
                )}
              </div>
            )
          })}
        </Section>

        <div style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 12, marginTop: 8, paddingBottom: 32 }}>
          {kyc.created_at && <span>Dossier créé le {new Date(kyc.created_at).toLocaleDateString('fr-FR')}</span>}
          {kyc.updated_at && <span> · Modifié le {new Date(kyc.updated_at).toLocaleDateString('fr-FR')}</span>}
        </div>

      </div>
    </div>
  )
}
