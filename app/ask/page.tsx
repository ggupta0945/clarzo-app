'use client'

import { useChat } from '@ai-sdk/react'
import { TextStreamChatTransport, isTextUIPart } from 'ai'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { captureEvent } from '@/lib/analytics/client'

const SUGGESTED = [
  'Is HDFC Bank a good long-term hold?',
  "What's a good emergency fund for a ₹1L/month earner?",
  'Should I do SIP or lump sum right now?',
  'How is gold ETF different from physical gold?',
]

export default function PublicAskPage() {
  const [input, setInput] = useState('')
  const [rateLimit, setRateLimit] = useState<{
    remaining: number | null
    blocked: boolean
    message: string | null
  }>({ remaining: null, blocked: false, message: null })
  const bottomRef = useRef<HTMLDivElement>(null)

  // Mirror the /dashboard/ask transport shape: read X-RateLimit-Remaining
  // from headers, surface 429s as a paywall instead of a generic stream
  // error.
  const transport = useMemo(
    () =>
      new TextStreamChatTransport({
        api: '/api/public-ask',
        fetch: async (input, init) => {
          const res = await fetch(input, init)
          const remaining = res.headers.get('X-RateLimit-Remaining')
          if (remaining != null) {
            setRateLimit((prev) => ({ ...prev, remaining: Number(remaining) }))
          }
          if (res.status === 429) {
            let message = "You've used your 3 free questions."
            try {
              const body = await res.clone().json()
              if (body?.message) message = body.message
            } catch {}
            captureEvent('public_chat_limit_hit')
            setRateLimit({ remaining: 0, blocked: true, message })
          }
          return res
        },
      }),
    [],
  )

  const { messages, sendMessage, status } = useChat({
    transport,
  })
  const isLoading = status === 'submitted' || status === 'streaming'

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || isLoading || rateLimit.blocked) return
    captureEvent('public_chat_message_sent', {
      source: 'manual',
      message_length: input.trim().length,
    })
    sendMessage({ text: input })
    setInput('')
  }

  function handleSuggest(q: string) {
    if (isLoading || rateLimit.blocked) return
    captureEvent('public_chat_message_sent', {
      source: 'suggested',
      message_length: q.length,
    })
    sendMessage({ text: q })
  }

  const liveMessages = messages
    .map((m) => {
      const text = m.parts.filter(isTextUIPart).map((p) => p.text).join('')
      return { id: m.id, role: m.role as 'user' | 'assistant', content: text }
    })
    .filter((m) => m.content)

  const hasMessages = liveMessages.length > 0 || isLoading

  return (
    <div className="min-h-screen bg-[#040f0a] text-[#e4f0e8] flex flex-col">
      <header className="border-b border-[#1a4a2e] px-4 sm:px-6 py-4 flex items-center justify-between flex-shrink-0">
        <Link
          href="/"
          className="text-2xl text-[#34d399]"
          style={{ fontFamily: 'Playfair Display, serif' }}
        >
          Clarzo
        </Link>
        <div className="flex items-center gap-3 sm:gap-4">
          {!rateLimit.blocked && rateLimit.remaining != null && (
            <span className="text-xs text-[#88b098] hidden sm:inline">
              {rateLimit.remaining} free question{rateLimit.remaining !== 1 ? 's' : ''} left
            </span>
          )}
          <Link
            href="/login"
            className="bg-[#059669] hover:bg-[#0F6E56] text-white px-4 sm:px-5 py-2 rounded-full text-sm font-medium transition"
          >
            Sign up free
          </Link>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 sm:px-10 py-8">
        {!hasMessages ? (
          <div className="max-w-2xl mx-auto">
            <h1
              className="text-3xl sm:text-4xl mb-3"
              style={{ fontFamily: 'Playfair Display, serif' }}
            >
              Ask Clarzo anything about money.
            </h1>
            <p className="text-[#88b098] mb-8">
              Free. No signup. 3 questions to get you started.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              {SUGGESTED.map((q) => (
                <button
                  key={q}
                  onClick={() => handleSuggest(q)}
                  className="text-left bg-[#071a10] border border-[#1a4a2e] hover:border-[#34d399] hover:bg-[#0c2418] rounded-xl p-4 text-sm transition"
                >
                  {q}
                </button>
              ))}
            </div>

            <div className="bg-[#071a10] border border-[#1a4a2e] rounded-xl p-5 mt-8">
              <p className="text-sm text-[#88b098]">
                Want personalized answers about <em>your</em> portfolio?{' '}
                <Link href="/login" className="text-[#34d399] hover:underline">
                  Sign up free →
                </Link>
              </p>
            </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-4">
            {liveMessages.map((m) => (
              <Bubble key={m.id} role={m.role}>
                {m.content}
                {m.role === 'assistant' &&
                  isLoading &&
                  m.id === liveMessages[liveMessages.length - 1]?.id && (
                    <span className="animate-pulse">▌</span>
                  )}
              </Bubble>
            ))}

            {isLoading && liveMessages.every((m) => m.role === 'user') && (
              <Bubble role="assistant">
                <div className="flex space-x-1">
                  <span
                    className="w-2 h-2 bg-[#34d399] rounded-full animate-bounce"
                    style={{ animationDelay: '0ms' }}
                  />
                  <span
                    className="w-2 h-2 bg-[#34d399] rounded-full animate-bounce"
                    style={{ animationDelay: '150ms' }}
                  />
                  <span
                    className="w-2 h-2 bg-[#34d399] rounded-full animate-bounce"
                    style={{ animationDelay: '300ms' }}
                  />
                </div>
              </Bubble>
            )}

            {rateLimit.blocked && (
              <div className="bg-[#0c2418] border border-[#34d399]/30 rounded-2xl p-6 mt-8 text-center">
                <p className="text-lg mb-3">Want unlimited questions?</p>
                <p className="text-sm text-[#88b098] mb-5">
                  {rateLimit.message ||
                    "Sign up free to ask unlimited general questions — and upload your portfolio for personalized answers about your money."}
                </p>
                <Link
                  href="/login"
                  className="inline-block bg-[#059669] hover:bg-[#0F6E56] text-white px-6 py-3 rounded-full font-medium transition"
                >
                  Sign up free →
                </Link>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {!rateLimit.blocked && (
        <form
          onSubmit={handleSubmit}
          className="px-4 sm:px-10 py-4 border-t border-[#1a4a2e] flex-shrink-0"
        >
          <div className="max-w-2xl mx-auto flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
              placeholder="Ask anything about money..."
              className="flex-1 bg-[#071a10] border border-[#1a4a2e] focus:border-[#34d399] rounded-full px-5 py-3 text-[#e4f0e8] placeholder-[#4a7a5a] outline-none transition disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="bg-[#059669] hover:bg-[#0F6E56] disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-full font-medium transition"
            >
              Send
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

function Bubble({
  role,
  children,
}: {
  role: 'user' | 'assistant'
  children: React.ReactNode
}) {
  return (
    <div className={`flex ${role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          role === 'user'
            ? 'bg-[#059669] text-white'
            : 'bg-[#071a10] border border-[#1a4a2e] text-[#e4f0e8]'
        }`}
      >
        {role === 'assistant' && (
          <p className="text-xs text-[#34d399] mb-1 font-medium">Clarzo</p>
        )}
        <p className="whitespace-pre-wrap">{children}</p>
      </div>
    </div>
  )
}
