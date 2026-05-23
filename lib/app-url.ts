/** URL de base pour les liens e-mail / client (hors ngrok). */
export function getClientAppBaseUrl(): string {
  const productionDefault = 'https://platform.amana-patrimoine.fr'
  const localDefault = 'http://localhost:3000'
  const isDev = process.env.NODE_ENV === 'development'

  if (isDev) {
    const raw = process.env.AMANA_CLIENT_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? localDefault
    const url = raw.replace(/\/$/, '')
    if (/ngrok/i.test(url)) return localDefault
    return url
  }

  const candidates = [
    process.env.AMANA_CLIENT_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    productionDefault,
  ].filter(Boolean) as string[]

  for (const raw of candidates) {
    const url = raw.replace(/\/$/, '')
    if (!/ngrok|localhost|127\.0\.0\.1/i.test(url)) return url
  }
  return productionDefault
}
