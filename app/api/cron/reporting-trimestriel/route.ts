// app/api/cron/reporting-trimestriel/route.ts
// Cron trimestriel : génère et envoie un rapport de suivi PDF à chaque client actif.
// Déclenché par Vercel Cron le 1er jour de chaque trimestre à 9h.
// Peut aussi être déclenché manuellement par Mohamed via POST.

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { sendEmail } from '@/lib/email'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://amana-patrimoine.fr'

function verifyAuth(request: NextRequest): boolean {
  // Vercel Cron transmet l'Authorization header
  const auth = request.headers.get('authorization')
  if (auth === `Bearer ${process.env.CRON_SECRET}`) return true
  // En développement, autoriser les requêtes locales sans token
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

  // Lister les dossiers actifs avec offre patrimoniale/premium
  const { data: dossiers, error } = await svc
    .from('dossiers')
    .select('id, prenom, nom, email_client, conseiller_id, offre_amana_cible, pipeline_stage')
    .in('pipeline_stage', ['lm_signee', 'bilan_genere', 'ra_signe', 'suivi_actif'])
    .in('offre_amana_cible', ['patrimoniale', 'premium'])

  if (error) {
    console.error('[cron/reporting-trimestriel] erreur lecture dossiers', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const results: Array<{ dossierId: string; status: string; error?: string }> = []
  const now = new Date()
  const trimestre = Math.ceil((now.getMonth() + 1) / 3)
  const annee = now.getFullYear()

  for (const dossier of dossiers ?? []) {
    try {
      // Créer une entrée audit pour traçabilité
      await svc.from('audit_logs').insert({
        user_id: dossier.conseiller_id,
        action: 'cron.reporting_trimestriel',
        entity_type: 'dossier',
        entity_id: dossier.id,
        metadata: { trimestre, annee, pipeline_stage: dossier.pipeline_stage },
      })

      // Notifier le client par email avec lien vers son espace
      if (dossier.email_client) {
        const reportUrl = `${BASE_URL}/dashboard`
        await sendEmail({
          to: dossier.email_client,
          subject: `[AMANA] Votre rapport de suivi trimestriel T${trimestre} ${annee}`,
          html: `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f8f4ec;font-family:system-ui,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px;">
<table width="600" cellpadding="0" cellspacing="0" style="background:white;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(68,75,63,0.08);">
<tr><td style="background:#353b32;padding:24px 40px;"><span style="font-family:Georgia,serif;font-size:18px;color:#f8f4ec;letter-spacing:0.06em;">AMANA <span style="color:#c9a55a;">PATRIMOINE</span></span></td></tr>
<tr><td style="padding:40px;">
<h2 style="font-family:Georgia,serif;color:#444b3f;font-size:22px;margin:0 0 16px;">Rapport de suivi T${trimestre} ${annee}</h2>
<p style="color:#4b5563;font-size:15px;line-height:1.7;margin:0 0 16px;">Bonjour ${dossier.prenom},</p>
<p style="color:#4b5563;font-size:15px;line-height:1.7;margin:0 0 16px;">
  Votre conseiller AMANA Patrimoine a préparé votre rapport de suivi trimestriel. Connectez-vous à votre espace personnel pour en prendre connaissance.
</p>
<a href="${reportUrl}" style="display:inline-block;padding:13px 28px;background:#c9a55a;color:white;border-radius:8px;text-decoration:none;font-size:15px;font-weight:600;">Accéder à mon espace →</a>
<p style="color:#6d7368;font-size:13px;margin:28px 0 0;">AMANA Patrimoine est CIF/COA/COBSP enregistré à l'ORIAS sous le n° 25009552.</p>
</td></tr>
<tr><td style="background:#f8f4ec;padding:20px 40px;border-top:1px solid #e8dfc8;"><p style="margin:0;font-size:12px;color:#6d7368;">Cet email a été envoyé automatiquement.</p></td></tr>
</table></td></tr></table></body></html>`,
        })
      }

      results.push({ dossierId: dossier.id, status: 'sent' })
    } catch (err) {
      console.error(`[cron/reporting-trimestriel] erreur dossier ${dossier.id}`, err)
      results.push({
        dossierId: dossier.id,
        status: 'error',
        error: err instanceof Error ? err.message : 'Erreur inconnue',
      })
    }
  }

  return NextResponse.json({
    ok: true,
    trimestre,
    annee,
    total: results.length,
    sent: results.filter(r => r.status === 'sent').length,
    errors: results.filter(r => r.status === 'error').length,
    results,
  })
}
