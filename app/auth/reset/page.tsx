'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import AmanaLogo from '@/components/amana-logo'

const FOREST = '#444b3f'
const GOLD   = '#c9a55a'
const CREAM  = '#f8f4ec'
const DARK   = '#353b32'

export default function AuthResetPage() {
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [done,    setDone]    = useState(false)
  const [error,   setError]   = useState('')

  const handleReset = async () => {
    if (!email) { setError('Veuillez saisir votre adresse email.'); return }
    setLoading(true); setError('')
    const supabase = createClient()
    const { error: e } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/update-password`,
    })
    if (e) { setError(e.message); setLoading(false); return }
    setDone(true)
    setLoading(false)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '13px 16px',
    border: '1.5px solid #ddd5c8', borderRadius: 10,
    fontSize: 15, boxSizing: 'border-box',
    background: CREAM, color: DARK,
    fontFamily: "'Inter', system-ui, sans-serif",
    outline: 'none', transition: 'border-color 0.15s',
  }

  return (
    <>
      <style>{`input:focus { border-color: ${FOREST} !important; box-shadow: 0 0 0 3px rgba(68,75,63,0.1) !important; }`}</style>

      <div style={{ minHeight: '100vh', display: 'flex', background: CREAM }}>

        {/* Panel gauche */}
        <div style={{
          width: '44%', background: FOREST,
          padding: '48px 44px',
          display: 'flex', flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Watermark olive */}
          <svg style={{ position: 'absolute', bottom: -40, right: -60, opacity: 0.05, pointerEvents: 'none' }}
            width="400" height="300" viewBox="0 0 400 300" fill="none">
            <path d="M20 280 C80 200 160 130 240 100 C320 68 370 30 400 0" stroke="white" strokeWidth="3" fill="none"/>
            <ellipse cx="80" cy="215" rx="40" ry="18" transform="rotate(-30 80 215)" fill="white"/>
            <ellipse cx="155" cy="170" rx="40" ry="18" transform="rotate(-24 155 170)" fill="white"/>
            <ellipse cx="235" cy="130" rx="38" ry="17" transform="rotate(-19 235 130)" fill="white"/>
          </svg>

          <a href="/" style={{ textDecoration: 'none', lineHeight: 0 }}>
            <AmanaLogo height={80} />
          </a>

          <div>
            <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 22, color: 'rgba(255,255,255,0.85)', fontStyle: 'italic', lineHeight: 1.55, marginBottom: 20, maxWidth: 280 }}>
              « La confiance est le fondement de toute richesse durable. »
            </div>
            <div style={{ width: 36, height: 1.5, background: GOLD, marginBottom: 14 }} />
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: "'Inter', system-ui, sans-serif", fontWeight: 500 }}>
              Gestion de patrimoine islamique
            </div>
          </div>

          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', fontFamily: "'Inter', system-ui, sans-serif" }}>
            ORIAS N° {process.env.NEXT_PUBLIC_ORIAS_NUM ?? '25009552'}
          </div>
        </div>

        {/* Panel droit */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 40px' }}>
          <div style={{ width: '100%', maxWidth: 420 }}>

            {!done ? (
              <>
                <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 30, color: FOREST, fontWeight: 400, margin: '0 0 8px' }}>
                  Mot de passe oublié
                </h1>
                <p style={{ fontSize: 14, color: '#6d7368', margin: '0 0 32px', lineHeight: 1.6, fontFamily: "'Inter', system-ui, sans-serif" }}>
                  Saisissez votre adresse email. Nous vous enverrons un lien pour réinitialiser votre mot de passe.
                </p>

                {error && (
                  <div style={{ background: '#fde8e8', border: '1px solid #f5c6c6', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#c0392b', lineHeight: 1.5, fontFamily: "'Inter', system-ui, sans-serif" }}>
                    {error}
                  </div>
                )}

                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#5a6a59', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 7, fontFamily: "'Inter', system-ui, sans-serif" }}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleReset()}
                    placeholder="votre@email.fr"
                    style={inputStyle}
                    autoFocus
                  />
                </div>

                <button
                  onClick={handleReset}
                  disabled={loading}
                  style={{
                    width: '100%', padding: 14,
                    background: loading ? '#6a7f69' : FOREST,
                    color: 'white', border: 'none', borderRadius: 10,
                    fontSize: 15, fontWeight: 600,
                    cursor: loading ? 'default' : 'pointer',
                    fontFamily: "'Inter', system-ui, sans-serif",
                    letterSpacing: '0.04em', transition: 'background 0.15s',
                  }}
                >
                  {loading ? '…' : 'Envoyer le lien de réinitialisation'}
                </button>

                <p style={{ textAlign: 'center', marginTop: 20 }}>
                  <a href="/auth" style={{ fontSize: 12, color: '#8a9a89', textDecoration: 'none', fontFamily: "'Inter', system-ui, sans-serif" }}>
                    ← Retour à la connexion
                  </a>
                </p>
              </>
            ) : (
              /* Confirmation */
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: 64, height: 64, borderRadius: '50%',
                  background: 'rgba(68,75,63,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 24px', fontSize: 28, color: FOREST,
                }}>✉</div>
                <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 28, color: FOREST, fontWeight: 400, margin: '0 0 12px' }}>
                  Email envoyé
                </h1>
                <p style={{ fontSize: 14, color: '#6d7368', lineHeight: 1.8, marginBottom: 12, fontFamily: "'Inter', system-ui, sans-serif" }}>
                  Si un compte existe pour <strong style={{ color: FOREST }}>{email}</strong>,<br />
                  vous recevrez un lien de réinitialisation sous quelques minutes.
                </p>
                <p style={{ fontSize: 12, color: '#9a9a9a', lineHeight: 1.6, marginBottom: 32, fontFamily: "'Inter', system-ui, sans-serif" }}>
                  Vérifiez également vos spams. Le lien est valable 1 heure.
                </p>
                <a
                  href="/auth"
                  style={{
                    display: 'inline-block', padding: '12px 32px',
                    background: FOREST, color: 'white', borderRadius: 10,
                    fontSize: 14, fontWeight: 600, textDecoration: 'none',
                    fontFamily: "'Inter', system-ui, sans-serif", letterSpacing: '0.04em',
                  }}
                >
                  Retour à la connexion
                </a>
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  )
}
