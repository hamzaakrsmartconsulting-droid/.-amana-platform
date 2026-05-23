// scripts/mark-dossier-signed.mjs
//
// DEV ONLY — Force le marquage "signed" sur les documents en attente Yousign
// d'un dossier (pack DER+LM+RA ou autre), puis applique la transition pipeline
// équivalente au webhook signature_request.signed.
//
// Usage :
//   node scripts/mark-dossier-signed.mjs <dossierId-ou-email>
//   node scripts/mark-dossier-signed.mjs a17e6477-d663-4ed3-838c-b8a659153356
//   node scripts/mark-dossier-signed.mjs hamzalazigheb@gmail.com
//
// Effet :
//   - documents.yousign_status = 'signed' + yousign_signed_at = now
//   - Si le pack contient (der+lm+ra) ou (lm+ra) : pipeline → 'souscription'
//   - Sinon : applique la transition unitaire (lm seul, der seul, etc.)
//   - Insère dossier_stage_history + audit_logs pour traçabilité

import fs from 'fs'
import { createClient } from '@supabase/supabase-js'

const envPath = new URL('../.env.local', import.meta.url)
const env = Object.fromEntries(
  fs
    .readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i), l.slice(i + 1)]
    }),
)

const sb = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
)

const arg = process.argv[2]
if (!arg) {
  console.error('Usage : node scripts/mark-dossier-signed.mjs <dossierId-ou-email>')
  process.exit(1)
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

let dossierQuery
if (UUID_RE.test(arg)) {
  dossierQuery = sb.from('dossiers').select('*').eq('id', arg).maybeSingle()
} else {
  dossierQuery = sb
    .from('dossiers')
    .select('*')
    .ilike('email_client', arg)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
}

const { data: dossier, error: dErr } = await dossierQuery
if (dErr || !dossier) {
  console.error('Dossier introuvable :', arg, dErr?.message ?? '')
  process.exit(1)
}

console.log(`Dossier trouvé : ${dossier.prenom} ${dossier.nom} (${dossier.id}) — stage actuel : ${dossier.pipeline_stage}`)

const { data: pendingDocs, error: pErr } = await sb
  .from('documents')
  .select('id, type, filename, yousign_signature_request_id, yousign_status, storage_path, project_id')
  .eq('dossier_id', dossier.id)
  .eq('yousign_status', 'pending')
  .not('yousign_signature_request_id', 'is', null)

if (pErr) {
  console.error('Erreur listing docs :', pErr.message)
  process.exit(1)
}

if (!pendingDocs?.length) {
  console.log('Aucun document Yousign en attente sur ce dossier.')
  process.exit(0)
}

const bySigReq = new Map()
for (const d of pendingDocs) {
  const list = bySigReq.get(d.yousign_signature_request_id) ?? []
  list.push(d)
  bySigReq.set(d.yousign_signature_request_id, list)
}

const now = new Date().toISOString()

function isPackSouscription(types) {
  const set = new Set(types)
  if (set.has('der') && set.has('lm') && set.has('ra')) return true
  if (set.has('lm') && set.has('ra')) return true
  return false
}

let latestStage = dossier.pipeline_stage
for (const [sigReqId, docs] of bySigReq) {
  const types = docs.map((d) => d.type)
  console.log(`  Procédure ${sigReqId} : ${types.join(', ')}`)

  const { error: uErr } = await sb
    .from('documents')
    .update({ yousign_status: 'signed', yousign_signed_at: now })
    .eq('yousign_signature_request_id', sigReqId)
  if (uErr) {
    console.error('    update docs error:', uErr.message)
    continue
  }
  console.log(`    ✓ ${docs.length} document(s) marqué(s) signed`)

  await sb
    .from('signature_requests')
    .update({ statut: 'signe', signed_at: now, updated_at: now })
    .eq('provider_id', sigReqId)

  // Si tous les docs partagent un project_id → pipeline 2 (souscription
  // complémentaire) → on transitionne le projet vers 'signes' au lieu du
  // dossier.
  const projectIds = Array.from(
    new Set(docs.map((d) => d.project_id).filter(Boolean)),
  )
  const allDocsTargetSameProject =
    projectIds.length === 1 && docs.every((d) => d.project_id === projectIds[0])

  if (allDocsTargetSameProject) {
    const projectId = projectIds[0]
    const { data: proj } = await sb
      .from('projects')
      .select('id, pipeline_stage, conseiller_id')
      .eq('id', projectId)
      .maybeSingle()
    const fromStage = proj?.pipeline_stage ?? null
    const { error: upErr } = await sb
      .from('projects')
      .update({
        pipeline_stage: 'signes',
        pipeline_stage_updated_at: now,
        updated_at: now,
      })
      .eq('id', projectId)
    if (upErr) {
      console.error('    project transition error:', upErr.message)
      continue
    }
    await sb.from('project_stage_history').insert({
      project_id: projectId,
      conseiller_id: proj?.conseiller_id ?? dossier.conseiller_id,
      from_stage: fromStage,
      to_stage: 'signes',
      triggered_by: 'manual',
      trigger_context: { source: 'dev_script_mark_signed', sig_req_id: sigReqId, docs: types },
      notes: `Pack ${types.join('+')} signé (DEV script) → signes`,
    })
    console.log(`    ✓ project ${projectId} : ${fromStage ?? '∅'} → signes`)
    continue
  }

  let toStage = null
  let notes = ''
  if (isPackSouscription(types)) {
    toStage = 'souscription'
    notes = types.includes('der')
      ? 'Pack DER+LM+RA signé (DEV script) → souscription'
      : 'LM + RA signés (DEV script) → souscription'
  } else if (types.includes('lm')) {
    toStage = 'lm_signee'
    notes = 'LM signée (DEV script)'
  } else if (types.includes('der')) {
    toStage = 'der_signe'
    notes = 'DER signé (DEV script)'
  } else if (types.includes('bulletin')) {
    toStage = 'actif'
    notes = 'Bulletin signé (DEV script) → actif'
  } else if (types.includes('ra')) {
    toStage = 'souscription'
    notes = 'RA signé seul (DEV script) → souscription'
  }

  if (toStage && latestStage !== toStage) {
    const { error: stErr } = await sb
      .from('dossiers')
      .update({
        pipeline_stage: toStage,
        pipeline_stage_updated_at: now,
      })
      .eq('id', dossier.id)
    if (stErr) {
      console.error('    transition error:', stErr.message)
      continue
    }
    await sb.from('dossier_stage_history').insert({
      dossier_id: dossier.id,
      conseiller_id: dossier.conseiller_id,
      from_stage: latestStage,
      to_stage: toStage,
      triggered_by: 'manual',
      trigger_context: { source: 'dev_script_mark_signed', sig_req_id: sigReqId, docs: types },
      notes,
    })
    console.log(`    ✓ pipeline ${latestStage} → ${toStage}`)
    latestStage = toStage
  }
}

await sb.from('audit_logs').insert({
  user_id: dossier.conseiller_id,
  action: 'dev.mark_dossier_signed',
  entity_type: 'dossier',
  entity_id: dossier.id,
  metadata: {
    pending_count: pendingDocs.length,
    new_stage: latestStage,
    via: 'scripts/mark-dossier-signed.mjs',
  },
})

console.log(`\nTerminé. Stage final : ${latestStage}`)
