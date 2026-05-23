// app/api/dossiers/route.ts
// Sprint Agents IA v6 · 29 avril 2026
// CRUD dossiers : GET (liste) et POST (création)

import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import {
  createDossier,
  listDossiers,
  type CreateDossierInput,
} from '@/lib/dossiers/dossier-service'
import {
  ensureClientDossiersForConseiller,
  resolveAssistantConseillerId,
} from '@/lib/dossiers/assistant-scope'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function checkAuth(): Promise<{
  authorized: boolean
  userId?: string
  role?: string
}> {
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
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  return {
    authorized: true,
    userId: user.id,
    role: profile?.role ?? 'client',
  }
}

export async function GET() {
  const auth = await checkAuth()
  if (!auth.authorized || !auth.userId) {
    return new Response(JSON.stringify({ error: 'Auth required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const conseillerId = resolveAssistantConseillerId(auth.userId, auth.role ?? 'client')
  if (!conseillerId) {
    return new Response(JSON.stringify({ dossiers: [], synced: { created: 0 } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const synced = await ensureClientDossiersForConseiller(conseillerId)
  const dossiers = await listDossiers(conseillerId, { includeArchived: false })

  return new Response(
    JSON.stringify({
      dossiers,
      synced,
      suggest_activate_dossier_id:
        synced.created > 0 && synced.dossierIds[0] ? synced.dossierIds[0] : null,
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    },
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

  let body: CreateDossierInput
  try {
    body = (await request.json()) as CreateDossierInput
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const conseillerId = resolveAssistantConseillerId(auth.userId, auth.role ?? 'client')
  if (!conseillerId) {
    return new Response(JSON.stringify({ error: 'Assistant réservé aux admins et conseillers' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const result = await createDossier(conseillerId, body)
  if (!result.ok) {
    return new Response(JSON.stringify({ error: result.error }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  return new Response(JSON.stringify({ dossier: result.dossier }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  })
}
