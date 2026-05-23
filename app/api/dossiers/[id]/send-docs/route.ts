// app/api/dossiers/[id]/send-docs/route.ts
// Envoie une sélection de documents via Yousign (1 procédure, 1 email au client).
// Appelé depuis le back-office admin après sélection manuelle des docs.

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { normalizePhoneForYousign, YOUSIGN_PHONE_HINT } from '@/lib/yousign/phone'
import { sendRegulatoryPackForSignature } from '@/lib/yousign/yousign-service'
import {
  GATE_BY_DOCUMENT_TYPE,
  GATE_LABEL_FR,
  requireApprovedGate,
} from '@/lib/workflow/validation-gates'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function svc() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Service role manquant')
  return createServiceClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: dossierId } = await context.params

  // Auth admin
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Réservé aux admins' }, { status: 403 })

  // Lire les doc IDs sélectionnés
  const body = await request.json().catch(() => ({})) as { doc_ids?: string[] }
  const docIds: string[] = body.doc_ids ?? []
  if (docIds.length === 0) return NextResponse.json({ error: 'Aucun document sélectionné' }, { status: 400 })

  const admin = svc()

  // Récupérer le dossier
  const { data: dossier } = await admin
    .from('dossiers')
    .select('id, prenom, nom, email_client, telephone')
    .eq('id', dossierId)
    .maybeSingle()

  if (!dossier) return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 })
  if (!dossier.email_client) return NextResponse.json({ error: 'Email client manquant sur le dossier' }, { status: 400 })

  // Récupérer les documents sélectionnés
  const { data: docs, error: docsErr } = await admin
    .from('documents')
    .select('id, type, filename, storage_path')
    .in('id', docIds)
    .eq('dossier_id', dossierId)

  if (docsErr || !docs?.length) {
    return NextResponse.json({ error: 'Documents introuvables' }, { status: 404 })
  }

  // Verrou validation admin (LM / RA / Bilan) avant Yousign
  for (const doc of docs) {
    const docType = doc.type as string
    const gateType =
      docType === 'lm' || docType === 'ra' || docType === 'bilan'
        ? GATE_BY_DOCUMENT_TYPE[docType as 'lm' | 'ra' | 'bilan']
        : undefined
    if (!gateType) continue

    const gateCheck = await requireApprovedGate(dossierId, gateType)
    if (!gateCheck.ok) {
      const label = GATE_LABEL_FR[gateType] ?? gateType
      return NextResponse.json(
        {
          error: `${label} : validation admin requise avant envoi Yousign. Approuvez dans Validations.`,
          gate_type: gateType,
          gate_status: gateCheck.status,
          document_type: doc.type,
        },
        { status: 423 },
      )
    }
  }

  // Télécharger chaque PDF depuis Storage
  const yousignDocs: Array<{ pdfBuffer: Buffer; filename: string; type: string; dbId: string }> = []
  const errors: string[] = []

  for (const doc of docs) {
    const { data: fileBlob, error: dlErr } = await admin.storage
      .from('amana-documents')
      .download(doc.storage_path)

    if (dlErr || !fileBlob) {
      errors.push(`${doc.filename} : téléchargement échoué`)
      continue
    }
    yousignDocs.push({
      pdfBuffer: Buffer.from(await fileBlob.arrayBuffer()),
      filename: doc.filename,
      type: doc.type,
      dbId: doc.id,
    })
  }

  if (yousignDocs.length === 0) {
    return NextResponse.json({ error: 'Aucun PDF téléchargeable', details: errors }, { status: 500 })
  }

  const sanitizeSignerName = (s: string) =>
    s.replace(/[^a-zA-ZÀ-ÿ\s\-']/g, '').trim().replace(/\s+/g, ' ') || 'Client'

  const yousignPhone = normalizePhoneForYousign(dossier.telephone)
  if (dossier.telephone?.trim() && !yousignPhone) {
    console.warn(
      `[send-docs] téléphone dossier ignoré pour Yousign: "${dossier.telephone}"`,
    )
  }

  const packName = `AMANA – ${dossier.prenom} ${dossier.nom} – ${yousignDocs.map(d => d.type.toUpperCase()).join(' + ')}`

  let yousignResult
  try {
    yousignResult = await sendRegulatoryPackForSignature({
      documents: yousignDocs.map(d => ({
        pdfBuffer: d.pdfBuffer,
        filename: d.filename,
        type: d.type as 'der' | 'lm' | 'ra',
      })),
      signer: {
        email: dossier.email_client,
        first_name: sanitizeSignerName(dossier.prenom),
        last_name: sanitizeSignerName(dossier.nom),
        phone_number: yousignPhone,
      },
      packName,
      expiration_days: 30,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur Yousign inconnue'
    console.error('[send-docs] yousign error', err)
    const isPhone = msg.includes('phone_number')
    return NextResponse.json(
      {
        error: isPhone
          ? `Envoi Yousign impossible : ${YOUSIGN_PHONE_HINT}`
          : `Envoi Yousign impossible : ${msg}`,
        telephone_dossier: dossier.telephone,
      },
      { status: 502 },
    )
  }

  // Mettre à jour chaque document dans la DB avec le yousign_signature_request_id
  for (const doc of yousignDocs) {
    await admin
      .from('documents')
      .update({
        yousign_signature_request_id: yousignResult.signature_request_id,
        yousign_status: 'pending',
        updated_at: new Date().toISOString(),
      })
      .eq('id', doc.dbId)
  }

  // Audit log
  await admin.from('audit_logs').insert({
    user_id: user.id,
    action: 'documents.sent_yousign',
    entity_type: 'dossier',
    entity_id: dossierId,
    metadata: {
      doc_ids: docIds,
      doc_count: yousignDocs.length,
      client_email: dossier.email_client,
      signature_request_id: yousignResult.signature_request_id,
      signing_url: yousignResult.signing_url,
    },
  })

  return NextResponse.json({
    ok: true,
    sent: yousignDocs.length,
    skipped: errors.length,
    errors,
    signature_request_id: yousignResult.signature_request_id,
    signing_url: yousignResult.signing_url,
  })
}
