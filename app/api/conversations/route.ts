// app/api/conversations/route.ts
// Sprint Agents IA v8 · 29 avril 2026
// GET  : liste des conversations du conseiller (filtrable par dossier_id + agent_name)
// POST : crée une nouvelle conversation

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import {
  listConversations,
  createConversation,
} from '@/lib/conversations/conversation-service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function checkAuth(): Promise<{ authorized: boolean; userId?: string }> {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {},
      },
    }
  )
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return { authorized: false }
  return { authorized: true, userId: user.id }
}

export async function GET(request: NextRequest) {
  const auth = await checkAuth()
  if (!auth.authorized || !auth.userId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const url = new URL(request.url)
  const dossierIdParam = url.searchParams.get('dossier_id')
  const agentName = url.searchParams.get('agent_name') ?? undefined

  // dossier_id : 'sandbox' ou 'null' → null, sinon UUID
  let dossierId: string | null | undefined = undefined
  if (dossierIdParam !== null) {
    if (dossierIdParam === 'sandbox' || dossierIdParam === 'null' || dossierIdParam === '') {
      dossierId = null
    } else {
      dossierId = dossierIdParam
    }
  }

  const conversations = await listConversations({
    conseillerId: auth.userId,
    dossierId,
    agentName,
  })

  return NextResponse.json({ conversations })
}

export async function POST(request: NextRequest) {
  const auth = await checkAuth()
  if (!auth.authorized || !auth.userId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  let body: { dossier_id?: string | null; agent_name?: string; title?: string }
  try {
    body = (await request.json()) as { dossier_id?: string | null; agent_name?: string; title?: string }
  } catch {
    return NextResponse.json({ error: 'Body JSON invalide' }, { status: 400 })
  }

  if (!body.agent_name) {
    return NextResponse.json({ error: 'agent_name est requis' }, { status: 400 })
  }

  const result = await createConversation({
    conseillerId: auth.userId,
    dossierId: body.dossier_id ?? null,
    agentName: body.agent_name,
    title: body.title,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json({ conversation: result.conversation }, { status: 201 })
}
