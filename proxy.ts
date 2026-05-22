import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Routes spécifiques par rôle (redirect vers home si rôle != attendu)
const CLIENT_ROUTES     = ['/dashboard', '/kyc', '/mif2', '/catalogue', '/souscription', '/onboarding', '/der', '/lettre-de-mission', '/simulator']
const CONSEILLER_ROUTES = ['/conseiller']
const ADMIN_ROUTES      = ['/admin']

// Routes accessibles à tous les utilisateurs authentifiés (admin + conseiller + client)
// Auth requise mais pas de filtrage par rôle
const SHARED_ROUTES     = ['/assistant', '/rapport-adequation']

const PRIVATE_ROUTES    = [...CLIENT_ROUTES, ...CONSEILLER_ROUTES, ...ADMIN_ROUTES, ...SHARED_ROUTES]

const HOME_BY_ROLE: Record<string, string> = {
  admin:      '/admin',
  conseiller: '/conseiller',
  client:     '/dashboard',
}

/** Dev only: skip Supabase in middleware — no login required to open private routes. */
function devAuthBypass() {
  return (
    process.env.NODE_ENV === 'development' &&
    process.env.DEV_BYPASS_AUTH === '1'
  )
}

export async function proxy(request: NextRequest) {
  if (devAuthBypass()) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname

  // Non authentifié sur route privée → /auth (avec next pour retour)
  const isPrivate = PRIVATE_ROUTES.some(r => pathname.startsWith(r))
  if (isPrivate && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }
  if (!user) return supabaseResponse

  // Lire le rôle depuis profiles
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = (profile?.role ?? 'client') as 'admin' | 'conseiller' | 'client'
  const home = HOME_BY_ROLE[role] ?? '/dashboard'

  // Déjà connecté sur /auth → bon espace
  if (pathname === '/auth') {
    const url = request.nextUrl.clone()
    url.pathname = home
    return NextResponse.redirect(url)
  }

  // Routes filtrées par rôle (les SHARED_ROUTES passent ici sans filtre)
  const isAdminRoute      = ADMIN_ROUTES.some(r => pathname.startsWith(r))
  const isConseillerRoute = CONSEILLER_ROUTES.some(r => pathname.startsWith(r))
  const isClientRoute     = CLIENT_ROUTES.some(r => pathname.startsWith(r))

  if (isAdminRoute      && role !== 'admin')                               return redirect(request, home)
  if (isConseillerRoute && role !== 'conseiller' && role !== 'admin')      return redirect(request, home)
  if (isClientRoute     && role !== 'client')                              return redirect(request, home)

  return supabaseResponse
}

function redirect(request: NextRequest, to: string) {
  const url = request.nextUrl.clone()
  url.pathname = to
  return NextResponse.redirect(url)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
