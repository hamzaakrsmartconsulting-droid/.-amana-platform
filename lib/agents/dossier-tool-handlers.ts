// lib/agents/dossier-tool-handlers.ts
// Sprint Agents IA v6 · 29 avril 2026
//
// Handlers d'exécution des tools dossier (create, switch, sandbox, list).
// Utilisés par Mizan et Amîn pour leur tool use loop.
//
// Particularité : ces handlers peuvent modifier le dossier actif (cookie côté nav).
// Au lieu de setter le cookie directement (impossible en streaming), ils accumulent
// les changements dans un objet "pendingCookieUpdate" que la route ajoute à la
// NextResponse finale via response.cookies.set(...).

import {
  createDossier,
  listDossiers,
  archiveDossier,
  type Dossier,
  type DossierWithStats,
} from '@/lib/dossiers/dossier-service'
import { saveClientFact } from '@/lib/agents/client-memory'

export type ToolExecutionState = {
  conseillerId: string
  /** Dossier actuellement actif (mis à jour si create_dossier ou switch_dossier réussit) */
  activeDossierId: string | null
  /** Indique au caller qu'il doit setter/clear le cookie en réponse */
  pendingCookieUpdate: { dossierId: string | null } | null
}

export async function execCreateDossier(
  state: ToolExecutionState,
  input: Record<string, unknown>
): Promise<string> {
  const nom = String(input.nom ?? '').trim()
  const prenom = String(input.prenom ?? '').trim()
  if (!nom || !prenom) return 'Erreur : nom et prenom sont requis.'

  const result = await createDossier(state.conseillerId, {
    nom,
    prenom,
    email_client: input.email_client ? String(input.email_client) : null,
    telephone: input.telephone ? String(input.telephone) : null,
    statut: (input.statut as 'prospect' | 'actif') ?? 'prospect',
    offre_amana_cible: (input.offre_amana_cible as 'mass' | 'patrimoniale' | 'premium') ?? null,
  })

  if (!result.ok) return `Erreur création dossier : ${result.error}`

  // Activer ce nouveau dossier
  state.activeDossierId = result.dossier.id
  state.pendingCookieUpdate = { dossierId: result.dossier.id }

  return `Dossier créé et activé : ${result.dossier.prenom} ${result.dossier.nom} (id: ${result.dossier.id}, statut: ${result.dossier.statut}). Les facts saved à partir de maintenant seront associés à ce dossier.`
}

export async function execSwitchDossier(
  state: ToolExecutionState,
  input: Record<string, unknown>
): Promise<string> {
  const query = String(input.query ?? '').trim().toLowerCase()
  if (!query) return 'Erreur : query est requis (nom, prenom ou id).'

  const dossiers = await listDossiers(state.conseillerId, { includeArchived: false })
  // Match : id exact OU prenom contient OR nom contient OR "prenom nom" contient
  const matches = dossiers.filter((d) => {
    const fullName = `${d.prenom} ${d.nom}`.toLowerCase()
    return (
      d.id === query ||
      d.prenom.toLowerCase().includes(query) ||
      d.nom.toLowerCase().includes(query) ||
      fullName.includes(query)
    )
  })

  if (matches.length === 0) {
    return `Aucun dossier ne correspond à "${query}". Utilise list_dossiers pour voir les dossiers disponibles, ou create_dossier pour en créer un nouveau.`
  }

  if (matches.length > 1) {
    const list = matches
      .slice(0, 5)
      .map((d) => `- ${d.prenom} ${d.nom} (statut: ${d.statut})`)
      .join('\n')
    return `Plusieurs dossiers correspondent à "${query}". Précise lequel :\n${list}`
  }

  const target = matches[0]
  state.activeDossierId = target.id
  state.pendingCookieUpdate = { dossierId: target.id }
  return `Bascule effectuée sur le dossier : ${target.prenom} ${target.nom} (statut: ${target.statut}, ${target.facts_count} facts connus, dernière activité ${target.last_activity_at}).`
}

export async function execSwitchToSandbox(
  state: ToolExecutionState
): Promise<string> {
  state.activeDossierId = null
  state.pendingCookieUpdate = { dossierId: null }
  return `Bascule en mode bac à sable. Aucun dossier client actif. Les facts saved iront dans le silo "sans dossier" et ne contamineront aucun dossier client réel.`
}

export async function execListDossiers(
  state: ToolExecutionState,
  input: Record<string, unknown>
): Promise<string> {
  const includeArchived = Boolean(input.include_archived)
  const dossiers: DossierWithStats[] = await listDossiers(state.conseillerId, { includeArchived })
  if (dossiers.length === 0) {
    return 'Aucun dossier en cours. Utilise create_dossier pour en créer un.'
  }
  const lines = dossiers.map((d) => {
    const isActive = d.id === state.activeDossierId ? ' [ACTIF]' : ''
    return `- ${d.prenom} ${d.nom} (statut: ${d.statut}, ${d.facts_count} facts)${isActive}`
  })
  return `Dossiers en cours :\n${lines.join('\n')}`
}

export async function execSaveClientFact(
  state: ToolExecutionState,
  input: Record<string, unknown>,
  sourceAgent: string
): Promise<string> {
  const key = String(input.key ?? '').trim()
  const value = String(input.value ?? '').trim()
  if (!key || !value) return 'Erreur : key et value requis.'

  const result = await saveClientFact(
    state.conseillerId,
    state.activeDossierId,
    key,
    value,
    sourceAgent
  )
  if (!result.ok) return `Échec sauvegarde fait : ${result.error}`

  const scope = state.activeDossierId
    ? 'dossier client en cours'
    : 'bac à sable'
  return `Fait sauvegardé dans le ${scope} : ${key} = ${value}.`
}
