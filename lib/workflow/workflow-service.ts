// lib/workflow/workflow-service.ts
// Sprint Agents IA v19 · 30 avril 2026
import 'server-only'
//
// Service de gestion des transitions d'étape dans le pipeline AMANA.
//
// Concepts :
//   - Chaque dossier a un `pipeline_stage` (cf. migration v19)
//   - Les transitions sont validées (matrice d'états autorisés)
//   - Chaque transition est tracée dans dossier_stage_history
//   - Certaines transitions déclenchent des actions automatiques
//     (génération doc, envoi signature, etc.) — gérées dans auto-trigger.ts
//
// Le pipeline n'est PAS strictement linéaire — un dossier peut revenir en
// arrière (ex: KYC rejeté → kyc_attente) ou passer en bloqué.

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import { sendEmail, emailBienvenueSouscription } from '@/lib/email'
import {
  getManualPipelineTargets,
  isTransitionAllowed,
  type PipelineStage,
} from '@/lib/workflow/pipeline-stages'

async function notifySouscriptionWelcome(
  supabase: SupabaseClient,
  dossierId: string,
): Promise<void> {
  const { data: dossier } = await supabase
    .from('dossiers')
    .select('email_client, prenom')
    .eq('id', dossierId)
    .maybeSingle()

  if (!dossier?.email_client) return

  try {
    await sendEmail({
      to: dossier.email_client,
      ...emailBienvenueSouscription(dossier.prenom ?? 'cher client'),
    })
  } catch (err) {
    console.error('[workflow] email bienvenue souscription', dossierId, err)
  }
}

export type TriggeredBy =
  | 'manual'
  | 'agent_sajl'
  | 'agent_raqib'
  | 'agent_mawsim'
  | 'agent_jamaa'
  | 'webhook_yousign'
  | 'background_job'
  | 'funnel_onboarding'
  | 'autre'

// =====================================================================
// Service côté server (utilisateur authentifié)
// =====================================================================

export type DossierPipelineRow = {
  id: string
  conseiller_id: string
  prenom: string
  nom: string
  email_client: string | null
  telephone: string | null
  statut: string
  offre_amana_cible: 'mass' | 'patrimoniale' | 'premium' | null
  pipeline_stage: PipelineStage
  pipeline_stage_updated_at: string
  created_at: string
  updated_at: string
  docs_count: number
  compliance_checks_recent: number
  critical_alerts_open: number
}

export async function listPipelineDossiers(): Promise<DossierPipelineRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('v_pipeline_dossiers')
    .select('*')
    .order('updated_at', { ascending: false })
  if (error) {
    console.error('[workflow] listPipelineDossiers', error)
    return []
  }
  return (data ?? []) as DossierPipelineRow[]
}

export async function transitionDossierStage(params: {
  dossierId: string
  toStage: PipelineStage
  triggeredBy: TriggeredBy
  triggerContext?: Record<string, unknown>
  notes?: string
  // Si fourni, force la transition même si non autorisée par la matrice
  // (à utiliser avec parcimonie, par les admins en cas de correction)
  bypassMatrix?: boolean
}): Promise<
  | { ok: true; from: PipelineStage; to: PipelineStage }
  | { ok: false; error: string }
> {
  const supabase = await createClient()

  // 1. Lire le dossier actuel
  const { data: dossier, error: getErr } = await supabase
    .from('dossiers')
    .select('id, conseiller_id, pipeline_stage')
    .eq('id', params.dossierId)
    .maybeSingle()
  if (getErr || !dossier) return { ok: false, error: 'Dossier introuvable' }

  const fromStage = (dossier.pipeline_stage as PipelineStage) ?? 'nouveau'

  // 2. Vérifier la matrice (sauf bypass)
  if (!params.bypassMatrix && !isTransitionAllowed(fromStage, params.toStage)) {
    return {
      ok: false,
      error: `Transition non autorisée : ${fromStage} → ${params.toStage}. Autorisées depuis ${fromStage} : ${getManualPipelineTargets(fromStage).join(', ')}`,
    }
  }

  // 3. Si même stage, no-op
  if (fromStage === params.toStage) {
    return { ok: true, from: fromStage, to: params.toStage }
  }

  // 4. Update + insert history
  const now = new Date().toISOString()
  const { error: updErr } = await supabase
    .from('dossiers')
    .update({
      pipeline_stage: params.toStage,
      pipeline_stage_updated_at: now,
    })
    .eq('id', params.dossierId)
  if (updErr) return { ok: false, error: updErr.message }

  await supabase.from('dossier_stage_history').insert({
    dossier_id: params.dossierId,
    conseiller_id: dossier.conseiller_id,
    from_stage: fromStage,
    to_stage: params.toStage,
    triggered_by: params.triggeredBy,
    trigger_context: params.triggerContext ?? null,
    notes: params.notes ?? null,
  })

  // 5. Audit log
  await supabase.from('audit_logs').insert({
    user_id: dossier.conseiller_id,
    action: 'dossier.pipeline_stage_transitioned',
    entity_type: 'dossier',
    entity_id: params.dossierId,
    metadata: {
      from_stage: fromStage,
      to_stage: params.toStage,
      triggered_by: params.triggeredBy,
      timestamp: now,
    },
  })

  if (params.toStage === 'souscription') {
    void notifySouscriptionWelcome(supabase, params.dossierId)
  }

  return { ok: true, from: fromStage, to: params.toStage }
}

// =====================================================================
// Variante service_role pour les hooks background (sans auth user)
// =====================================================================

export async function transitionDossierStageService(params: {
  dossierId: string
  toStage: PipelineStage
  triggeredBy: TriggeredBy
  triggerContext?: Record<string, unknown>
  notes?: string
  bypassMatrix?: boolean
}): Promise<
  | { ok: true; from: PipelineStage; to: PipelineStage }
  | { ok: false; error: string }
> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return { ok: false, error: 'Service role manquant' }
  const supabase = createServiceClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: dossier, error: getErr } = await supabase
    .from('dossiers')
    .select('id, conseiller_id, pipeline_stage')
    .eq('id', params.dossierId)
    .maybeSingle()
  if (getErr || !dossier) return { ok: false, error: 'Dossier introuvable' }

  const fromStage = (dossier.pipeline_stage as PipelineStage) ?? 'nouveau'

  if (!params.bypassMatrix && !isTransitionAllowed(fromStage, params.toStage)) {
    return {
      ok: false,
      error: `Transition non autorisée : ${fromStage} → ${params.toStage}`,
    }
  }
  if (fromStage === params.toStage) {
    return { ok: true, from: fromStage, to: params.toStage }
  }

  const now = new Date().toISOString()
  const { error: updErr } = await supabase
    .from('dossiers')
    .update({
      pipeline_stage: params.toStage,
      pipeline_stage_updated_at: now,
    })
    .eq('id', params.dossierId)
  if (updErr) return { ok: false, error: updErr.message }

  await supabase.from('dossier_stage_history').insert({
    dossier_id: params.dossierId,
    conseiller_id: dossier.conseiller_id,
    from_stage: fromStage,
    to_stage: params.toStage,
    triggered_by: params.triggeredBy,
    trigger_context: params.triggerContext ?? null,
    notes: params.notes ?? null,
  })

  await supabase.from('audit_logs').insert({
    user_id: dossier.conseiller_id,
    action: 'dossier.pipeline_stage_transitioned',
    entity_type: 'dossier',
    entity_id: params.dossierId,
    metadata: {
      from_stage: fromStage,
      to_stage: params.toStage,
      triggered_by: params.triggeredBy,
      timestamp: now,
    },
  })

  if (params.toStage === 'souscription') {
    void notifySouscriptionWelcome(supabase, params.dossierId)
  }

  return { ok: true, from: fromStage, to: params.toStage }
}

export async function listStageHistory(
  dossierId: string
): Promise<
  Array<{
    id: string
    from_stage: string | null
    to_stage: string
    triggered_by: string
    trigger_context: unknown
    notes: string | null
    created_at: string
  }>
> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('dossier_stage_history')
    .select('id, from_stage, to_stage, triggered_by, trigger_context, notes, created_at')
    .eq('dossier_id', dossierId)
    .order('created_at', { ascending: false })
  if (error) return []
  return data ?? []
}
