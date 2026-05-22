// lib/compliance/compliance-service.ts — v2
// Sprint Agents IA v15 · 30 avril 2026
//
// Évolution v2 :
//   + prescreenLookup    : génère les URLs et la checklist pour Mohamed
//   + recordPreScreenDecision : enregistre 4 lignes compliance_checks d'un coup
//
// REMPLACE compliance-service.ts v1 (sprint v14).

import { createClient } from '@/lib/supabase/server'

export type AlertSeverity = 'info' | 'warning' | 'critical'
export type AlertCategory = 'lcb_ft' | 'criblage' | 'documentaire' | 'echeance' | 'autre'
export type AlertStatut = 'open' | 'in_progress' | 'resolved' | 'ignored'

export type ComplianceAlertRow = {
  id: string
  conseiller_id: string
  dossier_id: string | null
  severity: AlertSeverity
  category: AlertCategory
  titre: string
  description: string | null
  due_date: string | null
  statut: AlertStatut
  resolution_notes: string | null
  created_at: string
  updated_at: string
  resolved_at: string | null
}

export type CheckType =
  | 'pep' | 'sanctions' | 'embargos' | 'source_funds' | 'beneficial_owner' | 'autre'

export type CheckResult = 'clean' | 'flagged' | 'manual_review' | 'pending'

export type ComplianceCheckRow = {
  id: string
  dossier_id: string
  conseiller_id: string
  check_type: CheckType
  result: CheckResult
  evidence: string | null
  source: string | null
  checked_at: string
  expires_at: string | null
  notes: string | null
  created_at: string
}

// =====================================================================
// Alerts (inchangés v1)
// =====================================================================

export async function listAlerts(filter?: {
  severity?: AlertSeverity[]
  statut?: AlertStatut[]
  category?: AlertCategory[]
  dossier_id?: string
}): Promise<ComplianceAlertRow[]> {
  const supabase = await createClient()
  let query = supabase
    .from('compliance_alerts')
    .select('*')
    .order('severity', { ascending: false })
    .order('due_date', { ascending: true, nullsFirst: false })
  if (filter?.severity?.length) query = query.in('severity', filter.severity)
  if (filter?.statut?.length) query = query.in('statut', filter.statut)
  if (filter?.category?.length) query = query.in('category', filter.category)
  if (filter?.dossier_id) query = query.eq('dossier_id', filter.dossier_id)
  const { data, error } = await query
  if (error) {
    console.error('[compliance] listAlerts', error)
    return []
  }
  return (data ?? []) as ComplianceAlertRow[]
}

export async function createAlert(params: {
  conseillerId: string
  dossierId?: string
  severity: AlertSeverity
  category: AlertCategory
  titre: string
  description?: string
  due_date?: string
}) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('compliance_alerts')
    .insert({
      conseiller_id: params.conseillerId,
      dossier_id: params.dossierId ?? null,
      severity: params.severity,
      category: params.category,
      titre: params.titre,
      description: params.description ?? null,
      due_date: params.due_date ?? null,
    })
    .select('*')
    .single()
  if (error) return { ok: false as const, error: error.message }
  return { ok: true as const, row: data as ComplianceAlertRow }
}

export async function resolveAlert(params: {
  alertId: string
  resolution_notes?: string
  statut?: AlertStatut
}) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('compliance_alerts')
    .update({
      statut: params.statut ?? 'resolved',
      resolution_notes: params.resolution_notes ?? null,
    })
    .eq('id', params.alertId)
    .select('*')
    .single()
  if (error) return { ok: false as const, error: error.message }
  return { ok: true as const, row: data as ComplianceAlertRow }
}

// =====================================================================
// Checks (inchangés v1)
// =====================================================================

export async function listComplianceChecks(dossierId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('compliance_checks')
    .select('*')
    .eq('dossier_id', dossierId)
    .order('checked_at', { ascending: false })
  if (error) {
    console.error('[compliance] listComplianceChecks', error)
    return []
  }
  return (data ?? []) as ComplianceCheckRow[]
}

export async function recordComplianceCheck(params: {
  conseillerId: string
  dossierId: string
  check_type: CheckType
  result: CheckResult
  evidence?: string
  source?: string
  expires_at?: string
  notes?: string
}) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('compliance_checks')
    .insert({
      conseiller_id: params.conseillerId,
      dossier_id: params.dossierId,
      check_type: params.check_type,
      result: params.result,
      evidence: params.evidence ?? null,
      source: params.source ?? null,
      expires_at: params.expires_at ?? null,
      notes: params.notes ?? null,
    })
    .select('*')
    .single()
  if (error) return { ok: false as const, error: error.message }
  return { ok: true as const, row: data as ComplianceCheckRow }
}

// =====================================================================
// Audit complet (inchangé v1)
// =====================================================================

export type DossierComplianceAudit = {
  dossier_id: string
  documents_present: string[]
  documents_manquants: string[]
  checks_recents: ComplianceCheckRow[]
  checks_manquants: CheckType[]
  alerts_open: ComplianceAlertRow[]
  score: 'ok' | 'warning' | 'critical'
}

const DOCUMENTS_REQUIS_MIN = ['der', 'lm']
const DOCUMENTS_RECOMMANDES = ['bilan', 'ra', 'preco']
const CHECKS_REQUIS_MIN: CheckType[] = ['pep', 'sanctions', 'source_funds']

export async function auditDossierCompliance(
  dossierId: string
): Promise<DossierComplianceAudit> {
  const supabase = await createClient()
  const { data: docs } = await supabase
    .from('documents')
    .select('type')
    .eq('dossier_id', dossierId)
  const documentsPresent = Array.from(new Set((docs ?? []).map((d) => d.type)))
  const documentsManquantsMin = DOCUMENTS_REQUIS_MIN.filter(
    (d) => !documentsPresent.includes(d)
  )
  const documentsManquantsReco = DOCUMENTS_RECOMMANDES.filter(
    (d) => !documentsPresent.includes(d)
  )
  const { data: checks } = await supabase
    .from('compliance_checks')
    .select('*')
    .eq('dossier_id', dossierId)
    .gte('checked_at', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString())
    .order('checked_at', { ascending: false })
  const checksRecents = (checks ?? []) as ComplianceCheckRow[]
  const checksTypesPresents = Array.from(new Set(checksRecents.map((c) => c.check_type)))
  const checksManquants = CHECKS_REQUIS_MIN.filter(
    (c) => !checksTypesPresents.includes(c)
  )
  const { data: alerts } = await supabase
    .from('compliance_alerts')
    .select('*')
    .eq('dossier_id', dossierId)
    .in('statut', ['open', 'in_progress'])
  const alertsOpen = (alerts ?? []) as ComplianceAlertRow[]
  let score: 'ok' | 'warning' | 'critical' = 'ok'
  if (
    documentsManquantsMin.length > 0 ||
    checksManquants.length > 0 ||
    alertsOpen.some((a) => a.severity === 'critical')
  ) score = 'critical'
  else if (
    documentsManquantsReco.length > 0 ||
    alertsOpen.some((a) => a.severity === 'warning')
  ) score = 'warning'
  return {
    dossier_id: dossierId,
    documents_present: documentsPresent,
    documents_manquants: [...documentsManquantsMin, ...documentsManquantsReco],
    checks_recents: checksRecents,
    checks_manquants: checksManquants,
    alerts_open: alertsOpen,
    score,
  }
}

// =====================================================================
// PRÉ-CRIBLAGE SEMI-MANUEL (NEW v2)
// =====================================================================

export type PreScreenLookupResult = {
  dossier_id: string
  client: { prenom: string; nom: string; email: string | null; telephone: string | null }
  identite_extras: {
    date_naissance?: string
    nationalite?: string
    contexte_pro?: string
  }
  checklist: Array<{
    label: string
    description: string
    sources: Array<{ name: string; url: string; instructions: string }>
    google_queries?: string[]
  }>
  template_rapport: string
  expires_in_months_default: number
}

/**
 * Prépare le pré-criblage en générant la checklist et les URLs/queries à
 * consulter pour les 4 vérifications LCB-FT critiques :
 *   1. Sanctions UE (liste consolidée)
 *   2. Sanctions OFAC (USA)
 *   3. PEP (Personnes Politiquement Exposées)
 *   4. Negative news (recherche presse défavorable)
 *
 * Le résultat est destiné à être affiché à Mohamed dans la conversation Raqîb.
 * Mohamed consulte les liens, prend sa décision, puis appelle
 * recordPreScreenDecision.
 */
export async function prescreenLookup(params: {
  dossierId: string
  date_naissance?: string
  nationalite?: string
  contexte_pro?: string
}): Promise<PreScreenLookupResult | { error: string }> {
  const supabase = await createClient()
  const { data: dossier, error } = await supabase
    .from('dossiers')
    .select('id, prenom, nom, email_client, telephone')
    .eq('id', params.dossierId)
    .maybeSingle()
  if (error || !dossier) {
    return { error: 'Dossier introuvable' }
  }

  const fullName = `${dossier.prenom} ${dossier.nom}`
  const fullNameEncoded = encodeURIComponent(fullName)
  const fullNameQuoted = encodeURIComponent(`"${fullName}"`)

  return {
    dossier_id: dossier.id,
    client: {
      prenom: dossier.prenom,
      nom: dossier.nom,
      email: dossier.email_client,
      telephone: dossier.telephone,
    },
    identite_extras: {
      date_naissance: params.date_naissance,
      nationalite: params.nationalite,
      contexte_pro: params.contexte_pro,
    },
    checklist: [
      {
        label: 'Sanctions UE (liste consolidée)',
        description:
          'Vérifier que le client ne figure pas sur la liste consolidée des sanctions financières de l\'Union européenne. Recherche par nom + prénom, vérifier date de naissance et nationalité si match.',
        sources: [
          {
            name: 'Direction générale du Trésor — Registre des sanctions',
            url: 'https://gels-avoirs.dgtresor.gouv.fr/Liste',
            instructions: 'Rechercher par nom de famille puis filtrer par prénom. Vérifier date de naissance et alias.',
          },
          {
            name: 'EU Financial Sanctions Database',
            url: 'https://webgate.ec.europa.eu/fsd/fsf',
            instructions: 'Recherche de la liste consolidée UE — utiliser le moteur de recherche par nom.',
          },
        ],
      },
      {
        label: 'Sanctions OFAC (USA — Specially Designated Nationals)',
        description:
          'Vérifier la liste SDN du Treasury américain. Pertinent même pour clients français car les flux internationaux peuvent transiter par USD.',
        sources: [
          {
            name: 'OFAC Sanctions Search',
            url: 'https://sanctionssearch.ofac.treas.gov/',
            instructions: 'Rechercher par nom complet. Cocher tous les types de listes pour exhaustivité.',
          },
        ],
      },
      {
        label: 'PEP (Personnes Politiquement Exposées)',
        description:
          'Vérifier si le client exerce ou a exercé des fonctions politiques, judiciaires ou administratives importantes en France ou à l\'étranger. Inclut les membres de famille proche et associés.',
        sources: [
          {
            name: 'Recherche Wikipedia — fonctions politiques',
            url: `https://fr.wikipedia.org/w/index.php?search=${fullNameEncoded}&fulltext=1`,
            instructions: 'Vérifier mandats électifs, postes administratifs, fonctions judiciaires.',
          },
        ],
        google_queries: [
          `${fullName} député OR sénateur OR maire OR ministre`,
          `${fullName} préfet OR magistrat OR ambassadeur`,
          `${fullName} entreprise publique direction`,
          `${fullName} parti politique`,
        ],
      },
      {
        label: 'Negative news (presse défavorable)',
        description:
          'Vérifier l\'absence d\'antécédent défavorable : enquête judiciaire, condamnation, fraude, blanchiment, terrorisme, scandale public.',
        sources: [
          {
            name: 'Google Actualités',
            url: `https://www.google.com/search?q=${fullNameQuoted}&tbm=nws`,
            instructions: 'Lire les 5 premières pages d\'actualité sur le nom complet.',
          },
        ],
        google_queries: [
          `"${fullName}" enquête OR condamnation OR fraude OR blanchiment`,
          `"${fullName}" tribunal OR procès OR mis en examen`,
          `"${fullName}" terrorisme OR financement OR sanction`,
        ],
      },
    ],
    template_rapport: `Pré-criblage ${fullName} — ${new Date().toISOString().slice(0, 10)}

1. Sanctions UE : [clean | flagged | manual_review]
   Source consultée : ___
   Notes : ___

2. Sanctions OFAC : [clean | flagged | manual_review]
   Source consultée : ___
   Notes : ___

3. PEP : [clean | flagged | manual_review]
   Source consultée : ___
   Notes : ___

4. Negative news : [clean | flagged | manual_review]
   Source consultée : ___
   Notes : ___

Décision globale : [clean | flagged | manual_review]
Justification : ___
`,
    expires_in_months_default: 12,
  }
}

/**
 * Enregistre la décision de pré-criblage prise par Mohamed.
 * Crée 4 lignes dans compliance_checks (pep, sanctions, embargos, source_funds)
 * avec le même résultat global et la même evidence/source.
 */
export async function recordPreScreenDecision(params: {
  conseillerId: string
  dossierId: string
  decision_globale: CheckResult
  sources_consultees: string
  notes?: string
  validity_months?: number
}): Promise<{ ok: true; rows: ComplianceCheckRow[] } | { ok: false; error: string }> {
  const supabase = await createClient()
  const validityMonths = params.validity_months ?? 12
  const expires_at = new Date(
    Date.now() + validityMonths * 30 * 24 * 60 * 60 * 1000
  ).toISOString()

  const checkTypes: CheckType[] = ['pep', 'sanctions', 'embargos', 'source_funds']
  const rowsToInsert = checkTypes.map((check_type) => ({
    conseiller_id: params.conseillerId,
    dossier_id: params.dossierId,
    check_type,
    result: params.decision_globale,
    evidence: params.sources_consultees,
    source: 'Pré-criblage assisté Raqîb',
    expires_at,
    notes: params.notes ?? null,
  }))

  const { data, error } = await supabase
    .from('compliance_checks')
    .insert(rowsToInsert)
    .select('*')

  if (error) {
    console.error('[compliance] recordPreScreenDecision', error)
    return { ok: false, error: error.message }
  }

  // Si flagged, créer une alerte critical pour suivi
  if (params.decision_globale === 'flagged') {
    await supabase.from('compliance_alerts').insert({
      conseiller_id: params.conseillerId,
      dossier_id: params.dossierId,
      severity: 'critical',
      category: 'criblage',
      titre: 'Pré-criblage flagged — investigation requise',
      description: `Sources consultées : ${params.sources_consultees}\nNotes : ${params.notes ?? '—'}`,
    })
  }

  return { ok: true, rows: (data ?? []) as ComplianceCheckRow[] }
}
