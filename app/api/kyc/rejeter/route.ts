import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmail, emailKycRejete } from '@/lib/email'

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

  const { data: kyc } = await supabase
    .from('kyc').select('user_id, prenom').eq('id', kyc_id).single()

  // Rejeter le dossier
  const { error } = await supabase
    .from('kyc')
    .update({ statut: 'rejete', updated_at: new Date().toISOString() })
    .eq('id', kyc_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Audit log DORA
  const { data: tenant } = await supabase
    .from('tenants').select('id').eq('slug', 'amana').single()

  await supabase.from('audit_logs').insert({
    tenant_id: tenant?.id ?? null,
    user_id: user.id,
    action: 'kyc.reject',
    entity_type: 'kyc',
    entity_id: kyc_id,
    metadata: {
      conseiller_id: user.id,
      client_user_id: kyc?.user_id,
      timestamp: new Date().toISOString(),
    },
    ip_address: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? null,
  })

  // Email au client
  if (kyc?.user_id) {
    const { data: clientAuth } = await supabase.auth.admin.getUserById(kyc.user_id)
    const email = clientAuth?.user?.email
    if (email) {
      const tpl = emailKycRejete(kyc.prenom ?? 'cher client')
      await sendEmail({ to: email, ...tpl }).catch(e => console.error('[Email KYC rejeté]', e))
    }
  }

  return NextResponse.redirect(new URL('/conseiller', request.url))
}
