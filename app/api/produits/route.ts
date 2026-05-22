import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function checkConseiller() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase: null, user: null, tenant: null, error: 'Non autorisé' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'conseiller') return { supabase: null, user: null, tenant: null, error: 'Accès refusé' }

  const { data: tenant } = await supabase.from('tenants').select('id').eq('slug', 'amana').single()
  return { supabase, user, tenant, error: null }
}

// GET /api/produits — liste
export async function GET() {
  const { supabase, error } = await checkConseiller()
  if (error || !supabase) return NextResponse.json({ error }, { status: 401 })

  const { data } = await supabase.from('products').select('*').order('type')
  return NextResponse.json(data ?? [])
}

// POST /api/produits — création
export async function POST(request: NextRequest) {
  const { supabase, tenant, error } = await checkConseiller()
  if (error || !supabase) return NextResponse.json({ error }, { status: 401 })

  const body = await request.json()
  const { nom, type, gestionnaire, description, rendement, ticket_min, halal_label, halal_detail, actif } = body

  if (!nom || !type) return NextResponse.json({ error: 'nom et type requis' }, { status: 400 })

  const { data, error: err } = await supabase.from('products').insert({
    tenant_id:    tenant?.id,
    nom, type, gestionnaire, description, rendement,
    ticket_min:   ticket_min ?? null,
    halal_label:  halal_label ?? 'Conforme charia',
    halal_detail: halal_detail ?? null,
    actif:        actif !== false,
  }).select().single()

  if (err) return NextResponse.json({ error: err.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
