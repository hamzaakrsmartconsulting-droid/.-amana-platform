// app/api/dossiers/[id]/document-inputs/route.ts
// Sprint Agents IA v10c · 30 avril 2026
//
// Endpoint :
//   GET  /api/dossiers/:id/document-inputs?type=der|lm|ra|...
//        → lit les inputs saisis pour ce dossier × type
//   POST /api/dossiers/:id/document-inputs
//        body: { document_type, inputs, status? }
//        → upsert (crée ou met à jour) les inputs avant génération

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import {
  getDocumentInputs,
  upsertDocumentInputs,
  type DocumentType,
  type DocumentInputsRow,
} from '@/lib/documents/document-inputs-service'

const VALID_TYPES: DocumentType[] = [
  'der',
  'lm',
  'ra',
  'bilan',
  'preco',
  'succession',
  'zakat',
  'bulletin',
]

// =====================================================================
// GET
// =====================================================================
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: dossierId } = await context.params
  const url = new URL(request.url)
  const type = url.searchParams.get('type')

  if (!type || !VALID_TYPES.includes(type as DocumentType)) {
    return NextResponse.json(
      { ok: false, error: 'Paramètre `type` invalide' },
      { status: 400 }
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Non authentifié' }, { status: 401 })
  }

  const row = await getDocumentInputs(dossierId, type as DocumentType)
  return NextResponse.json({ ok: true, row })
}

// =====================================================================
// POST (upsert)
// =====================================================================
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: dossierId } = await context.params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Non authentifié' }, { status: 401 })
  }

  // Récupérer le rôle pour autoriser les admins
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  const isAdmin = profile?.role === 'admin'

  let body: {
    document_type?: string
    inputs?: Record<string, unknown>
    status?: 'draft' | 'ready'
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'JSON invalide' }, { status: 400 })
  }

  const docType = body.document_type
  if (!docType || !VALID_TYPES.includes(docType as DocumentType)) {
    return NextResponse.json(
      { ok: false, error: '`document_type` invalide' },
      { status: 400 }
    )
  }

  // Vérifier que le dossier appartient bien au conseiller (ou que l'appelant est admin).
  const { data: dossier, error: dossierErr } = await supabase
    .from('dossiers')
    .select('id, conseiller_id')
    .eq('id', dossierId)
    .maybeSingle()

  if (dossierErr) {
    console.error('[document-inputs route] dossier fetch error', dossierErr)
    return NextResponse.json(
      { ok: false, error: 'Erreur lecture dossier' },
      { status: 500 }
    )
  }
  if (!dossier) {
    return NextResponse.json({ ok: false, error: 'Dossier introuvable' }, { status: 404 })
  }
  if (!isAdmin && dossier.conseiller_id !== user.id) {
    return NextResponse.json(
      { ok: false, error: 'Accès refusé : ce dossier ne vous appartient pas' },
      { status: 403 }
    )
  }

  // L'admin saisit au nom du conseiller propriétaire du dossier.
  const effectiveConseillerId = isAdmin ? dossier.conseiller_id : user.id

  let result: { ok: true; row: DocumentInputsRow } | { ok: false; error: string }

  if (isAdmin) {
    // Service role pour bypasser le RLS INSERT/UPDATE (auth.uid() = admin, pas le conseiller).
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) {
      return NextResponse.json({ ok: false, error: 'Variables service role manquantes' }, { status: 500 })
    }
    const svc = createServiceClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data, error: upsertErr } = await svc
      .from('document_inputs')
      .upsert(
        {
          conseiller_id: effectiveConseillerId,
          dossier_id: dossierId,
          document_type: docType,
          inputs: (body.inputs ?? {}) as Record<string, unknown>,
          status: body.status ?? 'draft',
        },
        { onConflict: 'dossier_id,document_type' }
      )
      .select('*')
      .single()
    if (upsertErr) {
      console.error('[document-inputs route] admin upsert error', upsertErr)
      result = { ok: false, error: upsertErr.message }
    } else {
      result = { ok: true, row: data as DocumentInputsRow }
    }
  } else {
    result = await upsertDocumentInputs({
      conseillerId: effectiveConseillerId,
      dossierId,
      documentType: docType as DocumentType,
      inputs: (body.inputs ?? {}) as never,
      status: body.status ?? 'draft',
    })
  }

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 })
  }
  return NextResponse.json({ ok: true, row: result.row })
}
