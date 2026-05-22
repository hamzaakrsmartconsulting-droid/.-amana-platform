// app/api/dossiers/[id]/auto-bilan/route.ts
// Déclenché après V1 (KYC validé par Mohamed).
// Génère le bilan patrimonial (pré-rempli depuis KYC) et crée le gate V2
// en attente pour validation Mohamed.

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { generateBilanForDossierAdmin } from '@/lib/documents/generate-pdf'
import { sendEmail, emailValidationRequired, emailBilanPret } from '@/lib/email'

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

  // Charger les inputs pré-remplis depuis document_inputs (rempli par preFillBilanFromKyc)
  const { data: existingInputs } = await supabase
    .from('document_inputs')
    .select('inputs')
    .eq('dossier_id', dossierId)
    .eq('document_type', 'bilan')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const genResult = await generateBilanForDossierAdmin(
    dossier.conseiller_id,
    dossierId,
    existingInputs?.inputs ?? undefined,
  )

  if (!genResult.ok) {
    return NextResponse.json(
      { ok: false, error: `Génération bilan échouée : ${genResult.error}` },
      { status: 500 }
    )
  }

  // Créer ou mettre à jour le gate V2 en pending
  const now = new Date().toISOString()
  await supabase
    .from('validation_gates')
    .upsert(
      {
        dossier_id: dossierId,
        gate_type: 'profil_risque_validation',
        decision: 'pending',
        decided_at: null,
        comment: null,
        updated_at: now,
      },
      { onConflict: 'dossier_id,gate_type' }
    )

  // Notifier Mohamed
  const adminEmail = process.env.AMANA_ADMIN_EMAIL
  if (adminEmail) {
    const dossierNom = [dossier.prenom, dossier.nom].filter(Boolean).join(' ') || dossierId
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://amana-patrimoine.fr'
    void sendEmail({
      to: adminEmail,
      ...emailValidationRequired('V2 — Validation Profil Risque + Bilan patrimonial', dossierNom, `${baseUrl}/admin/validations`),
    }).catch(err => console.error('[auto-bilan] email admin error', err))
  }

  // Notifier le client que son bilan est disponible
  if (dossier.email_client) {
    void sendEmail({
      to: dossier.email_client,
      ...emailBilanPret(dossier.prenom ?? 'cher client'),
    }).catch(err => console.error('[auto-bilan] email client error', err))
  }

  await supabase.from('audit_logs').insert({
    user_id: dossier.conseiller_id,
    action: 'document.auto_bilan.generated',
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
    gate: 'profil_risque_validation',
  })
}
