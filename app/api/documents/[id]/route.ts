// app/api/documents/[id]/route.ts
// GET    : retourne une signed URL pour télécharger le document
// DELETE : supprime le document (admin uniquement — suppression réelle DB + Storage)

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { getDocument, getSignedUrl } from '@/lib/documents/document-service'

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

  const doc = await getDocument(id)
  if (!doc) {
    return NextResponse.json({ error: 'Document introuvable' }, { status: 404 })
  }

  // Autorisation : owner OU admin
  if (doc.conseiller_id !== auth.userId && auth.role !== 'admin') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const signedUrl = await getSignedUrl(doc.storage_path, 600)
  if (!signedUrl) {
    return NextResponse.json({ error: 'Échec génération URL signée' }, { status: 500 })
  }

  // Audit log de la consultation
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
  await supabase.from('audit_logs').insert({
    user_id: auth.userId,
    action: 'document.access',
    entity_type: 'document',
    entity_id: id,
    metadata: {
      type: doc.type,
      filename: doc.filename,
      timestamp: new Date().toISOString(),
    },
    ip_address:
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      null,
    user_agent: request.headers.get('user-agent') ?? null,
  })

  return NextResponse.json({
    document: doc,
    signed_url: signedUrl,
    expires_in_seconds: 600,
  })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const auth = await checkAuth()
  if (!auth.authorized) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (auth.role !== 'admin') return NextResponse.json({ error: 'Réservé aux admins' }, { status: 403 })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return NextResponse.json({ error: 'Config manquante' }, { status: 500 })
  const admin = createServiceClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

  // Récupérer le storage_path avant suppression
  const { data: doc } = await admin.from('documents').select('storage_path, filename').eq('id', id).maybeSingle()
  if (!doc) return NextResponse.json({ error: 'Document introuvable' }, { status: 404 })

  // Supprimer de Storage
  await admin.storage.from('amana-documents').remove([doc.storage_path])

  // Supprimer de la DB
  const { error: delErr } = await admin.from('documents').delete().eq('id', id)
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 })

  return NextResponse.json({ ok: true, deleted: doc.filename })
}
