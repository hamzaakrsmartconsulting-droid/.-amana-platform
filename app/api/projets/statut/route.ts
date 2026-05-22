import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const STATUTS_VALIDES = ['en_cours', 'soumis', 'signe', 'actif', 'cloture']

const TYPE_LABEL: Record<string, string> = {
  assurance_vie: 'Assurance-vie Halal',
  scpi:          'SCPI Halal',
  cto:           'Portefeuille Actions Halal',
  immobilier:    'Investissement Immobilier',
  pee:           'Plan Épargne Entreprise',
  retraite:      'PER Individuel Halal',
  don:           'Don / Waqf Amana',
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'conseiller') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const formData = await request.formData()
  const projet_id = formData.get('projet_id') as string
  const statut    = formData.get('statut') as string

  if (!projet_id || !statut || !STATUTS_VALIDES.includes(statut)) {
    return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 })
  }

  // Service role pour opérations admin
  const admin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: projet, error: fetchErr } = await supabase
    .from('projects').select('*, kyc:kyc_id(prenom)').eq('id', projet_id).single()

  if (fetchErr || !projet) {
    return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 })
  }

  const { error } = await supabase
    .from('projects')
    .update({ statut, updated_at: new Date().toISOString() })
    .eq('id', projet_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Audit log
  const { data: tenant } = await supabase
    .from('tenants').select('id').eq('slug', 'amana').single()

  try {
    await supabase.from('audit_logs').insert({
      tenant_id:  tenant?.id ?? null,
      user_id:    user.id,
      action:     `project.${statut}`,
      entity_type: 'project',
      entity_id:  projet_id,
      metadata: {
        statut_precedent: projet.statut,
        statut_nouveau:   statut,
        montant:          projet.montant,
        type:             projet.type,
        conseiller_id:    user.id,
      },
      ip_address: request.headers.get('x-forwarded-for') ?? null,
    })
  } catch { /* audit non bloquant */ }

  // Email client quand le projet passe en 'actif'
  // (à implémenter avec Resend une fois le package installé)
  if (statut === 'actif' && projet.user_id) {
    try {
      const { data: clientAuth } = await admin.auth.admin.getUserById(projet.user_id)
      const emailClient = clientAuth?.user?.email
      if (emailClient) {
        console.log(`[TODO Email] Projet actif → envoyer confirmation à ${emailClient}`)
      }
    } catch (e) {
      console.error('[Email projet actif]', e)
    }
  }

  return NextResponse.redirect(new URL('/conseiller/projets', request.url))
}
