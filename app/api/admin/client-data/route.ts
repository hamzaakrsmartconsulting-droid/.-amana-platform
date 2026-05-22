import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

const DOC_KEYS = ['doc_cni', 'doc_justificatif_domicile', 'doc_rib', 'doc_residence_fiscale'] as const

const DOC_PATH_FALLBACKS: Record<(typeof DOC_KEYS)[number], string[]> = {
  doc_cni: ['doc_identite_url'],
  doc_justificatif_domicile: ['doc_justif_url'],
  doc_rib: ['doc_rib_url'],
  doc_residence_fiscale: ['doc_residence_fiscale_url'],
}

export async function GET(request: NextRequest) {
  const uid = request.nextUrl.searchParams.get('uid')
  if (!uid) return NextResponse.json({ error: 'uid manquant' }, { status: 400 })

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

  const [kycRes, mif2Res, userRes] = await Promise.all([
    admin.from('kyc').select('*').eq('user_id', uid).maybeSingle(),
    admin.from('mif2').select('*').eq('user_id', uid).maybeSingle(),
    admin.auth.admin.getUserById(uid),
  ])

  if (kycRes.error) {
    return NextResponse.json({ error: 'Erreur récupération KYC' }, { status: 500 })
  }

  // Generate signed URLs for documents (1h validity)
  const kyc = kycRes.data
  const signed_urls: Record<string, string> = {}

  if (kyc) {
    await Promise.all(
      DOC_KEYS.map(async (key) => {
        const legacyValue = kyc[key] as string | undefined
        const fallbackValue = DOC_PATH_FALLBACKS[key]
          .map((fk) => kyc[fk] as string | undefined)
          .find(Boolean)
        const rawPath = legacyValue ?? fallbackValue
        if (!rawPath) return

        // Nouveau format: doc_*_url contient deja "uid/type_timestamp.ext"
        // Ancien format: doc_* contient juste le filename, on prefixe avec uid.
        const path = rawPath.includes('/') ? rawPath : `${uid}/${rawPath}`
        const { data } = await admin.storage
          .from('kyc-documents')
          .createSignedUrl(path, 3600)
        if (data?.signedUrl) {
          signed_urls[key] = data.signedUrl
        }
      })
    )
  }

  const u = userRes.data?.user
  return NextResponse.json({
    kyc,
    mif2: mif2Res.data ?? null,
    client: {
      email: u?.email ?? '',
      nom: (u?.user_metadata?.nom as string) ?? '',
      prenom: (u?.user_metadata?.prenom as string) ?? '',
    },
    signed_urls,
  })
}
