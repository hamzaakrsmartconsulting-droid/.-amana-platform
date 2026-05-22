import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'
import { triggerPostKycValidated } from '@/lib/workflow/auto-trigger'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { uid, statut } = body as { uid: string; statut: string }

  if (!uid || !statut) {
    return NextResponse.json({ error: 'uid et statut requis' }, { status: 400 })
  }
  if (!['valide', 'rejete'].includes(statut)) {
    return NextResponse.json({ error: 'statut invalide' }, { status: 400 })
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || !['admin', 'conseiller'].includes(profile.role ?? '')) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await admin
    .from('kyc')
    .update({ statut, updated_at: new Date().toISOString() })
    .eq('user_id', uid)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let pipeline: {
    ok: boolean
    actions_taken: string[]
    errors: string[]
    next_stage?: string
  } | null = null

  if (statut === 'valide') {
    try {
      const { data: clientAuth } = await admin.auth.admin.getUserById(uid)
      const clientEmail = clientAuth?.user?.email

      if (clientEmail) {
        const { data: dossier } = await admin
          .from('dossiers')
          .select('id')
          .eq('email_client', clientEmail)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (dossier?.id) {
          const hookResult = await triggerPostKycValidated({ dossierId: dossier.id })
          pipeline = {
            ok: hookResult.ok,
            actions_taken: hookResult.actions_taken,
            errors: hookResult.errors,
            next_stage: hookResult.next_stage,
          }
        }
      }
    } catch (err) {
      console.error('[admin.kyc.statut] pipeline trigger error', err)
    }
  }

  await admin.from('audit_logs').insert({
    user_id: user.id,
    action: statut === 'valide' ? 'kyc.validate' : 'kyc.reject',
    entity_type: 'kyc',
    entity_id: uid,
    metadata: {
      via: 'admin.kyc.statut',
      pipeline_actions: pipeline?.actions_taken ?? [],
      pipeline_errors: pipeline?.errors ?? [],
      pipeline_next_stage: pipeline?.next_stage ?? null,
    },
  })

  return NextResponse.json({ ok: true, statut, pipeline })
}
