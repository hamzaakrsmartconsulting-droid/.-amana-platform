import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { sendEmail, emailKycValide } from '@/lib/email'
import { triggerPostKycValidated } from '@/lib/workflow/auto-trigger'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorise' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'conseiller') {
    return NextResponse.json({ error: 'Acces refuse' }, { status: 403 })
  }

  const formData = await request.formData()
  const kyc_id = formData.get('kyc_id') as string
  if (!kyc_id) return NextResponse.json({ error: 'kyc_id manquant' }, { status: 400 })

  // Récupérer le KYC + prénom client
  const { data: kyc } = await supabase
    .from('kyc').select('user_id, prenom').eq('id', kyc_id).single()

  // Valider le dossier
  const { error } = await supabase
    .from('kyc')
    .update({ statut: 'valide', updated_at: new Date().toISOString() })
    .eq('id', kyc_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Audit log DORA
  const { data: tenant } = await supabase
    .from('tenants').select('id').eq('slug', 'amana').single()

  await supabase.from('audit_logs').insert({
    tenant_id: tenant?.id ?? null,
    user_id: user.id,
    action: 'kyc.validate',
    entity_type: 'kyc',
    entity_id: kyc_id,
    metadata: {
      conseiller_id: user.id,
      client_user_id: kyc?.user_id,
      timestamp: new Date().toISOString(),
    },
    ip_address: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? null,
  })

  // Service role pour lookup user/dossier (auth.admin requiert service role)
  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  let clientEmail: string | undefined
  if (kyc?.user_id) {
    try {
      const { data: clientAuth } = await admin.auth.admin.getUserById(kyc.user_id)
      clientEmail = clientAuth?.user?.email
    } catch (err) {
      console.error('[kyc.valider] lookup user error', err)
    }
  }

  // Email au client
  if (clientEmail) {
    const tpl = emailKycValide(kyc?.prenom ?? 'cher client')
    await sendEmail({ to: clientEmail, ...tpl }).catch(e => console.error('[Email KYC validé]', e))
  }

  // Pipeline: kyc_attente → kyc_complet (+ auto-DER pour Mass)
  if (clientEmail) {
    try {
      const { data: dossier } = await admin
        .from('dossiers')
        .select('id')
        .eq('email_client', clientEmail)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (dossier?.id) {
        const hookResult = await triggerPostKycValidated({ dossierId: dossier.id })
        await admin.from('audit_logs').insert({
          user_id: user.id,
          action: 'kyc.pipeline_trigger',
          entity_type: 'dossier',
          entity_id: dossier.id,
          metadata: {
            kyc_id,
            actions_taken: hookResult.actions_taken,
            errors: hookResult.errors,
            next_stage: hookResult.next_stage,
          },
        })
      }
    } catch (err) {
      console.error('[kyc.valider] pipeline trigger error', err)
    }
  }

  return NextResponse.redirect(new URL('/conseiller', request.url))
}
