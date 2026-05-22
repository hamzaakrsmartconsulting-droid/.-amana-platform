// lib/agents/client-memory.ts — v2 avec support dossier_id
// Sprint Agents IA v6 · 29 avril 2026
//
// Évolution vs v1 (sprint v5) :
//   - Toutes les fonctions acceptent maintenant un dossier_id (string | null)
//   - dossier_id = null → bac à sable (silo isolé pour tests/questions méta)
//   - dossier_id = "uuid" → silo d'un dossier client/prospect spécifique

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export type ClientFact = {
  fact_key: string
  fact_value: string
  source_agent: string | null
  confidence: number
  updated_at: string
  dossier_id: string | null
}

// Catalogue de fact_keys (inchangé vs v1)
export const FACT_KEYS = {
  AGE: 'age',
  SITUATION_FAMILIALE: 'situation_familiale',
  NB_ENFANTS: 'nb_enfants',
  REGIME_MATRIMONIAL: 'regime_matrimonial',
  REVENUS_ANNUELS_EUR: 'revenus_annuels_eur',
  CHARGES_ANNUELLES_EUR: 'charges_annuelles_eur',
  TAUX_MARGINAL_IMPOSITION: 'taux_marginal_imposition',
  PATRIMOINE_TOTAL_EUR: 'patrimoine_total_eur',
  LIQUIDITES_EUR: 'liquidites_eur',
  RP_VALEUR_EUR: 'rp_valeur_eur',
  RP_EMPRUNT_RESTANT_EUR: 'rp_emprunt_restant_eur',
  IMMOBILIER_LOCATIF_EUR: 'immobilier_locatif_eur',
  ACTIONS_ETF_EUR: 'actions_etf_eur',
  SCPI_SHARIA_EUR: 'scpi_sharia_eur',
  OR_PHYSIQUE_EUR: 'or_physique_eur',
  PROFIL_RISQUE: 'profil_risque',
  OBJECTIF_PRINCIPAL: 'objectif_principal',
  HORIZON_PLACEMENT_ANNEES: 'horizon_placement_annees',
  OFFRE_AMANA_CIBLE: 'offre_amana_cible',
  KYC_STATUT: 'kyc_statut',
  MIF2_COMPLETE: 'mif2_complete',
  SENSIBILITE_SHARIA: 'sensibilite_sharia',
  NOTES_CONSEILLER: 'notes_conseiller',
} as const

const FACT_LABELS: Record<string, string> = {
  age: 'Âge',
  situation_familiale: 'Situation familiale',
  nb_enfants: "Nombre d'enfants",
  regime_matrimonial: 'Régime matrimonial',
  revenus_annuels_eur: 'Revenus annuels (€)',
  charges_annuelles_eur: 'Charges annuelles (€)',
  taux_marginal_imposition: "Taux marginal d'imposition (%)",
  patrimoine_total_eur: 'Patrimoine total (€)',
  liquidites_eur: 'Liquidités (€)',
  rp_valeur_eur: 'Valeur résidence principale (€)',
  rp_emprunt_restant_eur: 'Emprunt restant RP (€)',
  immobilier_locatif_eur: 'Immobilier locatif (€)',
  actions_etf_eur: 'Actions / ETF (€)',
  scpi_sharia_eur: 'SCPI Sharia (€)',
  or_physique_eur: 'Or physique (€)',
  profil_risque: 'Profil de risque',
  objectif_principal: 'Objectif principal',
  horizon_placement_annees: 'Horizon de placement (années)',
  offre_amana_cible: 'Offre AMANA cible',
  kyc_statut: 'KYC statut',
  mif2_complete: 'MIF2 complète',
  sensibilite_sharia: 'Sensibilité Sharia',
  notes_conseiller: 'Notes conseiller',
}

async function getSupabaseServer() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll() {
          // pas de set en route API
        },
      },
    }
  )
}

/**
 * Charge les facts d'un user pour un dossier donné (ou bac à sable si null)
 * et formate pour injection dans le system prompt.
 */
export async function loadClientFactsForPrompt(
  userId: string,
  dossierId: string | null,
  dossierName?: string
): Promise<string> {
  const supabase = await getSupabaseServer()
  let query = supabase
    .from('client_facts')
    .select('fact_key, fact_value, source_agent, confidence, updated_at, dossier_id')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })

  if (dossierId === null) {
    query = query.is('dossier_id', null)
  } else {
    query = query.eq('dossier_id', dossierId)
  }

  const { data, error } = await query
  if (error) {
    console.error('[client-memory] erreur chargement facts', error)
    return ''
  }
  if (!data || data.length === 0) {
    if (dossierId === null) {
      return ''
    }
    // Pour un dossier vide, on injecte quand même le contexte du dossier
    return `# Dossier en cours\n\n${dossierName ? `Dossier client : **${dossierName}**` : `Dossier ID : ${dossierId}`}.\n\nAucun fact n'a encore été enregistré pour ce dossier. Les informations que tu collecteras seront associées à ce silo.\n\n`
  }

  const lines: string[] = []
  if (dossierId === null) {
    lines.push('# Bac à sable AMANA (questions méta, tests)')
    lines.push('')
    lines.push(
      "Tu es en mode bac à sable. Les facts ci-dessous viennent de tes tests précédents, pas d'un dossier client réel."
    )
  } else {
    lines.push(`# Dossier client en cours${dossierName ? ` — ${dossierName}` : ''}`)
    lines.push('')
    lines.push(
      "Voici ce que tu sais sur ce client/prospect, accumulé au fil des interactions précédentes. Utilise ces informations pour personnaliser ta réponse sans redemander ce qui est déjà connu. Si une info te paraît périmée ou incohérente, signale-le et propose une mise à jour via save_client_fact."
    )
  }
  lines.push('')
  for (const f of data as ClientFact[]) {
    const label = FACT_LABELS[f.fact_key] ?? f.fact_key
    const source = f.source_agent ? ` (source : ${f.source_agent})` : ''
    lines.push(`- **${label}** : ${f.fact_value}${source}`)
  }
  lines.push('')
  return lines.join('\n')
}

/**
 * Sauvegarde (upsert) un fact pour un user dans un dossier (ou bac à sable).
 */
export async function saveClientFact(
  userId: string,
  dossierId: string | null,
  factKey: string,
  factValue: string,
  sourceAgent: string,
  confidence: number = 0.8
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!factKey || !factValue) {
    return { ok: false, error: 'fact_key et fact_value sont requis' }
  }

  const supabase = await getSupabaseServer()

  // L'upsert avec onConflict ne marche pas avec un index unique partiel (WHERE clause).
  // On fait un select-then-insert/update à la main.
  let existingQuery = supabase
    .from('client_facts')
    .select('id')
    .eq('user_id', userId)
    .eq('fact_key', factKey)
  if (dossierId === null) {
    existingQuery = existingQuery.is('dossier_id', null)
  } else {
    existingQuery = existingQuery.eq('dossier_id', dossierId)
  }
  const { data: existing, error: selErr } = await existingQuery.maybeSingle()
  if (selErr) {
    console.error('[client-memory] erreur select existing', selErr)
    return { ok: false, error: selErr.message }
  }

  if (existing) {
    const { error: updErr } = await supabase
      .from('client_facts')
      .update({
        fact_value: factValue,
        source_agent: sourceAgent,
        confidence,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
    if (updErr) {
      console.error('[client-memory] erreur update', updErr)
      return { ok: false, error: updErr.message }
    }
  } else {
    const { error: insErr } = await supabase.from('client_facts').insert({
      user_id: userId,
      dossier_id: dossierId,
      fact_key: factKey,
      fact_value: factValue,
      source_agent: sourceAgent,
      confidence,
    })
    if (insErr) {
      console.error('[client-memory] erreur insert', insErr)
      return { ok: false, error: insErr.message }
    }
  }
  return { ok: true }
}

/**
 * Supprime un fact pour un user dans un dossier.
 */
export async function deleteClientFact(
  userId: string,
  dossierId: string | null,
  factKey: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await getSupabaseServer()
  let query = supabase
    .from('client_facts')
    .delete()
    .eq('user_id', userId)
    .eq('fact_key', factKey)
  if (dossierId === null) {
    query = query.is('dossier_id', null)
  } else {
    query = query.eq('dossier_id', dossierId)
  }

  const { error } = await query
  if (error) {
    console.error('[client-memory] erreur delete fact', error)
    return { ok: false, error: error.message }
  }
  return { ok: true }
}

/**
 * Liste brute des facts d'un user pour un dossier (pour la page admin).
 */
export async function listClientFacts(
  userId: string,
  dossierId: string | null
): Promise<ClientFact[]> {
  const supabase = await getSupabaseServer()
  let query = supabase
    .from('client_facts')
    .select('fact_key, fact_value, source_agent, confidence, updated_at, dossier_id')
    .eq('user_id', userId)
    .order('fact_key', { ascending: true })

  if (dossierId === null) {
    query = query.is('dossier_id', null)
  } else {
    query = query.eq('dossier_id', dossierId)
  }

  const { data, error } = await query
  if (error) {
    console.error('[client-memory] erreur list facts', error)
    return []
  }
  return (data ?? []) as ClientFact[]
}
