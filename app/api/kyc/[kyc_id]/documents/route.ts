// app/api/kyc/[kyc_id]/documents/route.ts — v2 sécurisé
// Sprint Agents IA v7 · 29 avril 2026
//
// Évolutions vs v1 :
//   F8 — Admin a accès aux documents (en plus du conseiller)
//   F9 — Récupération des 4 documents (identité, justif, RIB, résidence fiscale)
//   F10 — Audit log de chaque consultation (action='kyc.documents.access')

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SIGNED_URL_TTL_SECONDS = 600 // 10 minutes — assez pour consultation, pas trop long

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ kyc_id: string }> }
) {
  const { kyc_id } = await params
  const supabase = await createClient()

  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  // Récupérer le rôle du user
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  const role = (profile?.role ?? 'client') as 'admin' | 'conseiller' | 'client'

  // Récupérer le KYC + tous les paths de documents
  const { data: kyc, error: kycErr } = await supabase
    .from('kyc')
    .select('user_id, doc_identite_url, doc_justif_url, doc_rib_url, doc_residence_fiscale_url')
    .eq('id', kyc_id)
    .single()

  if (kycErr || !kyc) {
    return NextResponse.json({ error: 'KYC introuvable' }, { status: 404 })
  }

  // F8 : autorisation = admin OR conseiller OR propriétaire du KYC
  const isOwner = kyc.user_id === user.id
  const isAdmin = role === 'admin'
  const isConseiller = role === 'conseiller'

  if (!isOwner && !isAdmin && !isConseiller) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  // F9 : récupération des 4 documents (urls signées)
  const docKeys = [
    { key: 'identite',           path: kyc.doc_identite_url           },
    { key: 'justificatif',       path: kyc.doc_justif_url             },
    { key: 'rib',                path: kyc.doc_rib_url                },
    { key: 'residence_fiscale',  path: kyc.doc_residence_fiscale_url  },
  ] as const

  const urls: Record<string, string | null> = {
    identite: null,
    justificatif: null,
    rib: null,
    residence_fiscale: null,
  }

  for (const { key, path } of docKeys) {
    if (path) {
      const { data, error } = await supabase.storage
        .from('kyc-documents')
        .createSignedUrl(path, SIGNED_URL_TTL_SECONDS)
      if (!error) {
        urls[key] = data?.signedUrl ?? null
      } else {
        console.error(`[kyc.documents] signedUrl error for ${key}`, error)
      }
    }
  }

  // F10 : audit log de la consultation
  // Sauf si c'est le propriétaire qui consulte ses propres docs (pas critique pour LCB-FT)
  // → on log uniquement pour les accès tiers (admin, conseiller)
  if (!isOwner) {
    const { error: auditErr } = await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'kyc.documents.access',
      entity_type: 'kyc',
      entity_id: kyc_id,
      metadata: {
        accessor_role: role,
        client_user_id: kyc.user_id,
        documents_returned: Object.entries(urls)
          .filter(([, v]) => v !== null)
          .map(([k]) => k),
        timestamp: new Date().toISOString(),
      },
      ip_address:
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
        request.headers.get('x-real-ip') ??
        null,
      user_agent: request.headers.get('user-agent') ?? null,
    })
    if (auditErr) {
      console.error('[kyc.documents] audit log failed', auditErr)
    }
  }

  return NextResponse.json(urls)
}
