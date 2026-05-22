// app/api/pipeline/history/route.ts
// Sprint Agents IA v19

import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { listStageHistory } from '@/lib/workflow/workflow-service'

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

export async function GET(request: NextRequest) {
  const auth = await getAuthUser()
  if (!auth) {
    return NextResponse.json({ ok: false, error: 'Non autorisé' }, { status: 401 })
  }
  const url = new URL(request.url)
  const dossier_id = url.searchParams.get('dossier_id')
  if (!dossier_id) {
    return NextResponse.json(
      { ok: false, error: 'dossier_id requis' },
      { status: 400 }
    )
  }
  const history = await listStageHistory(dossier_id)
  return NextResponse.json({ ok: true, history })
}
