// app/api/conversations/[id]/route.ts
// Sprint Agents IA v8 · 29 avril 2026
// DELETE : archive la conversation (soft delete)
// GET    : retourne les messages de la conversation

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import {
  getConversation,
  listMessages,
  archiveConversation,
} from '@/lib/conversations/conversation-service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function checkAuth(): Promise<{ authorized: boolean; userId?: string; role?: string }> {
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
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  return { authorized: true, userId: user.id, role: profile?.role ?? 'client' }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const auth = await checkAuth()
  if (!auth.authorized || !auth.userId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const conversation = await getConversation(id)
  if (!conversation) {
    return NextResponse.json({ error: 'Conversation introuvable' }, { status: 404 })
  }

  // Autorisation : owner ou admin
  if (conversation.conseiller_id !== auth.userId && auth.role !== 'admin') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const messages = await listMessages(id)
  return NextResponse.json({ conversation, messages })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const auth = await checkAuth()
  if (!auth.authorized || !auth.userId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const conversation = await getConversation(id)
  if (!conversation) {
    return NextResponse.json({ error: 'Conversation introuvable' }, { status: 404 })
  }

  if (conversation.conseiller_id !== auth.userId && auth.role !== 'admin') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const result = await archiveConversation(id)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
