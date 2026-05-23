// app/api/profile/submit/route.ts
// Soumission finale du profil pour validation admin.
// Fait exactement ce que /kyc handleSubmit faisait :
// 1. kyc.statut = 'soumis'
// 2. dossier.pipeline_stage = 'kyc_attente'
// 3. validation_gates: kyc_validation pending
// 4. Email de notification au conseiller/admin

import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { sendEmail, emailKycSoumisAdmin } from '@/lib/email'
import { getClientAppBaseUrl } from '@/lib/app-url'
import { transitionDossierStageService } from '@/lib/workflow/workflow-service'
import type { PipelineStage } from '@/lib/workflow/pipeline-stages'

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
      const currentStage = (existingDossier.pipeline_stage ?? 'nouveau') as PipelineStage

      // Toujours mettre à jour nom/prénom + statut côté CRM
      await admin.from('dossiers').update({
        nom:       kyc.nom   ?? undefined,
        prenom:    kyc.prenom ?? undefined,
        statut:    'actif',
        updated_at: new Date().toISOString(),
      }).eq('id', existingDossier.id)

      // Transition du pipeline : seulement si encore en amont du KYC.
      // Cas normal post-funnel : currentStage === 'criblage' → kyc_attente.
      // Edge case : currentStage === 'nouveau' → on passe d'abord par criblage.
      // Si déjà kyc_attente ou plus avancé, on ne touche pas au stage.
      if (currentStage === 'nouveau') {
        await transitionDossierStageService({
          dossierId: existingDossier.id,
          toStage: 'criblage',
          triggeredBy: 'funnel_onboarding',
          notes: 'Pré-criblage déclenché par soumission KYC client (rattrapage)',
        })
      }

      if (currentStage === 'nouveau' || currentStage === 'criblage') {
        const tr = await transitionDossierStageService({
          dossierId: existingDossier.id,
          toStage: 'kyc_attente',
          triggeredBy: 'manual',
          triggerContext: { source: 'profile_submit', kyc_id: kyc.id },
          notes: 'KYC soumis par le client — en attente de validation conseiller',
        })
        if (!tr.ok) {
          console.error('[profile/submit] transition criblage→kyc_attente échouée :', tr.error)
        }
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

  // 6. Notifier le conseiller/admin par email
  if (dossierId) {
    try {
      // Récupérer le conseiller du dossier
      const { data: dossier } = await admin
        .from('dossiers')
        .select('conseiller_id, prenom, nom')
        .eq('id', dossierId)
        .maybeSingle()

      if (dossier?.conseiller_id) {
        const { data: conseillerAuth } = await admin.auth.admin.getUserById(dossier.conseiller_id)
        const conseillerEmail = conseillerAuth?.user?.email

        if (conseillerEmail) {
          const clientNom = [kyc.prenom, kyc.nom].filter(Boolean).join(' ') || emailClient || 'Client'
          const adminUrl = `${getClientAppBaseUrl()}/admin/validations`
          await sendEmail({
            to: conseillerEmail,
            ...emailKycSoumisAdmin(clientNom, dossierId, adminUrl),
          }).catch(err => console.error('[profile/submit] email notif conseiller', err))
        }
      }
    } catch (err) {
      console.error('[profile/submit] notification conseiller error', err)
    }
  }

  return NextResponse.json({ ok: true, dossier_id: dossierId })
}
