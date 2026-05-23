// lib/workflow/auto-trigger.ts — v2
// Sprint Agents IA v21 · 30 avril 2026
//
// Évolution v2 (vs v1 sprint v19) :
// + appels effectifs aux routes /api/dossiers/[id]/auto-der et /auto-lm
//   pour le chaînage Mass.
// + tous les hooks sont maintenant fonctionnels (pas juste des "notes").
//
// REMPLACE lib/workflow/auto-trigger.ts du sprint v19.
import 'server-only'

import { createClient as createServiceClient } from '@supabase/supabase-js'
import type { PipelineStage } from '@/lib/workflow/pipeline-stages'
import {
  transitionDossierStageService,
  type TriggeredBy,
} from './workflow-service'
import { generateDerForDossierAdmin } from '@/lib/documents/generate-pdf'
import { sendEmailWithAttachment, emailDerRemis } from '@/lib/email'
import { getClientAppBaseUrl } from '@/lib/app-url'

function svc() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Service role manquant')
  return createServiceClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

// Helper pour appeler les routes internes /auto-* avec le secret partagé
async function callInternalRoute(params: {
  dossierId: string
  endpoint: 'auto-der' | 'auto-lm' | 'auto-bilan' | 'auto-profil' | 'auto-ra-skeleton' | 'auto-pack-sign'
  body?: Record<string, unknown>
}): Promise<{ ok: boolean; error?: string; data?: unknown }> {
  const baseUrl = process.env.AMANA_BASE_URL || 'http://localhost:3000'
  const secret = process.env.AMANA_INTERNAL_SECRET
  if (!secret) {
    return { ok: false, error: 'AMANA_INTERNAL_SECRET manquant' }
  }
  try {
    const res = await fetch(
      `${baseUrl}/api/dossiers/${params.dossierId}/${params.endpoint}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-AMANA-Internal-Secret': secret,
        },
        body: JSON.stringify(params.body ?? {}),
      }
    )
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return { ok: false, error: data.error ?? `HTTP ${res.status}`, data }
    }
    return { ok: true, data }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Erreur inconnue',
    }
  }
}

export type TriggerResult = {
  ok: boolean
  next_stage?: PipelineStage
  actions_taken: string[]
  errors: string[]
  signing_url?: string | null  // présent si auto-pack-sign déclenché
}

// =====================================================================
// 1. Hook : post-finalisation funnel onboarding
// =====================================================================
export async function triggerPostFinalizeOnboarding(params: {
  dossierId: string
  offre: 'mass' | 'patrimoniale' | 'premium'
}): Promise<TriggerResult> {
  const result: TriggerResult = { ok: true, actions_taken: [], errors: [] }
  const supabase = svc()

  const { data: dossier } = await supabase
    .from('dossiers')
    .select('id, conseiller_id, prenom, nom, email_client')
    .eq('id', params.dossierId)
    .maybeSingle()
  if (!dossier) {
    return { ok: false, actions_taken: [], errors: ['Dossier introuvable'] }
  }

  // Criblage automatique : nouveau → criblage (s'arrête là)
  // Le dossier reste en `criblage` jusqu'à ce que le client soumette son KYC.
  // La transition criblage → kyc_attente est déclenchée par /api/profile/submit
  // au moment où le client soumet effectivement son dossier KYC.
  const trCriblage = await transitionDossierStageService({
    dossierId: params.dossierId,
    toStage: 'criblage',
    triggeredBy: 'funnel_onboarding',
    triggerContext: { offre: params.offre },
    notes: 'Transition automatique après finalisation funnel public — en attente du KYC client',
  })
  if (!trCriblage.ok) {
    result.errors.push(`Transition criblage : ${trCriblage.error}`)
    result.ok = false
  } else {
    result.actions_taken.push('Transition → criblage')
    result.next_stage = 'criblage'
  }

  await supabase.from('compliance_alerts').insert({
    conseiller_id: dossier.conseiller_id,
    dossier_id: params.dossierId,
    severity: 'info',
    category: 'criblage',
    titre: `Pré-criblage à vérifier — ${dossier.prenom} ${dossier.nom}`,
    description: `Dossier en attente de soumission KYC client (offre ${params.offre}). Vérifier PEP/sanctions via Raqîb en arrière-plan.`,
  })
  result.actions_taken.push('Alerte criblage créée')

  // ============================================================
  // V0 spec : génération du DER nominatif dès la finalisation
  // pour matérialiser la preuve de remise (article L.541-8-1 CMF).
  // Le PDF est stocké dans Storage + ligne `documents` créée.
  // ============================================================
  try {
    const derResult = await generateDerForDossierAdmin(
      dossier.conseiller_id,
      params.dossierId,
    )
    if (derResult.ok) {
      result.actions_taken.push('DER nominatif généré (preuve de remise)')
      await supabase.from('audit_logs').insert({
        user_id: dossier.conseiller_id,
        action: 'der.generated_at_finalize',
        entity_type: 'document',
        entity_id: derResult.doc.id,
        metadata: {
          dossier_id: params.dossierId,
          offre: params.offre,
          phase: 'finalisation_funnel',
        },
      })

      // Envoyer le DER en PJ + magic-link d'activation au client
      if (dossier.email_client) {
        try {
          // Télécharger le PDF depuis Storage
          const { data: fileBlob } = await supabase.storage
            .from('amana-documents')
            .download(derResult.doc.storage_path)

          // Générer un magic-link (invite link) valide pour ce client
          const baseUrl = getClientAppBaseUrl()
          const { data: linkData } = await supabase.auth.admin.generateLink({
            type: 'magiclink',
            email: dossier.email_client,
            options: {
              // /auth/callback échange le code et redirige vers /onboarding (client)
              redirectTo: `${baseUrl}/auth/callback?next=/dashboard`,
            },
          })
          const magicLink =
            linkData?.properties?.action_link ??
            `${baseUrl}/auth`

          if (fileBlob) {
            const pdfBuffer = Buffer.from(await fileBlob.arrayBuffer())
            const tpl = emailDerRemis(dossier.prenom, dossier.nom ?? '', magicLink)
            await sendEmailWithAttachment({
              to: dossier.email_client,
              subject: tpl.subject,
              html: tpl.html,
              attachments: [
                {
                  filename: derResult.doc.filename,
                  content: pdfBuffer,
                  contentType: 'application/pdf',
                },
              ],
            })
            result.actions_taken.push('Email DER avec PJ envoyé au client')
          } else {
            result.errors.push('DER généré mais téléchargement Storage échoué — email non envoyé')
          }
        } catch (emailErr) {
          result.errors.push(
            `Envoi email DER : ${emailErr instanceof Error ? emailErr.message : 'erreur inconnue'}`
          )
        }
      }
    } else {
      console.error('[auto-trigger] Génération DER échouée :', derResult.error)
      result.errors.push(`Génération DER funnel : ${derResult.error}`)
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'erreur inconnue'
    console.error('[auto-trigger] Exception génération DER :', msg)
    result.errors.push(`Génération DER funnel : ${msg}`)
  }

  return result
}

// =====================================================================
// 2. Hook : post-criblage (clean / flagged)
// =====================================================================
export async function triggerPostScreening(params: {
  dossierId: string
  decision: 'clean' | 'manual_review' | 'flagged'
}): Promise<TriggerResult> {
  const result: TriggerResult = { ok: true, actions_taken: [], errors: [] }

  if (params.decision === 'manual_review') {
    result.actions_taken.push('Criblage manual_review : pas de transition auto')
    return result
  }

  const targetStage: PipelineStage =
    params.decision === 'clean' ? 'kyc_attente' : 'bloque'

  const tr = await transitionDossierStageService({
    dossierId: params.dossierId,
    toStage: targetStage,
    triggeredBy: 'agent_raqib',
    triggerContext: { decision: params.decision },
    notes:
      params.decision === 'clean'
        ? 'Criblage clean — peut commencer KYC'
        : 'Criblage flagged — investigation requise avant suite',
  })
  if (!tr.ok) {
    result.errors.push(tr.error)
    result.ok = false
  } else {
    result.actions_taken.push(`Transition → ${targetStage}`)
    result.next_stage = targetStage
  }
  return result
}

// =====================================================================
// 3. Hook : post-validation KYC
// =====================================================================
export async function triggerPostKycValidated(params: {
  dossierId: string
  autoSendDerForMass?: boolean // défaut true
}): Promise<TriggerResult> {
  const result: TriggerResult = { ok: true, actions_taken: [], errors: [] }
  const supabase = svc()

  const { data: dossier } = await supabase
    .from('dossiers')
    .select('id, conseiller_id, offre_amana_cible, prenom, nom, email_client')
    .eq('id', params.dossierId)
    .maybeSingle()
  if (!dossier) {
    return { ok: false, actions_taken: [], errors: ['Dossier introuvable'] }
  }

  const tr = await transitionDossierStageService({
    dossierId: params.dossierId,
    toStage: 'kyc_complet',
    triggeredBy: 'manual',
    triggerContext: { offre: dossier.offre_amana_cible },
    notes: 'KYC validé — pièces conformes',
  })
  if (!tr.ok) {
    result.errors.push(tr.error)
    result.ok = false
    return result
  }
  result.actions_taken.push('Transition → kyc_complet')
  result.next_stage = 'kyc_complet'

  // Pour Mass : déclencher auto-pack-sign (DER + LM + RA en 1 Yousign)
  // skip_email=true → l'appelant (kyc-validate) enverra un email combiné unique
  if (
    dossier.offre_amana_cible === 'mass' &&
    (params.autoSendDerForMass ?? true) &&
    dossier.email_client
  ) {
    const packResult = await callInternalRoute({
      dossierId: params.dossierId,
      endpoint: 'auto-pack-sign',
      body: { skip_email: true },
    })
    if (packResult.ok) {
      result.actions_taken.push('auto-pack-sign déclenché (DER+LM+RA en 1 Yousign)')
      result.next_stage = 'der_envoye'
      // Remonter le signing_url pour que l'appelant puisse envoyer l'email combiné
      const packData = packResult.data as { signing_url?: string | null } | undefined
      result.signing_url = packData?.signing_url ?? null
    } else {
      result.errors.push(`auto-pack-sign échoué : ${packResult.error}`)
      // Le dossier reste en kyc_complet, Mohamed pourra envoyer manuellement.
    }
  }

  return result
}

// =====================================================================
// 3b. Pré-remplissage automatique des inputs Bilan après KYC V1
// Spec étape 3→4 : "déclenchement automatique de la génération du
// Bilan patrimonial" = pré-remplir le formulaire avec les données KYC
// pour que Mohamed puisse compléter et valider sans ressaisie.
// =====================================================================
export async function preFillBilanFromKyc(dossierId: string): Promise<{
  ok: boolean
  actions: string[]
  error?: string
}> {
  const supabase = svc()
  const actions: string[] = []

  try {
    // Récupérer le dossier + KYC + onboarding session
    const { data: dossier } = await supabase
      .from('dossiers')
      .select('id, conseiller_id, prenom, nom, offre_amana_cible')
      .eq('id', dossierId)
      .maybeSingle()

    if (!dossier) return { ok: false, actions, error: 'Dossier introuvable' }

    const { data: kyc } = await supabase
      .from('kyc')
      .select('*')
      .eq('dossier_id', dossierId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const { data: onb } = await supabase
      .from('onboarding_sessions')
      .select('*')
      .eq('email', dossier.prenom) // fallback — on join par email via dossier
      .limit(1)
      .maybeSingle()
      .then(async r => {
        if (r.data) return r
        // Alternative: retrouver via email_client du dossier
        const { data: d2 } = await supabase
          .from('dossiers')
          .select('email_client')
          .eq('id', dossierId)
          .maybeSingle()
        if (!d2?.email_client) return r
        return supabase
          .from('onboarding_sessions')
          .select('*')
          .eq('email', d2.email_client)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
      })

    // Construire les inputs pré-remplis à partir des données disponibles
    const patrimoineNet = kyc?.patrimoine_net_eur ?? onb?.patrimoine_net_eur ?? ''
    const revenus = kyc?.revenus_annuels_eur ?? onb?.revenus_annuels_eur ?? ''
    const charges = kyc?.charges_annuelles_eur ?? onb?.charges_annuelles_eur ?? ''
    const epargne = kyc?.capacite_epargne_mensuelle_eur ?? onb?.capacite_epargne_mensuelle_eur ?? ''
    const situation = kyc?.situation_familiale ?? onb?.situation_familiale ?? ''
    const objectif = onb?.objectif_principal ?? ''
    const horizonAns = onb?.horizon_annees ?? ''

    const synthese = [
      `${dossier.prenom} ${dossier.nom}`,
      situation ? `Situation : ${situation}.` : '',
      patrimoineNet ? `Patrimoine net estimé : ${Number(patrimoineNet).toLocaleString('fr-FR')} €.` : '',
      revenus ? `Revenus annuels : ${Number(revenus).toLocaleString('fr-FR')} €.` : '',
      epargne ? `Capacité d'épargne mensuelle : ${Number(epargne).toLocaleString('fr-FR')} €.` : '',
      objectif ? `Objectif principal : ${objectif}.` : '',
      horizonAns ? `Horizon de placement : ${horizonAns} an(s).` : '',
      `— Synthèse à compléter par le conseiller après analyse approfondie.`,
    ].filter(Boolean).join(' ')

    const bilanInputs = {
      synthese_patrimoine_resume: synthese,
      bilan_date: new Date().toLocaleDateString('fr-FR'),
      patrimoine_net_eur: String(patrimoineNet),
      revenus_annuels_eur: String(revenus),
      charges_annuelles_eur: String(charges),
      capacite_epargne_mensuelle_eur: String(epargne),
      domiciliation_fiscale: kyc?.domiciliation_fiscale ?? 'France',
      // Allocation placeholder — à compléter par le conseiller
      allocation_actuelle: [
        {
          classe: 'Patrimoine global (à ventiler)',
          montant_eur: patrimoineNet ? String(patrimoineNet) : '0',
          pct: '100',
          statut_sharia: 'douteux' as const,
          commentaire: 'À ventiler par classe d\'actifs lors de l\'entretien',
        },
      ],
      // Recommandations placeholder
      recommandations_prioritaires: [
        {
          action: 'Compléter l\'analyse patrimoniale lors de l\'entretien conseil',
          horizon: 'immediat' as const,
          priorite: 'haute',
        },
      ],
    }

    // Upsert dans document_inputs (pré-remplissage, statut draft)
    const { error: upsertErr } = await supabase
      .from('document_inputs')
      .upsert(
        {
          conseiller_id: dossier.conseiller_id,
          dossier_id:    dossierId,
          document_type: 'bilan',
          inputs:        bilanInputs,
          status:        'draft',
          updated_at:    new Date().toISOString(),
        },
        { onConflict: 'dossier_id,document_type' },
      )

    if (upsertErr) {
      console.error('[preFillBilanFromKyc] upsert error', upsertErr.message)
      return { ok: false, actions, error: upsertErr.message }
    }
    actions.push('Bilan pré-rempli dans document_inputs (draft)')

    // Audit log
    await supabase.from('audit_logs').insert({
      user_id:     dossier.conseiller_id,
      action:      'bilan.prefilled_from_kyc',
      entity_type: 'dossier',
      entity_id:   dossierId,
      metadata:    { source: 'post_kyc_v1', fields_filled: Object.keys(bilanInputs) },
    })
    actions.push('Audit log bilan.prefilled_from_kyc créé')

    return { ok: true, actions }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'erreur inconnue'
    console.error('[preFillBilanFromKyc] exception', msg)
    return { ok: false, actions, error: msg }
  }
}

// =====================================================================
// 4. Hook : post-signature DER, LM ou Bulletin (webhook Yousign)
// =====================================================================
export async function triggerPostDocumentSigned(params: {
  dossierId: string
  documentType: 'der' | 'lm' | 'bulletin'
}): Promise<TriggerResult> {
  const result: TriggerResult = { ok: true, actions_taken: [], errors: [] }
  const supabase = svc()

  const { data: dossier } = await supabase
    .from('dossiers')
    .select('id, conseiller_id, offre_amana_cible, pipeline_stage')
    .eq('id', params.dossierId)
    .maybeSingle()
  if (!dossier) {
    return { ok: false, actions_taken: [], errors: ['Dossier introuvable'] }
  }

  if (params.documentType === 'der') {
    const tr = await transitionDossierStageService({
      dossierId: params.dossierId,
      toStage: 'der_signe',
      triggeredBy: 'webhook_yousign',
      triggerContext: { document_type: 'der' },
      notes: 'DER signé électroniquement par le client',
    })
    if (!tr.ok) {
      result.errors.push(tr.error)
      result.ok = false
    } else {
      result.actions_taken.push('Transition → der_signe')
      result.next_stage = 'der_signe'

      // Créer gate V3 (lm_send) pending pour validation admin avant envoi LM
      // L'admin approuvera depuis /admin/validations → déclenche auto-lm
      try {
        await supabase.from('validation_gates').upsert(
          {
            dossier_id: params.dossierId,
            gate_type: 'lm_send',
            decision: 'pending',
            decided_at: null,
            comment: null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'dossier_id,gate_type' }
        )
        result.actions_taken.push('Gate V3 (lm_send) créée — en attente validation admin')
      } catch (gErr) {
        result.errors.push(`Création gate V3 : ${gErr instanceof Error ? gErr.message : 'erreur'}`)
      }
    }
  } else if (params.documentType === 'lm') {
    const tr = await transitionDossierStageService({
      dossierId: params.dossierId,
      toStage: 'souscription',
      triggeredBy: 'webhook_yousign',
      triggerContext: { document_type: 'lm', from_stage: dossier.pipeline_stage },
      notes: 'LM signée — dossier en souscription (bulletin / assureur)',
    })
    if (!tr.ok) {
      result.errors.push(tr.error)
      result.ok = false
    } else {
      result.actions_taken.push('Transition → souscription')
      result.next_stage = 'souscription'

      // Pour Mass : déclencher auto-ra-skeleton (sections 1-6 auto + gate V4)
      if (dossier.offre_amana_cible === 'mass') {
        const autoRaResult = await callInternalRoute({
          dossierId: params.dossierId,
          endpoint: 'auto-ra-skeleton',
        })
        if (autoRaResult.ok) {
          result.actions_taken.push('auto-RA skeleton déclenché (sections 1-6)')
        } else {
          result.errors.push(`auto-RA skeleton échoué : ${autoRaResult.error}`)
        }
      }
    }
  } else if (params.documentType === 'bulletin') {
    // Bulletin signé = souscription client confirmée → dossier actif
    const tr = await transitionDossierStageService({
      dossierId: params.dossierId,
      toStage: 'actif',
      triggeredBy: 'webhook_yousign',
      triggerContext: { document_type: 'bulletin' },
      notes: 'Bulletin de souscription signé — client actif',
    })
    if (!tr.ok) {
      result.errors.push(tr.error)
      result.ok = false
    } else {
      result.actions_taken.push('Transition → actif')
      result.next_stage = 'actif'

      // Alerte conseiller : dossier prêt pour envoi assureur (non bloquant)
      const { error: alertErr } = await supabase.from('compliance_alerts').insert({
        conseiller_id: dossier.conseiller_id,
        dossier_id: params.dossierId,
        severity: 'info',
        category: 'souscription',
        titre: 'Bulletin signé — envoi assureur à effectuer',
        description:
          'Le bulletin de souscription a été signé par le client via Yousign. ' +
          'Procéder à l\'envoi du dossier complet à l\'assureur partenaire.',
      })
      if (alertErr) {
        console.warn('[auto-trigger] compliance_alert insert (non bloquant):', alertErr.message)
      }

      result.actions_taken.push('Alerte conseiller : envoi assureur à effectuer')
    }
  }

  return result
}

// =====================================================================
// 5. Hook : post-souscription assureur
// =====================================================================
export async function triggerPostSubscription(params: {
  dossierId: string
}): Promise<TriggerResult> {
  const tr = await transitionDossierStageService({
    dossierId: params.dossierId,
    toStage: 'actif',
    triggeredBy: 'manual',
    notes: 'Souscription assureur confirmée — client actif',
  })
  if (!tr.ok) {
    return { ok: false, actions_taken: [], errors: [tr.error] }
  }
  return {
    ok: true,
    actions_taken: ['Transition → actif'],
    next_stage: 'actif',
    errors: [],
  }
}
