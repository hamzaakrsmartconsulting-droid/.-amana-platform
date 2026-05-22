import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { sendEmail, emailSignatureConfirmation, emailProjetActif } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()
    const { event_name, data } = payload

    // Vérifier que c'est un événement de signature complétée
    if (event_name !== 'signer.done' && event_name !== 'signature_request.done') {
      return NextResponse.json({ received: true })
    }

    const supabase = await createClient()

    const yousignRequestId = data?.signature_request?.id ?? data?.id
    if (!yousignRequestId) return NextResponse.json({ received: true })

    // Trouver la demande de signature correspondante
    const { data: sigReq } = await supabase
      .from('signature_requests')
      .select('*')
      .eq('provider_id', yousignRequestId)
      .single()

    if (!sigReq) return NextResponse.json({ received: true })

    if (event_name === 'signature_request.done') {
      // Tous les signataires ont signé
      await supabase.from('signature_requests')
        .update({
          statut: 'signe',
          signed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', sigReq.id)

      // Passer le projet en 'signe'
      await supabase.from('projects')
        .update({ statut: 'signe', updated_at: new Date().toISOString() })
        .eq('id', sigReq.project_id)

      // Audit log
      const { data: tenant } = await supabase
        .from('tenants').select('id').eq('slug', 'amana').single()

      await supabase.from('audit_logs').insert({
        tenant_id: tenant?.id,
        user_id: sigReq.user_id,
        action: 'signature.completed',
        entity_type: 'signature_request',
        entity_id: sigReq.id,
        metadata: {
          yousign_id: yousignRequestId,
          project_id: sigReq.project_id,
          signed_at: new Date().toISOString(),
        },
      })

      // Notifier le client par email
      try {
        const admin = createServiceClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          { auth: { persistSession: false, autoRefreshToken: false } },
        )
        const { data: clientAuth } = await admin.auth.admin.getUserById(sigReq.user_id)
        const clientEmail = clientAuth?.user?.email
        if (clientEmail) {
          const { data: project } = await admin
            .from('projects')
            .select('type, montant, kyc:kyc_id(prenom, nom)')
            .eq('id', sigReq.project_id)
            .maybeSingle()
          const prenom = (project?.kyc as { prenom?: string } | null)?.prenom ?? 'cher client'
          const nomDoc = sigReq.document_nom ?? 'Bulletin de souscription'
          const nomProduit = sigReq.metadata?.produit ?? nomDoc

          // Email confirmation signature
          void sendEmail({
            to: clientEmail,
            ...emailSignatureConfirmation(prenom, nomDoc),
          }).catch(e => console.error('[webhook] emailSignatureConfirmation', e))

          // Email projet actif si montant connu
          if (project?.montant) {
            void sendEmail({
              to: clientEmail,
              ...emailProjetActif(prenom, nomProduit, project.montant),
            }).catch(e => console.error('[webhook] emailProjetActif', e))
          }
        }
      } catch (emailErr) {
        console.error('[webhook] notification client erreur', emailErr)
      }
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('[Webhook Yousign]', err)
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 })
  }
}
