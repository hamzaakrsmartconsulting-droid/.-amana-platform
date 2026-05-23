import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'
import { sendEmail, emailProjectSoumisAdmin } from '@/lib/email'
import { getClientAppBaseUrl } from '@/lib/app-url'

const TYPES_VALIDES = ['assurance_vie', 'scpi', 'cto', 'immobilier', 'pee', 'retraite', 'don']

export async function POST(request: NextRequest) {
  // ── Auth client ──────────────────────────────────────────────────────────────
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  // ── Body ─────────────────────────────────────────────────────────────────────
  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })

  const { product_id, montant, type } = body as {
    product_id: string
    montant:    number
    type:       string
  }

  if (!product_id || !montant || !type) {
    return NextResponse.json({ error: 'product_id, montant et type sont requis' }, { status: 400 })
  }
  if (!TYPES_VALIDES.includes(type)) {
    return NextResponse.json({ error: 'Type de projet invalide' }, { status: 400 })
  }
  if (!Number.isInteger(montant) || montant <= 0 || montant > 10_000_000) {
    return NextResponse.json({ error: 'Montant invalide' }, { status: 400 })
  }

  // ── Admin client (service role — bypasse RLS) ─────────────────────────────
  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Vérifier que le produit existe et est actif
  const { data: product } = await admin
    .from('products')
    .select('id, nom, ticket_min, actif')
    .eq('id', product_id)
    .single()

  if (!product || !product.actif) {
    return NextResponse.json({ error: 'Produit non disponible' }, { status: 404 })
  }
  if (product.ticket_min > 0 && montant < product.ticket_min) {
    return NextResponse.json({
      error: `Montant minimum requis : ${product.ticket_min.toLocaleString('fr-FR')} €`,
    }, { status: 400 })
  }

  // Vérifier KYC de l'utilisateur
  const { data: kyc } = await admin
    .from('kyc')
    .select('id, statut')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!kyc) {
    return NextResponse.json({ error: 'Dossier KYC requis avant toute souscription' }, { status: 403 })
  }
  if (!['soumis', 'valide'].includes(kyc.statut)) {
    return NextResponse.json({ error: 'KYC non soumis — veuillez compléter votre dossier' }, { status: 403 })
  }

  // Tenant AMANA
  const { data: tenant } = await admin
    .from('tenants')
    .select('id')
    .eq('slug', 'amana')
    .single()

  // Retrouver le dossier client parent (lien via email).
  // Permet d'attacher la souscription au dossier + d'identifier le conseiller
  // qui doit recevoir la notif et qui sera tracé dans le pipeline additionnel.
  let dossierId: string | null = null
  let conseillerId: string | null = null
  let clientPrenom = ''
  let clientNom = ''
  if (user.email) {
    const { data: dossier } = await admin
      .from('dossiers')
      .select('id, conseiller_id, prenom, nom')
      .ilike('email_client', user.email)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (dossier) {
      dossierId      = dossier.id
      conseillerId   = dossier.conseiller_id
      clientPrenom   = dossier.prenom ?? ''
      clientNom      = dossier.nom ?? ''
    }
  }

  const now = new Date().toISOString()

  // Créer le projet (pipeline additionnel : démarre en 'nouveau')
  const { data: projet, error: projErr } = await admin
    .from('projects')
    .insert({
      tenant_id:                 tenant?.id ?? null,
      user_id:                   user.id,
      kyc_id:                    kyc.id,
      conseiller_id:             conseillerId,
      dossier_id:                dossierId,
      type,
      montant,
      statut:                    'en_cours',
      pipeline_stage:            'nouveau',
      pipeline_stage_updated_at: now,
      metadata: {
        product_id,
        product_nom:  product.nom,
        source:       'souscription_client',
        submitted_at: now,
      },
      created_at: now,
      updated_at: now,
    })
    .select('id')
    .single()

  if (projErr) {
    console.error('[api/souscription]', projErr)
    return NextResponse.json({ error: projErr.message }, { status: 500 })
  }

  // Historique pipeline (entrée initiale dans le pipeline additionnel)
  try {
    await admin.from('project_stage_history').insert({
      project_id:      projet.id,
      conseiller_id:   conseillerId,
      from_stage:      null,
      to_stage:        'nouveau',
      triggered_by:    'souscription_client',
      trigger_context: { product_id, product_nom: product.nom, montant },
      notes:           'Souscription complémentaire soumise par le client',
    })
  } catch (e) {
    console.error('[api/souscription] project_stage_history insert error', e)
  }

  // Audit log (best-effort — on ignore l'erreur)
  try {
    await admin.from('audit_logs').insert({
      tenant_id:   tenant?.id ?? null,
      user_id:     user.id,
      action:      'souscription.submit',
      entity_type: 'project',
      entity_id:   projet.id,
      metadata: {
        product_id,
        product_nom: product.nom,
        montant,
        kyc_id:      kyc.id,
        dossier_id:  dossierId,
      },
      ip_address: request.headers.get('x-forwarded-for') ?? null,
    })
  } catch (_) {}

  // Notification admin/conseiller (best-effort — n'empêche pas la réponse)
  try {
    // Email du conseiller en charge du dossier (auth.users)
    let conseillerEmail: string | null = null
    if (conseillerId) {
      const { data: conseiller } = await admin.auth.admin.getUserById(conseillerId)
      conseillerEmail = conseiller?.user?.email ?? null
    }
    const fallbackAdmin = process.env.ADMIN_NOTIFICATION_EMAIL
    const targetEmail = conseillerEmail ?? fallbackAdmin

    if (targetEmail) {
      const clientFullName = `${clientPrenom} ${clientNom}`.trim() || (user.email ?? 'client')
      const { subject, html } = emailProjectSoumisAdmin(
        clientFullName,
        product.nom,
        montant,
        projet.id,
        `${getClientAppBaseUrl()}/admin/pipeline`,
      )
      await sendEmail({ to: targetEmail, subject, html })
    }
  } catch (e) {
    console.error('[api/souscription] notification admin échouée', e)
  }

  return NextResponse.json({ ok: true, projet_id: projet.id })
}
