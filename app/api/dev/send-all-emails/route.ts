// app/api/dev/send-all-emails/route.ts
// DEV ONLY — envoie tous les templates email client en une seule requête
// pour prévisualisation dans Mailpit (127.0.0.1:54324).
// Route désactivée en production (NODE_ENV !== 'development').

import { NextRequest, NextResponse } from 'next/server'
import {
  sendEmail,
  sendEmailWithAttachment,
  emailDerRemis,
  emailKycValide,
  emailKycRejete,
  emailDocumentPretASigner,
  emailSignatureInvitation,
  emailSignatureConfirmation,
  emailProjetActif,
  emailValidationRequired,
} from '@/lib/email'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Petite pause pour ne pas surcharger Mailpit
function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Route disponible uniquement en développement' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const to: string = body.to ?? 'zaza@test.com'

  const BASE = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const PRENOM = 'Fatima'
  const NOM    = 'Benali'

  const results: { email: string; ok: boolean; error?: string }[] = []

  async function send(label: string, payload: { subject: string; html: string }) {
    try {
      await sendEmail({ to, ...payload })
      results.push({ email: label, ok: true })
    } catch (err) {
      results.push({ email: label, ok: false, error: String(err) })
    }
    await sleep(300)
  }

  // ── 1. Bienvenue + DER ───────────────────────────────────────────────
  try {
    // PDF minimal (1 octet) pour simuler la pièce jointe sans générer un vrai PDF
    const fakePdf = Buffer.from('%PDF-1.4 fake')
    await sendEmailWithAttachment({
      to,
      ...emailDerRemis(PRENOM, NOM, `${BASE}/auth/callback?next=/onboarding`),
      attachments: [{
        filename: 'DER_AMANA_Fatima_Benali.pdf',
        content: fakePdf,
        contentType: 'application/pdf',
      }],
    })
    results.push({ email: '1. Bienvenue + DER (avec PJ)', ok: true })
  } catch (err) {
    results.push({ email: '1. Bienvenue + DER (avec PJ)', ok: false, error: String(err) })
  }
  await sleep(300)

  // ── 2. KYC validé ────────────────────────────────────────────────────
  await send('2. KYC validé', emailKycValide(PRENOM))

  // ── 3. KYC rejeté ────────────────────────────────────────────────────
  await send('3. KYC rejeté / compléments requis', emailKycRejete(PRENOM))

  // ── 4a. LM / doc prêt à signer (avec lien AMANA) ─────────────────────
  await send(
    '4a. Lettre de Mission prête à signer (AMANA email)',
    emailDocumentPretASigner(
      PRENOM,
      'Lettre de Mission AMANA',
      `${BASE}/sign/demo-lm-link`,
    ),
  )

  // ── 4b. LM / doc prêt à signer (sans lien — fallback dashboard) ───────
  await send(
    '4b. Document prêt à signer (sans lien direct)',
    emailDocumentPretASigner(PRENOM, 'Lettre de Mission AMANA'),
  )

  // ── 4c. Bulletin prêt à signer (mock Yousign) ─────────────────────────
  await send(
    '4c. Bulletin de souscription prêt à signer (mock Yousign)',
    emailSignatureInvitation(
      PRENOM,
      'Bulletin de souscription — Assurance-vie Salam Patrimoine',
      `${BASE}/conseiller/projets?mock_sign=1&projet_id=demo`,
    ),
  )

  // ── 5. Signature confirmée ────────────────────────────────────────────
  await send(
    '5. Signature confirmée',
    emailSignatureConfirmation(PRENOM, 'Bulletin de souscription — Assurance-vie Salam Patrimoine'),
  )

  // ── 6. Investissement actif ───────────────────────────────────────────
  await send(
    '6. Investissement actif',
    emailProjetActif(PRENOM, 'Assurance-vie Salam Patrimoine', 15000),
  )

  // ── 7. Validation requise (email Mohamed — inclus pour référence) ─────
  await send(
    '7. [Admin] Validation requise (gate V1 KYC)',
    emailValidationRequired(
      'V1 — Validation KYC — pièces + cohérence LCB-FT',
      `${PRENOM} ${NOM}`,
      `${BASE}/admin/validations`,
    ),
  )

  const allOk = results.every(r => r.ok)

  return NextResponse.json({
    sent_to: to,
    total: results.length,
    success: results.filter(r => r.ok).length,
    failed: results.filter(r => !r.ok).length,
    results,
    mailpit_url: 'http://127.0.0.1:54324',
    message: allOk
      ? `✅ ${results.length} emails envoyés vers ${to} — ouvrez Mailpit pour les voir.`
      : `⚠️ ${results.filter(r => r.ok).length}/${results.length} emails envoyés.`,
  })
}

// GET → déclenche avec l'email par défaut (pratique depuis le navigateur)
export async function GET(request: NextRequest) {
  const to = new URL(request.url).searchParams.get('to') ?? 'zaza@test.com'
  return POST(new Request(request.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to }),
  }) as NextRequest)
}
