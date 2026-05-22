// app/api/profile/submit/route.ts
// Soumission finale du profil pour validation admin.
// Fait exactement ce que /kyc handleSubmit faisait :
// 1. kyc.statut = 'soumis'
// 2. dossier.pipeline_stage = 'kyc_attente'
// 3. validation_gates: kyc_validation pending

import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non connecté' }, { status: 401 })

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )

  // 1. Vérifier qu'un KYC existe pour cet user
  const { data: kyc } = await admin
    .from('kyc')
    .select('id, prenom, nom, statut')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!kyc) {
    return NextResponse.json({ error: 'Aucun profil trouvé. Veuillez renseigner au moins une section.' }, { status: 400 })
  }

  // 2. Marquer le KYC comme soumis
  const { error: kycErr } = await admin
    .from('kyc')
    .update({ statut: 'soumis', updated_at: new Date().toISOString() })
    .eq('user_id', user.id)

  if (kycErr) return NextResponse.json({ error: kycErr.message }, { status: 500 })

  // 3. Trouver le dossier du client (par email)
  const emailClient = user.email ?? null
  let dossierId: string | null = null

  if (emailClient) {
    const { data: existingDossier } = await admin
      .from('dossiers')
      .select('id, pipeline_stage')
      .eq('email_client', emailClient)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existingDossier) {
      dossierId = existingDossier.id
      // Passer en kyc_attente uniquement si le dossier n'est pas déjà plus avancé
      const stagesBefore = [
        'lead', 'contact_pris', 'kyc_invite', 'kyc_a_faire', 'nouveau',
        'criblage', 'actif', 'onboarding_complet',
      ]
      if (stagesBefore.includes(existingDossier.pipeline_stage ?? '')) {
        await admin.from('dossiers').update({
          nom:       kyc.nom   ?? undefined,
          prenom:    kyc.prenom ?? undefined,
          statut:    'actif',
          pipeline_stage: 'kyc_attente',
          pipeline_stage_updated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq('id', existingDossier.id)
      } else if (existingDossier.pipeline_stage !== 'kyc_attente') {
        // Déjà plus avancé — on met quand même à jour nom/prénom
        await admin.from('dossiers').update({
          nom:    kyc.nom    ?? undefined,
          prenom: kyc.prenom ?? undefined,
          updated_at: new Date().toISOString(),
        }).eq('id', existingDossier.id)
      }
    }
  }

  // 4. Créer le gate kyc_validation si pas déjà présent
  if (dossierId) {
    const { data: existingGate } = await admin
      .from('validation_gates')
      .select('id')
      .eq('dossier_id', dossierId)
      .eq('gate_type', 'kyc_validation')
      .in('decision', ['pending', 'approved'])
      .maybeSingle()

    if (!existingGate) {
      await admin.from('validation_gates').insert({
        dossier_id: dossierId,
        gate_type:  'kyc_validation',
        decision:   'pending',
      })
    }
  }

  // 5. Audit log
  await admin.from('audit_logs').insert({
    user_id:     user.id,
    action:      'kyc.submitted_by_client',
    entity_type: 'kyc',
    entity_id:   kyc.id,
    metadata: {
      dossier_id:   dossierId,
      email_client: emailClient,
    },
  })

  return NextResponse.json({ ok: true, dossier_id: dossierId })
}
