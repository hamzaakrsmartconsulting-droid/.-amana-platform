// app/api/admin/projects-pipeline/list/route.ts
//
// Liste agrégée des souscriptions (pipeline additionnel) pour le 2e Kanban
// admin. Renvoie les lignes de la vue v_pipeline_projects (RLS via security
// invoker — donc seuls les admins/managers verront toutes les lignes).

import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { listPipelineProjects } from '@/lib/workflow/project-workflow-service'

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

export async function GET(_req: NextRequest) {
  const auth = await getAuthUser()
  if (!auth) {
    return NextResponse.json({ ok: false, error: 'Non autorisé' }, { status: 401 })
  }
  const rows = await listPipelineProjects()
  return NextResponse.json({ ok: true, rows })
}
