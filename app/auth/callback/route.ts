// app/auth/callback/route.ts
// Gère le retour du magic link Supabase (PKCE code exchange).
// Supabase redirige ici avec ?code=xxx après vérification du token.
// On échange le code contre une session, puis on redirige selon le rôle.

import { createServerClient } from '@supabase/ssr'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ROLE_HOME: Record<string, string> = {
  admin:      '/admin',
  manager:    '/admin',
  conseiller: '/conseiller',
  client:     '/dashboard',
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code  = url.searchParams.get('code')
  const next  = url.searchParams.get('next') ?? '/dashboard'
  const error = url.searchParams.get('error')
  const errorDescription = url.searchParams.get('error_description')

  // Si Supabase a renvoyé une erreur (ex: lien expiré)
  if (error) {
    const msg = errorDescription ?? error
    return NextResponse.redirect(
      new URL(`/auth?error=${encodeURIComponent(msg)}`, request.url)
    )
  }

  if (!code) {
    return NextResponse.redirect(new URL('/auth', request.url))
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    },
  )

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError) {
    return NextResponse.redirect(
      new URL(`/auth?error=${encodeURIComponent(exchangeError.message)}`, request.url)
    )
  }

  // Récupérer le rôle pour rediriger vers le bon espace
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(new URL('/auth', request.url))
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  const role = profile?.role ?? 'client'

  // Spec étape 2 — preuve de remise DER (article L.541-8-1 CMF)
  // Tracer le clic sur le magic link comme accusé de réception du DER
  if (role === 'client') {
    try {
      const svc = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false, autoRefreshToken: false } },
      )
      // Retrouver le dernier DER remis à ce client
      const { data: lastDer } = await svc
        .from('documents')
        .select('id, dossier_id')
        .eq('user_id', user.id)
        .eq('type', 'der')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (lastDer) {
        // Vérifier si la preuve de remise existe déjà (idempotent)
        const { data: existing } = await svc
          .from('documents_remis')
          .select('id')
          .eq('user_id', user.id)
          .eq('document_type', 'der_generique')
          .eq('source', 'funnel_onboarding_email_click')
          .limit(1)
          .maybeSingle()

        if (!existing) {
          await svc.from('documents_remis').insert({
            user_id:       user.id,
            document_id:   lastDer.id,
            dossier_id:    lastDer.dossier_id,
            document_type: 'der_generique',
            source:        'funnel_onboarding_email_click',
            remis_at:      new Date().toISOString(),
          })
        }
      }
    } catch (remisErr) {
      // Non bloquant — ne pas empêcher la connexion
      console.error('[auth/callback] documents_remis insert error', remisErr)
    }
  }

  // Si `next` est spécifié et commence par /, on le respecte pour les clients
  // Sinon on redirige vers l'espace du rôle
  const destination = next.startsWith('/') && role === 'client'
    ? next
    : ROLE_HOME[role] ?? '/dashboard'

  return NextResponse.redirect(new URL(destination, request.url))
}
