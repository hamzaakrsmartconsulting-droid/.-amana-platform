// app/api/onboard/step/route.ts
// Sprint Agents IA v18 · 30 avril 2026
// Route PUBLIQUE — sauvegarde une étape du funnel onboarding.

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import {
  saveStep1,
  saveStep2,
  saveStep3,
  saveStep4,
} from '@/lib/onboarding/onboarding-service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  let body: {
    step?: number
    session_token?: string
    data?: Record<string, unknown>
  } = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'JSON invalide' }, { status: 400 })
  }

  if (!body.session_token) {
    return NextResponse.json(
      { ok: false, error: 'session_token requis' },
      { status: 400 }
    )
  }
  if (!body.step || !body.data) {
    return NextResponse.json(
      { ok: false, error: 'step et data requis' },
      { status: 400 }
    )
  }

  try {
    let result
    switch (body.step) {
      case 1:
        result = await saveStep1(body.session_token, body.data as never)
        break
      case 2:
        result = await saveStep2(body.session_token, body.data as never)
        break
      case 3:
        result = await saveStep3(body.session_token, body.data as never)
        break
      case 4:
        result = await saveStep4(body.session_token, body.data as never)
        break
      default:
        return NextResponse.json(
          { ok: false, error: `step inconnu : ${body.step}` },
          { status: 400 }
        )
    }
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: 400 }
      )
    }
    if (body.step === 3 && 'aiguillage' in result) {
      return NextResponse.json({
        ok: true,
        current_step: result.session.current_step,
        aiguillage: result.aiguillage,
      })
    }
    return NextResponse.json({
      ok: true,
      current_step: result.session.current_step,
    })
  } catch (err) {
    console.error('[onboard/step] error', err)
    return NextResponse.json(
      { ok: false, error: 'Erreur sauvegarde étape' },
      { status: 500 }
    )
  }
}
