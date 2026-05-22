// lib/events/events-service.ts
// Sprint Agents IA v13 · 30 avril 2026
//
// Service Supabase pour les tables events / event_actions / event_contacts.
// Toutes les opérations passent par les RLS définies dans la migration
// 20260430_events.sql — un conseiller ne peut accéder qu'à ses propres
// événements, admins ont accès complet.

import { createClient } from '@/lib/supabase/server'

export type EventType =
  | 'table_ronde'
  | 'stand'
  | 'conference'
  | 'webinaire'
  | 'salon'
  | 'rdv_partenaire'
  | 'autre'

export type EventStatut =
  | 'prepa'
  | 'j_minus_7'
  | 'j_minus_1'
  | 'en_cours'
  | 'fait'
  | 'annule'

export type ActionCategorie =
  | 'logistique'
  | 'contenu'
  | 'contacts'
  | 'comm_pre'
  | 'comm_post'
  | 'suivi'
  | 'autre'

export type ActionStatut = 'todo' | 'in_progress' | 'done' | 'blocked'

export type ContactRole =
  | 'intervenant'
  | 'partenaire'
  | 'journaliste'
  | 'prospect'
  | 'equipe'
  | 'autre'

export type EventRow = {
  id: string
  conseiller_id: string
  nom: string
  type: EventType
  date_debut: string
  date_fin: string | null
  lieu: string | null
  description: string | null
  statut: EventStatut
  audience_cible: string | null
  objectifs: string | null
  kpi_attendu: string | null
  budget_estime_eur: number | null
  budget_reel_eur: number | null
  bilan_post_event: string | null
  created_at: string
  updated_at: string
}

export type EventActionRow = {
  id: string
  event_id: string
  conseiller_id: string
  titre: string
  description: string | null
  due_date: string | null
  statut: ActionStatut
  categorie: ActionCategorie
  assigne_a: string | null
  notes: string | null
  created_at: string
  updated_at: string
  done_at: string | null
}

export type EventContactRow = {
  id: string
  event_id: string
  conseiller_id: string
  role: ContactRole
  nom: string
  email: string | null
  phone: string | null
  organisation: string | null
  notes: string | null
  created_at: string
}

// =====================================================================
// Events
// =====================================================================

export async function listEvents(filter?: {
  statut?: EventStatut[]
  type?: EventType[]
  futur_only?: boolean
}): Promise<EventRow[]> {
  const supabase = await createClient()
  let query = supabase.from('events').select('*').order('date_debut', { ascending: true })
  if (filter?.statut?.length) query = query.in('statut', filter.statut)
  if (filter?.type?.length) query = query.in('type', filter.type)
  if (filter?.futur_only) query = query.gte('date_debut', new Date().toISOString())
  const { data, error } = await query
  if (error) {
    console.error('[events-service] listEvents', error)
    return []
  }
  return (data ?? []) as EventRow[]
}

export async function getEvent(eventId: string): Promise<{
  event: EventRow | null
  actions: EventActionRow[]
  contacts: EventContactRow[]
}> {
  const supabase = await createClient()
  const [eventRes, actionsRes, contactsRes] = await Promise.all([
    supabase.from('events').select('*').eq('id', eventId).maybeSingle(),
    supabase.from('event_actions').select('*').eq('event_id', eventId).order('due_date', { ascending: true }),
    supabase.from('event_contacts').select('*').eq('event_id', eventId).order('created_at', { ascending: true }),
  ])
  return {
    event: (eventRes.data as EventRow) ?? null,
    actions: (actionsRes.data ?? []) as EventActionRow[],
    contacts: (contactsRes.data ?? []) as EventContactRow[],
  }
}

export async function createEvent(params: {
  conseillerId: string
  nom: string
  type: EventType
  date_debut: string
  date_fin?: string
  lieu?: string
  description?: string
  statut?: EventStatut
  audience_cible?: string
  objectifs?: string
  kpi_attendu?: string
  budget_estime_eur?: number
}): Promise<{ ok: true; row: EventRow } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('events')
    .insert({
      conseiller_id: params.conseillerId,
      nom: params.nom,
      type: params.type,
      date_debut: params.date_debut,
      date_fin: params.date_fin ?? null,
      lieu: params.lieu ?? null,
      description: params.description ?? null,
      statut: params.statut ?? 'prepa',
      audience_cible: params.audience_cible ?? null,
      objectifs: params.objectifs ?? null,
      kpi_attendu: params.kpi_attendu ?? null,
      budget_estime_eur: params.budget_estime_eur ?? null,
    })
    .select('*')
    .single()
  if (error) {
    console.error('[events-service] createEvent', error)
    return { ok: false, error: error.message }
  }
  return { ok: true, row: data as EventRow }
}

export async function updateEvent(
  eventId: string,
  patch: Partial<Omit<EventRow, 'id' | 'conseiller_id' | 'created_at' | 'updated_at'>>
): Promise<{ ok: true; row: EventRow } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('events')
    .update(patch)
    .eq('id', eventId)
    .select('*')
    .single()
  if (error) {
    console.error('[events-service] updateEvent', error)
    return { ok: false, error: error.message }
  }
  return { ok: true, row: data as EventRow }
}

// =====================================================================
// Actions
// =====================================================================

export async function upsertEventAction(params: {
  conseillerId: string
  eventId: string
  id?: string
  titre: string
  description?: string
  due_date?: string
  statut?: ActionStatut
  categorie?: ActionCategorie
  assigne_a?: string
  notes?: string
}): Promise<{ ok: true; row: EventActionRow } | { ok: false; error: string }> {
  const supabase = await createClient()
  const payload = {
    conseiller_id: params.conseillerId,
    event_id: params.eventId,
    titre: params.titre,
    description: params.description ?? null,
    due_date: params.due_date ?? null,
    statut: params.statut ?? 'todo',
    categorie: params.categorie ?? 'autre',
    assigne_a: params.assigne_a ?? null,
    notes: params.notes ?? null,
  }
  let res
  if (params.id) {
    res = await supabase
      .from('event_actions')
      .update(payload)
      .eq('id', params.id)
      .select('*')
      .single()
  } else {
    res = await supabase
      .from('event_actions')
      .insert(payload)
      .select('*')
      .single()
  }
  if (res.error) {
    console.error('[events-service] upsertEventAction', res.error)
    return { ok: false, error: res.error.message }
  }
  return { ok: true, row: res.data as EventActionRow }
}

export async function markActionDone(
  actionId: string
): Promise<{ ok: true; row: EventActionRow } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('event_actions')
    .update({ statut: 'done' })
    .eq('id', actionId)
    .select('*')
    .single()
  if (error) return { ok: false, error: error.message }
  return { ok: true, row: data as EventActionRow }
}

// =====================================================================
// Contacts
// =====================================================================

export async function upsertEventContact(params: {
  conseillerId: string
  eventId: string
  id?: string
  role: ContactRole
  nom: string
  email?: string
  phone?: string
  organisation?: string
  notes?: string
}): Promise<{ ok: true; row: EventContactRow } | { ok: false; error: string }> {
  const supabase = await createClient()
  const payload = {
    conseiller_id: params.conseillerId,
    event_id: params.eventId,
    role: params.role,
    nom: params.nom,
    email: params.email ?? null,
    phone: params.phone ?? null,
    organisation: params.organisation ?? null,
    notes: params.notes ?? null,
  }
  let res
  if (params.id) {
    res = await supabase
      .from('event_contacts')
      .update(payload)
      .eq('id', params.id)
      .select('*')
      .single()
  } else {
    res = await supabase
      .from('event_contacts')
      .insert(payload)
      .select('*')
      .single()
  }
  if (res.error) {
    console.error('[events-service] upsertEventContact', res.error)
    return { ok: false, error: res.error.message }
  }
  return { ok: true, row: res.data as EventContactRow }
}
