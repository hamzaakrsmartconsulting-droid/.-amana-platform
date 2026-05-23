/** Hôtes invalides pour les liens e-mail (HOSTNAME Docker, dev local, tunnels). */
const INVALID_APP_URL =
  /ngrok|localhost|127\.0\.0\.1|0\.0\.0\.0/i

function normalizeAppUrl(raw: string): string {
  return raw.replace(/\/$/, '')
}

function isUsableAppUrl(url: string): boolean {
  return url.length > 0 && !INVALID_APP_URL.test(url)
}

/** URL de base pour les liens e-mail / client (hors ngrok). */
export function getClientAppBaseUrl(): string {
  const productionDefault = 'https://platform.amana-patrimoine.fr'
  const localDefault = 'http://localhost:3000'
  const isDev = process.env.NODE_ENV === 'development'

  if (isDev) {
    const raw =
      process.env.AMANA_CLIENT_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? localDefault
    const url = normalizeAppUrl(raw)
    if (isUsableAppUrl(url)) return url
    return localDefault
  }

  const candidates = [
    process.env.AMANA_CLIENT_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    productionDefault,
  ].filter(Boolean) as string[]

  for (const raw of candidates) {
    const url = normalizeAppUrl(raw)
    if (isUsableAppUrl(url)) return url
  }
  return productionDefault
}
