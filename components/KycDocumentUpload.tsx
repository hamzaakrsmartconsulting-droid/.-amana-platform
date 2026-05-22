'use client'

import { useState, useRef } from 'react'

const GOLD = '#c9a55a'
const FOREST = '#3a4d39'

type Props = {
  type: 'identite' | 'justificatif'
  label: string
  inputName: string
  defaultPath?: string
}

export default function KycDocumentUpload({ type, label, inputName, defaultPath }: Props) {
  const [path, setPath]       = useState(defaultPath ?? '')
  const [loading, setLoading] = useState(false)
  const [done, setDone]       = useState(!!defaultPath)
  const [error, setError]     = useState('')
  const [fileName, setFileName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    setLoading(true)
    setError('')
    setFileName(file.name)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('type', type)

      const res = await fetch('/api/kyc/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erreur upload')

      setPath(data.path)
      setDone(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur')
      setFileName('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <label style={{ fontSize: '13px', color: '#6b7f6a', fontWeight: 500 }}>{label}</label>

      {/* Input caché pour le formulaire */}
      <input type="hidden" name={inputName} value={path} />

      {/* Zone de drop/sélection */}
      <div
        onClick={() => !loading && inputRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => {
          e.preventDefault()
          const file = e.dataTransfer.files[0]
          if (file) handleFile(file)
        }}
        style={{
          border: `2px dashed ${done ? '#10b981' : '#d4c9a8'}`,
          borderRadius: '10px',
          padding: '20px',
          textAlign: 'center',
          cursor: loading ? 'default' : 'pointer',
          background: done ? '#f0fdf4' : '#fafaf7',
          transition: 'all 0.2s',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp,.pdf"
          style={{ display: 'none' }}
          onChange={e => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
          }}
        />

        {loading ? (
          <div style={{ color: '#6b7f6a', fontSize: '14px' }}>
            <div style={{ marginBottom: '8px', fontSize: '20px' }}>⏳</div>
            Envoi en cours…
          </div>
        ) : done ? (
          <div>
            <div style={{ fontSize: '20px', marginBottom: '8px' }}>✅</div>
            <div style={{ fontSize: '13px', color: '#065f46', fontWeight: 500 }}>{fileName || 'Document enregistré'}</div>
            <div style={{ fontSize: '11px', color: '#6b7f6a', marginTop: '4px' }}>
              Cliquer pour remplacer
            </div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: '24px', marginBottom: '8px', color: GOLD }}>📄</div>
            <div style={{ fontSize: '14px', color: FOREST, fontWeight: 500, marginBottom: '4px' }}>
              Glisser-déposer ou cliquer
            </div>
            <div style={{ fontSize: '12px', color: '#6b7f6a' }}>JPG, PNG, PDF — max 10 Mo</div>
          </div>
        )}
      </div>

      {error && (
        <div style={{ fontSize: '12px', color: '#991b1b', padding: '8px 12px', background: '#fef2f2', borderRadius: '6px' }}>
          {error}
        </div>
      )}
    </div>
  )
}
