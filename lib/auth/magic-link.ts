import 'server-only'

const BAD_HOST = /0\.0\.0\.0|localhost|127\.0\.0\.1|ngrok/i

/** URL de retour après validation du magic link Supabase (PKCE ou hash). */
export function buildPostAuthRedirectUrl(
  baseUrl: string,
  postLoginPath: string,
): string {
  return `${baseUrl}/auth/callback?next=${encodeURIComponent(postLoginPath)}`
}

/**
 * Force redirect_to dans le lien verify Supabase (action_link).
 * Corrige les mails qui pointent encore vers 0.0.0.0 si la config projet Supabase est erronée.
 */
export function sanitizeSupabaseMagicLink(
  actionLink: string,
  baseUrl: string,
  postLoginPath: string,
): string {
  const canonicalRedirect = buildPostAuthRedirectUrl(baseUrl, postLoginPath)

  try {
    const u = new URL(actionLink)
    if (u.searchParams.has('redirect_to')) {
      u.searchParams.set('redirect_to', canonicalRedirect)
      return u.toString()
    }
  } catch {
    // URL invalide — repli ci-dessous
  }

  if (BAD_HOST.test(actionLink)) {
    return `${baseUrl.replace(/\/$/, '')}/auth?next=${encodeURIComponent(postLoginPath)}`
  }

  return actionLink
}

export function magicLinkLooksInvalid(actionLink: string): boolean {
  if (BAD_HOST.test(actionLink)) return true
  try {
    const u = new URL(actionLink)
    const redirectTo = u.searchParams.get('redirect_to') ?? ''
    return BAD_HOST.test(decodeURIComponent(redirectTo))
  } catch {
    return false
  }
}
