'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const FOREST = '#3a4d39'

interface Setting {
  key:       string
  value:     string
  label:     string | null
  categorie: string | null
}

const CATEGORIES: Record<string, string> = {
  general: 'Informations générales',
  legal:   'Informations légales',
  contenu: 'Contenus & blocs',
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([])
  const [edited,   setEdited]   = useState<Record<string, string>>({})
  const [saving,   setSaving]   = useState(false)
  const [msg,      setMsg]      = useState('')
  const supabase = createClient()

  useEffect(() => { loadSettings() }, [])

  async function loadSettings() {
    const { data } = await supabase.from('site_settings').select('*').order('categorie').order('key')
    if (data) {
      setSettings(data as Setting[])
      const init: Record<string, string> = {}
      data.forEach((s: Setting) => { init[s.key] = s.value })
      setEdited(init)
    }
  }

  async function saveAll() {
    setSaving(true)
    const updates = Object.entries(edited).map(([key, value]) =>
      supabase.from('site_settings').update({ value, updated_at: new Date().toISOString() }).eq('key', key)
    )
    await Promise.all(updates)
    setMsg('Paramètres enregistrés.')
    setSaving(false)
    setTimeout(() => setMsg(''), 3000)
  }

  const grouped = settings.reduce((acc, s) => {
    const cat = s.categorie ?? 'general'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(s)
    return acc
  }, {} as Record<string, Setting[]>)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 28, color: FOREST, fontWeight: 400, margin: '0 0 4px' }}>
            Paramètres du site
          </h1>
          <p style={{ fontSize: 13, color: '#8a9a89', margin: 0, fontFamily: "'Inter', system-ui, sans-serif" }}>
            Informations générales, légales et blocs de contenu éditables.
          </p>
        </div>
        <button onClick={saveAll} disabled={saving} style={{
          padding: '10px 24px', background: saving ? '#6a7f69' : FOREST,
          color: 'white', border: 'none', borderRadius: 8,
          fontSize: 13, fontWeight: 600, cursor: saving ? 'default' : 'pointer',
          fontFamily: "'Inter', system-ui, sans-serif", transition: 'background 0.15s',
        }}>
          {saving ? 'Enregistrement…' : 'Tout enregistrer'}
        </button>
      </div>

      {msg && (
        <div style={{
          background: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: 8,
          padding: '10px 16px', marginBottom: 20, fontSize: 13, color: '#1b5e20',
          fontFamily: "'Inter', system-ui, sans-serif",
        }}>{msg}</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {Object.entries(CATEGORIES).map(([cat, catLabel]) => {
          const items = grouped[cat] ?? []
          if (!items.length) return null
          return (
            <div key={cat} style={{ background: 'white', borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
              <div style={{
                padding: '14px 20px', borderBottom: '1px solid #f0ece4',
                fontSize: 11, fontWeight: 700, color: '#8a9a89',
                letterSpacing: '0.1em', textTransform: 'uppercase',
                fontFamily: "'Inter', system-ui, sans-serif",
              }}>
                {catLabel}
              </div>
              <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                {items.map(s => (
                  <div key={s.key}>
                    <label style={{
                      display: 'block', fontSize: 12, fontWeight: 600, color: '#5a6a59',
                      marginBottom: 6, fontFamily: "'Inter', system-ui, sans-serif",
                    }}>
                      {s.label ?? s.key}
                    </label>
                    {(edited[s.key] ?? '').length > 80 ? (
                      <textarea
                        value={edited[s.key] ?? ''}
                        onChange={e => setEdited(prev => ({ ...prev, [s.key]: e.target.value }))}
                        rows={3}
                        style={{
                          width: '100%', padding: '10px 14px',
                          border: '1.5px solid #ddd5c8', borderRadius: 8,
                          fontSize: 13, fontFamily: "'Inter', system-ui, sans-serif",
                          color: '#2a3829', background: '#fafaf8',
                          resize: 'vertical', outline: 'none',
                          boxSizing: 'border-box', lineHeight: 1.6,
                        }}
                      />
                    ) : (
                      <input
                        value={edited[s.key] ?? ''}
                        onChange={e => setEdited(prev => ({ ...prev, [s.key]: e.target.value }))}
                        style={{
                          width: '100%', padding: '10px 14px',
                          border: '1.5px solid #ddd5c8', borderRadius: 8,
                          fontSize: 13, fontFamily: "'Inter', system-ui, sans-serif",
                          color: '#2a3829', background: '#fafaf8', outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
