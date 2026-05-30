// lib/documents/generate-pdf.ts — v3.4
// Sprint Agents IA v11c · 30 avril 2026
//
// Évolution v3.4 : ajout de generateSuccessionForDossier (Stratégie successorale v1).
// REMPLACE generate-pdf.ts v3.3 (sprint v11d).

import React from 'react'
import { renderToBuffer, type DocumentProps } from '@react-pdf/renderer'
import { renderDerPdfFromTemplate, TEMPLATE_VERSION as DER_TEMPLATE_VERSION } from '@/lib/documents/der-pdf-template'
import { LmTemplate, type LmTemplateProps } from '@/lib/documents/templates/lm-template'
import { RaTemplate, type RaTemplateProps } from '@/lib/documents/templates/ra-template'
import {
  BilanTemplate,
  type BilanTemplateProps,
  type AllocationLineBilan,
  type RecommandationLine,
  type StatutSharia,
} from '@/lib/documents/templates/bilan-template'
import {
  PrecoTemplate,
  type PrecoTemplateProps,
  type AllocationCibleLine,
  type EnveloppeLine,
  type FreqVersement,
  type FreqArbitrage,
  type FreqRevision,
} from '@/lib/documents/templates/preco-template'
import {
  ZakatTemplate,
  type ZakatTemplateProps,
  type ZakatBaseLine,
  type ProjectionLine,
  type NisabRetenu,
} from '@/lib/documents/templates/zakat-template'
import {
  SuccessionTemplate,
  type SuccessionTemplateProps,
  type StatutMatrimonial,
  type HeritierLine,
  type ActionSuccessorale,
} from '@/lib/documents/templates/succession-template'
import { LcbftTemplate, type LcbftAxe } from '@/lib/documents/templates/lcbft-template'
import { PpeTemplate } from '@/lib/documents/templates/ppe-template'
import { KycTemplate, type KycTemplateProps } from '@/lib/documents/templates/kyc-template'
import {
  ProfilRisqueTemplate,
  type ProfilRisqueTemplateProps,
  type ProfilRetenu,
} from '@/lib/documents/templates/profil-risque-template'
import {
  BulletinSouscriptionTemplate,
  type BeneficiaireLine,
  type FreqVersementBulletin,
} from '@/lib/documents/templates/bulletin-souscription-template'
import {
  uploadAndRegisterDocument,
  uploadAndRegisterDocumentAdmin,
  type AmanaDocument,
  type DocumentType,
} from '@/lib/documents/document-service'
import { applyGateAfterDocumentGenerated } from '@/lib/workflow/validation-gates'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { getDossier } from '@/lib/dossiers/dossier-service'
import { listClientFacts } from '@/lib/agents/client-memory'

// =====================================================================
// Types d'inputs
// =====================================================================
export type DerInputs = {}
export type LmInputs = {
  objectifs_client?: string
  duree_mission?: string
  honoraires_estimes?: string
  perimetre_specifique?: string
}
export type RaInputs = {
  bilan_mizan_resume?: string
  bilan_mizan_date?: string
  allocation_cible?: Array<{ classe: string; pourcentage: string; montant_eur?: string; supports?: string }>
  capacite_financiere?: string
  connaissances_investissement?: string
  justification_adequation?: string
}
export type BilanInputs = {
  synthese_patrimoine_resume?: string
  bilan_date?: string
  revenus_annuels_eur?: string
  charges_annuelles_eur?: string
  capacite_epargne_mensuelle_eur?: string
  patrimoine_net_eur?: string
  allocation_actuelle?: AllocationLineBilan[]
  purification_estimee_eur?: string
  purification_commentaire?: string
  zakat_base_eur?: string
  zakat_estimee_eur?: string
  zakat_date_hawl?: string
  zakat_nisab_reference?: string
  points_vigilance?: string
  recommandations_prioritaires?: RecommandationLine[]
  domiciliation_fiscale?: string
}
export type PrecoInputs = {
  mission_synthese?: string
  preco_date?: string
  allocation_cible_detaillee?: AllocationCibleLine[]
  enveloppes_choisies?: EnveloppeLine[]
  versement_initial_eur?: string
  versements_programmes_eur?: string
  versements_frequence?: FreqVersement
  arbitrage_frequence?: FreqArbitrage
  frais_entree_pct?: string
  frais_gestion_annuel_pct?: string
  honoraires_amana?: string
  rendement_cible_annuel_pct?: string
  rendement_horizon?: string
  risques_identifies?: string
  prochaine_revision_frequence?: FreqRevision
  prochaine_revision_date?: string
}
export type ZakatInputs = {
  synthese_zakat_client?: string
  zakat_date_reference?: string
  nisab_or_eur?: string
  nisab_argent_eur?: string
  nisab_date_reference?: string
  nisab_retenu?: NisabRetenu
  hawl_date_anniversaire?: string
  bases_par_classe?: ZakatBaseLine[]
  dettes_deductibles_eur?: string
  total_zakat_due_eur?: string
  beneficiaires_choisis?: string
  prochaine_echeance_paiement?: string
  projection_pluriannuelle?: ProjectionLine[]
  vigilance_specificites?: string
}
export type SuccessionInputs = {
  synthese_situation?: string
  date_reference?: string
  statut_matrimonial?: StatutMatrimonial
  regime_matrimonial_detail?: string
  composition_familiale?: string
  patrimoine_succession_eur?: string
  heritiers?: HeritierLine[]
  synthese_parts_coraniques?: string
  synthese_parts_droit_francais?: string
  ecarts_explication?: string
  actions_proposees?: ActionSuccessorale[]
  points_attention?: string
  notaire_referent?: string
  prochaine_etape?: string
}

export type {
  AllocationLineBilan,
  RecommandationLine,
  StatutSharia,
  AllocationCibleLine,
  EnveloppeLine,
  FreqVersement,
  FreqArbitrage,
  FreqRevision,
  ZakatBaseLine,
  ProjectionLine,
  NisabRetenu,
  StatutMatrimonial,
  HeritierLine,
  ActionSuccessorale,
}

export type GenerateDocumentResult =
  | { ok: true; doc: AmanaDocument }
  | { ok: false; error: string }

// =====================================================================
// Utilitaires
// =====================================================================
function frenchDate(): string {
  return new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}
async function buildClientFromDossier(dossierId: string, conseillerId: string) {
  const dossier = await getDossier(dossierId)
  if (!dossier) return null
  if (dossier.conseiller_id !== conseillerId) return null
  return dossier
}

async function buildDerPdfBuffer(params: {
  prenom: string
  nom: string
  dossierId: string
  offre?: string | null
}): Promise<Buffer> {
  return renderDerPdfFromTemplate({
    prenom: params.prenom,
    nom: params.nom,
    dossierId: params.dossierId,
    offre: params.offre,
    generationDate: frenchDate(),
  })
}

function derMetadata(prenom: string, nom: string): Record<string, unknown> {
  return {
    dossier_nom_client: `${prenom} ${nom}`,
    template_version: DER_TEMPLATE_VERSION,
    inputs_keys: [],
  }
}

async function renderDerAndUpload(params: {
  conseillerId: string
  dossierId: string
  prenom: string
  nom: string
  offre?: string | null
}): Promise<GenerateDocumentResult> {
  let pdfBuffer: Buffer
  try {
    pdfBuffer = await buildDerPdfBuffer(params)
  } catch (err) {
    console.error('[generate-pdf] erreur rendu DER PDF template', err)
    return {
      ok: false,
      error: `Erreur génération PDF : ${err instanceof Error ? err.message : 'inconnue'}`,
    }
  }
  const safeFilename = `DER_${params.prenom}_${params.nom}_${Date.now()}.pdf`.replace(/[^a-zA-Z0-9_.-]/g, '_')
  const result = await uploadAndRegisterDocument({
    conseillerId: params.conseillerId,
    dossierId: params.dossierId,
    type: 'der',
    pdfBuffer,
    filename: safeFilename,
    metadata: { ...derMetadata(params.prenom, params.nom), generation_date: new Date().toISOString() },
  })
  if (result.ok) {
    try {
      await applyGateAfterDocumentGenerated(params.dossierId, 'der')
    } catch (err) {
      console.error('[generate-pdf] gate pending (der)', err)
      return {
        ok: false,
        error:
          err instanceof Error
            ? `PDF créé mais verrou admin non enregistré : ${err.message}`
            : 'PDF créé mais verrou admin non enregistré',
      }
    }
  }
  return result
}

async function renderDerAndUploadAdmin(params: {
  conseillerId: string
  dossierId: string
  prenom: string
  nom: string
  offre?: string | null
}): Promise<GenerateDocumentResult> {
  let pdfBuffer: Buffer
  try {
    pdfBuffer = await buildDerPdfBuffer(params)
  } catch (err) {
    console.error('[generate-pdf] erreur rendu DER admin PDF template', err)
    return {
      ok: false,
      error: `Erreur génération PDF : ${err instanceof Error ? err.message : 'inconnue'}`,
    }
  }
  const safeFilename = `DER_${params.prenom}_${params.nom}_${Date.now()}.pdf`.replace(/[^a-zA-Z0-9_.-]/g, '_')
  return uploadAndRegisterDocumentAdmin({
    conseillerId: params.conseillerId,
    dossierId: params.dossierId,
    type: 'der',
    pdfBuffer,
    filename: safeFilename,
    metadata: { ...derMetadata(params.prenom, params.nom), generation_date: new Date().toISOString() },
  })
}

// =====================================================================
// DER / LM / RA / Bilan / Préco / Zakat — inchangés (cf. v3.3)
// =====================================================================
export async function generateDerForDossier(
  conseillerId: string,
  dossierId: string,
  _inputs?: DerInputs
): Promise<GenerateDocumentResult> {
  const dossier = await buildClientFromDossier(dossierId, conseillerId)
  if (!dossier) return { ok: false, error: 'Dossier introuvable ou accès refusé' }
  return renderDerAndUpload({
    conseillerId,
    dossierId,
    prenom: dossier.prenom,
    nom: dossier.nom,
    offre: dossier.offre_amana_cible,
  })
}

/**
 * Variante service-role de generateDerForDossier.
 * À utiliser dans les contextes background/workflow sans session utilisateur.
 */
export async function generateDerForDossierAdmin(
  conseillerId: string,
  dossierId: string,
): Promise<GenerateDocumentResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return { ok: false, error: 'Variables service role manquantes' }

  const svc = createServiceClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: dossier } = await svc
    .from('dossiers')
    .select('id, conseiller_id, prenom, nom, email_client, telephone, offre_amana_cible')
    .eq('id', dossierId)
    .maybeSingle()

  if (!dossier) return { ok: false, error: 'Dossier introuvable (service role)' }

  return renderDerAndUploadAdmin({
    conseillerId,
    dossierId,
    prenom: dossier.prenom,
    nom: dossier.nom,
    offre: dossier.offre_amana_cible,
  })
}

export async function generateLmForDossierAdmin(
  conseillerId: string,
  dossierId: string,
  inputs?: LmInputs
): Promise<GenerateDocumentResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return { ok: false, error: 'Variables service role manquantes' }
  const svc = createServiceClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: dossier } = await svc
    .from('dossiers')
    .select('id, conseiller_id, prenom, nom, email_client, telephone, offre_amana_cible')
    .eq('id', dossierId)
    .maybeSingle()
  if (!dossier) return { ok: false, error: 'Dossier introuvable (service role)' }
  const missing = validateLmInputs(inputs)
  if (missing.length > 0)
    return { ok: false, error: `Inputs LM manquants : ${missing.join(', ')}.` }
  const props: LmTemplateProps = {
    client: { prenom: dossier.prenom, nom: dossier.nom, email: dossier.email_client, telephone: dossier.telephone },
    offre: dossier.offre_amana_cible,
    inputs: inputs ?? undefined,
    generationDate: frenchDate(),
    dossierId,
  }
  return renderAndUploadAdmin({
    conseillerId,
    dossierId,
    type: 'lm',
    filename: `LM_${dossier.prenom}_${dossier.nom}_${Date.now()}.pdf`,
    element: React.createElement(LmTemplate, props),
    metadata: { dossier_nom_client: `${dossier.prenom} ${dossier.nom}`, template_version: 'lm-v2', offre: dossier.offre_amana_cible },
  })
}

export async function generateLmForDossier(
  conseillerId: string,
  dossierId: string,
  inputs?: LmInputs
): Promise<GenerateDocumentResult> {
  const dossier = await buildClientFromDossier(dossierId, conseillerId)
  if (!dossier) return { ok: false, error: 'Dossier introuvable ou accès refusé' }
  const missing = validateLmInputs(inputs)
  if (missing.length > 0)
    return { ok: false, error: `Inputs LM manquants : ${missing.join(', ')}. Compléter le formulaire avant génération.` }
  const props: LmTemplateProps = {
    client: { prenom: dossier.prenom, nom: dossier.nom, email: dossier.email_client, telephone: dossier.telephone },
    offre: dossier.offre_amana_cible,
    inputs: inputs ?? undefined,
    generationDate: frenchDate(),
    dossierId,
  }
  return renderAndUpload({
    conseillerId,
    dossierId,
    type: 'lm',
    filename: `LM_${dossier.prenom}_${dossier.nom}_${Date.now()}.pdf`,
    element: React.createElement(LmTemplate, props),
    metadata: { dossier_nom_client: `${dossier.prenom} ${dossier.nom}`, template_version: 'lm-v2', offre: dossier.offre_amana_cible, inputs_keys: inputs ? Object.keys(inputs) : [] },
  })
}

export async function generateRaForDossier(
  conseillerId: string,
  dossierId: string,
  inputs?: RaInputs
): Promise<GenerateDocumentResult> {
  const dossier = await buildClientFromDossier(dossierId, conseillerId)
  if (!dossier) return { ok: false, error: 'Dossier introuvable ou accès refusé' }
  const missing = validateRaInputs(inputs)
  if (missing.length > 0)
    return { ok: false, error: `Inputs RA manquants : ${missing.join(', ')}. Compléter le formulaire avant génération.` }
  const factsList = await listClientFacts(conseillerId, dossierId)
  const facts: Record<string, string | undefined> = {}
  for (const f of factsList) facts[f.fact_key] = f.fact_value
  const props: RaTemplateProps = {
    client: { prenom: dossier.prenom, nom: dossier.nom, email: dossier.email_client },
    facts: facts as RaTemplateProps['facts'],
    inputs: inputs ?? undefined,
    generationDate: frenchDate(),
    dossierId,
  }
  return renderAndUpload({
    conseillerId,
    dossierId,
    type: 'ra',
    filename: `RA_${dossier.prenom}_${dossier.nom}_${Date.now()}.pdf`,
    element: React.createElement(RaTemplate, props),
    metadata: { dossier_nom_client: `${dossier.prenom} ${dossier.nom}`, template_version: 'ra-v2', facts_count: factsList.length, inputs_keys: inputs ? Object.keys(inputs) : [], allocation_lignes: inputs?.allocation_cible?.length ?? 0 },
  })
}

// Version service-role pour les routes background (auto-ra, etc.)
export async function generateRaForDossierAdmin(
  conseillerId: string,
  dossierId: string,
  inputs?: RaInputs
): Promise<GenerateDocumentResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return { ok: false, error: 'Variables service role manquantes' }
  const svc = createServiceClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

  const { data: dossier } = await svc
    .from('dossiers')
    .select('id, conseiller_id, prenom, nom, email_client, telephone, offre_amana_cible')
    .eq('id', dossierId)
    .maybeSingle()
  if (!dossier) return { ok: false, error: 'Dossier introuvable (service role)' }

  const missing = validateRaInputs(inputs)
  if (missing.length > 0)
    return { ok: false, error: `Inputs RA manquants : ${missing.join(', ')}. Compléter V4/V5/V6 avant génération.` }

  // Charger les facts via service role
  const { data: factRows } = await svc
    .from('client_facts')
    .select('fact_key, fact_value')
    .eq('dossier_id', dossierId)
  const facts: Record<string, string | undefined> = {}
  for (const f of (factRows ?? [])) facts[f.fact_key] = f.fact_value

  const props: RaTemplateProps = {
    client: { prenom: dossier.prenom, nom: dossier.nom, email: dossier.email_client },
    facts: facts as RaTemplateProps['facts'],
    inputs: inputs ?? undefined,
    generationDate: frenchDate(),
    dossierId,
  }
  return renderAndUploadAdmin({
    conseillerId,
    dossierId,
    type: 'ra',
    filename: `RA_${dossier.prenom}_${dossier.nom}_${Date.now()}.pdf`,
    element: React.createElement(RaTemplate, props),
    metadata: { dossier_nom_client: `${dossier.prenom} ${dossier.nom}`, template_version: 'ra-v2', facts_count: factRows?.length ?? 0, inputs_keys: inputs ? Object.keys(inputs) : [], allocation_lignes: inputs?.allocation_cible?.length ?? 0 },
  })
}

export async function generateBilanForDossier(
  conseillerId: string,
  dossierId: string,
  inputs?: BilanInputs
): Promise<GenerateDocumentResult> {
  const dossier = await buildClientFromDossier(dossierId, conseillerId)
  if (!dossier) return { ok: false, error: 'Dossier introuvable ou accès refusé' }
  const missing = validateBilanInputs(inputs)
  if (missing.length > 0)
    return { ok: false, error: `Inputs Bilan manquants : ${missing.join(', ')}. Compléter le formulaire avant génération.` }
  const factsList = await listClientFacts(conseillerId, dossierId)
  const facts: Record<string, string | undefined> = {}
  for (const f of factsList) facts[f.fact_key] = f.fact_value
  const i = inputs!
  const props: BilanTemplateProps = {
    client: {
      prenom: dossier.prenom,
      nom: dossier.nom,
      email: dossier.email_client,
      telephone: dossier.telephone,
      age: facts.age,
      situation_familiale: facts.situation_familiale,
      domiciliation_fiscale: i.domiciliation_fiscale,
    },
    inputs: {
      synthese_patrimoine_resume: i.synthese_patrimoine_resume!,
      bilan_date: i.bilan_date,
      revenus_annuels_eur: i.revenus_annuels_eur ?? facts.revenus_annuels_eur,
      charges_annuelles_eur: i.charges_annuelles_eur ?? facts.charges_annuelles_eur,
      capacite_epargne_mensuelle_eur: i.capacite_epargne_mensuelle_eur,
      patrimoine_net_eur: i.patrimoine_net_eur ?? facts.patrimoine_total_eur,
      allocation_actuelle: i.allocation_actuelle!,
      purification_estimee_eur: i.purification_estimee_eur,
      purification_commentaire: i.purification_commentaire,
      zakat_base_eur: i.zakat_base_eur,
      zakat_estimee_eur: i.zakat_estimee_eur,
      zakat_date_hawl: i.zakat_date_hawl,
      zakat_nisab_reference: i.zakat_nisab_reference,
      points_vigilance: i.points_vigilance,
      recommandations_prioritaires: i.recommandations_prioritaires!,
    },
    generationDate: frenchDate(),
    dossierId,
  }
  return renderAndUpload({
    conseillerId,
    dossierId,
    type: 'bilan',
    filename: `BILAN_${dossier.prenom}_${dossier.nom}_${Date.now()}.pdf`,
    element: React.createElement(BilanTemplate, props),
    metadata: {
      dossier_nom_client: `${dossier.prenom} ${dossier.nom}`,
      template_version: 'bilan-v1',
      inputs_keys: Object.keys(inputs ?? {}),
      allocation_lignes: i.allocation_actuelle!.length,
      reco_lignes: i.recommandations_prioritaires!.length,
    },
  })
}

// Version service-role pour les routes background (auto-bilan, etc.)
export async function generateBilanForDossierAdmin(
  conseillerId: string,
  dossierId: string,
  inputs?: BilanInputs
): Promise<GenerateDocumentResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return { ok: false, error: 'Variables service role manquantes' }
  const svc = createServiceClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

  const { data: dossier } = await svc
    .from('dossiers')
    .select('id, conseiller_id, prenom, nom, email_client, telephone, offre_amana_cible')
    .eq('id', dossierId)
    .maybeSingle()
  if (!dossier) return { ok: false, error: 'Dossier introuvable (service role)' }

  const missing = validateBilanInputs(inputs)
  if (missing.length > 0)
    return { ok: false, error: `Inputs Bilan manquants : ${missing.join(', ')}.` }

  const { data: factRows } = await svc
    .from('client_facts')
    .select('fact_key, fact_value')
    .eq('dossier_id', dossierId)
  const facts: Record<string, string | undefined> = {}
  for (const f of (factRows ?? [])) facts[f.fact_key] = f.fact_value

  const i = inputs!
  const props: BilanTemplateProps = {
    client: {
      prenom: dossier.prenom,
      nom: dossier.nom,
      email: dossier.email_client,
      telephone: dossier.telephone,
      age: facts.age,
      situation_familiale: facts.situation_familiale,
      domiciliation_fiscale: i.domiciliation_fiscale,
    },
    inputs: {
      synthese_patrimoine_resume: i.synthese_patrimoine_resume!,
      bilan_date: i.bilan_date,
      revenus_annuels_eur: i.revenus_annuels_eur ?? facts.revenus_annuels_eur,
      charges_annuelles_eur: i.charges_annuelles_eur ?? facts.charges_annuelles_eur,
      capacite_epargne_mensuelle_eur: i.capacite_epargne_mensuelle_eur,
      patrimoine_net_eur: i.patrimoine_net_eur ?? facts.patrimoine_total_eur,
      allocation_actuelle: i.allocation_actuelle!,
      purification_estimee_eur: i.purification_estimee_eur,
      purification_commentaire: i.purification_commentaire,
      zakat_base_eur: i.zakat_base_eur,
      zakat_estimee_eur: i.zakat_estimee_eur,
      zakat_date_hawl: i.zakat_date_hawl,
      zakat_nisab_reference: i.zakat_nisab_reference,
      points_vigilance: i.points_vigilance,
      recommandations_prioritaires: i.recommandations_prioritaires!,
    },
    generationDate: frenchDate(),
    dossierId,
  }
  return renderAndUploadAdmin({
    conseillerId,
    dossierId,
    type: 'bilan',
    filename: `BILAN_${dossier.prenom}_${dossier.nom}_${Date.now()}.pdf`,
    element: React.createElement(BilanTemplate, props),
    metadata: {
      dossier_nom_client: `${dossier.prenom} ${dossier.nom}`,
      template_version: 'bilan-v1',
      inputs_keys: Object.keys(inputs ?? {}),
      allocation_lignes: i.allocation_actuelle!.length,
      reco_lignes: i.recommandations_prioritaires!.length,
    },
  })
}

export async function generatePrecoForDossier(
  conseillerId: string,
  dossierId: string,
  inputs?: PrecoInputs
): Promise<GenerateDocumentResult> {
  const dossier = await buildClientFromDossier(dossierId, conseillerId)
  if (!dossier) return { ok: false, error: 'Dossier introuvable ou accès refusé' }
  const missing = validatePrecoInputs(inputs)
  if (missing.length > 0)
    return { ok: false, error: `Inputs Préco manquants : ${missing.join(', ')}. Compléter le formulaire avant génération.` }
  const i = inputs!
  const props: PrecoTemplateProps = {
    client: { prenom: dossier.prenom, nom: dossier.nom, email: dossier.email_client, telephone: dossier.telephone },
    inputs: {
      mission_synthese: i.mission_synthese!,
      preco_date: i.preco_date,
      allocation_cible_detaillee: i.allocation_cible_detaillee!,
      enveloppes_choisies: i.enveloppes_choisies!,
      versement_initial_eur: i.versement_initial_eur,
      versements_programmes_eur: i.versements_programmes_eur,
      versements_frequence: i.versements_frequence,
      arbitrage_frequence: i.arbitrage_frequence,
      frais_entree_pct: i.frais_entree_pct,
      frais_gestion_annuel_pct: i.frais_gestion_annuel_pct,
      honoraires_amana: i.honoraires_amana,
      rendement_cible_annuel_pct: i.rendement_cible_annuel_pct,
      rendement_horizon: i.rendement_horizon,
      risques_identifies: i.risques_identifies,
      prochaine_revision_frequence: i.prochaine_revision_frequence!,
      prochaine_revision_date: i.prochaine_revision_date,
    },
    generationDate: frenchDate(),
    dossierId,
  }
  return renderAndUpload({
    conseillerId,
    dossierId,
    type: 'preco',
    filename: `PRECO_${dossier.prenom}_${dossier.nom}_${Date.now()}.pdf`,
    element: React.createElement(PrecoTemplate, props),
    metadata: {
      dossier_nom_client: `${dossier.prenom} ${dossier.nom}`,
      template_version: 'preco-v1',
      inputs_keys: Object.keys(inputs ?? {}),
      allocation_lignes: i.allocation_cible_detaillee!.length,
      enveloppes_count: i.enveloppes_choisies!.length,
    },
  })
}

export async function generateZakatForDossier(
  conseillerId: string,
  dossierId: string,
  inputs?: ZakatInputs
): Promise<GenerateDocumentResult> {
  const dossier = await buildClientFromDossier(dossierId, conseillerId)
  if (!dossier) return { ok: false, error: 'Dossier introuvable ou accès refusé' }
  const missing = validateZakatInputs(inputs)
  if (missing.length > 0)
    return { ok: false, error: `Inputs Zakat manquants : ${missing.join(', ')}. Compléter le formulaire avant génération.` }
  const i = inputs!
  const props: ZakatTemplateProps = {
    client: { prenom: dossier.prenom, nom: dossier.nom, email: dossier.email_client },
    inputs: {
      synthese_zakat_client: i.synthese_zakat_client!,
      zakat_date_reference: i.zakat_date_reference,
      nisab_or_eur: i.nisab_or_eur,
      nisab_argent_eur: i.nisab_argent_eur,
      nisab_date_reference: i.nisab_date_reference,
      nisab_retenu: i.nisab_retenu!,
      hawl_date_anniversaire: i.hawl_date_anniversaire!,
      bases_par_classe: i.bases_par_classe!,
      dettes_deductibles_eur: i.dettes_deductibles_eur,
      total_zakat_due_eur: i.total_zakat_due_eur,
      beneficiaires_choisis: i.beneficiaires_choisis,
      prochaine_echeance_paiement: i.prochaine_echeance_paiement,
      projection_pluriannuelle: i.projection_pluriannuelle,
      vigilance_specificites: i.vigilance_specificites,
    },
    generationDate: frenchDate(),
    dossierId,
  }
  return renderAndUpload({
    conseillerId,
    dossierId,
    type: 'zakat',
    filename: `ZAKAT_${dossier.prenom}_${dossier.nom}_${Date.now()}.pdf`,
    element: React.createElement(ZakatTemplate, props),
    metadata: {
      dossier_nom_client: `${dossier.prenom} ${dossier.nom}`,
      template_version: 'zakat-v1',
      inputs_keys: Object.keys(inputs ?? {}),
      bases_lignes: i.bases_par_classe!.length,
      projection_lignes: i.projection_pluriannuelle?.length ?? 0,
      nisab_retenu: i.nisab_retenu,
    },
  })
}

// =====================================================================
// SUCCESSION (NEW v3.4)
// =====================================================================
export async function generateSuccessionForDossier(
  conseillerId: string,
  dossierId: string,
  inputs?: SuccessionInputs
): Promise<GenerateDocumentResult> {
  const dossier = await buildClientFromDossier(dossierId, conseillerId)
  if (!dossier) return { ok: false, error: 'Dossier introuvable ou accès refusé' }

  const missing = validateSuccessionInputs(inputs)
  if (missing.length > 0) {
    return {
      ok: false,
      error: `Inputs Succession manquants : ${missing.join(', ')}. Compléter le formulaire avant génération.`,
    }
  }

  const factsList = await listClientFacts(conseillerId, dossierId)
  const facts: Record<string, string | undefined> = {}
  for (const f of factsList) facts[f.fact_key] = f.fact_value

  const i = inputs!

  const props: SuccessionTemplateProps = {
    client: {
      prenom: dossier.prenom,
      nom: dossier.nom,
      email: dossier.email_client,
      age: facts.age,
    },
    inputs: {
      synthese_situation: i.synthese_situation!,
      date_reference: i.date_reference,
      statut_matrimonial: i.statut_matrimonial!,
      regime_matrimonial_detail: i.regime_matrimonial_detail,
      composition_familiale: i.composition_familiale,
      patrimoine_succession_eur: i.patrimoine_succession_eur,
      heritiers: i.heritiers!,
      synthese_parts_coraniques: i.synthese_parts_coraniques,
      synthese_parts_droit_francais: i.synthese_parts_droit_francais,
      ecarts_explication: i.ecarts_explication,
      actions_proposees: i.actions_proposees!,
      points_attention: i.points_attention,
      notaire_referent: i.notaire_referent,
      prochaine_etape: i.prochaine_etape,
    },
    generationDate: frenchDate(),
    dossierId,
  }

  return renderAndUpload({
    conseillerId,
    dossierId,
    type: 'succession',
    filename: `SUCCESSION_${dossier.prenom}_${dossier.nom}_${Date.now()}.pdf`,
    element: React.createElement(SuccessionTemplate, props),
    metadata: {
      dossier_nom_client: `${dossier.prenom} ${dossier.nom}`,
      template_version: 'succession-v1',
      inputs_keys: Object.keys(inputs ?? {}),
      heritiers_count: i.heritiers!.length,
      actions_count: i.actions_proposees!.length,
      statut_matrimonial: i.statut_matrimonial,
    },
  })
}

// =====================================================================
// Validations
// =====================================================================
function validateLmInputs(i: LmInputs | undefined): string[] {
  const m: string[] = []
  if (!i?.objectifs_client?.trim()) m.push('objectifs_client')
  if (!i?.duree_mission?.trim()) m.push('duree_mission')
  return m
}
function validateRaInputs(i: RaInputs | undefined): string[] {
  const m: string[] = []
  if (!i?.bilan_mizan_resume?.trim()) m.push('bilan_mizan_resume')
  if (!Array.isArray(i?.allocation_cible) || i.allocation_cible.length === 0)
    m.push('allocation_cible')
  else if (i.allocation_cible.some((a) => !a.classe?.trim() || !a.pourcentage?.trim()))
    m.push('allocation_cible (lignes incomplètes)')
  if (!i?.justification_adequation?.trim()) m.push('justification_adequation')
  return m
}
function validateBilanInputs(i: BilanInputs | undefined): string[] {
  const m: string[] = []
  if (!i?.synthese_patrimoine_resume?.trim()) m.push('synthese_patrimoine_resume')
  if (!Array.isArray(i?.allocation_actuelle) || i.allocation_actuelle.length === 0)
    m.push('allocation_actuelle')
  else if (
    i.allocation_actuelle.some(
      (a) => !a.classe?.trim() || !a.montant_eur?.trim() || !['halal', 'douteux', 'haram'].includes(a.statut_sharia)
    )
  )
    m.push('allocation_actuelle (lignes incomplètes)')
  if (!Array.isArray(i?.recommandations_prioritaires) || i.recommandations_prioritaires.length === 0)
    m.push('recommandations_prioritaires')
  else if (
    i.recommandations_prioritaires.some((r) => !r.action?.trim() || !['immediat', '6_mois', '12_mois'].includes(r.horizon))
  )
    m.push('recommandations_prioritaires (lignes incomplètes)')
  return m
}
function validatePrecoInputs(i: PrecoInputs | undefined): string[] {
  const m: string[] = []
  if (!i?.mission_synthese?.trim()) m.push('mission_synthese')
  if (!Array.isArray(i?.allocation_cible_detaillee) || i.allocation_cible_detaillee.length === 0)
    m.push('allocation_cible_detaillee')
  else if (
    i.allocation_cible_detaillee.some(
      (a) => !a.classe?.trim() || !a.montant_eur?.trim() || !a.pourcentage?.trim()
    )
  )
    m.push('allocation_cible_detaillee (lignes incomplètes)')
  if (!Array.isArray(i?.enveloppes_choisies) || i.enveloppes_choisies.length === 0)
    m.push('enveloppes_choisies')
  else if (
    i.enveloppes_choisies.some(
      (e) => !e.montant_eur?.trim() || !['av_vie_plus', 'cto_intencial', 'hors_enveloppe'].includes(e.type)
    )
  )
    m.push('enveloppes_choisies (lignes incomplètes)')
  if (
    !i?.prochaine_revision_frequence ||
    !['semestrielle', 'annuelle', 'biennale'].includes(i.prochaine_revision_frequence)
  )
    m.push('prochaine_revision_frequence')
  return m
}
function validateZakatInputs(i: ZakatInputs | undefined): string[] {
  const m: string[] = []
  if (!i?.synthese_zakat_client?.trim()) m.push('synthese_zakat_client')
  if (!i?.nisab_retenu || !['or', 'argent'].includes(i.nisab_retenu)) m.push('nisab_retenu')
  if (!i?.hawl_date_anniversaire?.trim()) m.push('hawl_date_anniversaire')
  if (!Array.isArray(i?.bases_par_classe) || i.bases_par_classe.length === 0)
    m.push('bases_par_classe')
  else if (
    i.bases_par_classe.some(
      (b) =>
        !b.classe?.trim() ||
        !b.montant_zakatable_eur?.trim() ||
        !b.taux?.trim() ||
        !b.zakat_due_eur?.trim()
    )
  )
    m.push('bases_par_classe (lignes incomplètes)')
  return m
}

const VALID_STATUT_MATRIMONIAL = [
  'celibataire',
  'marie_communaute_reduite',
  'marie_separation_biens',
  'marie_communaute_universelle',
  'pacs',
  'divorce',
  'veuf',
] as const
const VALID_OUTILS = [
  'donation_entre_epoux',
  'donation_partage',
  'demembrement',
  'av_beneficiaires',
  'testament',
  'waqf',
  'autre',
] as const

/**
 * Succession — minimum requis :
 *   - synthese_situation : cadrage (qui, situation familiale, ordre des priorités)
 *   - statut_matrimonial : pivot fiscal et successoral
 *   - heritiers : ≥ 1 ligne avec lien + nom (parts laissées libres car
 *                  validation Sakina ultérieure)
 *   - actions_proposees : ≥ 1 outil (sinon le doc n'a pas d'objet)
 */
function validateSuccessionInputs(i: SuccessionInputs | undefined): string[] {
  const m: string[] = []
  if (!i?.synthese_situation?.trim()) m.push('synthese_situation')
  if (!i?.statut_matrimonial || !VALID_STATUT_MATRIMONIAL.includes(i.statut_matrimonial))
    m.push('statut_matrimonial')
  if (!Array.isArray(i?.heritiers) || i.heritiers.length === 0)
    m.push('heritiers')
  else if (i.heritiers.some((h) => !h.lien || !h.nom?.trim()))
    m.push('heritiers (lignes incomplètes)')
  if (!Array.isArray(i?.actions_proposees) || i.actions_proposees.length === 0)
    m.push('actions_proposees')
  else if (
    i.actions_proposees.some(
      (a) => !a.titre?.trim() || !a.outil || !VALID_OUTILS.includes(a.outil)
    )
  )
    m.push('actions_proposees (lignes incomplètes)')
  return m
}

// =====================================================================
// Helper interne
// =====================================================================
async function renderAndUpload(params: {
  conseillerId: string
  dossierId: string
  type: DocumentType
  filename: string
  element: React.ReactElement
  metadata?: Record<string, unknown>
}): Promise<GenerateDocumentResult> {
  let pdfBuffer: Buffer
  try {
    const elementCast = params.element as unknown as React.ReactElement<DocumentProps>
    pdfBuffer = await renderToBuffer(elementCast)
  } catch (err) {
    console.error(`[generate-pdf v3.4] erreur rendu ${params.type}`, err)
    const message = err instanceof Error ? err.message : 'Erreur rendu PDF'
    return { ok: false, error: `Erreur génération PDF : ${message}` }
  }
  const safeFilename = params.filename.replace(/[^a-zA-Z0-9_.-]/g, '_')
  const result = await uploadAndRegisterDocument({
    conseillerId: params.conseillerId,
    dossierId: params.dossierId,
    type: params.type,
    pdfBuffer,
    filename: safeFilename,
    metadata: { ...(params.metadata ?? {}), generation_date: new Date().toISOString() },
  })
  if (result.ok) {
    try {
      await applyGateAfterDocumentGenerated(params.dossierId, params.type)
    } catch (err) {
      console.error(`[generate-pdf] gate pending (${params.type})`, err)
      return {
        ok: false,
        error:
          err instanceof Error
            ? `PDF créé mais verrou admin non enregistré : ${err.message}`
            : 'PDF créé mais verrou admin non enregistré',
      }
    }
  }
  return result
}

async function renderAndUploadAdmin(params: {
  conseillerId: string
  dossierId: string
  type: DocumentType
  filename: string
  element: React.ReactElement
  metadata?: Record<string, unknown>
}): Promise<GenerateDocumentResult> {
  let pdfBuffer: Buffer
  try {
    const elementCast = params.element as unknown as React.ReactElement<DocumentProps>
    pdfBuffer = await renderToBuffer(elementCast)
  } catch (err) {
    console.error(`[generate-pdf] erreur rendu admin ${params.type}`, err)
    const message = err instanceof Error ? err.message : 'Erreur rendu PDF'
    return { ok: false, error: `Erreur génération PDF : ${message}` }
  }
  const safeFilename = params.filename.replace(/[^a-zA-Z0-9_.-]/g, '_')
  return uploadAndRegisterDocumentAdmin({
    conseillerId: params.conseillerId,
    dossierId: params.dossierId,
    type: params.type,
    pdfBuffer,
    filename: safeFilename,
    metadata: { ...(params.metadata ?? {}), generation_date: new Date().toISOString() },
  })
}

// =====================================================================
// LCB-FT — Score 4 axes
// =====================================================================

export type LcbftInputs = {
  note_lcbft?: string
}

function computeLcbftAxes(kyc: Record<string, unknown>): {
  axeGeographique: LcbftAxe
  axeClient: LcbftAxe
  axeOperation: LcbftAxe
  axeCanal: LcbftAxe
  scoreTotal: number
  niveauRisque: 'faible' | 'modere' | 'eleve'
} {
  const nationalite = (kyc.nationalite as string) || 'Française'
  const pays = (kyc.pays as string) || 'France'
  const fatca = Boolean(kyc.fatca_us_person)
  const ppe = Boolean(kyc.ppe)
  const ppeEntourage = Boolean(kyc.ppe_entourage)
  const revenu = (kyc.revenu_foyer as string) || ''
  const toleranceRisque = Number(kyc.tolerance_risque ?? 0)
  const objectif = (kyc.objectif_investissement as string) || ''
  const patrimoineNet = parseInt((kyc.patrimoine_net as string) || '0', 10)
  const adresseFiscaleIdentique = kyc.adresse_fiscale_identique !== false
  const source = (kyc.source_acquisition as string) || ''

  const geo: LcbftAxe = {
    label: 'Axe géographique',
    items: [
      { libelle: 'Nationalité non-française', valeur: nationalite !== 'Française', points: nationalite !== 'Française' ? 1 : 0 },
      { libelle: 'Résidence hors France', valeur: pays !== 'France', points: pays !== 'France' ? 1 : 0 },
      { libelle: 'Personne FATCA / Résidence fiscale US', valeur: fatca, points: fatca ? 2 : 0 },
      { libelle: 'Domiciliation fiscale différente de résidence', valeur: !adresseFiscaleIdentique, points: !adresseFiscaleIdentique ? 1 : 0 },
    ],
    score: 0,
  }
  geo.score = geo.items.reduce((s, i) => s + i.points, 0)

  const client: LcbftAxe = {
    label: 'Axe client',
    items: [
      { libelle: 'PPE directe', valeur: ppe, points: ppe ? 3 : 0 },
      { libelle: 'Entourage PPE', valeur: ppeEntourage, points: ppeEntourage ? 2 : 0 },
      { libelle: 'Revenus élevés (> 150k€)', valeur: revenu === 'gt150k', points: revenu === 'gt150k' ? 2 : revenu === '75-150k' ? 1 : 0 },
    ],
    score: 0,
  }
  client.score = client.items.reduce((s, i) => s + i.points, 0)

  const operation: LcbftAxe = {
    label: 'Axe opération',
    items: [
      { libelle: 'Incohérence patrimoine élevé / revenus faibles', valeur: patrimoineNet > 500000 && revenu === 'lt25k', points: patrimoineNet > 500000 && revenu === 'lt25k' ? 2 : 0 },
      { libelle: 'Objectif valorisation capital (profil dynamique)', valeur: objectif === 'valorisation_capital', points: objectif === 'valorisation_capital' ? 1 : 0 },
      { libelle: 'Tolérance risque élevée (score ≥ 4/5)', valeur: toleranceRisque >= 4, points: toleranceRisque >= 4 ? 1 : 0 },
    ],
    score: 0,
  }
  operation.score = operation.items.reduce((s, i) => s + i.points, 0)

  const canal: LcbftAxe = {
    label: 'Axe canal de distribution',
    items: [
      { libelle: 'Prospection funnel public (non recommandé)', valeur: source === 'site_web' || source === 'publicite', points: source === 'site_web' || source === 'publicite' ? 1 : 0 },
      { libelle: 'Entrée en relation via réseau / recommandation', valeur: source === 'recommandation' || source === 'evenement', points: 0 },
    ],
    score: 0,
  }
  canal.score = canal.items.reduce((s, i) => s + i.points, 0)

  const scoreTotal = geo.score + client.score + operation.score + canal.score
  const niveauRisque: 'faible' | 'modere' | 'eleve' = scoreTotal >= 8 ? 'eleve' : scoreTotal >= 4 ? 'modere' : 'faible'

  return { axeGeographique: geo, axeClient: client, axeOperation: operation, axeCanal: canal, scoreTotal, niveauRisque }
}

/**
 * Génère la fiche LCB-FT automatiquement à partir des données KYC du dossier.
 * Appelé en background après validation KYC (V1).
 */
export async function generateLcbftForDossier(
  dossierId: string,
  conseillerId: string,
  inputs?: LcbftInputs,
): Promise<GenerateDocumentResult> {
  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )

  const { data: dossier } = await svc
    .from('dossiers')
    .select('id, prenom, nom, email_client, telephone, conseiller_id')
    .eq('id', dossierId)
    .maybeSingle()
  if (!dossier) return { ok: false, error: 'Dossier introuvable' }

  const { data: kycRow } = await svc
    .from('kyc')
    .select('*')
    .eq('dossier_id', dossierId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const kyc: Record<string, unknown> = (kycRow ?? {}) as Record<string, unknown>
  const { axeGeographique, axeClient, axeOperation, axeCanal, scoreTotal, niveauRisque } = computeLcbftAxes(kyc)

  const props = {
    client: { prenom: dossier.prenom, nom: dossier.nom, email: dossier.email_client, nationalite: kyc.nationalite as string | null },
    dossierId,
    generationDate: frenchDate(),
    axeGeographique,
    axeClient,
    axeOperation,
    axeCanal,
    scoreTotal,
    niveauRisque,
    noteLcbft: inputs?.note_lcbft,
  }

  return renderAndUploadAdmin({
    conseillerId: dossier.conseiller_id ?? conseillerId,
    dossierId,
    type: 'lcbft',
    filename: `LCBFT_${dossier.prenom}_${dossier.nom}_${Date.now()}.pdf`,
    element: React.createElement(LcbftTemplate, props),
    metadata: { score_lcbft: scoreTotal, niveau_risque: niveauRisque, template_version: 'lcbft-v1' },
  })
}

// =====================================================================
// PPE Annexe
// =====================================================================

export async function generatePpeAnnexeForDossier(
  dossierId: string,
  conseillerId: string,
): Promise<GenerateDocumentResult> {
  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )

  const { data: dossier } = await svc
    .from('dossiers')
    .select('id, prenom, nom, email_client, conseiller_id')
    .eq('id', dossierId)
    .maybeSingle()
  if (!dossier) return { ok: false, error: 'Dossier introuvable' }

  const { data: kycRow } = await svc
    .from('kyc')
    .select('*')
    .eq('dossier_id', dossierId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const kyc: Record<string, unknown> = (kycRow ?? {}) as Record<string, unknown>
  const isPpe = Boolean(kyc.ppe)
  const isPpeEntourage = Boolean(kyc.ppe_entourage)

  const props = {
    client: { prenom: dossier.prenom, nom: dossier.nom, email: dossier.email_client },
    dossierId,
    generationDate: frenchDate(),
    typePpe: (isPpe ? 'ppe_directe' : 'entourage_ppe') as 'ppe_directe' | 'entourage_ppe',
    fonctionPpe: kyc.ppe_fonction as string | undefined,
    origineFonds: kyc.origine_fonds as string | undefined,
    montantPatrimoineEstime: kyc.patrimoine_net as string | undefined,
  }

  return renderAndUploadAdmin({
    conseillerId: dossier.conseiller_id ?? conseillerId,
    dossierId,
    type: 'ppe_annexe',
    filename: `PPE_${dossier.prenom}_${dossier.nom}_${Date.now()}.pdf`,
    element: React.createElement(PpeTemplate, props),
    metadata: { ppe_directe: isPpe, ppe_entourage: isPpeEntourage, template_version: 'ppe-v1' },
  })
}

// =====================================================================
// Bulletin de souscription
// =====================================================================

export type BulletinInputs = {
  produit?: string
  assureur?: string
  isin?: string
  versement_initial_eur?: number
  versements_programmes_eur?: number
  frequence_versements?: FreqVersementBulletin
  duree_contrat_ans?: number
  beneficiaires?: BeneficiaireLine[]
  unite_compte?: string
  frais_entree_pct?: number
  frais_gestion_annuel_pct?: number
  objectif_gestion?: string
  numero_police?: string
}

export async function generateBulletinSouscriptionForDossier(
  conseillerId: string,
  dossierId: string,
  inputs: BulletinInputs,
): Promise<GenerateDocumentResult> {
  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )

  const { data: dossier } = await svc
    .from('dossiers')
    .select('id, prenom, nom, email_client, telephone, conseiller_id')
    .eq('id', dossierId)
    .maybeSingle()
  if (!dossier) return { ok: false, error: 'Dossier introuvable' }

  const props = {
    client: {
      prenom: dossier.prenom,
      nom: dossier.nom,
      email: dossier.email_client,
      telephone: dossier.telephone,
    },
    dossierId,
    generationDate: frenchDate(),
    produit: inputs.produit ?? 'Produit AMANA',
    assureur: inputs.assureur,
    isin: inputs.isin,
    versementInitialEur: inputs.versement_initial_eur ?? 0,
    versementsProgrammesEur: inputs.versements_programmes_eur,
    frequenceVersements: inputs.frequence_versements,
    dureeContratAns: inputs.duree_contrat_ans,
    beneficiaires: inputs.beneficiaires,
    uniteCompte: inputs.unite_compte,
    fraisEntreePct: inputs.frais_entree_pct,
    fraisGestionAnnuelPct: inputs.frais_gestion_annuel_pct,
    objectifGestion: inputs.objectif_gestion,
    numeroPolice: inputs.numero_police,
  }

  const effectiveConseillerId = dossier.conseiller_id ?? conseillerId
  return renderAndUploadAdmin({
    conseillerId: effectiveConseillerId,
    dossierId,
    type: 'bulletin',
    filename: `BULLETIN_${inputs.produit ?? 'souscription'}_${dossier.prenom}_${dossier.nom}_${Date.now()}.pdf`,
    element: React.createElement(BulletinSouscriptionTemplate, props),
    metadata: { produit: inputs.produit, assureur: inputs.assureur, template_version: 'bulletin-v1' },
  })
}

// =====================================================================
// Fiche KYC complétée (PDF AMANA officiel)
// Spec étape 3 — générée automatiquement après validation KYC Mohamed
// =====================================================================
export async function generateKycFicheForDossier(
  dossierId: string,
  conseillerId: string,
): Promise<GenerateDocumentResult> {
  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )

  const { data: dossier } = await svc
    .from('dossiers')
    .select('id, prenom, nom, email_client, telephone, conseiller_id')
    .eq('id', dossierId)
    .maybeSingle()
  if (!dossier) return { ok: false, error: 'Dossier introuvable' }

  const { data: kycRow } = await svc
    .from('kyc')
    .select('*')
    .eq('dossier_id', dossierId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const kyc = (kycRow ?? {}) as Record<string, unknown>

  const props: KycTemplateProps = {
    client: {
      prenom:               dossier.prenom ?? '',
      nom:                  dossier.nom ?? '',
      email:                dossier.email_client ?? undefined,
      telephone:            dossier.telephone ?? undefined,
      date_naissance:       kyc.date_naissance as string | undefined,
      lieu_naissance:       kyc.lieu_naissance as string | undefined,
      nationalite:          kyc.nationalite as string | undefined,
      adresse:              kyc.adresse as string | undefined,
      code_postal:          kyc.code_postal as string | undefined,
      ville:                kyc.ville as string | undefined,
      pays_residence:       (kyc.pays_residence as string | undefined) ?? 'France',
      domiciliation_fiscale:(kyc.domiciliation_fiscale as string | undefined) ?? 'France',
      numero_fiscal:        kyc.numero_fiscal as string | undefined,
      situation_familiale:  kyc.situation_familiale as string | undefined,
      nb_enfants:           kyc.nb_enfants as number | undefined,
      profession:           kyc.profession as string | undefined,
      employeur:            kyc.employeur as string | undefined,
      csp:                  kyc.csp as string | undefined,
    },
    kyc: {
      qualite_declarant:              (kyc.qualite_declarant as string | undefined) ?? 'Client',
      patrimoine_net_eur:             kyc.patrimoine_net_eur as string | undefined,
      revenus_annuels_eur:            kyc.revenus_annuels_eur as string | undefined,
      charges_annuelles_eur:          kyc.charges_annuelles_eur as string | undefined,
      capacite_epargne_mensuelle_eur: kyc.capacite_epargne_mensuelle_eur as string | undefined,
      origine_fonds:                  kyc.origine_fonds as string | undefined,
      ppe:                            Boolean(kyc.ppe),
      ppe_fonction:                   kyc.ppe_fonction as string | undefined,
      ppe_entourage:                  Boolean(kyc.ppe_entourage),
      ppe_entourage_lien:             kyc.ppe_entourage_lien as string | undefined,
      risque_lcbft:                   kyc.risque_lcbft as 'faible' | 'modere' | 'eleve' | undefined,
      statut:                         (kyc.statut as string) ?? 'valide',
    },
    generationDate: frenchDate(),
    dossierId,
    conseillerNom:  'AMANA Patrimoine',
  }

  return renderAndUploadAdmin({
    conseillerId,
    dossierId,
    type: 'kyc_fiche',
    filename: `KYC_${dossier.prenom}_${dossier.nom}_${Date.now()}.pdf`,
    element: React.createElement(KycTemplate, props),
    metadata: {
      dossier_nom_client: `${dossier.prenom} ${dossier.nom}`,
      template_version: 'kyc-v1',
      ppe: Boolean(kyc.ppe),
      ppe_entourage: Boolean(kyc.ppe_entourage),
      risque_lcbft: kyc.risque_lcbft,
    },
  })
}

// =====================================================================
// Profil de Risque Investisseur (PDF MIF II)
// Spec étape 4 — généré après validation V2 par Mohamed
// Article 25 MIF II + L.541-8-1 CMF
// =====================================================================
export type ProfilRisqueInputs = {
  connaissance_experience?: 'aucune' | 'moderee' | 'bonne' | 'elevee'
  produits_detenus?: string[]
  reaction_baisse_20pct?: 'vendre' | 'inquiet' | 'conserver' | 'racheter'
  montant_envisage_eur?: string
  pct_patrimoine?: string
  perte_max_acceptable_pct?: string
  horizon_placement_ans?: number
  retrait_planifie?: boolean
  epargne_precaution_eur?: string
  esg_preference?: string
  esg_pct_min?: number
  esg_indicateurs?: string[]
  points_q41?: number
  points_q42?: number
  points_q43?: number
  points_q44?: number
  points_q45?: number
  profil_retenu?: ProfilRetenu
  score_total?: number
  commentaire_conseiller?: string
}

function computeProfilFromScore(score: number): ProfilRetenu {
  if (score <= 5)  return 'prudent'
  if (score <= 10) return 'equilibre'
  if (score <= 15) return 'dynamique'
  return 'offensif'
}

export async function generateProfilRisqueForDossier(
  dossierId: string,
  conseillerId: string,
  inputs?: ProfilRisqueInputs,
): Promise<GenerateDocumentResult> {
  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )

  const { data: dossier } = await svc
    .from('dossiers')
    .select('id, prenom, nom, email_client, conseiller_id')
    .eq('id', dossierId)
    .maybeSingle()
  if (!dossier) return { ok: false, error: 'Dossier introuvable' }

  // Récupérer données MIF2 si disponibles
  const { data: mif2 } = await svc
    .from('mif2')
    .select('*')
    .eq('dossier_id', dossierId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data: onb } = await svc
    .from('onboarding_sessions')
    .select('capacite_pertes, horizon_annees, esg_preference, esg_pct_min, esg_indicateurs')
    .eq('email', dossier.email_client ?? '')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const m = (mif2 ?? {}) as Record<string, unknown>
  const i = inputs ?? {}

  const scoreTotal = i.score_total ?? (m.score_total as number | undefined) ?? 8
  const profilRetenu: ProfilRetenu =
    i.profil_retenu ??
    (m.profil_retenu as ProfilRetenu | undefined) ??
    computeProfilFromScore(scoreTotal)

  const props: ProfilRisqueTemplateProps = {
    client: {
      prenom: dossier.prenom ?? '',
      nom:    dossier.nom ?? '',
      email:  dossier.email_client ?? undefined,
    },
    questionnaire: {
      connaissance_experience: i.connaissance_experience ?? (m.connaissance_experience as ProfilRisqueTemplateProps['questionnaire']['connaissance_experience']) ?? 'moderee',
      produits_detenus:        i.produits_detenus ?? (m.produits_detenus as string[] | undefined),
      reaction_baisse_20pct:   i.reaction_baisse_20pct ?? (m.reaction_baisse_20pct as ProfilRisqueTemplateProps['questionnaire']['reaction_baisse_20pct']) ?? 'conserver',
      montant_envisage_eur:    i.montant_envisage_eur ?? (m.montant_envisage_eur as string | undefined),
      pct_patrimoine:          i.pct_patrimoine ?? (m.pct_patrimoine as string | undefined),
      perte_max_acceptable_pct: i.perte_max_acceptable_pct ?? (m.perte_max_acceptable_pct as string | undefined),
      horizon_placement_ans:   i.horizon_placement_ans ?? (m.horizon_annees as number | undefined) ?? (onb?.horizon_annees as number | undefined),
      retrait_planifie:        Boolean(i.retrait_planifie ?? m.retrait_planifie),
      epargne_precaution_eur:  i.epargne_precaution_eur as string | undefined,
      esg_preference:          i.esg_preference ?? (m.esg_preference as string | undefined) ?? (onb?.esg_preference as string | undefined),
      esg_pct_min:             i.esg_pct_min ?? (m.esg_pct_min as number | undefined) ?? (onb?.esg_pct_min as number | undefined),
      esg_indicateurs:         i.esg_indicateurs ?? (m.esg_indicateurs as string[] | undefined) ?? (onb?.esg_indicateurs as string[] | undefined),
      points_q41: i.points_q41,
      points_q42: i.points_q42,
      points_q43: i.points_q43,
      points_q44: i.points_q44,
      points_q45: i.points_q45,
    },
    profil_retenu:          profilRetenu,
    score_total:            scoreTotal,
    score_max:              20,
    commentaire_conseiller: i.commentaire_conseiller ?? (m.commentaire_conseiller as string | undefined),
    generationDate:         frenchDate(),
    dossierId,
    conseillerNom:          'AMANA Patrimoine',
  }

  return renderAndUploadAdmin({
    conseillerId,
    dossierId,
    type: 'profil_risque',
    filename: `PROFIL_RISQUE_${dossier.prenom}_${dossier.nom}_${Date.now()}.pdf`,
    element: React.createElement(ProfilRisqueTemplate, props),
    metadata: {
      dossier_nom_client: `${dossier.prenom} ${dossier.nom}`,
      template_version:   'profil-risque-v1',
      profil_retenu:      profilRetenu,
      score_total:        scoreTotal,
    },
  })
}
