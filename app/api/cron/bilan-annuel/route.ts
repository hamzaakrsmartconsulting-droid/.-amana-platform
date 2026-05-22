// app/api/cron/bilan-annuel/route.ts
// Cron annuel : génère un bilan patrimonial de révision + crée un gate V8 pour Mohamed.
// Déclenché par Vercel Cron le 1er janvier à 9h.
// Peut aussi être déclenché manuellement par Mohamed via POST.

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { sendEmail, emailValidationRequired } from '@/lib/email'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://amana-patrimoine.fr'

function verifyAuth(request: NextRequest): boolean {
  const auth = request.headers.get('authorization')
  if (auth === `Bearer ${process.env.CRON_SECRET}`) return true
  if (process.env.NODE_ENV === 'development') return true
  return false
}

export async function GET(request: NextRequest) {
  return handleCron(request)
}

export async function POST(request: NextRequest) {
  return handleCron(request)
}

async function handleCron(request: NextRequest) {
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )

  // Lister les dossiers avec suivi annuel (toutes offres confondues)
  const { data: dossiers, error } = await svc
    .from('dossiers')
    .select('id, prenom, nom, email_client, conseiller_id, offre_amana_cible, pipeline_stage')
    .in('pipeline_stage', ['lm_signee', 'bilan_genere', 'ra_signe', 'suivi_actif'])

  if (error) {
    console.error('[cron/bilan-annuel] erreur lecture dossiers', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const annee = new Date().getFullYear()
  const results: Array<{ dossierId: string; status: string; gateId?: string; error?: string }> = []
  const adminEmail = process.env.AMANA_ADMIN_EMAIL

  for (const dossier of dossiers ?? []) {
    try {
      // Créer le gate V8 "bilan_annuel_validation" en attente
      const { data: gateRow, error: gateErr } = await svc
        .from('validation_gates')
        .insert({
          dossier_id: dossier.id,
          gate_type: 'bilan_annuel_validation', // V8 — révision annuelle art. 25 MIF II
          decision: 'pending',
          comment: `Révision annuelle ${annee} — bilan patrimonial à générer et valider`,
          metadata: { type: 'bilan_annuel', annee },
        })
        .select('id')
        .single()

      if (gateErr) {
        // Peut échouer si un gate pending existe déjà (contrainte UNIQUE active)
        console.warn(`[cron/bilan-annuel] gate déjà existant pour ${dossier.id}`, gateErr.message)
      }

      // Audit log
      await svc.from('audit_logs').insert({
        user_id: dossier.conseiller_id,
        action: 'cron.bilan_annuel',
        entity_type: 'dossier',
        entity_id: dossier.id,
        metadata: { annee, gate_id: gateRow?.id },
      })

      // Notifier Mohamed
      if (adminEmail) {
        const dossierNom = [dossier.prenom, dossier.nom].filter(Boolean).join(' ') || dossier.id
        void sendEmail({
          to: adminEmail,
          ...emailValidationRequired(
            `Révision annuelle ${annee}`,
            dossierNom,
            `${BASE_URL}/admin/validations`,
          ),
        }).catch(err => console.error('[cron/bilan-annuel] email error', err))
      }

      results.push({ dossierId: dossier.id, status: 'gate_created', gateId: gateRow?.id })
    } catch (err) {
      console.error(`[cron/bilan-annuel] erreur dossier ${dossier.id}`, err)
      results.push({
        dossierId: dossier.id,
        status: 'error',
        error: err instanceof Error ? err.message : 'Erreur inconnue',
      })
    }
  }

  return NextResponse.json({
    ok: true,
    annee,
    total: results.length,
    gates_created: results.filter(r => r.status === 'gate_created').length,
    errors: results.filter(r => r.status === 'error').length,
    results,
  })
}
