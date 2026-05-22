// app/sajl/page.tsx
// Sprint Agents IA v12 · 30 avril 2026
//
// Page UI minimale de l'agent Sajl (Document & Reporting).
// Consomme /api/agents/sajl en SSE.
// Pattern aligné sur celui d'Amîn (sprint v4) : zone de messages,
// input utilisateur, indicateur de tool calls, rendu markdown basique.

'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
  toolCalls?: Array<{ name: string; input: unknown }>
  toolResults?: Array<{ name: string; result: unknown }>
}

type ActiveDossier = {
  id: string
  prenom: string
  nom: string
}

export default function SajlPage() {
  const router = useRouter()
  const [activeDossier, setActiveDossier] = useState<ActiveDossier | null>(null)
  const [loadingDossier, setLoadingDossier] = useState(true)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Charger le dossier actif
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const r = await fetch('/api/dossiers/active')
        const data = await r.json()
        if (cancelled) return
        if (data.dossier) {
          setActiveDossier({
            id: data.dossier.id,
            prenom: data.dossier.prenom,
            nom: data.dossier.nom,
          })
        }
      } catch (e) {
        console.error(e)
      } finally {
        if (!cancelled) setLoadingDossier(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!input.trim() || streaming) return
    if (!activeDossier) {
      setError('Aucun dossier actif. Activez un dossier dans /admin/dossiers.')
      return
    }

    const userMsg: ChatMessage = { role: 'user', content: input.trim() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setStreaming(true)
    setError(null)

    // Préparer le payload pour /api/agents/sajl
    const apiMessages = newMessages.map((m) => ({
      role: m.role,
      content: m.content,
    }))

    try {
      const res = await fetch('/api/agents/sajl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          dossier_id: activeDossier.id,
        }),
      })
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${res.status}`)
      }

      // Stream SSE
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let assistantContent = ''
      const toolCalls: Array<{ name: string; input: unknown }> = []
      const toolResults: Array<{ name: string; result: unknown }> = []

      // Ajouter un message assistant vide qui se remplira au fur et à mesure
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '', toolCalls, toolResults },
      ])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        // Parser les events SSE
        const events = buffer.split('\n\n')
        buffer = events.pop() ?? '' // garder le dernier morceau incomplet

        for (const evtBlock of events) {
          const lines = evtBlock.split('\n').filter(Boolean)
          const event = lines.find((l) => l.startsWith('event: '))?.slice(7)
          const dataLine = lines.find((l) => l.startsWith('data: '))?.slice(6)
          if (!event || !dataLine) continue
          let data: unknown
          try {
            data = JSON.parse(dataLine)
          } catch {
            continue
          }

          if (event === 'text_delta' && typeof (data as { text?: string }).text === 'string') {
            assistantContent += (data as { text: string }).text
            setMessages((prev) => {
              const next = [...prev]
              const last = next[next.length - 1]
              if (last && last.role === 'assistant') {
                next[next.length - 1] = { ...last, content: assistantContent }
              }
              return next
            })
          } else if (event === 'tool_call') {
            const tc = data as { name: string; input: unknown }
            toolCalls.push(tc)
            setMessages((prev) => {
              const next = [...prev]
              const last = next[next.length - 1]
              if (last && last.role === 'assistant') {
                next[next.length - 1] = { ...last, toolCalls: [...toolCalls] }
              }
              return next
            })
          } else if (event === 'tool_result') {
            const tr = data as { name: string; result: unknown }
            toolResults.push(tr)
            setMessages((prev) => {
              const next = [...prev]
              const last = next[next.length - 1]
              if (last && last.role === 'assistant') {
                next[next.length - 1] = { ...last, toolResults: [...toolResults] }
              }
              return next
            })
          } else if (event === 'error') {
            const errMsg = (data as { message?: string }).message ?? 'Erreur Sajl'
            setError(errMsg)
          } else if (event === 'done') {
            // Boucle terminée — rien de spécial à faire
          }
        }
      }
    } catch (e) {
      console.error(e)
      setError(e instanceof Error ? e.message : 'Erreur réseau')
    } finally {
      setStreaming(false)
    }
  }

  if (loadingDossier)
    return <div className="p-6 text-amana-grey">Chargement…</div>

  return (
    <div className="mx-auto flex h-screen max-w-4xl flex-col p-6">
      <header className="mb-4 flex items-center justify-between border-b border-amana-grey-light pb-3">
        <div>
          <h1 className="text-2xl font-semibold text-amana-forest">
            Sajl · Document & Reporting
          </h1>
          <p className="text-sm text-amana-grey">
            Pilotage des 7 documents officiels AMANA via conversation
          </p>
        </div>
        {activeDossier ? (
          <div className="text-sm text-amana-grey">
            Dossier actif :{' '}
            <Link
              href={`/admin/dossiers/${activeDossier.id}`}
              className="font-semibold text-amana-forest underline"
            >
              {activeDossier.prenom} {activeDossier.nom}
            </Link>
          </div>
        ) : (
          <div className="text-sm text-red-700">
            Pas de dossier actif —{' '}
            <Link
              href="/admin/dossiers"
              className="underline"
            >
              en activer un
            </Link>
          </div>
        )}
      </header>

      <main className="flex-1 space-y-3 overflow-y-auto pr-2">
        {messages.length === 0 && (
          <div className="rounded border border-amana-gold bg-amana-cream p-4 text-sm text-amana-dark">
            <p className="font-semibold text-amana-forest">
              Comment puis-je vous aider ?
            </p>
            <ul className="mt-2 list-disc pl-5">
              <li>« Génère le DER pour ce dossier »</li>
              <li>« Quels documents sont déjà produits ici ? »</li>
              <li>« Aide-moi à compléter la lettre de mission »</li>
              <li>« Crée le bilan Mizan avec ces données… »</li>
            </ul>
          </div>
        )}
        {messages.map((m, i) => (
          <MessageBubble key={i} message={m} />
        ))}
        {error && (
          <div className="rounded border-l-4 border-red-500 bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        )}
        <div ref={messagesEndRef} />
      </main>

      <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSubmit(e as unknown as FormEvent)
            }
          }}
          rows={2}
          placeholder="Demandez à Sajl…"
          disabled={streaming}
          className="flex-1 rounded border border-amana-grey-light p-2 text-sm disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={streaming || !input.trim() || !activeDossier}
          className="rounded bg-amana-forest px-4 py-2 text-sm font-semibold text-white hover:bg-amana-dark disabled:opacity-50"
        >
          {streaming ? '…' : 'Envoyer'}
        </button>
      </form>
    </div>
  )
}

function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-lg bg-amana-forest px-3 py-2 text-sm text-white">
          {message.content}
        </div>
      </div>
    )
  }
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] space-y-2">
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="space-y-1">
            {message.toolCalls.map((tc, i) => (
              <div
                key={i}
                className="inline-block rounded border border-amana-gold bg-amana-cream px-2 py-1 text-xs text-amana-dark"
              >
                🔧 {tc.name}
              </div>
            ))}
          </div>
        )}
        {message.content && (
          <div className="rounded-lg border border-amana-grey-light bg-white px-3 py-2 text-sm whitespace-pre-wrap">
            {message.content}
          </div>
        )}
      </div>
    </div>
  )
}
