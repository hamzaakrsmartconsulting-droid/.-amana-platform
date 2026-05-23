// lib/dossiers/assistant-scope.ts
// Scope conseiller pour /assistant + synchro auto dossiers clients.

import 'server-only'
import { createClient } from '@supabase/supabase-js'
import type { PipelineStage } from '@/lib/workflow/pipeline-stages'

function svc() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Service role manquant')
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export function getDefaultConseillerId(): string | null {
  const id = process.env.AMANA_DEFAULT_CONSEILLER_ID?.trim()
  return id || null
}

/** Conseiller dont les dossiers sont visibles dans l’assistant (admin → Mohamed par défaut). */
export function resolveAssistantConseillerId(
  userId: string,
  role: string,
): string | null {
  if (role === 'conseiller') return userId
  if (role === 'admin') {
    return getDefaultConseillerId() ?? userId
  }
  return null
}

export function dossierBelongsToAssistantScope(
  dossierConseillerId: string,
  userId: string,
  role: string,
): boolean {
  const scopeId = resolveAssistantConseillerId(userId, role)
  return scopeId !== null && dossierConseillerId === scopeId
}

function inferPipelineStage(kycStatut: string | null | undefined): PipelineStage {
  if (kycStatut === 'soumis') return 'kyc_attente'
  if (kycStatut === 'valide') return 'kyc_complet'
  return 'nouveau'
}

/**
 * Crée un dossier par client (profiles.role=client) sans dossier pour ce conseiller.
 * Appelé au chargement de la sidebar assistant.
 */
export async function ensureClientDossiersForConseiller(
  conseillerId: string,
): Promise<{ created: number; dossierIds: string[] }> {
  const sb = svc()
  const dossierIds: string[] = []

  const { data: clients, error: clientsErr } = await sb
    .from('profiles')
    .select('id, email, prenom, nom, offre_amana')
    .eq('role', 'client')

  if (clientsErr || !clients?.length) {
    return { created: 0, dossierIds }
  }

  const { data: existingRows } = await sb
    .from('dossiers')
    .select('email_client')
    .eq('conseiller_id', conseillerId)
    .not('email_client', 'is', null)

  const coveredEmails = new Set(
    (existingRows ?? [])
      .map((r) => r.email_client?.trim().toLowerCase())
      .filter((e): e is string => Boolean(e)),
  )

  let created = 0

  for (const client of clients) {
    const email = client.email?.trim().toLowerCase()
    if (!email || coveredEmails.has(email)) continue

    const { data: otherDossier } = await sb
      .from('dossiers')
      .select('id')
      .ilike('email_client', email)
      .limit(1)
      .maybeSingle()

    if (otherDossier) {
      coveredEmails.add(email)
      continue
    }

    const { data: kyc } = await sb
      .from('kyc')
      .select('prenom, nom, statut')
      .eq('user_id', client.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const prenom = (kyc?.prenom ?? client.prenom ?? 'Client').trim() || 'Client'
    const nom = (kyc?.nom ?? client.nom ?? 'AMANA').trim() || 'AMANA'
    const pipelineStage = inferPipelineStage(kyc?.statut)

    const { data: dossier, error: insErr } = await sb
      .from('dossiers')
      .insert({
        conseiller_id: conseillerId,
        prenom,
        nom,
        email_client: email,
        statut: 'prospect',
        offre_amana_cible: client.offre_amana ?? null,
        pipeline_stage: pipelineStage,
        notes:
          'Créé automatiquement — client inscrit (synchro assistant). Compléter via onboarding / KYC si besoin.',
      })
      .select('id')
      .single()

    if (insErr || !dossier) {
      console.error('[assistant-scope] création dossier', email, insErr)
      continue
    }

    created++
    dossierIds.push(dossier.id)
    coveredEmails.add(email)

    await sb.from('audit_logs').insert({
      user_id: conseillerId,
      action: 'dossier.auto_created_assistant_sync',
      entity_type: 'dossier',
      entity_id: dossier.id,
      metadata: {
        client_profile_id: client.id,
        email,
        pipeline_stage: pipelineStage,
        via: 'ensureClientDossiersForConseiller',
      },
    })
  }

  return { created, dossierIds }
}
