import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || !['admin', 'conseiller'].includes(profile.role ?? '')) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Filtre dossiers par conseiller_id si l'utilisateur est conseiller
  // Trier par updated_at DESC pour que le plus récent soit traité en premier
  const dossiersQuery = admin
    .from('dossiers')
    .select('id, email_client, updated_at, conseiller_id')
    .order('updated_at', { ascending: false })

  const [usersRes, kycRes, mif2Res, dossiersRes] = await Promise.all([
    admin.auth.admin.listUsers({ perPage: 1000 }),
    admin.from('kyc').select('user_id'),
    admin.from('mif2').select('user_id, profil_mif2, score_mif2'),
    profile.role === 'conseiller'
      ? dossiersQuery.eq('conseiller_id', user.id)
      : dossiersQuery,
  ])
  const kycSet = new Set((kycRes.data ?? []).map((k: { user_id: string }) => k.user_id))
  const mif2Map = new Map(
    (mif2Res.data ?? []).map((m: { user_id: string; profil_mif2?: string; score_mif2?: number }) => [m.user_id, m])
  )
  // Map email → dossier_id : garder le dossier le plus récemment mis à jour
  // (les dossiers sont déjà triés par updated_at DESC, donc le premier wins)
  const dossierByEmail = new Map<string, string>()
  for (const d of (dossiersRes.data ?? []) as { id: string; email_client: string | null; updated_at: string }[]) {
    if (!d.email_client) continue
    const email = d.email_client.toLowerCase()
    if (!dossierByEmail.has(email)) {
      dossierByEmail.set(email, d.id)
    }
  }

  const clients = (usersRes.data?.users ?? [])
    .filter(u => u.email !== user.email)
    .map(u => ({
      id: u.id,
      email: u.email ?? '',
      nom: (u.user_metadata?.nom as string) ?? '',
      prenom: (u.user_metadata?.prenom as string) ?? '',
      created_at: u.created_at,
      email_confirmed: !!u.email_confirmed_at,
      kyc: kycSet.has(u.id),
      mif2: mif2Map.has(u.id) ? mif2Map.get(u.id) : null,
      dossier_id: dossierByEmail.get((u.email ?? '').toLowerCase()) ?? null,
    }))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  return NextResponse.json({ clients })
}
