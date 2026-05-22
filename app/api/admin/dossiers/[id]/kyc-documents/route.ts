// app/api/admin/dossiers/[id]/kyc-documents/route.ts
// Retourne les URLs signées (10 min) des 6 pièces justificatives KYC du client.
// Utilisé par /admin/validations lors de la révision V1 (kyc_validation).

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TTL = 600 // 10 minutes

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: dossierId } = await context.params

  // Auth — admin ou conseiller uniquement
  const sb = await createClient()
  const { data: { user }, error: authErr } = await sb.auth.getUser()
  if (authErr || !user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  const { data: profile } = await sb.from('profiles').select('role').eq('id', user.id).single()
  const role = profile?.role ?? 'client'
  if (role !== 'admin' && role !== 'conseiller') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const admin = svc()

  // 1. Récupérer l'email client du dossier
  const { data: dossier } = await admin
    .from('dossiers')
    .select('email_client')
    .eq('id', dossierId)
    .maybeSingle()

  if (!dossier?.email_client) {
    return NextResponse.json({ error: 'Email client introuvable', documents: [] }, { status: 200 })
  }

  // 2. Trouver le user_id via l'email (auth.admin)
  const { data: usersData } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const clientUser = usersData?.users?.find(u => u.email === dossier.email_client)

  if (!clientUser) {
    return NextResponse.json({ error: 'Compte client introuvable', documents: [] }, { status: 200 })
  }

  // 3. Récupérer le KYC via user_id
  const { data: kyc, error: kycErr } = await admin
    .from('kyc')
    .select(`
      id,
      doc_identite_url,
      doc_justif_url,
      doc_rib_url,
      doc_residence_fiscale_url,
      doc_avis_imposition_url,
      doc_origine_fonds_url
    `)
    .eq('user_id', clientUser.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (kycErr || !kyc) {
    return NextResponse.json({ error: 'KYC introuvable pour ce client', documents: [] }, { status: 200 })
  }

  // Générer les URLs signées pour chaque document présent
  const DOC_SLOTS = [
    { key: 'identite',          label: "Pièce d'identité",          path: kyc.doc_identite_url },
    { key: 'justificatif',      label: 'Justificatif de domicile',  path: kyc.doc_justif_url },
    { key: 'rib',               label: 'RIB',                       path: kyc.doc_rib_url },
    { key: 'residence_fiscale', label: 'Résidence fiscale',         path: kyc.doc_residence_fiscale_url },
    { key: 'avis_imposition',   label: "Avis d'imposition",         path: kyc.doc_avis_imposition_url },
    { key: 'origine_fonds',     label: 'Origine des fonds',         path: kyc.doc_origine_fonds_url },
  ] as const

  const documents = await Promise.all(
    DOC_SLOTS.map(async slot => {
      if (!slot.path) {
        return { key: slot.key, label: slot.label, url: null, present: false }
      }
      const { data, error } = await admin.storage
        .from('kyc-documents')
        .createSignedUrl(slot.path, TTL)
      return {
        key: slot.key,
        label: slot.label,
        url: error ? null : (data?.signedUrl ?? null),
        present: true,
      }
    })
  )

  // Audit log (non bloquant)
  try {
    await admin.from('audit_logs').insert({
      user_id: user.id,
      action: 'kyc.documents.admin_review',
      entity_type: 'dossier',
      entity_id: dossierId,
      metadata: {
        accessor_role: role,
        kyc_id: kyc.id,
        docs_present: documents.filter(d => d.present).map(d => d.key),
        context: 'admin_v1_validation',
        timestamp: new Date().toISOString(),
      },
    })
  } catch { /* non bloquant */ }

  return NextResponse.json({ kyc_id: kyc.id, documents })
}
