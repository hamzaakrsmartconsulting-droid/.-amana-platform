// app/api/pipeline/transition/route.ts
// Sprint Agents IA v19

import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { PipelineStage } from '@/lib/workflow/pipeline-stages'
import {
  transitionDossierStage,
  type TriggeredBy,
} from '@/lib/workflow/workflow-service'

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
    dossier_id?: string
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
  if (!body.dossier_id || !body.to_stage) {
    return NextResponse.json(
      { ok: false, error: 'dossier_id et to_stage requis' },
      { status: 400 }
    )
  }

  const result = await transitionDossierStage({
    dossierId: body.dossier_id,
    toStage: body.to_stage as PipelineStage,
    triggeredBy: 'manual' as TriggeredBy,
    triggerContext: body.trigger_context,
    notes: body.notes,
    bypassMatrix: body.bypass_matrix,
  })
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 })
  }
  return NextResponse.json({ ok: true, from: result.from, to: result.to })
}
