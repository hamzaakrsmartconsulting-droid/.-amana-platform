// Dev only — envoie l'email de bienvenue souscription pour prévisualisation.
import { NextResponse } from 'next/server'
import { sendEmail, emailBienvenueSouscription } from '@/lib/email'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Non disponible en production' }, { status: 404 })
  }

  const body = (await request.json().catch(() => ({}))) as {
    to?: string
    prenom?: string
  }

  const to = body.to ?? 'hamzalazigheb@gmail.com'
  const prenom = body.prenom ?? 'Hamza'

  try {
    await sendEmail({
      to,
      ...emailBienvenueSouscription(prenom),
    })
    return NextResponse.json({
      ok: true,
      to,
      prenom,
      inbucket: 'http://127.0.0.1:54324',
      hint: 'En local (SMTP 54325), ouvrez Inbucket pour voir le mail.',
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur envoi'
    console.error('[dev/send-welcome-souscription]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
