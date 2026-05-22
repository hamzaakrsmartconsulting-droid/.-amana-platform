// app/api/profile/save-section/route.ts
// Sauvegarde partielle du profil KYC par section.
// Le client peut modifier une section sans refaire les 7 étapes.

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function svc() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createServiceClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non connecté' }, { status: 401 })

  let body: { section: string; data: Record<string, unknown> } = { section: '', data: {} }
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Body invalide' }, { status: 400 })
  }
  if (!body.section || !body.data) {
    return NextResponse.json({ error: 'section + data requis' }, { status: 400 })
  }

  const admin = svc()

  // Colonnes autorisées par section (whitelist sécurité)
  const ALLOWED: Record<string, string[]> = {
    identite: [
      'qualite_declarant', 'civilite', 'prenom', 'nom', 'date_naissance',
      'pays_naissance', 'ville_naissance', 'nationalite', 'capacite_juridique',
    ],
    coordonnees: [
      'telephone', 'telephone_fixe', 'adresse', 'code_postal', 'ville', 'pays',
      'adresse_fiscale_identique', 'adresse_fiscale',
    ],
    situation: [
      'situation_familiale', 'enfants_a_charge',
      'nb_personnes_charge', 'situation_pro', 'secteur_activite', 'csp',
    ],
    patrimoine: [
      'revenu_foyer', 'revenu_annuel', 'patrimoine_financier', 'patrimoine_net',
      'ifi_assujetti', 'numero_fiscal', 'fatca_us_person', 'ppe', 'ppe_entourage',
    ],
    profil_investisseur: [
      'objectif_investissement', 'horizon_placement', 'tolerance_risque', 'perte_acceptable',
    ],
    banque: [
      'titulaire_compte', 'nom_banque', 'iban', 'bic_swift',
    ],
  }

  const allowed = ALLOWED[body.section]
  if (!allowed) {
    return NextResponse.json({ error: `Section inconnue : ${body.section}` }, { status: 400 })
  }

  // Filtrer les colonnes autorisées
  const filtered: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body.data) filtered[key] = body.data[key]
  }

  if (Object.keys(filtered).length === 0) {
    return NextResponse.json({ error: 'Aucune donnée valide' }, { status: 400 })
  }

  const { error } = await admin.from('kyc').upsert(
    { user_id: user.id, ...filtered, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' }
  )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, section: body.section, fields_saved: Object.keys(filtered) })
}
