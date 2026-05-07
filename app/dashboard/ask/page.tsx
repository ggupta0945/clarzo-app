'use client'

import { useChat } from '@ai-sdk/react'
import { TextStreamChatTransport, isTextUIPart } from 'ai'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { captureEvent } from '@/lib/analytics/client'
import { MarkdownMessage } from '@/components/markdown-message'

const SUGGESTED_QUESTIONS = [
  "What's my biggest risk right now?",
  'Am I diversified enough?',
  'Which holdings should I worry about?',
  'How does my portfolio compare to a typical investor?',
]

const AUTO_GREET_PROMPT =
  "I just opened my dashboard. Give me a 3-bullet snapshot of my portfolio: (1) the most important thing I should know right now, (2) the biggest risk, (3) the most interesting opportunity. Keep each bullet to a single sentence with concrete numbers from my actual holdings. End by asking what I want to dig into."

type StoredMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export default function AskPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-[calc(100vh-3.5rem)] lg:h-screen">
          <div className="flex space-x-1.5">
            <span className="w-2 h-2 bg-accent rounded-full animate-bounce" />
            <span className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      }
    >
      <AskPageInner />
    </Suspense>
  )
}

function AskPageInner() {
  const searchParams = useSearchParams()
  const queryParam = searchParams.get('q')
  const welcomeParam = searchParams.get('welcome') === 'true'
  const [input, setInput] = useState('')
  const [hydrating, setHydrating] = useState(true)
  const [history, setHistory] = useState<StoredMessage[]>([])
  const [clearing, setClearing] = useState(false)
  const [rateLimit, setRateLimit] = useState<{
    remaining: number | null
    blocked: boolean
    message: string | null
  }>({ remaining: null, blocked: false, message: null })
  const greetTriggeredRef = useRef(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Wrap fetch on the transport so we can read X-RateLimit-* headers and
  // surface 429 responses as a banner instead of a generic stream error.
  const transport = useMemo(
    () =>
      new TextStreamChatTransport({
        api: '/api/ask',
        fetch: async (input, init) => {
          const res = await fetch(input, init)
          const remaining = res.headers.get('X-RateLimit-Remaining')
          if (remaining != null) {
            setRateLimit((prev) => ({ ...prev, remaining: Number(remaining) }))
          }
          if (res.status === 429) {
            let message = "You've used your free queries for this month."
            try {
              const body = await res.clone().json()
              if (body?.message) message = body.message
            } catch {}
            captureEvent('chat_limit_hit')
            setRateLimit({ remaining: 0, blocked: true, message })
          }
          return res
        },
      }),
    [],
  )

  const { messages, sendMessage, status, setMessages } = useChat({
    transport,
  })
  const isLoading = status === 'submitted' || status === 'streaming'

  // Load past chat on mount. If empty, fire the auto-greet so a returning
  // user sees the conversation pick up, while a first-time user gets an
  // immediate personalized snapshot. If the URL carries ?q=... (e.g. from a
  // goal card), send that as the user's message instead of the greet — the
  // user's intent is explicit so we honor it over the snapshot.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/ask/history')
        const json = (await res.json()) as { messages: StoredMessage[] }
        if (cancelled) return

        if (json.messages.length > 0) {
          setHistory(json.messages)
        }

        if (greetTriggeredRef.current) return
        greetTriggeredRef.current = true

        if (queryParam) {
          sendMessage({ text: queryParam })
        } else if (json.messages.length === 0 || welcomeParam) {
          sendMessage({ text: AUTO_GREET_PROMPT })
        }
      } catch (e) {
        console.error('history load failed:', e)
      } finally {
        if (!cancelled) setHydrating(false)
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, history])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    captureEvent('chat_message_sent', {
      source: 'manual',
      message_length: input.trim().length,
    })
    sendMessage({ text: input })
    setInput('')
  }

  function handleSuggest(q: string) {
    if (isLoading) return
    captureEvent('chat_message_sent', {
      source: 'suggested',
      message_length: q.length,
    })
    sendMessage({ text: q })
  }

  async function handleClear() {
    if (clearing || isLoading) return
    if (!confirm('Reset this conversation? Your portfolio data is not affected.')) return
    setClearing(true)
    try {
      const res = await fetch('/api/ask/clear', { method: 'POST' })
      if (!res.ok) throw new Error('clear failed')
      setHistory([])
      setMessages([])
      greetTriggeredRef.current = true
      sendMessage({ text: AUTO_GREET_PROMPT })
    } catch (e) {
      console.error(e)
      alert('Could not clear conversation. Try again.')
    } finally {
      setClearing(false)
    }
  }

  // Combine: stored history (older turns) + live in-session messages.
  // The auto-greet user message is filtered from rendering — the user didn't
  // type it, so showing it back to them is confusing.
  const liveRender = messages
    .map((m) => {
      const text = m.parts.filter(isTextUIPart).map((p) => p.text).join('')
      return { id: m.id, role: m.role as 'user' | 'assistant', content: text }
    })
    .filter((m) => m.content && m.content !== AUTO_GREET_PROMPT)

  const hasAnyMessages = history.length > 0 || liveRender.length > 0 || isLoading

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] lg:h-screen px-4 py-4 sm:p-6 max-w-4xl mx-auto">
      <div className="mb-5 flex-shrink-0 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-fg">
            Ask Clarzo
          </h1>
          <p className="text-fg-muted mt-0.5 text-xs">
            Anything about your portfolio. Plain English.
          </p>
        </div>
        {(history.length > 0 || liveRender.length > 0) && (
          <button
            onClick={handleClear}
            disabled={clearing || isLoading}
            className="text-xs font-medium text-fg-muted hover:text-accent disabled:opacity-50 transition shrink-0"
          >
            {clearing ? 'Resetting…' : 'Reset conversation'}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 min-h-0">
        {hydrating && (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="flex space-x-1.5">
              <span className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        {!hydrating && !hasAnyMessages && (
          <div className="flex flex-col items-center justify-center h-full gap-5 pb-8">
            <div className="text-center max-w-md">
              <p className="text-fg text-base font-medium">👋 I&apos;ve looked at your portfolio.</p>
              <p className="text-fg-muted text-xs mt-1.5">
                Ask me anything — what&apos;s working, what&apos;s risky, what to do next.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 w-full">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => handleSuggest(q)}
                  className="text-left px-3 py-2.5 rounded-xl bg-surface border border-line text-fg text-xs hover:border-accent hover:bg-accent-soft transition shadow-sm"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {history.map((m) => (
          <Bubble key={m.id} role={m.role}>
            {m.role === 'assistant' ? <MarkdownMessage content={m.content} /> : m.content}
          </Bubble>
        ))}

        {liveRender.map((m) => (
          <Bubble key={m.id} role={m.role}>
            {m.role === 'assistant' ? <MarkdownMessage content={m.content} /> : m.content}
            {m.role === 'assistant' && isLoading && m.id === liveRender[liveRender.length - 1]?.id && (
              <span className="animate-pulse">▌</span>
            )}
          </Bubble>
        ))}

        {isLoading && liveRender.every((m) => m.role === 'user') && (
          <Bubble role="assistant">
            <div className="flex space-x-1">
              <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </Bubble>
        )}

        {!hydrating && hasAnyMessages && (history.length > 0 || liveRender.length > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
            {SUGGESTED_QUESTIONS.slice(0, 2).map((q) => (
              <button
                key={q}
                onClick={() => handleSuggest(q)}
                disabled={isLoading}
                className="text-left px-2.5 py-1.5 rounded-lg bg-surface border border-line text-fg-muted text-[11px] hover:border-accent hover:text-fg disabled:opacity-50 transition"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {rateLimit.blocked && rateLimit.message && (
        <div className="mt-3 flex-shrink-0 bg-warning-soft border border-warning/40 rounded-xl px-3.5 py-2.5 text-xs text-warning flex items-center justify-between gap-3">
          <span>{rateLimit.message}</span>
          <a
            href="/dashboard/upgrade"
            className="bg-accent hover:bg-accent-hover text-white px-3 py-1.5 rounded-full text-[11px] font-medium transition shrink-0"
          >
            Upgrade
          </a>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2 mt-3 flex-shrink-0">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            rateLimit.blocked
              ? 'Free quota reached. Upgrade for unlimited queries.'
              : 'Ask anything about your portfolio...'
          }
          className="flex-1 bg-surface border border-line-strong rounded-xl px-3.5 py-2.5 text-sm text-fg placeholder-fg-subtle focus:outline-none focus:border-accent transition disabled:opacity-50 shadow-sm"
          disabled={isLoading || hydrating || rateLimit.blocked}
        />
        <button
          type="submit"
          disabled={isLoading || hydrating || !input.trim() || rateLimit.blocked}
          className="bg-accent hover:bg-accent-hover text-white px-5 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
        >
          Send
        </button>
      </form>

      {rateLimit.remaining != null && !rateLimit.blocked && rateLimit.remaining <= 5 && (
        <p className="mt-2 text-[11px] text-fg-muted text-right flex-shrink-0">
          {rateLimit.remaining} {rateLimit.remaining === 1 ? 'query' : 'queries'} left this month
        </p>
      )}
    </div>
  )
}

function Bubble({ role, children }: { role: 'user' | 'assistant'; children: React.ReactNode }) {
  return (
    <div className={`flex ${role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 ${
          role === 'user'
            ? 'bg-accent text-white'
            : 'bg-surface border border-line text-fg shadow-sm'
        }`}
      >
        {role === 'assistant' && (
          <p className="text-[10px] text-accent mb-1 font-semibold uppercase tracking-wider">Clarzo</p>
        )}
        {/* div, not p — assistant content includes block-level markdown
            (tables, headings) and the loading dots, both invalid inside <p>. */}
        <div
          className={`text-sm leading-relaxed ${role === 'user' ? 'whitespace-pre-wrap' : ''}`}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
