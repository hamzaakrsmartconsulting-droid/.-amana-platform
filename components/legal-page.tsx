'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import AmanaHeader, { UserAvatar } from '@/components/amana-header'
import { useRouter } from 'next/navigation'

const FOREST = '#3a4d39'
const GOLD   = '#c9a55a'
const CREAM  = '#f8f4ec'

interface LegalPageProps {
  pageId: 'mentions-legales' | 'cgu' | 'confidentialite' | 'der'
  backHref?: string
  backLabel?: string
}

export default function LegalPageLayout({ pageId, backHref = '/', backLabel = 'Accueil' }: LegalPageProps) {
  const router = useRouter()
  const [titre,    setTitre]   = useState('')
  const [contenu,  setContenu] = useState('')
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [loading,  setLoading] = useState(true)
  const [user,     setUser]    = useState<{ prenom?: string; nom?: string } | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()

      // L'utilisateur peut ne pas être connecté — pages publiques
      const { data: { user: u } } = await supabase.auth.getUser()
      if (u) {
        const meta = u.user_metadata ?? {}
        setUser({ prenom: meta.prenom, nom: meta.nom })
      }

      const { data } = await supabase
        .from('legal_pages')
        .select('titre, contenu, updated_at')
        .eq('id', pageId)
        .single()

      if (data) {
        setTitre(data.titre)
        setContenu(data.contenu)
        setUpdatedAt(data.updated_at)
      }
      setLoading(false)
    }
    load()
  }, [pageId])

  const initials = ((user?.prenom?.[0] ?? '') + (user?.nom?.[0] ?? '')).toUpperCase() || null
  const formattedDate = updatedAt
    ? new Date(updatedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  return (
    <div style={{ minHeight: '100vh', background: CREAM, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <AmanaHeader
        backHref={backHref}
        backLabel={backLabel}
        rightContent={initials ? <UserAvatar initials={initials} /> : undefined}
      />

      {/* Header */}
      <div style={{ background: FOREST, padding: '28px 24px 32px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <div style={{
            fontSize: 10, color: 'rgba(255,255,255,0.35)',
            textTransform: 'uppercase', letterSpacing: '0.15em',
            fontWeight: 600, marginBottom: 8,
          }}>
            Documents légaux
          </div>
          <h1 style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: 30, fontWeight: 400, color: 'white', margin: 0,
          }}>
            {loading ? '…' : titre || pageId}
          </h1>
          {formattedDate && (
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 6 }}>
              Mis à jour le {formattedDate}
            </div>
          )}
        </div>
      </div>

      {/* Contenu */}
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '36px 24px 80px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#8a9a89' }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              border: `2px solid ${GOLD}`, borderTopColor: 'transparent',
              animation: 'spin 0.8s linear infinite', margin: '0 auto 12px',
            }}/>
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
            Chargement…
          </div>
        ) : contenu ? (
          <div
            style={{
              background: 'white', borderRadius: 12,
              border: '1px solid #e8e0d0', padding: '36px 40px',
              lineHeight: 1.8,
            }}
          >
            {/* Rendu HTML stocké en base */}
            <div
              className="legal-content"
              dangerouslySetInnerHTML={{ __html: contenu }}
            />
            <style>{`
              .legal-content { font-size: 14px; color: #4a5a49; }
              .legal-content h2 {
                font-family: 'Cormorant Garamond', Georgia, serif;
                font-size: 20px; color: ${FOREST}; font-weight: 500;
                margin: 32px 0 12px; border-bottom: 1px solid #e8e0d0; padding-bottom: 8px;
              }
              .legal-content h3 {
                font-family: 'Cormorant Garamond', Georgia, serif;
                font-size: 16px; color: ${FOREST}; font-weight: 500; margin: 24px 0 8px;
              }
              .legal-content p  { margin: 0 0 14px; }
              .legal-content ul { padding-left: 20px; margin: 0 0 14px; }
              .legal-content li { margin-bottom: 6px; }
              .legal-content a  { color: ${GOLD}; text-decoration: underline; }
              .legal-content strong { color: ${FOREST}; font-weight: 600; }
            `}</style>
          </div>
        ) : (
          <div style={{
            background: 'white', borderRadius: 12, border: '1px solid #e8e0d0',
            padding: '60px 40px', textAlign: 'center',
          }}>
            <div style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: 20, color: FOREST, marginBottom: 8,
            }}>
              Document en cours de rédaction
            </div>
            <p style={{ fontSize: 13, color: '#8a9a89', margin: 0 }}>
              Ce document sera disponible prochainement.
            </p>
          </div>
        )}

        {/* Footer légal */}
        <div style={{ marginTop: 32, fontSize: 11, color: '#b0b0b0', textAlign: 'center' }}>
          AMANA Patrimoine — Conseiller en Gestion de Patrimoine indépendant
        </div>
      </div>
    </div>
  )
}
