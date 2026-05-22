// app/api/dossiers/[id]/route.ts
// Sprint Agents IA v7 · 29 avril 2026
// GET    : détail d'un dossier + facts associés (pour back-office /admin/dossiers/[id])
// DELETE : suppression RGPD cascadée (dossier + facts via FK ON DELETE CASCADE)
//          + audit log de l'action

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getDossier, archiveDossier } from '@/lib/dossiers/dossier-service'
import { listClientFacts } from '@/lib/agents/client-memory'

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
    .single()

  return { authorized: true, userId: user.id, role: profile?.role ?? 'client' }
}

// =====================================================================
// GET /api/dossiers/[id] — détail + facts
// =====================================================================
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const auth = await checkAuth()
  if (!auth.authorized || !auth.userId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const dossier = await getDossier(id)
  if (!dossier) {
    return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 })
  }

  // Autorisation : owner du dossier OU admin
  const isOwner = dossier.conseiller_id === auth.userId
  const isAdmin = auth.role === 'admin'
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const facts = await listClientFacts(auth.userId, id)

  return NextResponse.json({ dossier, facts })
}

// =====================================================================
// DELETE /api/dossiers/[id] — suppression RGPD cascadée
// =====================================================================
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const auth = await checkAuth()
  if (!auth.authorized || !auth.userId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const dossier = await getDossier(id)
  if (!dossier) {
    return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 })
  }

  // Autorisation : owner du dossier OU admin
  const isOwner = dossier.conseiller_id === auth.userId
  const isAdmin = auth.role === 'admin'
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  // Confirmation forte requise dans le body
  let confirmation: string | null = null
  try {
    const body = (await request.json()) as { confirmation?: string }
    confirmation = body.confirmation ?? null
  } catch {
    // body vide → on attend la confirmation explicite
  }

  if (confirmation !== 'SUPPRIMER') {
    return NextResponse.json(
      {
        error: 'Confirmation requise',
        message:
          'Pour confirmer la suppression définitive, envoie {"confirmation": "SUPPRIMER"} dans le body.',
      },
      { status: 400 }
    )
  }

  // Capture des infos pour audit log AVANT suppression
  const factsCount = (await listClientFacts(auth.userId, id)).length
  const dossierSnapshot = {
    id: dossier.id,
    nom: dossier.nom,
    prenom: dossier.prenom,
    email_client: dossier.email_client,
    statut: dossier.statut,
    facts_count: factsCount,
    created_at: dossier.created_at,
  }

  // Suppression : DELETE FROM dossiers cascade automatiquement sur client_facts (FK ON DELETE CASCADE)
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

  const { error: delErr } = await supabase
    .from('dossiers')
    .delete()
    .eq('id', id)

  if (delErr) {
    console.error('[dossier.delete] erreur', delErr)
    return NextResponse.json(
      { error: `Échec suppression : ${delErr.message}` },
      { status: 500 }
    )
  }

  // Audit log
  const { error: auditErr } = await supabase.from('audit_logs').insert({
    user_id: auth.userId,
    action: 'dossier.delete',
    entity_type: 'dossier',
    entity_id: id,
    metadata: {
      deleted_dossier: dossierSnapshot,
      reason: 'rgpd_request',
      timestamp: new Date().toISOString(),
    },
    ip_address:
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      null,
    user_agent: request.headers.get('user-agent') ?? null,
  })

  if (auditErr) {
    console.error('[dossier.delete] audit log failed', auditErr)
  }

  return NextResponse.json({
    ok: true,
    deleted_dossier_id: id,
    facts_deleted_count: factsCount,
  })
}
