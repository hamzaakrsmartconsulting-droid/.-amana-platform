// app/api/onboard/finalize/route.ts — v2
// Sprint Agents IA v21 · 30 avril 2026
//
// Évolution v2 (vs v1 sprint v18) : appel automatique de
// triggerPostFinalizeOnboarding après création du dossier. Permet de
// passer immédiatement le dossier en stage 'criblage' et de créer
// l'alerte criblage pour Raqîb.
//
// REMPLACE app/api/onboard/finalize/route.ts du sprint v18.

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { finalizeOnboarding } from '@/lib/onboarding/onboarding-service'
import { triggerPostFinalizeOnboarding } from '@/lib/workflow/auto-trigger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  let body: {
    session_token?: string
    password?: string
    consent_rgpd?: boolean
    consent_cgu?: boolean
    consent_communication?: boolean
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
  if (!body.password?.trim()) {
    return NextResponse.json(
      { ok: false, error: 'Mot de passe requis' },
      { status: 400 }
    )
  }
  if (!body.consent_rgpd || !body.consent_cgu) {
    return NextResponse.json(
      { ok: false, error: 'Consentements RGPD et CGU requis' },
      { status: 400 }
    )
  }

  const defaultConseillerId = process.env.AMANA_DEFAULT_CONSEILLER_ID
  if (!defaultConseillerId) {
    console.error('[onboard/finalize] AMANA_DEFAULT_CONSEILLER_ID manquant')
    return NextResponse.json(
      {
        ok: false,
        error: 'Configuration cabinet incomplète',
      },
      { status: 500 }
    )
  }

  try {
    const result = await finalizeOnboarding({
      sessionToken: body.session_token,
      password: body.password,
      consentRgpd: body.consent_rgpd,
      consentCgu: body.consent_cgu,
      consentCommunication: body.consent_communication,
      conseillerIdAssigned: defaultConseillerId,
    })
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: 400 }
      )
    }

    // ============================================================
    // NOUVEAU v21 : déclencher les hooks d'automatisation
    // ============================================================
    // On ne bloque pas la réponse en cas d'erreur du hook : le dossier
    // est déjà créé, on logue mais on continue.
    try {
      const hookResult = await triggerPostFinalizeOnboarding({
        dossierId: result.dossier_id,
        offre: result.offre,
      })
      if (!hookResult.ok) {
        console.warn('[onboard/finalize] hook errors:', hookResult.errors)
      }
    } catch (err) {
      console.error('[onboard/finalize] hook trigger error', err)
    }

    return NextResponse.json({
      ok: true,
      offre: result.offre,
      dossier_id: result.dossier_id,
    })
  } catch (err) {
    console.error('[onboard/finalize] error', err)
    return NextResponse.json(
      { ok: false, error: 'Erreur finalisation' },
      { status: 500 }
    )
  }
}
