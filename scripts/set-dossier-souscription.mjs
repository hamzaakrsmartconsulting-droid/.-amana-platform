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

const email = process.argv[2] ?? 'hamzaakrsmartconsulting@gmail.com'

const { data: rows, error: qErr } = await sb
  .from('dossiers')
  .select('id, prenom, nom, email_client, pipeline_stage, conseiller_id')
  .ilike('email_client', email)
  .order('updated_at', { ascending: false })
  .limit(1)

if (qErr || !rows?.length) {
  console.error('Dossier introuvable pour', email, qErr?.message)
  process.exit(1)
}

const d = rows[0]
const now = new Date().toISOString()
const { error: uErr } = await sb
  .from('dossiers')
  .update({ pipeline_stage: 'souscription', pipeline_stage_updated_at: now })
  .eq('id', d.id)

if (uErr) {
  console.error(uErr.message)
  process.exit(1)
}

await sb.from('dossier_stage_history').insert({
  dossier_id: d.id,
  conseiller_id: d.conseiller_id,
  from_stage: d.pipeline_stage,
  to_stage: 'souscription',
  triggered_by: 'manual',
  notes: 'Remise en souscription (script admin)',
})

console.log(`OK ${d.prenom} ${d.nom} : ${d.pipeline_stage} → souscription (${d.id})`)
