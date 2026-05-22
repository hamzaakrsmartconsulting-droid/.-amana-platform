// app/api/dossiers/[id]/kyc-edit/route.ts
// PATCH — Surcharge manuelle d'un champ KYC par Mohamed (admin)
// Déclenché depuis le review panel /admin/validations
// Champs autorisés : risque_lcbft (surcharge LCB-FT)

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

const ALLOWED_FIELDS = ['risque_lcbft'] as const
type AllowedField = (typeof ALLOWED_FIELDS)[number]

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id: dossierId } = await context.params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Accès refusé — réservé admin' }, { status: 403 })
  }

  let body: Record<string, unknown>
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'JSON invalide' }, { status: 400 }) }

  // Filtrer les champs autorisés
  const updates: Record<string, unknown> = {}
  for (const field of ALLOWED_FIELDS) {
    if (field in body && body[field] !== undefined) {
      updates[field as AllowedField] = body[field]
    }
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Aucun champ modifiable fourni' }, { status: 400 })
  }

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )

  // Trouver la ligne KYC la plus récente pour ce dossier
  const { data: kycRow } = await svc
    .from('kyc')
    .select('id')
    .eq('dossier_id', dossierId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!kycRow) return NextResponse.json({ error: 'KYC introuvable pour ce dossier' }, { status: 404 })

  const { error: updateErr } = await svc
    .from('kyc')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', kycRow.id)

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  // Audit log
  await svc.from('audit_logs').insert({
    user_id:     user.id,
    action:      'kyc.admin_override',
    entity_type: 'dossier',
    entity_id:   dossierId,
    metadata:    { fields: updates, source: 'review_panel' },
  })

  return NextResponse.json({ ok: true, updated: updates })
}
