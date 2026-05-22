// lib/onboarding/onboarding-service.ts
// Sprint Agents IA v18 · 30 avril 2026
//
// Service Supabase pour la gestion des sessions du funnel public.
// Toutes les écritures passent par le service_role car le prospect n'est pas
// authentifié dans Supabase. La sécurité repose sur le session_token.

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { normalizePhoneForYousign } from '@/lib/yousign/phone'
import { routeToOffer, type OffreAmana, type RouteOfferOutput } from './route-offer'

function serviceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Variables Supabase service role manquantes')
  return createServiceClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export type OnboardingStep1 = {
  objectif_principal:
    | 'preparer_retraite'
    | 'transmettre_patrimoine'
    | 'optimiser_fiscalite'
    | 'epargner_projet'
    | 'investir_immo'
    | 'gerer_heritage'
    | 'autre'
  horizon_annees: number
  capacite_pertes: 'faible' | 'moyenne' | 'elevee'
}

export type OnboardingStep2 = {
  patrimoine_net_eur: number
  revenus_annuels_eur?: number
  charges_annuelles_eur?: number
  capacite_epargne_mensuelle_eur?: number
  situation_familiale:
    | 'celibataire'
    | 'pacs'
    | 'marie_communaute_reduite'
    | 'marie_separation_biens'
    | 'marie_communaute_universelle'
    | 'divorce'
    | 'veuf'
  nb_enfants: number
  detient_parts_societe?: boolean
  detient_sci?: boolean
  expatrie_ou_non_resident?: boolean
  succession_active?: boolean
  plus_de_deux_immeubles?: boolean
  entrepreneur_ou_liberal?: boolean
}

export type OnboardingStep3 = {
  sensibilite_sharia: 'elevee' | 'moyenne' | 'principielle'
  patrimoine_haram_a_purifier?: boolean
  pratique_zakat?: boolean
  // Q1.6 spec — préférences ESG/SFDR (article L.533-22-1 CMF)
  esg_preference?: 'article8' | 'article9' | 'label_isr' | 'sans_preference'
  esg_pct_min?: number
  esg_indicateurs?: string[]
}

export type OnboardingStep4 = {
  prenom: string
  nom: string
  email: string
  telephone: string
}

/** Formats acceptés : 06…, +33…, 0033… (normalisés en E.164 à l'enregistrement). */
export function isValidOnboardingPhone(telephone: string): boolean {
  return normalizePhoneForYousign(telephone) !== undefined
}

export type OnboardingMeta = {
  user_agent?: string
  ip_address?: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
}

export type OnboardingSession = {
  id: string
  session_token: string
  current_step: number
  finalized: boolean
  finalized_dossier_id: string | null
  finalized_user_id: string | null
  offre_aiguillee: OffreAmana | null
  offre_score: unknown
  // Step 1
  objectif_principal: string | null
  horizon_annees: number | null
  capacite_pertes: string | null
  // Step 2
  patrimoine_net_eur: number | null
  revenus_annuels_eur: number | null
  charges_annuelles_eur: number | null
  capacite_epargne_mensuelle_eur: number | null
  situation_familiale: string | null
  nb_enfants: number | null
  detient_parts_societe: boolean
  detient_sci: boolean
  expatrie_ou_non_resident: boolean
  succession_active: boolean
  plus_de_deux_immeubles: boolean
  entrepreneur_ou_liberal: boolean
  // Step 3
  sensibilite_sharia: string | null
  patrimoine_haram_a_purifier: boolean
  pratique_zakat: boolean
  esg_preference: string | null
  esg_pct_min: number | null
  esg_indicateurs: string[] | null
  // Step 4
  prenom: string | null
  nom: string | null
  email: string | null
  telephone: string | null
  created_at: string
  updated_at: string
  expires_at: string
}

// =====================================================================
// Création / lecture de session
// =====================================================================

export async function createOnboardingSession(
  meta: OnboardingMeta = {}
): Promise<OnboardingSession> {
  const supabase = serviceSupabase()
  const session_token = crypto.randomUUID()

  const { data, error } = await supabase
    .from('onboarding_sessions')
    .insert({
      session_token,
      current_step: 1,
      user_agent: meta.user_agent ?? null,
      ip_address: meta.ip_address ?? null,
      utm_source: meta.utm_source ?? null,
      utm_medium: meta.utm_medium ?? null,
      utm_campaign: meta.utm_campaign ?? null,
    })
    .select('*')
    .single()
  if (error) throw new Error(`createOnboardingSession: ${error.message}`)
  return data as OnboardingSession
}

export async function getOnboardingSession(
  sessionToken: string
): Promise<OnboardingSession | null> {
  const supabase = serviceSupabase()
  const { data, error } = await supabase
    .from('onboarding_sessions')
    .select('*')
    .eq('session_token', sessionToken)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()
  if (error) {
    console.error('[onboarding] getOnboardingSession', error)
    return null
  }
  return data as OnboardingSession | null
}

// =====================================================================
// Sauvegarde par étape
// =====================================================================

export async function saveStep1(
  sessionToken: string,
  data: OnboardingStep1
): Promise<{ ok: true; session: OnboardingSession } | { ok: false; error: string }> {
  const supabase = serviceSupabase()
  const { data: row, error } = await supabase
    .from('onboarding_sessions')
    .update({
      objectif_principal: data.objectif_principal,
      horizon_annees: data.horizon_annees,
      capacite_pertes: data.capacite_pertes,
      current_step: 2,
    })
    .eq('session_token', sessionToken)
    .select('*')
    .single()
  if (error) return { ok: false, error: error.message }
  return { ok: true, session: row as OnboardingSession }
}

export async function saveStep2(
  sessionToken: string,
  data: OnboardingStep2
): Promise<{ ok: true; session: OnboardingSession } | { ok: false; error: string }> {
  const supabase = serviceSupabase()
  const { data: row, error } = await supabase
    .from('onboarding_sessions')
    .update({
      patrimoine_net_eur: data.patrimoine_net_eur,
      revenus_annuels_eur: data.revenus_annuels_eur ?? null,
      charges_annuelles_eur: data.charges_annuelles_eur ?? null,
      capacite_epargne_mensuelle_eur: data.capacite_epargne_mensuelle_eur ?? null,
      situation_familiale: data.situation_familiale,
      nb_enfants: data.nb_enfants,
      detient_parts_societe: data.detient_parts_societe ?? false,
      detient_sci: data.detient_sci ?? false,
      expatrie_ou_non_resident: data.expatrie_ou_non_resident ?? false,
      succession_active: data.succession_active ?? false,
      plus_de_deux_immeubles: data.plus_de_deux_immeubles ?? false,
      entrepreneur_ou_liberal: data.entrepreneur_ou_liberal ?? false,
      current_step: 3,
    })
    .eq('session_token', sessionToken)
    .select('*')
    .single()
  if (error) return { ok: false, error: error.message }
  return { ok: true, session: row as OnboardingSession }
}

export async function saveStep3(
  sessionToken: string,
  data: OnboardingStep3
): Promise<
  | { ok: true; session: OnboardingSession; aiguillage: RouteOfferOutput }
  | { ok: false; error: string }
> {
  const supabase = serviceSupabase()

  // Charger session pour calculer l'aiguillage avec toutes les données combinées
  const { data: existing, error: getErr } = await supabase
    .from('onboarding_sessions')
    .select('*')
    .eq('session_token', sessionToken)
    .maybeSingle()
  if (getErr || !existing) return { ok: false, error: 'Session introuvable' }

  // Calcul aiguillage
  const aiguillage = routeToOffer({
    patrimoine_net_eur: existing.patrimoine_net_eur ?? 0,
    capacite_pertes: existing.capacite_pertes as never,
    detient_parts_societe: existing.detient_parts_societe,
    detient_sci: existing.detient_sci,
    expatrie_ou_non_resident: existing.expatrie_ou_non_resident,
    succession_active: existing.succession_active,
    plus_de_deux_immeubles: existing.plus_de_deux_immeubles,
    entrepreneur_ou_liberal: existing.entrepreneur_ou_liberal,
  })

  const { data: row, error } = await supabase
    .from('onboarding_sessions')
    .update({
      sensibilite_sharia: data.sensibilite_sharia,
      patrimoine_haram_a_purifier: data.patrimoine_haram_a_purifier ?? false,
      pratique_zakat: data.pratique_zakat ?? false,
      esg_preference: data.esg_preference ?? null,
      esg_pct_min: data.esg_pct_min ?? null,
      esg_indicateurs: data.esg_indicateurs ?? null,
      offre_aiguillee: aiguillage.offre,
      offre_score: aiguillage.score,
      current_step: 4,
    })
    .eq('session_token', sessionToken)
    .select('*')
    .single()
  if (error) return { ok: false, error: error.message }
  return { ok: true, session: row as OnboardingSession, aiguillage }
}

export async function saveStep4(
  sessionToken: string,
  data: OnboardingStep4
): Promise<{ ok: true; session: OnboardingSession } | { ok: false; error: string }> {
  if (!data.prenom?.trim()) {
    return { ok: false, error: 'Prénom requis' }
  }
  if (!data.nom?.trim()) {
    return { ok: false, error: 'Nom requis' }
  }
  if (!data.email?.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
    return { ok: false, error: 'Email invalide' }
  }
  const phone = normalizePhoneForYousign(data.telephone)
  if (!phone) {
    return {
      ok: false,
      error: 'Numéro de téléphone invalide (ex. 06 12 34 56 78 ou +33 6 12 34 56 78)',
    }
  }
  const supabase = serviceSupabase()
  const { data: row, error } = await supabase
    .from('onboarding_sessions')
    .update({
      prenom: data.prenom.trim(),
      nom: data.nom.trim(),
      email: data.email.trim().toLowerCase(),
      telephone: phone,
      current_step: 5,
    })
    .eq('session_token', sessionToken)
    .select('*')
    .single()
  if (error) return { ok: false, error: error.message }
  return { ok: true, session: row as OnboardingSession }
}

// =====================================================================
// Finalisation : création du compte client + dossier
// =====================================================================

export async function finalizeOnboarding(params: {
  sessionToken: string
  conseillerIdAssigned: string // ID du conseiller (Mohamed) à qui le dossier est attribué
}): Promise<
  | { ok: true; user_id: string; dossier_id: string; offre: OffreAmana }
  | { ok: false; error: string }
> {
  const supabase = serviceSupabase()

  const { data: session, error: getErr } = await supabase
    .from('onboarding_sessions')
    .select('*')
    .eq('session_token', params.sessionToken)
    .maybeSingle()
  if (getErr || !session) return { ok: false, error: 'Session introuvable' }
  if (session.finalized) {
    return {
      ok: true,
      user_id: session.finalized_user_id!,
      dossier_id: session.finalized_dossier_id!,
      offre: session.offre_aiguillee as OffreAmana,
    }
  }
  if (
    !session.email ||
    !session.prenom ||
    !session.nom ||
    !session.telephone ||
    !session.offre_aiguillee
  ) {
    return { ok: false, error: 'Session incomplète, étapes 1-4 requises (téléphone inclus)' }
  }

  // 1. Créer ou récupérer l'utilisateur Supabase Auth (magic link)
  //
  // IMPORTANT : la colonne `email` est dans auth.users, PAS dans
  // public.profiles (chez AMANA, profiles ne contient que id + role +
  // colonnes métier). Pour vérifier l'existence d'un user par email, on
  // utilise auth.admin.listUsers() puis on filtre côté app.
  // C'est inefficient pour des millions d'users mais OK en MVP (<10k users).
  let userId: string | null = null

  // Tentative directe d'invitation : si email déjà utilisé, on récupère
  // l'user existant via listUsers().
  // Note : Supabase envoie automatiquement le magic link par email — on n'a
  // pas besoin de récupérer action_link côté serveur. Le typage de
  // inviteUserByEmail varie selon les versions du SDK ; on s'appuie
  // uniquement sur invited.user.id qui est stable.
  const { data: invited, error: inviteErr } = await supabase.auth.admin.inviteUserByEmail(
    session.email,
    {
      data: {
        prenom: session.prenom,
        nom: session.nom,
        source: 'funnel_onboarding',
        offre_amana: session.offre_aiguillee,
      },
    }
  )

  if (invited?.user) {
    // Nouveau user créé — Supabase Auth a déjà envoyé l'email magic link
    userId = invited.user.id

    // Créer le profil correspondant (PAS de colonne email — c'est dans auth.users)
    await supabase.from('profiles').insert({
      id: userId,
      role: 'client',
    })
  } else if (
    inviteErr &&
    /already|exists|registered/i.test(inviteErr.message ?? '')
  ) {
    // User existe déjà, le retrouver via listUsers
    // Note : listUsers paginé, on parcourt jusqu'à trouver l'email.
    let page = 1
    const PER_PAGE = 1000
    while (page < 50) {
      const { data: list, error: listErr } = await supabase.auth.admin.listUsers({
        page,
        perPage: PER_PAGE,
      })
      if (listErr) {
        return { ok: false, error: `Recherche user existante échouée : ${listErr.message}` }
      }
      const found = list.users.find(
        (u) => u.email?.toLowerCase() === session.email!.toLowerCase()
      )
      if (found) {
        userId = found.id
        break
      }
      if (list.users.length < PER_PAGE) break // dernière page
      page++
    }
    if (!userId) {
      return {
        ok: false,
        error: 'Email signalé existant par auth mais introuvable via listUsers',
      }
    }
    // S'assurer que le profil existe (idempotent — INSERT ON CONFLICT DO NOTHING)
    await supabase
      .from('profiles')
      .upsert({ id: userId, role: 'client' }, { onConflict: 'id' })
  } else {
    return {
      ok: false,
      error: `Invitation échouée : ${inviteErr?.message ?? 'erreur inconnue'}`,
    }
  }

  // Safety net : userId doit être défini à ce stade (narrowing TS)
  if (!userId) {
    return { ok: false, error: 'Erreur logique interne : userId indéterminé' }
  }

  // 2. Créer le dossier
  const { data: dossier, error: dossErr } = await supabase
    .from('dossiers')
    .insert({
      conseiller_id: params.conseillerIdAssigned,
      prenom: session.prenom,
      nom: session.nom,
      email_client: session.email,
      telephone: session.telephone,
      statut: 'prospect',
      offre_amana_cible: session.offre_aiguillee,
      notes: `Créé via funnel public /onboard. Aiguillage automatique : ${session.offre_aiguillee}.\nSensibilité Sharia : ${session.sensibilite_sharia}.\nObjectif : ${session.objectif_principal} (horizon ${session.horizon_annees} ans).`,
    })
    .select('id')
    .single()
  if (dossErr || !dossier) {
    return { ok: false, error: `Création dossier échouée : ${dossErr?.message ?? 'inconnu'}` }
  }

  // 3. Pré-remplir les facts à partir des réponses
  const facts: Array<{ fact_key: string; fact_value: string }> = []
  if (session.objectif_principal) facts.push({ fact_key: 'objectif_principal', fact_value: session.objectif_principal })
  if (session.horizon_annees != null) facts.push({ fact_key: 'horizon_placement_annees', fact_value: String(session.horizon_annees) })
  if (session.capacite_pertes) facts.push({ fact_key: 'profil_risque', fact_value: session.capacite_pertes })
  if (session.patrimoine_net_eur != null) facts.push({ fact_key: 'patrimoine_total_eur', fact_value: String(session.patrimoine_net_eur) })
  if (session.revenus_annuels_eur != null) facts.push({ fact_key: 'revenus_annuels_eur', fact_value: String(session.revenus_annuels_eur) })
  if (session.charges_annuelles_eur != null) facts.push({ fact_key: 'charges_annuelles_eur', fact_value: String(session.charges_annuelles_eur) })
  if (session.situation_familiale) facts.push({ fact_key: 'situation_familiale', fact_value: session.situation_familiale })
  if (session.nb_enfants != null) facts.push({ fact_key: 'nb_enfants', fact_value: String(session.nb_enfants) })
  if (session.sensibilite_sharia) facts.push({ fact_key: 'sensibilite_sharia', fact_value: session.sensibilite_sharia })
  if (session.esg_preference) facts.push({ fact_key: 'esg_preference', fact_value: session.esg_preference })
  if (session.esg_pct_min != null) facts.push({ fact_key: 'esg_pct_min', fact_value: String(session.esg_pct_min) })
  if (session.offre_aiguillee) facts.push({ fact_key: 'offre_amana_cible', fact_value: session.offre_aiguillee })

  if (facts.length > 0) {
    await supabase.from('client_facts').insert(
      facts.map((f) => ({
        conseiller_id: params.conseillerIdAssigned,
        dossier_id: dossier.id,
        fact_key: f.fact_key,
        fact_value: f.fact_value,
        source_agent: 'funnel_onboarding',
        confidence: 1.0,
      }))
    )
  }

  // 4. Marquer la session comme finalisée
  await supabase
    .from('onboarding_sessions')
    .update({
      finalized: true,
      finalized_dossier_id: dossier.id,
      finalized_user_id: userId,
    })
    .eq('session_token', params.sessionToken)

  // 5. Audit log
  await supabase.from('audit_logs').insert({
    user_id: params.conseillerIdAssigned,
    action: 'onboarding.finalized',
    entity_type: 'dossier',
    entity_id: dossier.id,
    metadata: {
      session_token_prefix: params.sessionToken.slice(0, 8),
      offre: session.offre_aiguillee,
      email: session.email,
      via: 'funnel_public',
      timestamp: new Date().toISOString(),
    },
  })

  return {
    ok: true,
    user_id: userId,
    dossier_id: dossier.id,
    offre: session.offre_aiguillee as OffreAmana,
  }
}
