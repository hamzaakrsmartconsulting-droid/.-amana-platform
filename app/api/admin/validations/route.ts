// GET /api/admin/validations — liste des verrous pending (+ sync gates depuis documents générés)

import { NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { ensureGatesForGeneratedDocuments } from '@/lib/workflow/validation-gates'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const GATE_TYPES = [
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

function svc() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Service role manquant')
  return createServiceClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

async function requireAdmin() {
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
  if (profile?.role !== 'admin' && profile?.role !== 'manager') return null
  return user
}

export async function GET() {
  const user = await requireAdmin()
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    await ensureGatesForGeneratedDocuments()
  } catch (err) {
    console.error('[admin/validations] ensure gates', err)
  }

  const admin = svc()
  const { data: allGateRows, error: gErr } = await admin
    .from('validation_gates')
    .select('id, dossier_id, gate_type, decision, decided_at, comment')
    .in('gate_type', [...GATE_TYPES])
    .eq('decision', 'pending')
    .order('created_at', { ascending: false })

  if (gErr) {
    return NextResponse.json({ error: gErr.message }, { status: 500 })
  }

  const pendingDossierIds = [...new Set((allGateRows ?? []).map(g => g.dossier_id))]
  if (pendingDossierIds.length === 0) {
    return NextResponse.json({ dossiers: [], gates: {} })
  }

  const { data: dossierRows, error: dErr } = await admin
    .from('dossiers')
    .select('id, prenom, nom, email_client, pipeline_stage, pipeline_stage_updated_at, created_at')
    .in('id', pendingDossierIds)
    .order('pipeline_stage_updated_at', { ascending: false })

  if (dErr) {
    return NextResponse.json({ error: dErr.message }, { status: 500 })
  }

  const gates: Record<string, typeof allGateRows> = {}
  for (const g of allGateRows ?? []) {
    gates[g.dossier_id] = gates[g.dossier_id] ?? []
    gates[g.dossier_id].push(g)
  }

  return NextResponse.json({
    dossiers: dossierRows ?? [],
    gates,
  })
}
