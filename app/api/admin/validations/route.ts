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

// Stages minimum requis pour qu'un verrou soit pertinent à afficher.
// Un verrou créé par erreur sur un dossier trop en amont ne sera pas affiché.
//
// IMPORTANT : pour les gates "contenu de document" (lm_send, ra_*, preco, etc.)
// on inclut TOUTES les étapes intermédiaires entre kyc_complet et actif
// (der_envoye, der_signe, lm_envoyee, lm_signee, bilan_genere). Sinon un
// document généré par auto-pack-sign (Mass) reste pending mais invisible
// dans /admin/validations parce que le pipeline est déjà passé en der_envoye.
const POST_KYC_STAGES = [
  'kyc_complet',
  'der_envoye',
  'der_signe',
  'lm_envoyee',
  'lm_signee',
  'bilan_genere',
  'souscription',
  'actif',
  'suivi',
  'bloque',
]

const GATE_MIN_STAGES: Record<string, string[]> = {
  kyc_validation:           ['nouveau', 'criblage', 'kyc_a_faire', 'kyc_invite', 'kyc_attente'],
  profil_risque_validation: [...POST_KYC_STAGES, 'archive'],
  lm_send:                  POST_KYC_STAGES,
  ra_recommandations:       POST_KYC_STAGES,
  ra_synthese:              POST_KYC_STAGES,
  ra_frais_exante:          POST_KYC_STAGES,
  ra_bulletin_send:         POST_KYC_STAGES,
  bilan_annuel_validation:  ['actif', 'suivi'],
  preco_validation:         POST_KYC_STAGES,
  zakat_validation:         ['actif', 'suivi'],
  succession_validation:    POST_KYC_STAGES,
}

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

  // Construire un index stage par dossier_id pour le filtre
  const stageByDossier: Record<string, string> = {}
  for (const d of dossierRows ?? []) {
    stageByDossier[d.id] = d.pipeline_stage ?? ''
  }

  // Filtrer les gates : ne garder que celles cohérentes avec le stage actuel du dossier
  const filteredGates = (allGateRows ?? []).filter(g => {
    const allowedStages = GATE_MIN_STAGES[g.gate_type]
    if (!allowedStages) return true // gate inconnue → toujours afficher
    const stage = stageByDossier[g.dossier_id] ?? ''
    return allowedStages.includes(stage)
  })

  const gates: Record<string, typeof filteredGates> = {}
  for (const g of filteredGates) {
    gates[g.dossier_id] = gates[g.dossier_id] ?? []
    gates[g.dossier_id].push(g)
  }

  // Ne retourner que les dossiers qui ont encore des gates après filtrage
  const dossierIdsWithGates = new Set(Object.keys(gates))
  const filteredDossiers = (dossierRows ?? []).filter(d => dossierIdsWithGates.has(d.id))

  return NextResponse.json({
    dossiers: filteredDossiers,
    gates,
  })
}
