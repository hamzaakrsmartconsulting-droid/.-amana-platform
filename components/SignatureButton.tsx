'use client'

import { useState } from 'react'

const GOLD = '#c9a55a'

type Props = {
  projetId: string
  nomClient: string
  nomProduit: string
}

export default function SignatureButton({ projetId, nomClient, nomProduit }: Props) {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [signingUrl, setSigningUrl] = useState<string | null>(null)
  const [error, setError] = useState('')

  const initierSignature = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/signature/initier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projet_id: projetId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erreur')

      setSigningUrl(data.signing_url ?? null)
      setDone(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'envoi')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
        <div style={{ fontSize: '12px', color: '#065f46', fontWeight: 500 }}>
          ✓ Email envoyé à {nomClient}
        </div>
        {signingUrl && (
          <a href={signingUrl} target="_blank" rel="noopener noreferrer"
            style={{ fontSize: '12px', color: GOLD, textDecoration: 'none', fontWeight: 500 }}>
            Lien de signature →
          </a>
        )}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
      <button
        onClick={initierSignature}
        disabled={loading}
        style={{
          padding: '8px 16px',
          background: loading ? '#e8dfc8' : GOLD,
          color: 'white', border: 'none', borderRadius: '6px',
          fontSize: '13px', cursor: loading ? 'default' : 'pointer',
          fontWeight: 500, whiteSpace: 'nowrap',
        }}
      >
        {loading ? 'Envoi...' : '✍ Initier la signature'}
      </button>
      {error && (
        <div style={{ fontSize: '11px', color: '#991b1b', maxWidth: '200px', textAlign: 'right' }}>
          {error}
        </div>
      )}
    </div>
  )
}
