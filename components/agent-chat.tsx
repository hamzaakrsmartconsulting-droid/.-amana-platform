// components/agent-chat.tsx — v3 avec persistence et reprise du fil
// Sprint Agents IA v8 · 29 avril 2026
//
// Évolutions vs v2 (sprint v3) :
//   - Au mount, charge la conversation active depuis localStorage et fetch ses messages
//   - Persiste le conversation_id à chaque échange (header X-Conversation-Id)
//   - Bouton "Nouvelle conversation" pour reset le fil
//   - Le state messages est initialisé depuis l'API (reprise au refresh)

'use client'

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent,
} from 'react'
import { useRouter } from 'next/navigation'

const FOREST = '#444b3f'
const GOLD = '#c9a55a'
const CREAM = '#f8f4ec'
const DARK = '#353b32'
const GREY = '#666666'
const GREY_LIGHT = '#e5e5e5'
const WHITE = '#ffffff'

type Msg = { role: 'user' | 'assistant'; content: string }

type Props = {
  agentName?: string
  agentRole?: string
  agentInitial?: string
  apiPath?: string
  welcomeMessage?: string
  examples?: string[]
  agentColor?: string
}

const localStorageKey = (dossierKey: string, agentName: string) =>
  `amana_convo_${dossierKey}_${agentName}`

export default function AgentChat({
  agentName = 'Mizan',
  agentRole = 'Bilan patrimonial',
  agentInitial = 'M',
  apiPath = '/api/agents/mizan',
  welcomeMessage,
  examples = [
    'Je suis salarié, 35 ans, 2 enfants, patrimoine 80 k€. Comment je commence ?',
    'Quelle différence entre un PER et une assurance-vie en finance islamique ?',
    "C'est quoi la SCPI NCap Education Santé ?",
    'Comment calcule-t-on la zakat sur des ETF islamiques ?',
  ],
  agentColor = FOREST,
}: Props) {
  const router = useRouter()
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [dossierKey, setDossierKey] = useState<string>('sandbox')
  const [hydrated, setHydrated] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, loading])

  // Au mount : déterminer le dossier actif + restaurer la conversation
  useEffect(() => {
    let cancelled = false

    async function init() {
      try {
        // 1. Récupérer le dossier actif
        const resA = await fetch('/api/dossiers/active')
        let activeDossierId: string | null = null
        if (resA.ok) {
          const data = (await resA.json()) as { active: { id: string } | null }
          activeDossierId = data.active?.id ?? null
        }
        const dKey = activeDossierId ?? 'sandbox'
        if (cancelled) return
        setDossierKey(dKey)

        // 2. Restaurer la conversation depuis localStorage
        const storedId = localStorage.getItem(localStorageKey(dKey, agentName))
        if (!storedId) {
          if (!cancelled) setHydrated(true)
          return
        }

        // 3. Fetch les messages de cette conversation
        const resC = await fetch(`/api/conversations/${storedId}`)
        if (!resC.ok) {
          // Conversation introuvable ou expirée : on reset
          localStorage.removeItem(localStorageKey(dKey, agentName))
          if (!cancelled) setHydrated(true)
          return
        }

        const cdata = (await resC.json()) as {
          conversation: { id: string }
          messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>
        }
        if (cancelled) return

        setConversationId(cdata.conversation.id)
        // Filtrer les messages system (on ne les affiche pas)
        const restored: Msg[] = cdata.messages
          .filter((m) => m.role === 'user' || m.role === 'assistant')
          .map((m) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          }))
        setMessages(restored)
      } catch (err) {
        console.error('[agent-chat] hydration failed', err)
      } finally {
        if (!cancelled) setHydrated(true)
      }
    }

    void init()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentName])

  function handleNewConversation() {
    setMessages([])
    setConversationId(null)
    setError(null)
    if (typeof window !== 'undefined') {
      localStorage.removeItem(localStorageKey(dossierKey, agentName))
    }
  }

  async function send(content: string) {
    const trimmed = content.trim()
    if (!trimmed || loading) return

    const userMsg: Msg = { role: 'user', content: trimmed }
    const newMessages: Msg[] = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    setError(null)

    setMessages([...newMessages, { role: 'assistant', content: '' }])

    try {
      const res = await fetch(apiPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          conversation_id: conversationId,
        }),
      })

      if (res.status === 401) {
        const data = await res.json().catch(() => ({}))
        const redirect =
          (data && typeof data.redirect === 'string' && data.redirect) || '/auth'
        const next = encodeURIComponent(window.location.pathname)
        router.push(`${redirect}?next=${next}`)
        return
      }

      if (!res.ok || !res.body) {
        const text = await res.text().catch(() => '')
        throw new Error(text || `HTTP ${res.status}`)
      }

      // Capter le conversation_id depuis le header de réponse
      const newConversationId = res.headers.get('X-Conversation-Id')
      if (newConversationId && newConversationId !== conversationId) {
        setConversationId(newConversationId)
        if (typeof window !== 'undefined') {
          localStorage.setItem(localStorageKey(dossierKey, agentName), newConversationId)
        }
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let acc = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        acc += decoder.decode(value, { stream: true })
        setMessages([...newMessages, { role: 'assistant', content: acc }])
      }

      acc += decoder.decode()
      if (acc) {
        setMessages([...newMessages, { role: 'assistant', content: acc }])
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue'
      setError(msg)
      setMessages(newMessages)
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    void send(input)
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void send(input)
    }
  }

  // ===== Styles =====
  const wrap: CSSProperties = {
    maxWidth: 880,
    margin: '0 auto',
    background: WHITE,
    border: `1px solid ${GREY_LIGHT}`,
    borderRadius: 16,
    overflow: 'hidden',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    display: 'flex',
    flexDirection: 'column',
    height: 'min(80vh, 720px)',
  }
  const header: CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '14px 18px', background: CREAM,
    borderBottom: `1px solid ${GREY_LIGHT}`,
  }
  const avatar: CSSProperties = {
    width: 40, height: 40, borderRadius: 12,
    background: agentColor, color: GOLD,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 600, fontSize: 16, flexShrink: 0,
  }
  const headerInfo: CSSProperties = { flex: 1 }
  const headerName: CSSProperties = { margin: 0, fontSize: 15, fontWeight: 600, color: DARK }
  const headerRole: CSSProperties = { margin: '2px 0 0', fontSize: 12, color: GREY }
  const dot: CSSProperties = {
    width: 8, height: 8, borderRadius: 4,
    background: '#22c55e', marginLeft: 8,
  }
  const newConvoBtn: CSSProperties = {
    padding: '6px 12px',
    background: 'transparent',
    color: GREY,
    borderWidth: 1, borderStyle: 'solid', borderColor: GREY_LIGHT,
    borderRadius: 8, fontSize: 11, cursor: 'pointer',
    fontFamily: 'inherit',
  }
  const messagesArea: CSSProperties = { flex: 1, overflowY: 'auto', padding: '16px 18px', background: '#fafafa' }
  const emptyState: CSSProperties = { textAlign: 'center', padding: '40px 20px', color: GREY }
  const emptyTitle: CSSProperties = { margin: 0, fontSize: 16, fontWeight: 600, color: DARK }
  const emptySub: CSSProperties = { margin: '6px 0 20px', fontSize: 13, color: GREY }
  const examplesGrid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 8, maxWidth: 720, margin: '0 auto' }
  const exampleBtn: CSSProperties = { background: WHITE, border: `1px solid ${GREY_LIGHT}`, borderRadius: 12, padding: '10px 14px', fontSize: 13, color: DARK, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }
  const msgRow = (role: 'user' | 'assistant'): CSSProperties => ({
    display: 'flex', justifyContent: role === 'user' ? 'flex-end' : 'flex-start',
    marginBottom: 10,
  })
  const bubble = (role: 'user' | 'assistant'): CSSProperties => ({
    maxWidth: '80%', padding: '10px 14px', borderRadius: 14,
    fontSize: 14, lineHeight: 1.55, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
    background: role === 'user' ? agentColor : WHITE,
    color: role === 'user' ? CREAM : DARK,
    border: role === 'assistant' ? `1px solid ${GREY_LIGHT}` : 'none',
    borderBottomRightRadius: role === 'user' ? 4 : 14,
    borderBottomLeftRadius: role === 'assistant' ? 4 : 14,
  })
  const typing: CSSProperties = { display: 'inline-flex', gap: 4, padding: '10px 14px', background: WHITE, border: `1px solid ${GREY_LIGHT}`, borderRadius: 14, borderBottomLeftRadius: 4 }
  const tag: CSSProperties = { display: 'inline-block', fontSize: 11, fontWeight: 500, color: agentColor, background: 'rgba(68, 75, 63, 0.1)', padding: '2px 8px', borderRadius: 999, marginBottom: 4 }
  const errorBox: CSSProperties = { background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '10px 14px', borderRadius: 8, fontSize: 13, margin: '0 0 10px' }
  const inputArea: CSSProperties = { borderTop: `1px solid ${GREY_LIGHT}`, padding: 12, background: WHITE }
  const form: CSSProperties = { display: 'flex', gap: 8, alignItems: 'flex-end' }
  const textareaStyle: CSSProperties = { flex: 1, minHeight: 44, maxHeight: 140, resize: 'none', border: `1px solid ${GREY_LIGHT}`, borderRadius: 14, padding: '10px 14px', fontFamily: 'inherit', fontSize: 14, lineHeight: 1.5, outline: 'none', background: WHITE, color: DARK }
  const sendBtn: CSSProperties = { background: agentColor, color: CREAM, border: 'none', borderRadius: '50%', width: 44, height: 44, cursor: loading || !input.trim() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: loading || !input.trim() ? 0.5 : 1 }
  const disclaimer: CSSProperties = { padding: '8px 18px', background: CREAM, borderTop: `1px solid ${GREY_LIGHT}`, fontSize: 11, color: GREY, textAlign: 'center' }

  return (
    <div style={wrap}>
      <div style={header}>
        <div style={avatar}>{agentInitial}</div>
        <div style={headerInfo}>
          <p style={headerName}>{agentName}</p>
          <p style={headerRole}>
            {agentRole}
            <span style={dot} aria-hidden />
          </p>
        </div>
        {messages.length > 0 && (
          <button style={newConvoBtn} onClick={handleNewConversation}>
            Nouvelle conversation
          </button>
        )}
      </div>

      <div style={messagesArea}>
        {!hydrated ? (
          <div style={emptyState}>
            <p style={emptySub}>Chargement de la conversation…</p>
          </div>
        ) : messages.length === 0 ? (
          <div style={emptyState}>
            <p style={emptyTitle}>
              {welcomeMessage ?? `Commencez la conversation avec ${agentName}`}
            </p>
            <p style={emptySub}>
              Quelques exemples pour démarrer · vos productions sont
              IA-augmentées et validées par Mohamed Mosbahi.
            </p>
            <div style={examplesGrid}>
              {examples.map((ex, i) => (
                <button key={i} type="button" style={exampleBtn} onClick={() => void send(ex)}>
                  {ex}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => {
            const isLastAssistant = m.role === 'assistant' && i === messages.length - 1
            const showTyping = isLastAssistant && loading && m.content === ''
            return (
              <div key={i} style={msgRow(m.role)}>
                <div>
                  {m.role === 'assistant' && i === 0 && (
                    <span style={tag}>{agentName}</span>
                  )}
                  {showTyping ? (
                    <div style={typing} aria-label="L'agent réfléchit">
                      <Dot delay={0} />
                      <Dot delay={0.15} />
                      <Dot delay={0.3} />
                    </div>
                  ) : (
                    <div style={bubble(m.role)}>{m.content}</div>
                  )}
                </div>
              </div>
            )
          })
        )}

        {error && (
          <div style={errorBox} role="alert">
            Erreur : {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div style={inputArea}>
        <form onSubmit={handleSubmit} style={form}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Posez votre question à ${agentName}...`}
            style={textareaStyle}
            rows={1}
            disabled={loading}
          />
          <button
            type="submit"
            style={sendBtn}
            disabled={loading || !input.trim()}
            aria-label="Envoyer"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2 21l21-9L2 3v7l15 2-15 2z" />
            </svg>
          </button>
        </form>
      </div>

      <div style={disclaimer}>
        Production IA-augmentée · validation humaine systématique par Mohamed
        Mosbahi · charte transparence sur amana-patrimoine.fr/charte-ia
      </div>
    </div>
  )
}

function Dot({ delay }: { delay: number }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: 6, height: 6, borderRadius: '50%',
        background: GREY,
        animation: `agent-bounce 1.2s ${delay}s infinite ease-in-out`,
      }}
    />
  )
}
