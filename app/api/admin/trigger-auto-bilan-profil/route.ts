// app/api/admin/trigger-auto-bilan-profil/route.ts
// Route proxy sécurisée : l'UI admin déclenche auto-bilan + auto-profil
// après approbation V2 sans exposer X-AMANA-Internal-Secret côté client.

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
  if (!profile || !['admin', 'manager'].includes(profile.role)) {
    return NextResponse.json({ error: 'Réservé aux admins' }, { status: 403 })
  }

  const { dossier_id } = await request.json().catch(() => ({}))
  if (!dossier_id) return NextResponse.json({ error: 'dossier_id requis' }, { status: 400 })

  const base = process.env.AMANA_BASE_URL ?? 'http://localhost:3000'
  const secret = process.env.AMANA_INTERNAL_SECRET
  if (!secret) return NextResponse.json({ error: 'Secret interne manquant' }, { status: 500 })

  const headers = { 'Content-Type': 'application/json', 'X-AMANA-Internal-Secret': secret }

  const [bilanRes, profilRes] = await Promise.allSettled([
    fetch(`${base}/api/dossiers/${dossier_id}/auto-bilan`, {
      method: 'POST', headers, body: JSON.stringify({}),
    }),
    fetch(`${base}/api/dossiers/${dossier_id}/auto-profil`, {
      method: 'POST', headers, body: JSON.stringify({}),
    }),
  ])

  const bilanData = bilanRes.status === 'fulfilled'
    ? await bilanRes.value.json().catch(() => ({}))
    : { ok: false, error: String((bilanRes as PromiseRejectedResult).reason) }

  const profilData = profilRes.status === 'fulfilled'
    ? await profilRes.value.json().catch(() => ({}))
    : { ok: false, error: String((profilRes as PromiseRejectedResult).reason) }

  return NextResponse.json({
    ok: (bilanData.ok || profilData.ok),
    bilan: bilanData,
    profil: profilData,
  })
}
