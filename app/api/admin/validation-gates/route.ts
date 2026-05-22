// app/api/admin/validation-gates/route.ts
// Endpoint pour les verrous Mohamed (admin) — création / mise à jour de la décision
// Spec « Parcours Réglementaire AMANA » V2 (lm_send) et V3 (ra_bulletin_send)

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'
import { sendEmail, emailValidationRequired, emailKycRejete } from '@/lib/email'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const GATE_LABEL_FR: Record<string, string> = {
  kyc_validation:           'V1 — Validation KYC',
  profil_risque_validation: 'V2 — Validation Profil Risque + Bilan',
  lm_send:                  'V3 — Validation Lettre de Mission',
  ra_recommandations:       'V4 — Validation recommandations RA',
  ra_synthese:              'V5 — Validation synthèse RA',
  ra_frais_exante:          'V6 — Validation frais ex ante',
  ra_bulletin_send:         'V7 — Validation bulletins de souscription',
  bilan_annuel_validation:  'V8 — Validation bilan annuel (art. 25 MIF II)',
  preco_validation:         'Validation Préconisation',
  zakat_validation:         'Validation Zakat',
  succession_validation:    'Validation Succession',
}

const ALLOWED_GATES = [
  'kyc_validation',
  'profil_risque_validation',
  'lm_send',
  'ra_recommandations',
  'ra_synthese',
  'ra_frais_exante',
  'ra_bulletin_send',
  'bilan_annuel_validation',
  'preco_validation',
  'zakat_validation',
  'succession_validation',
] as const
const ALLOWED_DECISIONS = ['pending', 'approved', 'rejected'] as const

type GateType = (typeof ALLOWED_GATES)[number]
type Decision = (typeof ALLOWED_DECISIONS)[number]

async function getAdminUser() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll() {},
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'manager'].includes(profile.role)) return null
  return { userId: user.id, role: profile.role }
}

export async function GET(request: NextRequest) {
  const auth = await getAdminUser()
  if (!auth) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const url = new URL(request.url)
  const dossierId = url.searchParams.get('dossier_id')
  const gateType = url.searchParams.get('gate_type') as GateType | null

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  let query = admin
    .from('validation_gates')
    .select('*')
    .order('created_at', { ascending: false })

  if (dossierId) query = query.eq('dossier_id', dossierId)
  if (gateType && (ALLOWED_GATES as readonly string[]).includes(gateType)) {
    query = query.eq('gate_type', gateType)
  }

  const { data, error } = await query
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, gates: data ?? [] })
}

export async function POST(request: NextRequest) {
  const auth = await getAdminUser()
  if (!auth) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  let body: {
    dossier_id?: string
    gate_type?: string
    decision?: string
    comment?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON invalide' }, { status: 400 })
  }

  if (!body.dossier_id) {
    return NextResponse.json({ error: 'dossier_id manquant' }, { status: 400 })
  }
  if (!body.gate_type || !(ALLOWED_GATES as readonly string[]).includes(body.gate_type)) {
    return NextResponse.json(
      {
        error: `gate_type invalide. Valeurs autorisées : ${ALLOWED_GATES.join(', ')}.`,
      },
      { status: 400 },
    )
  }
  if (!body.decision || !(ALLOWED_DECISIONS as readonly string[]).includes(body.decision)) {
    return NextResponse.json(
      {
        error: `decision invalide. Valeurs autorisées : ${ALLOWED_DECISIONS.join(', ')}.`,
      },
      { status: 400 },
    )
  }

  const dossierId = body.dossier_id
  const gateType = body.gate_type as GateType
  const decision = body.decision as Decision

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: dossier } = await admin
    .from('dossiers')
    .select('id, prenom, nom')
    .eq('id', dossierId)
    .maybeSingle()
  if (!dossier) {
    return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 })
  }

  const now = new Date().toISOString()

  const { data: existing } = await admin
    .from('validation_gates')
    .select('id, decision')
    .eq('dossier_id', dossierId)
    .eq('gate_type', gateType)
    .in('decision', ['pending', 'approved'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  let gateRow
  if (existing) {
    const { data, error } = await admin
      .from('validation_gates')
      .update({
        decision,
        decided_by: auth.userId,
        decided_at: now,
        comment: body.comment ?? null,
        updated_at: now,
      })
      .eq('id', existing.id)
      .select('*')
      .single()
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    gateRow = data
  } else {
    const { data, error } = await admin
      .from('validation_gates')
      .insert({
        dossier_id: dossierId,
        gate_type: gateType,
        decision,
        decided_by: auth.userId,
        decided_at: now,
        comment: body.comment ?? null,
      })
      .select('*')
      .single()
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    gateRow = data
  }

  await admin.from('audit_logs').insert({
    user_id: auth.userId,
    action: `validation_gate.${decision}`,
    entity_type: 'validation_gate',
    entity_id: gateRow.id,
    metadata: {
      dossier_id: dossierId,
      gate_type: gateType,
      comment: body.comment ?? null,
    },
    ip_address:
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      null,
    user_agent: request.headers.get('user-agent') ?? null,
  })

  // Notifier Mohamed par email quand un nouveau gate est créé en attente
  if (decision === 'pending') {
    const adminEmail = process.env.AMANA_ADMIN_EMAIL
    if (adminEmail) {
      const dossierNom = [dossier.prenom, dossier.nom].filter(Boolean).join(' ') || dossierId
      const gateName = GATE_LABEL_FR[gateType] ?? gateType
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://amana-patrimoine.fr'
      const url = `${baseUrl}/admin/validations`
      void sendEmail({ to: adminEmail, ...emailValidationRequired(gateName, dossierNom, url) })
        .catch(err => console.error('[validation-gates] email notification error', err))
    }
  }

  // V1 rejeté → notifier le client que son KYC nécessite des compléments
  if (gateType === 'kyc_validation' && decision === 'rejected') {
    const { data: dossFull } = await admin
      .from('dossiers')
      .select('email_client, prenom')
      .eq('id', dossierId)
      .maybeSingle()
    if (dossFull?.email_client) {
      void sendEmail({
        to: dossFull.email_client,
        ...emailKycRejete(dossFull.prenom ?? 'cher client'),
      }).catch(err => console.error('[validation-gates] emailKycRejete error', err))
    }
  }

  return NextResponse.json({ ok: true, gate: gateRow })
}
