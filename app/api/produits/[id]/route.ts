import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function checkConseiller() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase: null, error: 'Non autorisé' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'conseiller') return { supabase: null, error: 'Accès refusé' }

  return { supabase, error: null }
}

// GET /api/produits/[id]
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, error } = await checkConseiller()
  if (error || !supabase) return NextResponse.json({ error }, { status: 401 })

  const { data, error: err } = await supabase.from('products').select('*').eq('id', id).single()
  if (err || !data) return NextResponse.json({ error: 'Produit introuvable' }, { status: 404 })
  return NextResponse.json(data)
}

// PUT /api/produits/[id]
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, error } = await checkConseiller()
  if (error || !supabase) return NextResponse.json({ error }, { status: 401 })

  const body = await request.json()
  const { nom, type, gestionnaire, description, rendement, ticket_min, halal_label, halal_detail, actif } = body

  const { data, error: err } = await supabase.from('products').update({
    nom, type, gestionnaire, description, rendement,
    ticket_min:   ticket_min ?? null,
    halal_label:  halal_label ?? null,
    halal_detail: halal_detail ?? null,
    actif:        actif !== false,
    updated_at:   new Date().toISOString(),
  }).eq('id', id).select().single()

  if (err) return NextResponse.json({ error: err.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE /api/produits/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, error } = await checkConseiller()
  if (error || !supabase) return NextResponse.json({ error }, { status: 401 })

  const { error: err } = await supabase.from('products').delete().eq('id', id)
  if (err) return NextResponse.json({ error: err.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
