import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { genererBulletinSouscription } from '@/lib/pdf'
import { requireApprovedGateSameClientEmail } from '@/lib/workflow/validation-gates'
import { sendEmail, emailSignatureInvitation } from '@/lib/email'
import { normalizePhoneForYousign } from '@/lib/yousign/phone'

const RAW_YOUSIGN_BASE = process.env.YOUSIGN_BASE_URL ?? 'https://api-sandbox.yousign.app'
const YOUSIGN_BASE = RAW_YOUSIGN_BASE.replace(/\/+$/, '').endsWith('/v3')
  ? RAW_YOUSIGN_BASE.replace(/\/+$/, '')
  : `${RAW_YOUSIGN_BASE.replace(/\/+$/, '')}/v3`
const YOUSIGN_KEY  = process.env.YOUSIGN_API_KEY ?? ''
const DEV_MOCK_YOUSIGN = process.env.DEV_MOCK_YOUSIGN === '1'

const TYPE_LABEL: Record<string, string> = {
  assurance_vie: 'Assurance-vie Halal',
  scpi:          'SCPI Halal',
  cto:           'Portefeuille Actions Halal',
  immobilier:    'Investissement Immobilier',
  pee:           'Plan Épargne Entreprise',
  retraite:      'PER Individuel Halal',
  don:           'Don / Waqf Amana',
}

async function yousign(method: string, path: string, body?: unknown, isFormData = false) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${YOUSIGN_KEY}`,
  }
  if (!isFormData) headers['Content-Type'] = 'application/json'

  const res = await fetch(`${YOUSIGN_BASE}${path}`, {
    method,
    headers,
    body: isFormData
      ? (body as FormData)
      : body ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Yousign ${method} ${path} → ${res.status}: ${err}`)
  }
  return res.json()
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role, full_name').eq('id', user.id).single()
  if (profile?.role !== 'conseiller') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const { projet_id } = await request.json()
  if (!projet_id) return NextResponse.json({ error: 'projet_id manquant' }, { status: 400 })

  // Service role pour admin operations
  const admin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Récupérer projet + KYC
  const { data: projet } = await supabase
    .from('projects').select('*, kyc:kyc_id(*)').eq('id', projet_id).single()
  if (!projet) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 })

  const kyc = projet.kyc as Record<string, string | number | boolean> | null
  const nomClient = (kyc
    ? `${kyc.prenom ?? ''} ${kyc.nom ?? ''}`.trim()
    : '').replace(/\s+/g, ' ') || 'Client'
  const nomProduit = (TYPE_LABEL[projet.type] ?? projet.type).trim()

  // Email client via service role
  let emailClient = 'client@amana-patrimoine.fr'
  try {
    const { data: clientAuth } = await admin.auth.admin.getUserById(projet.user_id)
    emailClient = clientAuth?.user?.email ?? emailClient
  } catch { /* fallback */ }

  // Verrou « Mohamde » V3 : avant tout envoi de bulletin de souscription en
  // signature, l'administrateur doit avoir validé le RA + bulletins.
  // On retrouve le dossier via l'email client.
  const { data: dossierForGate } = await admin
    .from('dossiers')
    .select('id')
    .eq('email_client', emailClient)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!dossierForGate?.id) {
    return NextResponse.json(
      {
        error:
          'Impossible de retrouver le dossier client pour vérifier le verrou de validation administrateur.',
      },
      { status: 409 }
    )
  }

  // V7 — gate final obligatoire. Les gates V4/V5/V6 sont vérifiés en amont
  // (cascade : V4→V5→V6→V7 lors des approbations dans /admin/validations).
  const raGates = [
    'ra_recommandations',
    'ra_synthese',
    'ra_frais_exante',
    'ra_bulletin_send',
  ] as const
  for (const gateType of raGates) {
    const check = await requireApprovedGateSameClientEmail(dossierForGate.id, gateType)
    if (!check.ok) {
      return NextResponse.json(
        {
          error: check.reason,
          gate_type: gateType,
          gate_status: check.status,
          message: `Le verrou ${gateType} n'est pas encore approuvé. Les 4 verrous RA (V4-V7) sont requis avant signature.`,
        },
        { status: 423 },
      )
    }
  }

  if (DEV_MOCK_YOUSIGN) {
    const mockId = `mock_${crypto.randomUUID()}`
    const mockUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/conseiller/projets?mock_sign=1&projet_id=${projet_id}`
    const { data: tenant } = await admin.from('tenants').select('id').eq('slug', 'amana').single()

    await admin.from('signature_requests').insert({
      tenant_id: tenant?.id ?? null,
      project_id: projet_id,
      user_id: projet.user_id,
      conseiller_id: user.id,
      provider: 'yousign',
      provider_id: mockId,
      provider_url: mockUrl,
      statut: 'envoye',
      document_nom: `Bulletin souscription ${nomProduit} (mock)`,
      metadata: {
        mock: true,
        nom_client: nomClient,
        produit: nomProduit,
      },
      expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    })

    await admin.from('projects')
      .update({ statut: 'soumis', updated_at: new Date().toISOString() })
      .eq('id', projet_id)

    // Envoyer l'invitation de signature au client (mock — Yousign ne le fait pas en mode DEV)
    const prenomClient = kyc?.prenom ? String(kyc.prenom) : 'cher client'
    const nomDoc = `Bulletin de souscription — ${nomProduit}`
    void sendEmail({
      to: emailClient,
      ...emailSignatureInvitation(prenomClient, nomDoc, mockUrl),
    }).catch(err => console.error('[signature/initier mock] email invitation', err))

    return NextResponse.json({
      success: true,
      signature_request_id: mockId,
      signing_url: mockUrl,
      mock: true,
    })
  }

  if (!YOUSIGN_KEY) {
    return NextResponse.json({ error: 'Clé Yousign non configurée (YOUSIGN_API_KEY)' }, { status: 503 })
  }

  try {
    // 1. Créer la signature request
    const sigRequest = await yousign('POST', '/signature_requests', {
      name: `Souscription ${nomProduit} - ${nomClient}`.trim().replace(/\s+/g, ' '),
      delivery_mode: 'email',
      ordered_signers: false,
      // Yousign n'accepte que [1, 2, 7, 14]
      reminder_settings: { interval_in_days: 2, max_occurrences: 2 },
      expiration_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    })

    // 2. Générer le PDF bulletin
    const pdfBytes = await genererBulletinSouscription({
      nomClient,
      prenom:       String(kyc?.prenom ?? ''),
      nom:          String(kyc?.nom ?? ''),
      email:        emailClient,
      ville:        kyc?.ville ? String(kyc.ville) : undefined,
      produit:      nomProduit,
      type:         TYPE_LABEL[projet.type] ?? projet.type,
      montant:      projet.montant ?? 0,
      date:         new Date().toLocaleDateString('fr-FR'),
      conseillerNom: profile?.full_name ?? 'Conseiller AMANA',
    })

    const formData = new FormData()
    const pdfBlob = new Blob([Buffer.from(pdfBytes)], { type: 'application/pdf' })
    formData.append('file', pdfBlob, `bulletin_${projet_id}.pdf`)
    formData.append('nature', 'signable_document')

    const document = await yousign('POST', `/signature_requests/${sigRequest.id}/documents`, formData, true)

    // 3. Ajouter le signataire (client)
    // Yousign : uniquement lettres, espaces, tirets autorisés dans first_name/last_name
    const sanitizeName = (s: string) =>
      s.replace(/[^a-zA-ZÀ-ÿ\s\-']/g, '').trim().replace(/\s+/g, ' ') || 'Client'

    const signerFirstName = sanitizeName(String(kyc?.prenom ?? 'Client'))
    const signerLastName  = sanitizeName(String(kyc?.nom ?? 'AMANA'))

    const signer = await yousign('POST', `/signature_requests/${sigRequest.id}/signers`, {
      info: {
        first_name: signerFirstName,
        last_name:  signerLastName,
        email:      emailClient,
        locale: 'fr',
      },
      signature_level: 'electronic_signature',
      signature_authentication_mode: 'no_otp',
      fields: [{
        document_id: document.id,
        type: 'signature',
        page: 1,
        x: 400,
        y: 100,
        width: 150,
        height: 50,
      }],
    })

    // 4. Activer
    await yousign('POST', `/signature_requests/${sigRequest.id}/activate`, {})

    // 5. Stocker en base
    const { data: tenant } = await admin.from('tenants').select('id').eq('slug', 'amana').single()

    await admin.from('signature_requests').insert({
      tenant_id:    tenant?.id ?? null,
      project_id:   projet_id,
      user_id:      projet.user_id,
      conseiller_id: user.id,
      provider:     'yousign',
      provider_id:  sigRequest.id,
      provider_url: signer.signature_link ?? null,
      statut:       'envoye',
      document_nom: `Bulletin souscription ${nomProduit}`,
      metadata: {
        signer_id:  signer.id,
        document_id: document.id,
        nom_client: nomClient,
        produit:    nomProduit,
      },
      expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    })

    // 6. Passer le projet en 'soumis'
    await admin.from('projects')
      .update({ statut: 'soumis', updated_at: new Date().toISOString() })
      .eq('id', projet_id)

    // 7. Audit log
    try {
      await admin.from('audit_logs').insert({
        tenant_id:   tenant?.id ?? null,
        user_id:     user.id,
        action:      'signature.initiate',
        entity_type: 'signature_request',
        entity_id:   projet_id,
        metadata: { yousign_id: sigRequest.id, produit: nomProduit, nom_client: nomClient },
        ip_address:  request.headers.get('x-forwarded-for') ?? null,
      })
    } catch { /* audit non bloquant */ }

    return NextResponse.json({
      success:              true,
      signature_request_id: sigRequest.id,
      signing_url:          signer.signature_link ?? null,
    })

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erreur Yousign'
    console.error('[Yousign initier]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
