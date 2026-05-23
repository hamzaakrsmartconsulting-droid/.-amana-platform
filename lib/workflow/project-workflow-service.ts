// lib/workflow/project-workflow-service.ts
// Service de transition d'étape pour le pipeline des souscriptions
// complémentaires (`projects.pipeline_stage`).
//
// Équivalent de `lib/workflow/workflow-service.ts` mais opérant sur `projects`
// + table d'historique `project_stage_history`. Les deux pipelines sont
// indépendants : ce service ne touche jamais `dossiers.pipeline_stage`.

import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import {
  getProjectManualTargets,
  isProjectTransitionAllowed,
  type ProjectStage,
} from '@/lib/workflow/project-pipeline-stages'

export type ProjectTriggeredBy =
  | 'manual'
  | 'webhook_yousign'
  | 'background_job'
  | 'souscription_client'
  | 'autre'

export type ProjectPipelineRow = {
  id: string
  user_id: string
  conseiller_id: string | null
  dossier_id: string | null
  type: string
  montant: number | null
  statut: string
  pipeline_stage: ProjectStage
  pipeline_stage_updated_at: string
  created_at: string
  updated_at: string
  client_prenom: string | null
  client_nom: string | null
  client_email: string | null
  client_offre: 'mass' | 'patrimoniale' | 'premium' | null
  product_id: string | null
  product_nom: string | null
  product_gestionnaire: string | null
  docs_count: number
  metadata: Record<string, unknown> | null
}

// =====================================================================
// Listing (service côté serveur authentifié — RLS via security invoker)
// =====================================================================

export async function listPipelineProjects(): Promise<ProjectPipelineRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('v_pipeline_projects')
    .select('*')
    .order('updated_at', { ascending: false })
  if (error) {
    console.error('[project-workflow] listPipelineProjects', error)
    return []
  }
  return (data ?? []) as ProjectPipelineRow[]
}

// =====================================================================
// Transition (côté serveur authentifié — utilisateur courant = admin)
// =====================================================================

export async function transitionProjectStage(params: {
  projectId: string
  toStage: ProjectStage
  triggeredBy: ProjectTriggeredBy
  triggerContext?: Record<string, unknown>
  notes?: string
  bypassMatrix?: boolean
}): Promise<
  | { ok: true; from: ProjectStage; to: ProjectStage }
  | { ok: false; error: string }
> {
  const supabase = await createClient()

  const { data: project, error: getErr } = await supabase
    .from('projects')
    .select('id, conseiller_id, pipeline_stage')
    .eq('id', params.projectId)
    .maybeSingle()

  if (getErr || !project) return { ok: false, error: 'Project introuvable' }

  const fromStage = (project.pipeline_stage as ProjectStage) ?? 'nouveau'

  if (!params.bypassMatrix && !isProjectTransitionAllowed(fromStage, params.toStage)) {
    return {
      ok: false,
      error: `Transition non autorisée : ${fromStage} → ${params.toStage}. Autorisées depuis ${fromStage} : ${getProjectManualTargets(fromStage).join(', ')}`,
    }
  }

  if (fromStage === params.toStage) {
    return { ok: true, from: fromStage, to: params.toStage }
  }

  const now = new Date().toISOString()

  const { error: updErr } = await supabase
    .from('projects')
    .update({
      pipeline_stage: params.toStage,
      pipeline_stage_updated_at: now,
      updated_at: now,
    })
    .eq('id', params.projectId)

  if (updErr) return { ok: false, error: updErr.message }

  await supabase.from('project_stage_history').insert({
    project_id: params.projectId,
    conseiller_id: project.conseiller_id,
    from_stage: fromStage,
    to_stage: params.toStage,
    triggered_by: params.triggeredBy,
    trigger_context: params.triggerContext ?? null,
    notes: params.notes ?? null,
  })

  await supabase.from('audit_logs').insert({
    user_id: project.conseiller_id,
    action: 'project.pipeline_stage_transitioned',
    entity_type: 'project',
    entity_id: params.projectId,
    metadata: {
      from_stage: fromStage,
      to_stage: params.toStage,
      triggered_by: params.triggeredBy,
      timestamp: now,
    },
  })

  return { ok: true, from: fromStage, to: params.toStage }
}

// =====================================================================
// Transition côté service_role (hooks background, webhooks, etc.)
// =====================================================================

export async function transitionProjectStageService(params: {
  projectId: string
  toStage: ProjectStage
  triggeredBy: ProjectTriggeredBy
  triggerContext?: Record<string, unknown>
  notes?: string
  bypassMatrix?: boolean
}): Promise<
  | { ok: true; from: ProjectStage; to: ProjectStage }
  | { ok: false; error: string }
> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return { ok: false, error: 'Service role manquant' }
  const supabase = createServiceClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: project, error: getErr } = await supabase
    .from('projects')
    .select('id, conseiller_id, pipeline_stage')
    .eq('id', params.projectId)
    .maybeSingle()
  if (getErr || !project) return { ok: false, error: 'Project introuvable' }

  const fromStage = (project.pipeline_stage as ProjectStage) ?? 'nouveau'

  if (!params.bypassMatrix && !isProjectTransitionAllowed(fromStage, params.toStage)) {
    return { ok: false, error: `Transition non autorisée : ${fromStage} → ${params.toStage}` }
  }
  if (fromStage === params.toStage) {
    return { ok: true, from: fromStage, to: params.toStage }
  }

  const now = new Date().toISOString()
  const { error: updErr } = await supabase
    .from('projects')
    .update({
      pipeline_stage: params.toStage,
      pipeline_stage_updated_at: now,
      updated_at: now,
    })
    .eq('id', params.projectId)
  if (updErr) return { ok: false, error: updErr.message }

  await supabase.from('project_stage_history').insert({
    project_id: params.projectId,
    conseiller_id: project.conseiller_id,
    from_stage: fromStage,
    to_stage: params.toStage,
    triggered_by: params.triggeredBy,
    trigger_context: params.triggerContext ?? null,
    notes: params.notes ?? null,
  })

  await supabase.from('audit_logs').insert({
    user_id: project.conseiller_id,
    action: 'project.pipeline_stage_transitioned',
    entity_type: 'project',
    entity_id: params.projectId,
    metadata: {
      from_stage: fromStage,
      to_stage: params.toStage,
      triggered_by: params.triggeredBy,
      timestamp: now,
    },
  })

  return { ok: true, from: fromStage, to: params.toStage }
}
