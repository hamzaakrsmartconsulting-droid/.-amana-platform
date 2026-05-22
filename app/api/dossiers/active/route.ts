// app/api/dossiers/active/route.ts
// Sprint Agents IA v6 · 29 avril 2026
// GET : retourne le dossier actif (lu dans le cookie)
// POST : définit le dossier actif (set le cookie). Body : { dossier_id: string | null }

import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import {
  getActiveDossierIdFromCookie,
  getDossier,
  buildActiveDossierCookie,
} from '@/lib/dossiers/dossier-service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function checkAuth(): Promise<{ authorized: boolean; userId?: string }> {
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
    }
  )
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return { authorized: false }
  return { authorized: true, userId: user.id }
}

export async function GET() {
  const auth = await checkAuth()
  if (!auth.authorized || !auth.userId) {
    return new Response(JSON.stringify({ error: 'Auth required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const activeId = await getActiveDossierIdFromCookie()
  if (!activeId) {
    return new Response(
      JSON.stringify({ active: null, mode: 'sandbox' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const dossier = await getDossier(activeId)
  if (!dossier || dossier.conseiller_id !== auth.userId) {
    // Le cookie pointe vers un dossier qui n'existe plus ou n'appartient pas au user
    // → on retourne 'sandbox' (le client devrait clear le cookie via POST {dossier_id: null})
    return new Response(
      JSON.stringify({ active: null, mode: 'sandbox', stale_cookie: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  }

  return new Response(
    JSON.stringify({ active: dossier, mode: 'dossier' }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  )
}

export async function POST(request: NextRequest) {
  const auth = await checkAuth()
  if (!auth.authorized || !auth.userId) {
    return new Response(JSON.stringify({ error: 'Auth required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let body: { dossier_id?: string | null }
  try {
    body = (await request.json()) as { dossier_id?: string | null }
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const dossierId = body.dossier_id ?? null

  // Si on essaie d'activer un dossier précis, vérifier qu'il appartient au user
  if (dossierId !== null) {
    const dossier = await getDossier(dossierId)
    if (!dossier || dossier.conseiller_id !== auth.userId) {
      return new Response(
        JSON.stringify({ error: 'Dossier introuvable ou accès refusé' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }
  }

  const cookieConfig = buildActiveDossierCookie(dossierId)
  const response = NextResponse.json({
    active_dossier_id: dossierId,
    mode: dossierId === null ? 'sandbox' : 'dossier',
  })
  response.cookies.set(cookieConfig.name, cookieConfig.value, cookieConfig.options)
  return response
}
