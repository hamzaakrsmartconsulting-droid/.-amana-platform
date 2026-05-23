// app/api/admin/projects-pipeline/transition/route.ts
//
// Déclenche une transition manuelle d'étape sur un project (pipeline additionnel).
// Équivalent de /api/pipeline/transition mais opère sur la table projects.

import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import {
  transitionProjectStage,
  type ProjectTriggeredBy,
} from '@/lib/workflow/project-workflow-service'
import type { ProjectStage } from '@/lib/workflow/project-pipeline-stages'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function getAuthUser() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {},
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()
  return user ? { userId: user.id } : null
}

export async function POST(request: NextRequest) {
  const auth = await getAuthUser()
  if (!auth) {
    return NextResponse.json({ ok: false, error: 'Non autorisé' }, { status: 401 })
  }

  let body: {
    project_id?: string
    to_stage?: string
    notes?: string
    trigger_context?: Record<string, unknown>
    bypass_matrix?: boolean
  } = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'JSON invalide' }, { status: 400 })
  }
  if (!body.project_id || !body.to_stage) {
    return NextResponse.json(
      { ok: false, error: 'project_id et to_stage requis' },
      { status: 400 }
    )
  }

  const result = await transitionProjectStage({
    projectId: body.project_id,
    toStage: body.to_stage as ProjectStage,
    triggeredBy: 'manual' as ProjectTriggeredBy,
    triggerContext: body.trigger_context,
    notes: body.notes,
    bypassMatrix: body.bypass_matrix,
  })
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 })
  }
  return NextResponse.json({ ok: true, from: result.from, to: result.to })
}
