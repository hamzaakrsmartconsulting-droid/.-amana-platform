// app/api/dossiers/[id]/auto-profil/route.ts
// Déclenché après V1 (KYC validé par Mohamed), en parallèle avec auto-bilan.
// Génère le Profil de Risque Investisseur automatiquement à partir du scoring KYC.

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { generateProfilRisqueForDossier } from '@/lib/documents/generate-pdf'
import { sendEmail, emailProfilRisquePret } from '@/lib/email'

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

  const secret = request.headers.get('x-amana-internal-secret')
  const expected = process.env.AMANA_INTERNAL_SECRET
  if (!expected || secret !== expected) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
  }

  const supabase = svc()

  const { data: dossier } = await supabase
    .from('dossiers')
    .select('id, conseiller_id, prenom, nom, email_client, pipeline_stage')
    .eq('id', dossierId)
    .maybeSingle()

  if (!dossier) {
    return NextResponse.json({ ok: false, error: 'Dossier introuvable' }, { status: 404 })
  }

  const genResult = await generateProfilRisqueForDossier(dossierId, dossier.conseiller_id)

  if (!genResult.ok) {
    return NextResponse.json(
      { ok: false, error: `Génération profil risque échouée : ${genResult.error}` },
      { status: 500 }
    )
  }

  // Notifier le client que son profil de risque est disponible
  if (dossier.email_client) {
    void sendEmail({
      to: dossier.email_client,
      ...emailProfilRisquePret(dossier.prenom ?? 'cher client'),
    }).catch(err => console.error('[auto-profil] email client error', err))
  }

  const now = new Date().toISOString()
  await supabase.from('audit_logs').insert({
    user_id: dossier.conseiller_id,
    action: 'document.auto_profil.generated',
    entity_type: 'document',
    entity_id: genResult.doc.id,
    metadata: {
      dossier_id: dossierId,
      timestamp: now,
    },
  })

  return NextResponse.json({
    ok: true,
    document_id: genResult.doc.id,
  })
}
