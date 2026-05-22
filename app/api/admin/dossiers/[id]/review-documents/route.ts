// GET /api/admin/dossiers/[id]/review-documents
// PDFs du dossier (+ dossiers même email) avec URL signée Storage
// pour le panneau « Réviser » de /admin/validations.

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BUCKET = 'amana-documents'
const SIGNED_TTL = 60 * 60 // 1 heure

async function getAdminOrManager() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } },
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  if (!profile || !['admin', 'manager'].includes(profile.role ?? '')) return null
  return { userId: user.id }
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await getAdminOrManager()
  if (!auth) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { id: dossierId } = await context.params
  if (!dossierId) {
    return NextResponse.json({ error: 'dossier_id manquant' }, { status: 400 })
  }

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )

  // Récupérer le dossier pour avoir l'email client
  const { data: root, error: dErr } = await svc
    .from('dossiers')
    .select('id, email_client')
    .eq('id', dossierId)
    .maybeSingle()

  if (dErr || !root) {
    return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 })
  }

  // Agréger les dossiers frères (même email_client = même client)
  const email = root.email_client?.trim()
  let dossierIds = [dossierId]
  if (email) {
    const { data: siblings } = await svc
      .from('dossiers')
      .select('id')
      .eq('email_client', email)
    dossierIds = [...new Set((siblings ?? []).map(r => r.id))]
  }

  // Charger les documents de tous ces dossiers
  const { data: rows, error: docErr } = await svc
    .from('documents')
    .select('id, type, filename, storage_path, status, created_at, dossier_id')
    .in('dossier_id', dossierIds)
    .order('created_at', { ascending: false })
    .limit(40)

  if (docErr) {
    return NextResponse.json({ error: docErr.message }, { status: 500 })
  }

  // Générer une signed URL par document (service role bypass RLS storage)
  const documents: {
    id: string
    type: string
    filename: string | null
    created_at: string
    url: string | null
    dossier_id: string | null
  }[] = []

  for (const row of rows ?? []) {
    const storagePath = row.storage_path as string
    let signedUrl: string | null = null
    try {
      const { data: signed } = await svc.storage
        .from(BUCKET)
        .createSignedUrl(storagePath, SIGNED_TTL)
      signedUrl = signed?.signedUrl ?? null
    } catch {
      // Non bloquant : document sans URL = bouton désactivé
    }

    documents.push({
      id: row.id,
      type: row.type,
      filename: row.filename,
      created_at: row.created_at,
      url: signedUrl,
      dossier_id: row.dossier_id ?? null,
    })
  }

  return NextResponse.json({ ok: true, dossier_ids: dossierIds, documents })
}
