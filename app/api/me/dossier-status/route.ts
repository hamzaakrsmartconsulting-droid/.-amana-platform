// GET /api/me/dossier-status
// Retourne le pipeline_stage du dossier du client connecté.
// Utilise service_role car les clients n'ont pas de RLS direct sur dossiers.

import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ACTIVE_STAGES = ['actif', 'suivi']

export async function GET() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } },
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key  = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    return NextResponse.json({ error: 'Config manquante' }, { status: 500 })
  }

  const admin = createServiceClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // Chercher le dossier par email (lien fonctionnel onboarding → dossier)
  const email = user.email?.toLowerCase().trim()
  if (!email) {
    return NextResponse.json({ is_active: false, stage: null })
  }

  const { data: dossier } = await admin
    .from('dossiers')
    .select('id, pipeline_stage')
    .ilike('email_client', email)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const stage = dossier?.pipeline_stage ?? null
  const is_active = stage ? ACTIVE_STAGES.includes(stage) : false

  return NextResponse.json({ is_active, stage, dossier_id: dossier?.id ?? null })
}
