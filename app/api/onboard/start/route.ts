// app/api/onboard/start/route.ts
// Sprint Agents IA v18 · 30 avril 2026
// Route PUBLIQUE — démarre une session du funnel onboarding.

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createOnboardingSession } from '@/lib/onboarding/onboarding-service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  let body: {
    utm_source?: string
    utm_medium?: string
    utm_campaign?: string
  } = {}
  try {
    body = await request.json()
  } catch {
    // body optionnel
  }

  const userAgent = request.headers.get('user-agent') ?? undefined
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    undefined

  try {
    const session = await createOnboardingSession({
      user_agent: userAgent,
      ip_address: ip,
      utm_source: body.utm_source,
      utm_medium: body.utm_medium,
      utm_campaign: body.utm_campaign,
    })
    return NextResponse.json({
      ok: true,
      session_token: session.session_token,
      current_step: session.current_step,
    })
  } catch (err) {
    console.error('[onboard/start] error', err)
    const devDetail =
      process.env.NODE_ENV === 'development' && err instanceof Error
        ? err.message
        : null
    return NextResponse.json(
      {
        ok: false,
        error: devDetail ?? 'Erreur création session',
      },
      { status: 500 }
    )
  }
}
