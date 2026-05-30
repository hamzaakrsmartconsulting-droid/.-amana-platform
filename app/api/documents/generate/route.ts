// app/api/documents/generate/route.ts — v3.5
// Sprint Agents IA v11c · 30 avril 2026
//
// Évolution v3.5 : ajout du type 'succession' aux SUPPORTED_TYPES + dispatch
// vers generateSuccessionForDossier. Reste identique à v3.4 (sprint v11d).

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import {
  generateDerForDossier,
  generateLmForDossier,
  generateRaForDossier,
  generateBilanForDossier,
  generatePrecoForDossier,
  generateZakatForDossier,
  generateSuccessionForDossier,
  generateBulletinSouscriptionForDossier,
  generateProfilRisqueForDossier,
  type DerInputs,
  type LmInputs,
  type RaInputs,
  type BilanInputs,
  type PrecoInputs,
  type ZakatInputs,
  type SuccessionInputs,
  type BulletinInputs,
  type ProfilRisqueInputs,
} from '@/lib/documents/generate-pdf'
import { getDocumentInputs } from '@/lib/documents/document-inputs-service'
import type { PipelineStage } from '@/lib/workflow/pipeline-stages'
import { transitionDossierStageService } from '@/lib/workflow/workflow-service'

// Après génération d'un document, avancer automatiquement le pipeline
const DOC_NEXT_STAGE: Partial<Record<string, PipelineStage>> = {
  der:           'der_envoye',
  lm:            'lm_envoyee',
  ra:            'bilan_genere',
  bilan:         'bilan_genere',
  preco:         'bilan_genere',
  zakat:         undefined,
  succession:    undefined,
  bulletin:      undefined,
  profil_risque: undefined,
  kyc_fiche:     undefined,
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SUPPORTED_TYPES = [
  'der',
  'lm',
  'ra',
  'bilan',
  'preco',
  'zakat',
  'succession',
  'bulletin',
  'profil_risque',
] as const
type SupportedType = (typeof SUPPORTED_TYPES)[number]

async function checkAuth(): Promise<{ authorized: boolean; userId?: string; role?: string }> {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll() {},
      },
    }
  )
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) return { authorized: false }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  return { authorized: true, userId: user.id, role: profile?.role ?? 'client' }
}

export async function POST(request: NextRequest) {
  const auth = await checkAuth()
  if (!auth.authorized || !auth.userId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  let body: { type?: string; dossier_id?: string; project_id?: string | null }
  try {
    body = (await request.json()) as { type?: string; dossier_id?: string; project_id?: string | null }
  } catch {
    return NextResponse.json({ error: 'Body JSON invalide' }, { status: 400 })
  }

  if (!body.dossier_id) {
    return NextResponse.json({ error: 'dossier_id requis' }, { status: 400 })
  }
  const projectId = body.project_id ?? null
  if (!body.type || !SUPPORTED_TYPES.includes(body.type as SupportedType)) {
    return NextResponse.json(
      {
        error: `Type non supporté : ${body.type}. Types : ${SUPPORTED_TYPES.join(', ')}.`,
      },
      { status: 400 }
    )
  }

  // Pour un admin, les generate*ForDossier vérifient conseiller_id === userId.
  // On résout le vrai conseiller_id du dossier pour que la vérification passe.
  let effectiveConseillerId = auth.userId
  if (auth.role === 'admin') {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
    )
    const { data: dossier } = await supabase
      .from('dossiers')
      .select('conseiller_id, pipeline_stage')
      .eq('id', body.dossier_id)
      .maybeSingle()
    if (!dossier) {
      return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 })
    }
    effectiveConseillerId = dossier.conseiller_id
  }

  // Stage actuel (admin + conseiller) pour éviter les transitions auto prématurées
  let pipelineStage: PipelineStage | null = null
  {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const svc = createServiceClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data: stageRow } = await svc
      .from('dossiers')
      .select('pipeline_stage')
      .eq('id', body.dossier_id)
      .maybeSingle()
    pipelineStage = (stageRow?.pipeline_stage as PipelineStage) ?? null
  }

  const docType = body.type as SupportedType
  const inputsRow = await getDocumentInputs(body.dossier_id, docType)
  const inputs = (inputsRow?.inputs ?? {}) as Record<string, unknown>

  let result
  switch (docType) {
    case 'der':
      result = await generateDerForDossier(effectiveConseillerId, body.dossier_id, inputs as DerInputs)
      break
    case 'lm':
      result = await generateLmForDossier(effectiveConseillerId, body.dossier_id, inputs as LmInputs)
      break
    case 'ra':
      result = await generateRaForDossier(effectiveConseillerId, body.dossier_id, inputs as RaInputs)
      break
    case 'bilan':
      result = await generateBilanForDossier(effectiveConseillerId, body.dossier_id, inputs as BilanInputs)
      break
    case 'preco':
      result = await generatePrecoForDossier(effectiveConseillerId, body.dossier_id, inputs as PrecoInputs)
      break
    case 'zakat':
      result = await generateZakatForDossier(effectiveConseillerId, body.dossier_id, inputs as ZakatInputs)
      break
    case 'succession':
      result = await generateSuccessionForDossier(
        effectiveConseillerId,
        body.dossier_id,
        inputs as SuccessionInputs
      )
      break
    case 'bulletin':
      result = await generateBulletinSouscriptionForDossier(
        effectiveConseillerId,
        body.dossier_id,
        inputs as BulletinInputs
      )
      break
    case 'profil_risque':
      result = await generateProfilRisqueForDossier(
        body.dossier_id,
        effectiveConseillerId,
        inputs as ProfilRisqueInputs
      )
      break
  }

  if (!result.ok) {
    const isInputsError = result.error.startsWith('Inputs ')
    return NextResponse.json(
      { error: result.error, missingInputs: isInputsError },
      { status: isInputsError ? 422 : 400 }
    )
  }

  // Si le doc est généré dans le cadre d'une souscription complémentaire
  // (pipeline projets), on l'attache au project. On NE déclenche PAS
  // l'auto-transition du pipeline dossier (pipeline 1) : c'est le pipeline
  // projet (pipeline 2) qui gouverne ce flow.
  if (projectId) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const svc = createServiceClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { error: linkErr } = await svc
      .from('documents')
      .update({ project_id: projectId })
      .eq('id', result.doc.id)
    if (linkErr) {
      console.error('[generate route] échec liaison document → project', linkErr)
    }
  } else {
    // Cas standard (onboarding pipeline 1) : on avance le stage dossier.
    // En kyc_complet : Mohamed génère DER/LM/RA puis déplace le Kanban manuellement.
    const nextStage =
      pipelineStage === 'kyc_complet' ? undefined : DOC_NEXT_STAGE[docType]
    if (nextStage) {
      void transitionDossierStageService({
        dossierId: body.dossier_id!,
        toStage: nextStage,
        triggeredBy: 'agent_sajl',
        triggerContext: { document_type: docType, generated_by: auth.userId },
        notes: `Document ${docType.toUpperCase()} généré via wizard — transition automatique`,
        bypassMatrix: false,
      }).catch(err => {
        console.error('[generate route] auto-transition pipeline échouée', err)
      })
    }
  }

  // Audit log
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll() {},
      },
    }
  )
  const templateVersion: Record<SupportedType, string> = {
    der: 'der-v3-pdf-vdef',
    lm: 'lm-v2',
    ra: 'ra-v2',
    bilan: 'bilan-v1',
    preco: 'preco-v1',
    zakat:         'zakat-v1',
    succession:    'succession-v1',
    bulletin:      'bulletin-v1',
    profil_risque: 'profil-risque-v1',
  }
  await supabase.from('audit_logs').insert({
    user_id: auth.userId,
    action: 'document.generate',
    entity_type: 'document',
    entity_id: result.doc.id,
    metadata: {
      type: body.type,
      dossier_id: body.dossier_id,
      project_id: projectId,
      filename: result.doc.filename,
      inputs_keys: Object.keys(inputs),
      template_version: templateVersion[docType],
      timestamp: new Date().toISOString(),
    },
    ip_address:
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      null,
    user_agent: request.headers.get('user-agent') ?? null,
  })

  return NextResponse.json({ document: result.doc }, { status: 201 })
}
