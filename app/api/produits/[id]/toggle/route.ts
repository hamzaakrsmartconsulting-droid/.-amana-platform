import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/login', _req.url))

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'conseiller') return NextResponse.redirect(new URL('/dashboard', _req.url))

  const { data: produit } = await supabase.from('products').select('actif').eq('id', id).single()
  if (!produit) return NextResponse.redirect(new URL('/conseiller/produits', _req.url))

  await supabase.from('products').update({
    actif: !produit.actif,
    updated_at: new Date().toISOString(),
  }).eq('id', id)

  return NextResponse.redirect(new URL('/conseiller/produits', _req.url))
}
