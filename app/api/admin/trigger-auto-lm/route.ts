// app/api/admin/trigger-auto-lm/route.ts
// Route proxy sécurisée pour que l'UI admin puisse déclencher auto-lm
// sans exposer le secret interne côté client.

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Réservé aux admins' }, { status: 403 })
  }

  const { dossier_id } = await request.json().catch(() => ({}))
  if (!dossier_id) return NextResponse.json({ error: 'dossier_id requis' }, { status: 400 })

  const base = process.env.AMANA_BASE_URL ?? 'http://localhost:3000'
  const secret = process.env.AMANA_INTERNAL_SECRET
  if (!secret) return NextResponse.json({ error: 'Secret interne manquant' }, { status: 500 })

  const res = await fetch(`${base}/api/dossiers/${dossier_id}/auto-lm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-AMANA-Internal-Secret': secret },
    body: JSON.stringify({}),
  })
  const data = await res.json().catch(() => ({}))
  return NextResponse.json(data, { status: res.status })
}
