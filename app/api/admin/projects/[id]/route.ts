// app/api/admin/projects/[id]/route.ts
//
// Détail d'une souscription complémentaire (project) pour la page admin
// dédiée /admin/projects/[id].
//
// Renvoie :
//   - project (depuis v_pipeline_projects pour l'agrégat client/produit)
//   - documents UNIQUEMENT liés au project (documents.project_id = id)
//   - historique des transitions de stage du project

import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function getSupabase() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {},
      },
    }
  )
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await context.params

  const supabase = await getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Non autorisé' }, { status: 401 })
  }

  const { data: project, error: pErr } = await supabase
    .from('v_pipeline_projects')
    .select('*')
    .eq('id', projectId)
    .maybeSingle()

  if (pErr || !project) {
    return NextResponse.json(
      { ok: false, error: pErr?.message ?? 'Project introuvable' },
      { status: 404 },
    )
  }

  // Docs liés UNIQUEMENT au project (pas tout l'historique du dossier).
  const { data: docs, error: docsErr } = await supabase
    .from('documents')
    .select(
      'id, type, filename, storage_path, status, yousign_status, yousign_signature_request_id, yousign_signed_at, created_at, project_id',
    )
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (docsErr) {
    return NextResponse.json({ ok: false, error: docsErr.message }, { status: 500 })
  }

  // Historique transitions stage du project
  const { data: history } = await supabase
    .from('project_stage_history')
    .select('id, from_stage, to_stage, triggered_by, notes, created_at')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  return NextResponse.json({
    ok: true,
    project,
    documents: docs ?? [],
    history: history ?? [],
  })
}
