'use client'

import { Suspense, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'

const FOREST = '#444b3f'
const GOLD = '#c9a55a'
const CREAM = '#f8f4ec'
const DARK = '#353b32'

const REDIRECT: Record<string, string> = {
  admin: '/admin',
  conseiller: '/conseiller',
  client: '/dashboard',
}

function Logo({ height = 96 }: { height?: number }) {
  return (
    <img
      src="/amana-logo-header.png"
      alt="AMANA Patrimoine"
      style={{ height, width: 'auto', objectFit: 'contain', display: 'block' }}
    />
  )
}

type Mode = 'login' | 'signup'

export default function AuthPage() {
  return (
    <Suspense>
      <AuthPageInner />
    </Suspense>
  )
}

function AuthPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [prenom, setPrenom] = useState('')
  const [nom, setNom] = useState('')
  const [consentRgpd, setConsentRgpd] = useState(false)
  const [consentCgu, setConsentCgu] = useState(false)
  const [consentCom, setConsentCom] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [linkExpired, setLinkExpired] = useState(false)
  const [magicLinkLoading, setMagicLinkLoading] = useState(false)

  async function redirectAfterAuth() {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return false

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    const role = profile?.role ?? 'client'
    const nextParam = searchParams.get('next')
    const dest =
      role === 'client' && nextParam?.startsWith('/')
        ? nextParam
        : REDIRECT[role] ?? '/dashboard'

    router.replace(dest)
    return true
  }

  // Magic link mail DER : ?token_hash=…&type=magiclink (évite redirect Supabase → 0.0.0.0)
  useEffect(() => {
    const tokenHash = searchParams.get('token_hash')
    const linkType = searchParams.get('type')
    if (!tokenHash || linkType !== 'magiclink') return

    let cancelled = false

    ;(async () => {
      setMagicLinkLoading(true)
      setError('')
      setLinkExpired(false)

      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: 'magiclink',
      })

      if (typeof window !== 'undefined') {
        const next = searchParams.get('next')
        const cleanPath = window.location.pathname
        window.history.replaceState(
          null,
          '',
          next ? `${cleanPath}?next=${encodeURIComponent(next)}` : cleanPath,
        )
      }

      if (cancelled) return

      if (verifyError) {
        const isExpired =
          verifyError.message.toLowerCase().includes('expired') ||
          verifyError.message.toLowerCase().includes('invalid')
        setLinkExpired(isExpired)
        setError(
          isExpired
            ? 'Votre lien de connexion a expiré (valable 24 h). Connectez-vous avec votre email et mot de passe ci-dessous.'
            : verifyError.message,
        )
        setMagicLinkLoading(false)
        return
      }

      const ok = await redirectAfterAuth()
      if (!ok && !cancelled) {
        setError('Connexion impossible. Utilisez votre email et mot de passe ci-dessous.')
        setMagicLinkLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [searchParams])

  // Magic link Supabase : tokens dans #access_token (flow hash) → session + dashboard
  useEffect(() => {
    if (typeof window === 'undefined') return

    if (new URLSearchParams(window.location.search).get('token_hash')) return

    const hash = window.location.hash
    if (!hash || hash.length < 2) return

    const params = new URLSearchParams(hash.slice(1))

    if (params.get('error')) return

    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')
    if (!accessToken || !refreshToken) return

    let cancelled = false

    ;(async () => {
      setMagicLinkLoading(true)
      setError('')
      setLinkExpired(false)

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })

      window.history.replaceState(
        null,
        '',
        window.location.pathname + window.location.search,
      )

      if (cancelled) return

      if (sessionError) {
        setError(sessionError.message)
        setMagicLinkLoading(false)
        return
      }

      const ok = await redirectAfterAuth()
      if (!ok && !cancelled) {
        setError('Connexion impossible. Utilisez votre email et mot de passe ci-dessous.')
        setMagicLinkLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on hash at mount
  }, [])

  // Lire les erreurs transmises par /auth/callback ou Supabase dans l'URL
  useEffect(() => {
    // Erreur depuis query param (?error=...)
    const qError = searchParams.get('error')
    if (qError) {
      const isExpired =
        qError.toLowerCase().includes('expired') ||
        qError.toLowerCase().includes('invalid') ||
        qError.toLowerCase().includes('otp')
      setLinkExpired(isExpired)
      setError(isExpired
        ? 'Votre lien de connexion a expiré (valable 24 h). Connectez-vous avec votre email et mot de passe ci-dessous.'
        : decodeURIComponent(qError)
      )
      return
    }

    // Erreur Supabase dans le hash fragment (#error=access_denied...)
    if (typeof window !== 'undefined') {
      const hash = window.location.hash
      if (hash.includes('error=')) {
        const params = new URLSearchParams(hash.slice(1))
        const hashError = params.get('error') ?? ''
        const errorCode = params.get('error_code') ?? ''
        const isExpired =
          errorCode === 'otp_expired' ||
          hashError === 'access_denied' ||
          hashError.toLowerCase().includes('expired')
        setLinkExpired(isExpired)
        setError(isExpired
          ? 'Votre lien de connexion a expiré (valable 24 h). Connectez-vous avec votre email et mot de passe ci-dessous.'
          : `Erreur d'authentification : ${hashError}`
        )
        window.history.replaceState(null, '', window.location.pathname + window.location.search)
      }
    }
  }, [searchParams])

  async function handleLogin() {
    setLoading(true)
    setError('')
    setLinkExpired(false)
    const { error: e } = await supabase.auth.signInWithPassword({ email, password })
    if (e) {
      setError(
        e.message === 'Invalid login credentials'
          ? 'Email ou mot de passe incorrect'
          : e.message
      )
      setLoading(false)
      return
    }
    const ok = await redirectAfterAuth()
    if (!ok) router.push('/dashboard')
  }

  async function handleSignup() {
    if (!consentRgpd || !consentCgu) {
      setError('Vous devez accepter la politique de confidentialité et les CGU.')
      return
    }
    setLoading(true)
    setError('')
    const { error: e } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          prenom,
          nom,
          consent_rgpd: true,
          consent_cgu: true,
          consent_communication: consentCom,
        },
      },
    })
    if (e) {
      setError(e.message)
      setLoading(false)
      return
    }
    setSuccess('Un email de confirmation vous a été envoyé. Vérifiez votre boîte mail.')
    setLoading(false)
  }

  function switchMode(m: Mode) {
    setMode(m)
    setError('')
    setSuccess('')
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '13px 16px',
    border: '1.5px solid #ddd5c8',
    borderRadius: 10,
    fontSize: 15,
    boxSizing: 'border-box',
    background: CREAM,
    color: DARK,
    fontFamily: "'Inter', system-ui, sans-serif",
    outline: 'none',
    transition: 'border-color 0.15s',
    display: 'block',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 11,
    fontWeight: 600,
    color: '#5a6a59',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    marginBottom: 7,
    fontFamily: "'Inter', system-ui, sans-serif",
  }

  if (magicLinkLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: CREAM,
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            border: `3px solid ${GOLD}`,
            borderTopColor: 'transparent',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        <p style={{ color: FOREST, fontFamily: "'Inter', system-ui, sans-serif", fontSize: 15 }}>
          Connexion à votre espace AMANA…
        </p>
      </div>
    )
  }

  return (
    <>
      <style>{`
        @media (max-width: 768px) { .auth-left{display:none!important} .auth-right{padding:32px 24px!important} .auth-wrap{display:block!important} }
        input:focus { border-color: ${FOREST}!important; box-shadow: 0 0 0 3px rgba(68,75,63,0.1)!important; }
      `}</style>
      <div className="auth-wrap" style={{ minHeight: '100vh', display: 'flex', background: CREAM }}>
        <div
          className="auth-left"
          style={{
            width: '44%',
            background: FOREST,
            padding: '48px 44px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <svg
            style={{
              position: 'absolute',
              bottom: -40,
              right: -60,
              opacity: 0.05,
              pointerEvents: 'none',
            }}
            width="400"
            height="300"
            viewBox="0 0 400 300"
            fill="none"
          >
            <path
              d="M20 280 C80 200 160 130 240 100 C320 68 370 30 400 0"
              stroke="white"
              strokeWidth="3"
              fill="none"
            />
            <ellipse cx="80" cy="215" rx="40" ry="18" transform="rotate(-30 80 215)" fill="white" />
            <ellipse cx="155" cy="170" rx="40" ry="18" transform="rotate(-24 155 170)" fill="white" />
            <ellipse cx="235" cy="130" rx="38" ry="17" transform="rotate(-19 235 130)" fill="white" />
          </svg>
          <a href="/" style={{ textDecoration: 'none', lineHeight: 0, display: 'block' }}>
            <Logo height={96} />
          </a>
          <div>
            <div
              style={{
                fontFamily: "'Cormorant Garamond',Georgia,serif",
                fontSize: 22,
                color: 'rgba(255,255,255,0.85)',
                fontStyle: 'italic',
                lineHeight: 1.55,
                marginBottom: 20,
                maxWidth: 280,
              }}
            >
              « La confiance est le fondement de toute richesse durable. »
            </div>
            <div style={{ width: 36, height: 1.5, background: GOLD, marginBottom: 14 }} />
            <div
              style={{
                fontSize: 10,
                color: 'rgba(255,255,255,0.35)',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                fontFamily: "'Inter',system-ui,sans-serif",
                fontWeight: 500,
              }}
            >
              Gestion de patrimoine islamique
            </div>
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', fontFamily: "'Inter',system-ui,sans-serif" }}>
            ORIAS N° {process.env.NEXT_PUBLIC_ORIAS_NUM ?? '25009552'}
          </div>
        </div>

        <div
          className="auth-right"
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '48px 40px',
          }}
        >
          <div style={{ width: '100%', maxWidth: 420 }}>
            <div style={{ display: 'flex', borderBottom: '2px solid #e8e0d0', marginBottom: 36 }}>
              {(['login', 'signup'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => switchMode(m)}
                  style={{
                    flex: 1,
                    padding: '13px 0',
                    background: 'none',
                    border: 'none',
                    fontSize: 13,
                    fontWeight: mode === m ? 700 : 400,
                    color: mode === m ? FOREST : '#8a9a89',
                    fontFamily: "'Inter',system-ui,sans-serif",
                    borderBottom: mode === m ? `2.5px solid ${FOREST}` : 'none',
                    marginBottom: -2,
                    cursor: 'pointer',
                    letterSpacing: '0.04em',
                  }}
                >
                  {m === 'login' ? 'Connexion' : 'Créer un compte'}
                </button>
              ))}
            </div>

            <h1
              style={{
                fontFamily: "'Cormorant Garamond',Georgia,serif",
                fontSize: 30,
                color: FOREST,
                fontWeight: 400,
                margin: '0 0 32px',
              }}
            >
              {mode === 'login' ? 'Bienvenue' : 'Rejoignez AMANA'}
            </h1>

            {success && (
              <div
                style={{
                  background: '#e8f5e9',
                  border: '1px solid #a5d6a7',
                  borderRadius: 10,
                  padding: '14px 18px',
                  marginBottom: 24,
                  fontSize: 13,
                  color: '#1b5e20',
                  lineHeight: 1.6,
                  fontFamily: "'Inter',system-ui,sans-serif",
                }}
              >
                {success}
              </div>
            )}
            {error && (
              <div
                style={{
                  background: linkExpired ? '#fef9ec' : '#fde8e8',
                  border: `1px solid ${linkExpired ? '#f0d080' : '#f5c6c6'}`,
                  borderRadius: 10,
                  padding: '14px 18px',
                  marginBottom: 24,
                  fontSize: 13,
                  color: linkExpired ? '#7a5a00' : '#b71c1c',
                  lineHeight: 1.6,
                  fontFamily: "'Inter',system-ui,sans-serif",
                }}
              >
                {linkExpired && (
                  <span style={{ fontWeight: 700, display: 'block', marginBottom: 4 }}>
                    ⏱ Lien de connexion expiré
                  </span>
                )}
                {error}
              </div>
            )}

            {mode === 'signup' && (
              <div style={{ display: 'flex', gap: 14, marginBottom: 20 }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Prénom</label>
                  <input
                    value={prenom}
                    onChange={(e) => setPrenom(e.target.value)}
                    placeholder="Prénom"
                    style={inputStyle}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Nom</label>
                  <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Nom" style={inputStyle} />
                </div>
              </div>
            )}
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.fr"
                style={inputStyle}
                onKeyDown={(e) => e.key === 'Enter' && mode === 'login' && void handleLogin()}
              />
            </div>
            <div style={{ marginBottom: mode === 'signup' ? 28 : 32 }}>
              <label style={labelStyle}>Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={inputStyle}
                onKeyDown={(e) => e.key === 'Enter' && mode === 'login' && void handleLogin()}
              />
            </div>

            {mode === 'signup' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 32 }}>
                {[
                  {
                    key: 'rgpd',
                    checked: consentRgpd,
                    onChange: setConsentRgpd,
                    text: (
                      <>
                        <a href="/confidentialite" style={{ color: FOREST, fontWeight: 600 }}>
                          Politique de confidentialité
                        </a>{' '}
                        et traitement RGPD. <span style={{ color: '#c0392b' }}>*</span>
                      </>
                    ),
                  },
                  {
                    key: 'cgu',
                    checked: consentCgu,
                    onChange: setConsentCgu,
                    text: (
                      <>
                        <a href="/cgu" style={{ color: FOREST, fontWeight: 600 }}>
                          Conditions générales d&apos;utilisation
                        </a>
                        . <span style={{ color: '#c0392b' }}>*</span>
                      </>
                    ),
                  },
                  {
                    key: 'com',
                    checked: consentCom,
                    onChange: setConsentCom,
                    text: 'Recevoir les actualités AMANA (facultatif).',
                  },
                ].map(({ key, checked, onChange, text }) => (
                  <label key={key} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => onChange(e.target.checked)}
                      style={{ marginTop: 3, accentColor: FOREST, width: 15, height: 15, flexShrink: 0 }}
                    />
                    <span style={{ fontSize: 12, color: '#5a6a59', lineHeight: 1.65, fontFamily: "'Inter',system-ui,sans-serif" }}>
                      {text}
                    </span>
                  </label>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => void (mode === 'login' ? handleLogin() : handleSignup())}
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px',
                background: loading ? '#6a7f69' : FOREST,
                color: 'white',
                border: 'none',
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 600,
                cursor: loading ? 'default' : 'pointer',
                fontFamily: "'Inter',system-ui,sans-serif",
                letterSpacing: '0.04em',
                transition: 'background 0.15s',
              }}
            >
              {loading ? '…' : mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
            </button>

            {mode === 'login' && (
              <p style={{ textAlign: 'center', marginTop: 20 }}>
                <a
                  href="/auth/reset"
                  style={{ fontSize: 12, color: '#8a9a89', textDecoration: 'none', fontFamily: "'Inter',system-ui,sans-serif" }}
                >
                  Mot de passe oublié ?
                </a>
              </p>
            )}

          </div>
        </div>
      </div>
    </>
  )
}
