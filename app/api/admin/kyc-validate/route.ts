// app/api/admin/kyc-validate/route.ts
// V1 — Validation KYC par Mohamed.
// Déclenche la transition dossier kyc_attente → kyc_complet.
// Appelé automatiquement par /admin/validations après approbation du gate kyc_validation.

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'
import { triggerPostKycValidated, preFillBilanFromKyc } from '@/lib/workflow/auto-trigger'
import { setGatePendingAfterDocumentGeneration } from '@/lib/workflow/validation-gates'
import { generateLcbftForDossier, generatePpeAnnexeForDossier, generateKycFicheForDossier } from '@/lib/documents/generate-pdf'
import { sendEmail, emailKycValide, emailKycValideEtPackPretASigner } from '@/lib/email'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function getAdminUser() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {},
      },
    },
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'manager'].includes(profile.role)) return null
  return { userId: user.id, role: profile.role }
}

export async function POST(request: NextRequest) {
  const auth = await getAdminUser()
  if (!auth) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  let body: { dossier_id?: string } = {}
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Body JSON invalide' }, { status: 400 })
  }
  if (!body.dossier_id) {
    return NextResponse.json({ error: 'dossier_id manquant' }, { status: 400 })
  }

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )

  // Vérifier que le dossier est bien en kyc_attente
  const { data: dossier } = await admin
    .from('dossiers')
    .select('id, pipeline_stage, conseiller_id, prenom, nom, email_client, offre_amana_cible')
    .eq('id', body.dossier_id)
    .maybeSingle()

  if (!dossier) {
    return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 })
  }

  if (dossier.pipeline_stage !== 'kyc_attente') {
    return NextResponse.json(
      { error: `Le dossier est en stage "${dossier.pipeline_stage}", pas "kyc_attente"` },
      { status: 400 },
    )
  }

  // Déclencher la transition kyc_complet via auto-trigger
  const result = await triggerPostKycValidated({
    dossierId: body.dossier_id,
    autoSendDerForMass: true,
  })

  // V2 — gate bilan / profil risque dès KYC validé (visible dans Validations avant génération PDF)
  void setGatePendingAfterDocumentGeneration(body.dossier_id, 'profil_risque_validation').catch(
    err => console.error('[kyc-validate] gate profil_risque_validation', err),
  )

  // Spec étape 3→4 : pré-remplir le formulaire Bilan patrimonial avec les données KYC
  void preFillBilanFromKyc(body.dossier_id)
    .catch(err => console.error('[kyc-validate] preFillBilanFromKyc error', err))

  // Notifier le client :
  // - Offre Mass avec signing_url → 1 email combiné "KYC validé + pack à signer"
  // - Autres offres ou pas de signing_url → email KYC validé standard
  if (dossier.email_client) {
    const signingUrl = result.signing_url
    if (dossier.offre_amana_cible === 'mass' && signingUrl) {
      void sendEmail({
        to: dossier.email_client,
        ...emailKycValideEtPackPretASigner(dossier.prenom ?? 'cher client', signingUrl),
      }).catch(err => console.error('[kyc-validate] email combiné KYC+pack', err))
    } else {
      void sendEmail({
        to: dossier.email_client,
        ...emailKycValide(dossier.prenom ?? 'cher client'),
      }).catch(err => console.error('[kyc-validate] email client KYC validé', err))
    }
  }

  // Spec étape 3 — générer la Fiche KYC complétée (PDF AMANA officiel)
  void generateKycFicheForDossier(body.dossier_id, dossier.conseiller_id ?? auth.userId)
    .catch(err => console.error('[kyc-validate] erreur génération Fiche KYC', err))

  // Générer automatiquement la fiche LCB-FT en background
  void generateLcbftForDossier(body.dossier_id, dossier.conseiller_id ?? auth.userId)
    .catch(err => console.error('[kyc-validate] erreur génération LCB-FT', err))

  // Si PPE : générer aussi l'Annexe PPE
  const { data: kycRow } = await admin
    .from('kyc')
    .select('ppe, ppe_entourage')
    .eq('dossier_id', body.dossier_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (kycRow?.ppe || kycRow?.ppe_entourage) {
    void generatePpeAnnexeForDossier(body.dossier_id, dossier.conseiller_id ?? auth.userId)
      .catch(err => console.error('[kyc-validate] erreur génération Annexe PPE', err))
  }

  // Audit log
  await admin.from('audit_logs').insert({
    user_id: auth.userId,
    action: 'kyc.validated_by_admin',
    entity_type: 'dossier',
    entity_id: body.dossier_id,
    metadata: {
      previous_stage: 'kyc_attente',
      new_stage: result.next_stage ?? 'kyc_complet',
      validated_by: auth.userId,
      actions_taken: result.actions_taken,
      errors: result.errors,
    },
    ip_address: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
    user_agent: request.headers.get('user-agent') ?? null,
  })

  return NextResponse.json({
    ok: result.ok,
    next_stage: result.next_stage,
    actions_taken: result.actions_taken,
    errors: result.errors,
  })
}
