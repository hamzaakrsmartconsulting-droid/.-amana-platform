'use client'

import { useState, useEffect } from 'react'

const FOREST = '#3a4d39'
const GOLD = '#c9a55a'

type Props = { kycId: string }

type Urls = { identite: string | null; justificatif: string | null }

export default function KycDocumentsViewer({ kycId }: Props) {
  const [urls, setUrls]       = useState<Urls | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  useEffect(() => {
    fetch(`/api/kyc/${kycId}/documents`)
      .then(r => r.json())
      .then(data => {
        if (data.error) setError(data.error)
        else setUrls(data)
      })
      .catch(() => setError('Erreur de chargement'))
      .finally(() => setLoading(false))
  }, [kycId])

  if (loading) return (
    <div style={{ color: '#6b7f6a', fontSize: '13px', padding: '12px 0' }}>Chargement des documents…</div>
  )

  if (error) return (
    <div style={{ color: '#991b1b', fontSize: '13px' }}>{error}</div>
  )

  if (!urls?.identite && !urls?.justificatif) return (
    <div style={{ color: '#6b7f6a', fontSize: '13px', fontStyle: 'italic' }}>
      Aucun document téléversé
    </div>
  )

  const DocLink = ({ url, label, icon }: { url: string; label: string; icon: string }) => (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '14px 18px', background: 'white', borderRadius: '10px',
        border: '1px solid #e8dfc8', textDecoration: 'none',
        transition: 'border-color 0.2s',
      }}
    >
      <span style={{ fontSize: '24px' }}>{icon}</span>
      <div>
        <div style={{ fontSize: '13px', fontWeight: 600, color: FOREST }}>{label}</div>
        <div style={{ fontSize: '11px', color: '#6b7f6a', marginTop: '2px' }}>Lien valide 1 heure · Cliquer pour ouvrir</div>
      </div>
      <span style={{ marginLeft: 'auto', color: GOLD, fontSize: '16px' }}>→</span>
    </a>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {urls.identite && (
        <DocLink url={urls.identite} label="Pièce d'identité" icon="🪪" />
      )}
      {urls.justificatif && (
        <DocLink url={urls.justificatif} label="Justificatif de domicile" icon="📋" />
      )}
    </div>
  )
}
