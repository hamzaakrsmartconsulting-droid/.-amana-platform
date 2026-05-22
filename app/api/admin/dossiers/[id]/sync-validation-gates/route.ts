// POST — crée les verrous manquants pour les PDF déjà générés sur ce dossier

import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { ensureGatesForGeneratedDocuments } from '@/lib/workflow/validation-gates'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: dossierId } = await context.params
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll() {},
      },
    },
  )
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin' && profile?.role !== 'manager') {
    return NextResponse.json({ error: 'Réservé aux admins' }, { status: 403 })
  }

  try {
    const created = await ensureGatesForGeneratedDocuments(dossierId)
    return NextResponse.json({ ok: true, gates_created: created })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur sync gates'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
