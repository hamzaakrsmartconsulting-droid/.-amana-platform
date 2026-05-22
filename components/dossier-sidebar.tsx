// components/dossier-sidebar.tsx — v3 avec bouton suppression RGPD
// Sprint Agents IA v7 · 29 avril 2026
//
// Évolutions vs v2 :
//   - Bouton "..." (menu kebab) sur chaque dossier → ouvre menu avec :
//     - "Exporter (JSON)" → télécharge l'export RGPD
//     - "Supprimer définitivement" → confirme avec mot-clé SUPPRIMER → DELETE
//   - Le bouton "Supprimer" demande de taper "SUPPRIMER" dans une input pour valider
//     (protection contre clic accidentel, conforme bonne pratique RGPD)

'use client'

import { useState, useEffect, useCallback, type CSSProperties } from 'react'

const FOREST = '#3a4d39'
const GOLD = '#c9a55a'
const CREAM = '#f8f4ec'
const DARK = '#2a3829'
const GREY = '#666666'
const GREY_LIGHT = '#e5e5e5'
const RED = '#b91c1c'
const RED_LIGHT = '#fef2f2'

type Dossier = {
  id: string
  nom: string
  prenom: string
  email_client: string | null
  statut: 'prospect' | 'actif' | 'archive'
  offre_amana_cible: 'mass' | 'patrimoniale' | 'premium' | null
  facts_count: number
  last_activity_at: string
}

type ActiveResponse = {
  active: Dossier | null
  mode: 'sandbox' | 'dossier'
}

export default function DossierSidebar() {
  const [dossiers, setDossiers] = useState<Dossier[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newNom, setNewNom] = useState('')
  const [newPrenom, setNewPrenom] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [menuOpenForId, setMenuOpenForId] = useState<string | null>(null)
  const [deleteConfirmFor, setDeleteConfirmFor] = useState<Dossier | null>(null)
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('')
  const [deleting, setDeleting] = useState(false)

  const refresh = useCallback(async () => {
    setError(null)
    try {
      const [resD, resA] = await Promise.all([
        fetch('/api/dossiers'),
        fetch('/api/dossiers/active'),
      ])
      if (!resD.ok) throw new Error(`Erreur listing : ${resD.status}`)
      const d = (await resD.json()) as { dossiers: Dossier[] }
      setDossiers(d.dossiers ?? [])
      if (resA.ok) {
        const a = (await resA.json()) as ActiveResponse
        setActiveId(a.active?.id ?? null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
    const onFocus = () => void refresh()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [refresh])

  async function selectDossier(id: string | null) {
    setError(null)
    try {
      const res = await fetch('/api/dossiers/active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dossier_id: id }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? `Erreur switch : ${res.status}`)
      }
      setActiveId(id)
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur switch')
    }
  }

  async function handleCreate() {
    if (!newNom.trim() || !newPrenom.trim()) {
      setError('Nom et prénom requis')
      return
    }
    setCreating(true)
    setError(null)
    try {
      const res = await fetch('/api/dossiers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom: newNom.trim(),
          prenom: newPrenom.trim(),
          email_client: newEmail.trim() || null,
          statut: 'prospect',
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? `Erreur création : ${res.status}`)
      }
      const data = (await res.json()) as { dossier: Dossier }
      setNewNom('')
      setNewPrenom('')
      setNewEmail('')
      setShowCreate(false)
      await selectDossier(data.dossier.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur création')
    } finally {
      setCreating(false)
    }
  }

  function handleExport(d: Dossier) {
    setMenuOpenForId(null)
    // Trigger download via lien direct sur l'endpoint export
    window.open(`/api/dossiers/${d.id}/export`, '_blank')
  }

  function openDeleteConfirm(d: Dossier) {
    setMenuOpenForId(null)
    setDeleteConfirmFor(d)
    setDeleteConfirmInput('')
  }

  async function handleDelete() {
    if (!deleteConfirmFor) return
    if (deleteConfirmInput !== 'SUPPRIMER') {
      setError('Tape SUPPRIMER en majuscules pour confirmer')
      return
    }
    setDeleting(true)
    setError(null)
    try {
      const res = await fetch(`/api/dossiers/${deleteConfirmFor.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation: 'SUPPRIMER' }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? `Erreur suppression : ${res.status}`)
      }
      // Si on supprimait le dossier actif, basculer en bac à sable
      if (activeId === deleteConfirmFor.id) {
        await selectDossier(null)
      } else {
        await refresh()
      }
      setDeleteConfirmFor(null)
      setDeleteConfirmInput('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur suppression')
    } finally {
      setDeleting(false)
    }
  }

  // ===== Styles =====
  const wrap: CSSProperties = {
    width: 280,
    minHeight: '100vh',
    background: 'white',
    borderRight: `1px solid ${GREY_LIGHT}`,
    padding: '20px 16px',
    fontFamily: "'Inter', system-ui, sans-serif",
    position: 'sticky',
    top: 0,
    overflowY: 'auto',
  }
  const sectionTitle: CSSProperties = {
    fontSize: 11,
    fontWeight: 700,
    color: FOREST,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    margin: '0 0 10px',
  }
  const itemBase: CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    padding: '10px 12px',
    borderRadius: 10,
    cursor: 'pointer',
    fontSize: 13,
    transition: 'background 0.15s',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'transparent',
    position: 'relative',
  }
  const activeItem: CSSProperties = {
    background: 'rgba(58,77,57,0.08)',
    borderColor: FOREST,
  }
  const itemContent: CSSProperties = { flex: 1 }
  const itemName: CSSProperties = {
    fontWeight: 600,
    color: DARK,
    display: 'block',
  }
  const itemMeta: CSSProperties = {
    fontSize: 11,
    color: GREY,
    display: 'block',
  }
  const kebabBtn: CSSProperties = {
    background: 'transparent',
    border: 'none',
    color: GREY,
    cursor: 'pointer',
    fontSize: 16,
    padding: '0 4px',
    lineHeight: 1,
    fontFamily: 'inherit',
  }
  const menuPopup: CSSProperties = {
    position: 'absolute',
    top: '100%',
    right: 0,
    background: 'white',
    border: `1px solid ${GREY_LIGHT}`,
    borderRadius: 8,
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    padding: 4,
    zIndex: 10,
    minWidth: 180,
  }
  const menuItem: CSSProperties = {
    display: 'block',
    width: '100%',
    padding: '8px 12px',
    background: 'transparent',
    border: 'none',
    fontSize: 13,
    color: DARK,
    cursor: 'pointer',
    textAlign: 'left',
    borderRadius: 4,
    fontFamily: 'inherit',
  }
  const menuItemDanger: CSSProperties = {
    ...menuItem,
    color: RED,
  }
  const button: CSSProperties = {
    display: 'block',
    width: '100%',
    padding: '10px 12px',
    background: FOREST,
    color: CREAM,
    border: 'none',
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    marginBottom: 8,
  }
  const buttonGhost: CSSProperties = {
    ...button,
    background: 'transparent',
    color: FOREST,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: FOREST,
  }
  const buttonDanger: CSSProperties = {
    ...button,
    background: RED,
  }
  const input: CSSProperties = {
    width: '100%',
    padding: '8px 10px',
    border: `1px solid ${GREY_LIGHT}`,
    borderRadius: 8,
    fontSize: 13,
    fontFamily: 'inherit',
    marginBottom: 6,
    boxSizing: 'border-box',
  }
  const overlay: CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.4)',
    zIndex: 100,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }
  const dialog: CSSProperties = {
    background: 'white',
    borderRadius: 16,
    padding: 24,
    maxWidth: 480,
    width: '90%',
    boxShadow: '0 8px 40px rgba(0,0,0,0.2)',
    fontFamily: "'Inter', system-ui, sans-serif",
  }

  return (
    <aside style={wrap}>
      <div style={{ marginBottom: 18 }}>
        <p style={sectionTitle}>Mode actif</p>
        <div
          onClick={() => activeId !== null && selectDossier(null)}
          style={{
            ...itemBase,
            ...(activeId === null ? activeItem : {}),
          }}
        >
          <div style={itemContent}>
            <span style={itemName}>Bac à sable</span>
            <span style={itemMeta}>Tests, questions méta</span>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 18 }}>
        <p style={sectionTitle}>Dossiers ({dossiers.length})</p>
        {loading && <p style={{ ...itemMeta, padding: '0 12px' }}>Chargement…</p>}
        {!loading && dossiers.length === 0 && (
          <p style={{ ...itemMeta, padding: '0 12px' }}>Aucun dossier. Crée le premier ↓</p>
        )}
        {dossiers.map((d) => (
          <div
            key={d.id}
            style={{
              ...itemBase,
              ...(activeId === d.id ? activeItem : {}),
              marginBottom: 4,
            }}
          >
            <div
              style={itemContent}
              onClick={() => activeId !== d.id && selectDossier(d.id)}
            >
              <span style={itemName}>{d.prenom} {d.nom}</span>
              <span style={itemMeta}>
                {d.statut} · {d.facts_count} fait{d.facts_count > 1 ? 's' : ''}
              </span>
            </div>
            <button
              style={kebabBtn}
              onClick={(e) => {
                e.stopPropagation()
                setMenuOpenForId(menuOpenForId === d.id ? null : d.id)
              }}
              aria-label="Actions sur ce dossier"
            >
              ⋯
            </button>
            {menuOpenForId === d.id && (
              <div style={menuPopup}>
                <button style={menuItem} onClick={() => handleExport(d)}>
                  Exporter (JSON RGPD)
                </button>
                <button style={menuItemDanger} onClick={() => openDeleteConfirm(d)}>
                  Supprimer définitivement
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {!showCreate ? (
        <button style={button} onClick={() => setShowCreate(true)}>
          + Nouveau dossier
        </button>
      ) : (
        <div style={{ marginBottom: 12 }}>
          <p style={sectionTitle}>Nouveau dossier</p>
          <input
            type="text"
            placeholder="Prénom"
            value={newPrenom}
            onChange={(e) => setNewPrenom(e.target.value)}
            style={input}
          />
          <input
            type="text"
            placeholder="Nom"
            value={newNom}
            onChange={(e) => setNewNom(e.target.value)}
            style={input}
          />
          <input
            type="email"
            placeholder="Email (optionnel)"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            style={input}
          />
          <button
            style={{ ...button, opacity: creating ? 0.6 : 1 }}
            onClick={handleCreate}
            disabled={creating}
          >
            {creating ? 'Création…' : 'Créer et activer'}
          </button>
          <button
            style={buttonGhost}
            onClick={() => {
              setShowCreate(false)
              setNewNom('')
              setNewPrenom('')
              setNewEmail('')
              setError(null)
            }}
          >
            Annuler
          </button>
        </div>
      )}

      {error && (
        <div
          style={{
            padding: '8px 12px',
            background: RED_LIGHT,
            border: '1px solid #fecaca',
            borderRadius: 8,
            color: '#991b1b',
            fontSize: 12,
            marginTop: 8,
          }}
        >
          {error}
        </div>
      )}

      <button
        style={{ ...buttonGhost, marginTop: 12, fontSize: 11, padding: '6px 10px' }}
        onClick={() => void refresh()}
      >
        Rafraîchir
      </button>

      {/* Modal de confirmation de suppression */}
      {deleteConfirmFor && (
        <div style={overlay} onClick={() => setDeleteConfirmFor(null)}>
          <div style={dialog} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ margin: '0 0 12px', fontSize: 18, color: RED, fontWeight: 600 }}>
              Suppression définitive — RGPD
            </h2>
            <p style={{ fontSize: 14, color: DARK, lineHeight: 1.5, marginBottom: 12 }}>
              Tu vas supprimer <strong>définitivement</strong> le dossier{' '}
              <strong>{deleteConfirmFor.prenom} {deleteConfirmFor.nom}</strong>{' '}
              ainsi que tous les faits associés ({deleteConfirmFor.facts_count} fait
              {deleteConfirmFor.facts_count > 1 ? 's' : ''}).
            </p>
            <p style={{ fontSize: 13, color: GREY, marginBottom: 16 }}>
              Cette action est <strong>irréversible</strong>. Pour confirmer, tape
              <strong> SUPPRIMER </strong> dans le champ ci-dessous.
            </p>
            <input
              type="text"
              placeholder="Tape SUPPRIMER pour confirmer"
              value={deleteConfirmInput}
              onChange={(e) => setDeleteConfirmInput(e.target.value)}
              style={{ ...input, marginBottom: 16 }}
              autoFocus
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                style={{ ...buttonGhost, flex: 1 }}
                onClick={() => {
                  setDeleteConfirmFor(null)
                  setDeleteConfirmInput('')
                  setError(null)
                }}
              >
                Annuler
              </button>
              <button
                style={{
                  ...buttonDanger,
                  flex: 1,
                  opacity: deleteConfirmInput === 'SUPPRIMER' && !deleting ? 1 : 0.5,
                  cursor: deleteConfirmInput === 'SUPPRIMER' && !deleting ? 'pointer' : 'not-allowed',
                }}
                onClick={handleDelete}
                disabled={deleteConfirmInput !== 'SUPPRIMER' || deleting}
              >
                {deleting ? 'Suppression…' : 'Supprimer définitivement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
