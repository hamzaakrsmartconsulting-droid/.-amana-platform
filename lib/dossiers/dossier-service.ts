// lib/dossiers/dossier-service.ts
// Sprint Agents IA v6 · 29 avril 2026
// Helper serveur pour la gestion des dossiers AMANA.
//
// Contexte : un dossier = un silo isolé pour l'analyse d'un client/prospect.
// Chaque dossier a ses propres facts (table client_facts.dossier_id).
// dossier_id = NULL → bac à sable (questions méta, tests).

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const ACTIVE_DOSSIER_COOKIE = 'amana_active_dossier_id'
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30 // 30 jours

export type DossierStatut = 'prospect' | 'actif' | 'archive'
export type OffreAmana = 'mass' | 'patrimoniale' | 'premium'

export type Dossier = {
  id: string
  conseiller_id: string
  nom: string
  prenom: string
  email_client: string | null
  telephone: string | null
  statut: DossierStatut
  offre_amana_cible: OffreAmana | null
  notes: string | null
  created_at: string
  updated_at: string
  archived_at: string | null
}

export type DossierWithStats = Dossier & {
  facts_count: number
  last_activity_at: string
}

export type CreateDossierInput = {
  nom: string
  prenom: string
  email_client?: string | null
  telephone?: string | null
  statut?: DossierStatut
  offre_amana_cible?: OffreAmana | null
  notes?: string | null
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
 * Crée un nouveau dossier pour le conseiller authentifié.
 */
export async function createDossier(
  conseillerId: string,
  input: CreateDossierInput
): Promise<{ ok: true; dossier: Dossier } | { ok: false; error: string }> {
  if (!input.nom?.trim() || !input.prenom?.trim()) {
    return { ok: false, error: 'Nom et prénom sont requis' }
  }

  const supabase = await getSupabaseServer()
  const { data, error } = await supabase
    .from('dossiers')
    .insert({
      conseiller_id: conseillerId,
      nom: input.nom.trim(),
      prenom: input.prenom.trim(),
      email_client: input.email_client?.trim() || null,
      telephone: input.telephone?.trim() || null,
      statut: input.statut ?? 'prospect',
      offre_amana_cible: input.offre_amana_cible ?? null,
      notes: input.notes?.trim() || null,
    })
    .select('*')
    .single()

  if (error || !data) {
    console.error('[dossier-service] erreur création', error)
    return { ok: false, error: error?.message ?? 'Erreur création dossier' }
  }
  return { ok: true, dossier: data as Dossier }
}

/**
 * Liste les dossiers d'un conseiller, triés par activité récente.
 * Inclut les stats (nombre de facts, dernière activité).
 */
export async function listDossiers(
  conseillerId: string,
  options: { includeArchived?: boolean } = {}
): Promise<DossierWithStats[]> {
  const supabase = await getSupabaseServer()
  let query = supabase
    .from('dossiers_with_stats')
    .select('*')
    .eq('conseiller_id', conseillerId)
    .order('last_activity_at', { ascending: false })

  if (!options.includeArchived) {
    query = query.neq('statut', 'archive')
  }

  const { data, error } = await query
  if (error) {
    console.error('[dossier-service] erreur listing', error)
    return []
  }
  return (data ?? []) as DossierWithStats[]
}

/**
 * Récupère un dossier par son ID. Vérifie que le user a le droit d'y accéder.
 */
export async function getDossier(
  dossierId: string
): Promise<Dossier | null> {
  const supabase = await getSupabaseServer()
  const { data, error } = await supabase
    .from('dossiers')
    .select('*')
    .eq('id', dossierId)
    .single()

  if (error || !data) return null
  return data as Dossier
}

/**
 * Met à jour un dossier. Sécurité : ne permet pas de changer le conseiller_id.
 */
export async function updateDossier(
  dossierId: string,
  patch: Partial<CreateDossierInput>
): Promise<{ ok: true; dossier: Dossier } | { ok: false; error: string }> {
  const supabase = await getSupabaseServer()
  const update: Record<string, unknown> = {}
  if (patch.nom !== undefined)               update.nom = patch.nom.trim()
  if (patch.prenom !== undefined)            update.prenom = patch.prenom.trim()
  if (patch.email_client !== undefined)      update.email_client = patch.email_client?.trim() || null
  if (patch.telephone !== undefined)         update.telephone = patch.telephone?.trim() || null
  if (patch.statut !== undefined)            update.statut = patch.statut
  if (patch.offre_amana_cible !== undefined) update.offre_amana_cible = patch.offre_amana_cible
  if (patch.notes !== undefined)             update.notes = patch.notes?.trim() || null

  const { data, error } = await supabase
    .from('dossiers')
    .update(update)
    .eq('id', dossierId)
    .select('*')
    .single()

  if (error || !data) {
    console.error('[dossier-service] erreur update', error)
    return { ok: false, error: error?.message ?? 'Erreur update dossier' }
  }
  return { ok: true, dossier: data as Dossier }
}

/**
 * Archive un dossier (statut → 'archive', archived_at = now()).
 */
export async function archiveDossier(
  dossierId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await getSupabaseServer()
  const { error } = await supabase
    .from('dossiers')
    .update({ statut: 'archive', archived_at: new Date().toISOString() })
    .eq('id', dossierId)

  if (error) {
    console.error('[dossier-service] erreur archive', error)
    return { ok: false, error: error.message }
  }
  return { ok: true }
}

// =====================================================================
// Cookie active dossier
// =====================================================================
// Le dossier actif est stocké dans un cookie HttpOnly côté navigateur.
// Les routes API agents lisent ce cookie pour savoir dans quel silo écrire.

export async function getActiveDossierIdFromCookie(): Promise<string | null> {
  const cookieStore = await cookies()
  const cookie = cookieStore.get(ACTIVE_DOSSIER_COOKIE)
  return cookie?.value ?? null
}

/**
 * Helper utilisé dans les API routes (POST /api/dossiers/active) pour
 * définir le cookie. Retourne les options à passer à NextResponse.cookies.set().
 */
export function buildActiveDossierCookie(dossierId: string | null) {
  if (dossierId === null) {
    return {
      name: ACTIVE_DOSSIER_COOKIE,
      value: '',
      options: {
        httpOnly: true,
        secure: true,
        sameSite: 'lax' as const,
        path: '/',
        maxAge: 0, // expire immédiatement = supprime le cookie
      },
    }
  }
  return {
    name: ACTIVE_DOSSIER_COOKIE,
    value: dossierId,
    options: {
      httpOnly: true,
      secure: true,
      sameSite: 'lax' as const,
      path: '/',
      maxAge: COOKIE_MAX_AGE_SECONDS,
    },
  }
}

export const ACTIVE_DOSSIER_COOKIE_NAME = ACTIVE_DOSSIER_COOKIE
