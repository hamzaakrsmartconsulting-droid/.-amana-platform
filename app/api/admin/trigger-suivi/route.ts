// app/api/admin/trigger-suivi/route.ts
// Déclenché après approbation V8 (bilan_annuel_validation).
// Transition actif → suivi (art. 25 MIF II — suivi post-souscription).

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function svc() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createServiceClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function POST(request: NextRequest) {
  // Auth : session admin OU secret interne
  const secret = request.headers.get('x-amana-internal-secret')
  const expectedSecret = process.env.AMANA_INTERNAL_SECRET

  let authorized = false

  if (secret && secret === expectedSecret) {
    authorized = true
  } else {
    try {
      const cookieStore = await cookies()
      const sb = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { getAll: () => cookieStore.getAll() } }
      )
      const { data: { user } } = await sb.auth.getUser()
      if (user) authorized = true
    } catch { /* non bloquant */ }
  }

  if (!authorized) {
    return NextResponse.json({ ok: false, error: 'Non autorisé' }, { status: 401 })
  }

  const { dossier_id } = await request.json().catch(() => ({}))
  if (!dossier_id) {
    return NextResponse.json({ ok: false, error: 'dossier_id requis' }, { status: 400 })
  }

  const supabase = svc()

  const { data: dossier } = await supabase
    .from('dossiers')
    .select('id, pipeline_stage, prenom, nom')
    .eq('id', dossier_id)
    .maybeSingle()

  if (!dossier) {
    return NextResponse.json({ ok: false, error: 'Dossier introuvable' }, { status: 404 })
  }

  if (dossier.pipeline_stage !== 'actif') {
    return NextResponse.json(
      { ok: false, error: `Stage incompatible : ${dossier.pipeline_stage} (attendu actif)` },
      { status: 400 }
    )
  }

  await supabase
    .from('dossiers')
    .update({ pipeline_stage: 'suivi' })
    .eq('id', dossier_id)

  await supabase.from('audit_logs').insert({
    user_id: null,
    action: 'pipeline.transition',
    entity_type: 'dossier',
    entity_id: dossier_id,
    metadata: {
      from_stage: 'actif',
      to_stage: 'suivi',
      triggered_by: 'admin_v8_approval',
      notes: 'V8 bilan annuel validé — dossier passé en suivi (art. 25 MIF II)',
    },
  })

  return NextResponse.json({
    ok: true,
    dossier_id,
    from_stage: 'actif',
    to_stage: 'suivi',
  })
}
