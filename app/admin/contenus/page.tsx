'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import AmanaHeader, { UserAvatar } from '@/components/amana-header'

const FOREST = '#444b3f'
const GOLD   = '#c9a55a'
const CREAM  = '#f8f4ec'

const PAGES = [
  { id: 'mentions-legales',  label: 'Mentions légales',                  href: '/mentions-legales' },
  { id: 'cgu',               label: 'CGU',                               href: '/cgu' },
  { id: 'confidentialite',   label: 'Politique de confidentialité',      href: '/confidentialite' },
  { id: 'der',               label: 'Document d\'Entrée en Relation',    href: '/der' },
]

interface LegalPage {
  id:         string
  titre:      string
  contenu:    string
  updated_at: string | null
}

export default function AdminContenusPage() {
  const router  = useRouter()
  const [pages,    setPages]    = useState<LegalPage[]>([])
  const [selected, setSelected] = useState<string>('mentions-legales')
  const [titre,    setTitre]    = useState('')
  const [contenu,  setContenu]  = useState('')
  const [preview,  setPreview]  = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)
  const [user,     setUser]     = useState<{ prenom?: string; nom?: string } | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user: u } } = await supabase.auth.getUser()
      if (!u) { router.push('/auth'); return }

      const meta = u.user_metadata ?? {}
      setUser({ prenom: meta.prenom, nom: meta.nom })

      const { data } = await supabase.from('legal_pages').select('*').order('id')
      if (data) setPages(data)
    }
    load()
  }, [router])

  useEffect(() => {
    const p = pages.find(p => p.id === selected)
    if (p) { setTitre(p.titre); setContenu(p.contenu) }
  }, [selected, pages])

  async function handleSave() {
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('legal_pages')
      .update({ titre, contenu, updated_at: new Date().toISOString() })
      .eq('id', selected)

    setSaving(false)
    if (!error) {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      setPages(prev => prev.map(p =>
        p.id === selected ? { ...p, titre, contenu, updated_at: new Date().toISOString() } : p
      ))
    }
  }

  const initials = ((user?.prenom?.[0] ?? '') + (user?.nom?.[0] ?? '')).toUpperCase() || 'A'
  const currentPage = PAGES.find(p => p.id === selected)

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 10, color: '#8a9a89',
    textTransform: 'uppercase', letterSpacing: '0.1em',
    fontWeight: 600, marginBottom: 6,
    fontFamily: "'Inter', system-ui, sans-serif",
  }
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: 8,
    border: '1px solid #ddd5c8', fontSize: 14, color: FOREST,
    fontFamily: "'Inter', system-ui, sans-serif",
    background: 'white', boxSizing: 'border-box',
    outline: 'none',
  }

  return (
    <div style={{ minHeight: '100vh', background: CREAM, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <AmanaHeader
        backHref="/admin"
        backLabel="Admin"
        rightContent={<UserAvatar initials={initials} />}
      />

      {/* Header */}
      <div style={{ background: FOREST, padding: '28px 24px 32px' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div style={{
            fontSize: 10, color: 'rgba(255,255,255,0.35)',
            textTransform: 'uppercase', letterSpacing: '0.15em',
            fontWeight: 600, marginBottom: 8,
          }}>
            Administration
          </div>
          <h1 style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: 30, fontWeight: 400, color: 'white', margin: 0,
          }}>
            Gestion des contenus
          </h1>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '28px 16px 80px', display: 'flex', gap: 24 }}>

        {/* Sidebar navigation */}
        <div style={{ width: 220, flexShrink: 0 }}>
          <div style={{
            background: 'white', borderRadius: 12,
            border: '1px solid #e8e0d0', overflow: 'hidden',
          }}>
            <div style={{
              padding: '12px 16px', fontSize: 10, fontWeight: 700,
              color: '#8a9a89', textTransform: 'uppercase', letterSpacing: '0.1em',
              borderBottom: '1px solid #f0ece4',
            }}>
              Pages légales
            </div>
            {PAGES.map(p => (
              <button
                key={p.id}
                onClick={() => { setSelected(p.id); setPreview(false) }}
                style={{
                  width: '100%', textAlign: 'left', padding: '13px 16px',
                  background: selected === p.id ? 'rgba(68,75,63,0.06)' : 'transparent',
                  border: 'none', borderBottom: '1px solid #f0ece4',
                  cursor: 'pointer', fontSize: 13, color: selected === p.id ? FOREST : '#5a6a59',
                  fontWeight: selected === p.id ? 600 : 400,
                  fontFamily: "'Inter', system-ui, sans-serif",
                  transition: 'all 0.12s',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div style={{ marginTop: 12, padding: '12px 16px', background: 'white', borderRadius: 10, border: '1px solid #e8e0d0' }}>
            <div style={{ fontSize: 11, color: '#8a9a89', lineHeight: 1.6 }}>
              Le contenu est stocké en HTML. Utilisez les balises <code style={{ background: '#f4f0e8', padding: '1px 4px', borderRadius: 3 }}>&lt;h2&gt;</code>, <code style={{ background: '#f4f0e8', padding: '1px 4px', borderRadius: 3 }}>&lt;p&gt;</code>, <code style={{ background: '#f4f0e8', padding: '1px 4px', borderRadius: 3 }}>&lt;ul&gt;</code>.
            </div>
          </div>
        </div>

        {/* Éditeur principal */}
        <div style={{ flex: 1 }}>
          <div style={{
            background: 'white', borderRadius: 12,
            border: '1px solid #e8e0d0', padding: '24px 28px',
          }}>
            {/* Toolbar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: 20, color: FOREST, fontWeight: 500,
              }}>
                {currentPage?.label}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <a
                  href={currentPage?.href}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                    border: '1px solid #ddd5c8', color: '#5a6a59', textDecoration: 'none',
                    fontFamily: "'Inter', system-ui, sans-serif",
                  }}
                >
                  Voir en ligne ↗
                </a>
                <button
                  onClick={() => setPreview(!preview)}
                  style={{
                    padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                    border: `1px solid ${preview ? FOREST : '#ddd5c8'}`,
                    background: preview ? FOREST : 'white',
                    color: preview ? 'white' : '#5a6a59', cursor: 'pointer',
                    fontFamily: "'Inter', system-ui, sans-serif",
                  }}
                >
                  {preview ? 'Éditeur' : 'Aperçu'}
                </button>
              </div>
            </div>

            {/* Titre */}
            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>Titre de la page</label>
              <input
                value={titre}
                onChange={e => setTitre(e.target.value)}
                style={inputStyle}
                placeholder="ex: Mentions légales"
              />
            </div>

            {/* Contenu HTML ou aperçu */}
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>{preview ? 'Aperçu rendu' : 'Contenu HTML'}</label>
              {preview ? (
                <div
                  style={{
                    minHeight: 400, padding: '20px 24px', borderRadius: 8,
                    border: '1px solid #e8e0d0', background: CREAM,
                    fontSize: 14, color: '#4a5a49', lineHeight: 1.8,
                  }}
                >
                  {contenu ? (
                    <>
                      <div dangerouslySetInnerHTML={{ __html: contenu }} />
                      <style>{`
                        h2 { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 18px; color: ${FOREST}; margin: 24px 0 10px; border-bottom: 1px solid #e8e0d0; padding-bottom: 6px; }
                        h3 { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 15px; color: ${FOREST}; margin: 18px 0 6px; }
                        p  { margin: 0 0 12px; }
                        ul { padding-left: 18px; margin: 0 0 12px; }
                        li { margin-bottom: 4px; }
                        strong { color: ${FOREST}; }
                      `}</style>
                    </>
                  ) : (
                    <div style={{ color: '#aaa', fontStyle: 'italic' }}>Aucun contenu</div>
                  )}
                </div>
              ) : (
                <textarea
                  value={contenu}
                  onChange={e => setContenu(e.target.value)}
                  rows={20}
                  style={{
                    ...inputStyle,
                    fontFamily: 'monospace', fontSize: 13,
                    lineHeight: 1.6, resize: 'vertical',
                  }}
                  placeholder={`<h2>Article 1 — Présentation</h2>\n<p>La société AMANA Patrimoine...</p>`}
                />
              )}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, alignItems: 'center' }}>
              {saved && (
                <span style={{ fontSize: 12, color: '#5a9a58', fontWeight: 500 }}>
                  ✅ Sauvegardé
                </span>
              )}
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  padding: '11px 28px', background: saving ? '#8a9a89' : FOREST,
                  color: 'white', borderRadius: 8, border: 'none',
                  fontSize: 13, fontWeight: 600, cursor: saving ? 'default' : 'pointer',
                  fontFamily: "'Inter', system-ui, sans-serif",
                  letterSpacing: '0.04em',
                }}
              >
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
