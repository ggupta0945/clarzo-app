'use client'

import { useChat } from '@ai-sdk/react'
import { TextStreamChatTransport, isTextUIPart } from 'ai'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

// Routes where the FAB shouldn't render. The chat panel itself is still
// mounted everywhere so the AskClarzoBar's `clarzo:open` event can open it.
const HIDE_FAB_ON = ['/dashboard', '/dashboard/ask', '/dashboard/stocks']

export function FloatingAskClarzo() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const { messages, sendMessage, status } = useChat({
    transport: new TextStreamChatTransport({ api: '/api/ask' }),
  })
  const isLoading = status === 'submitted' || status === 'streaming'

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    inputRef.current?.focus()
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  // The inline AskClarzoBar fires `clarzo:open` to expand the chat. Optional
  // `detail.prefill` becomes the first message — submit immediately so the
  // user sees a response without re-typing.
  useEffect(() => {
    function onOpen(e: Event) {
      const detail = (e as CustomEvent<{ prefill?: string }>).detail
      setOpen(true)
      const prefill = detail?.prefill?.trim()
      if (prefill) sendMessage({ text: prefill })
    }
    window.addEventListener('clarzo:open', onOpen as EventListener)
    return () => window.removeEventListener('clarzo:open', onOpen as EventListener)
  }, [sendMessage])

  const renderable = messages
    .map((m) => ({
      id: m.id,
      role: m.role as 'user' | 'assistant',
      text: m.parts.filter(isTextUIPart).map((p) => p.text).join(''),
    }))
    .filter((m) => m.text)

  const hasMessages = renderable.length > 0 || isLoading

  function send(text: string) {
    if (!text.trim() || isLoading) return
    sendMessage({ text })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    send(input)
    setInput('')
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send(input)
      setInput('')
    }
  }

  const showFab = !HIDE_FAB_ON.includes(pathname)

  return (
    <>
      {/* FAB */}
      {!open && showFab && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open Ask Clarzo"
          className="fixed bottom-5 right-5 z-40 flex items-center gap-2 bg-accent hover:bg-accent-hover text-white pl-3 pr-4 py-2.5 rounded-full shadow-lg shadow-[#444ce7]/30 transition"
        >
          <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-fg/15">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-accent ring-2 ring-[#444ce7]" />
          </span>
          <span className="text-sm font-medium">Ask Clarzo</span>
        </button>
      )}

      {/* Fullsize chat */}
      {open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-surface">
          {/* Header */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-line">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#a4bcfd] to-[#444ce7] text-white">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </span>
              <div>
                <p className="text-sm font-semibold text-fg leading-tight">Ask Clarzo</p>
                <p className="text-[11px] text-fg-muted leading-tight">Your portfolio, in plain English</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Link
                href="/dashboard/ask"
                className="text-xs font-medium text-accent hover:underline px-2 py-1.5"
                title="Open the full chat history page"
              >
                Full thread →
              </Link>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="p-1.5 text-fg-muted hover:text-fg hover:bg-canvas rounded transition"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {hasMessages && (
              <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-3">
                {renderable.map((m) => (
                  <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                        m.role === 'user'
                          ? 'bg-accent text-white'
                          : 'bg-canvas border border-line text-fg'
                      }`}
                    >
                      {m.role === 'assistant' && (
                        <p className="text-xs mb-1 font-medium text-accent">Clarzo</p>
                      )}
                      <p className="whitespace-pre-wrap">{m.text}</p>
                    </div>
                  </div>
                ))}
                {isLoading && renderable.every((m) => m.role === 'user') && (
                  <div className="flex justify-start">
                    <div className="bg-canvas border border-line rounded-2xl px-4 py-2.5">
                      <p className="text-xs mb-1 font-medium text-accent">Clarzo</p>
                      <div className="flex space-x-1">
                        {[0, 150, 300].map((d) => (
                          <span
                            key={d}
                            className="w-1.5 h-1.5 rounded-full animate-bounce bg-accent"
                            style={{ animationDelay: `${d}ms` }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            )}
          </div>

          {/* Composer */}
          <div className="border-t border-line bg-surface px-4 sm:px-6 py-4">
            <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
              <div className="bg-surface border border-line-strong rounded-2xl shadow-sm focus-within:border-accent focus-within:shadow-md transition px-3 py-2.5">
                <div className="flex items-start gap-2">
                  <span className="mt-1 inline-flex h-5 w-5 items-center justify-center text-accent shrink-0">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5 5l2.5 2.5M16.5 16.5L19 19M5 19l2.5-2.5M16.5 7.5L19 5" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </span>
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKey}
                    placeholder="Ask me anything..."
                    rows={1}
                    disabled={isLoading}
                    className="flex-1 resize-none bg-transparent text-sm text-fg placeholder-fg-subtle focus:outline-none min-h-[24px] max-h-32"
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    aria-label="Send"
                    className="shrink-0 h-9 w-9 rounded-full bg-accent hover:bg-accent-hover text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="19" x2="12" y2="5" />
                      <polyline points="5 12 12 5 19 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
