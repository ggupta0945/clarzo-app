'use client'

import Link from 'next/link'
import { useChat } from '@ai-sdk/react'
import { TextStreamChatTransport, isTextUIPart } from 'ai'
import { useEffect, useRef, useState } from 'react'
import { UploadButton } from '@/components/chat/UploadButton'
import { VoiceButton } from '@/components/chat/VoiceButton'

// Inline Ask Clarzo bar: fixed to the viewport bottom on /dashboard. Sending
// a message streams the response into a small scrollable panel that sits
// directly above the input — no fullsize takeover. Clearing the conversation
// removes the panel; the bar collapses back to the input alone.

export function AskClarzoBar() {
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const { messages, sendMessage, status, setMessages } = useChat({
    transport: new TextStreamChatTransport({ api: '/api/ask' }),
  })
  const isLoading = status === 'submitted' || status === 'streaming'

  const renderable = messages
    .map((m) => ({
      id: m.id,
      role: m.role as 'user' | 'assistant',
      text: m.parts.filter(isTextUIPart).map((p) => p.text).join(''),
    }))
    .filter((m) => m.text)

  const hasMessages = renderable.length > 0 || isLoading

  useEffect(() => {
    if (hasMessages) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [renderable.length, isLoading, hasMessages])

  function send(text: string) {
    if (!text.trim() || isLoading) return
    sendMessage({ text })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text) return
    send(text)
    setInput('')
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-30 pointer-events-none">
      <div className="pointer-events-auto max-w-3xl mx-auto space-y-2">
        {/* Conversation panel — only when there's something to show */}
        {hasMessages && (
          <div className="bg-surface border border-line rounded-2xl shadow-lg shadow-[#1f235b]/8 overflow-hidden">
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-accent-soft">
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                <span className="text-[10px] font-medium text-fg-muted uppercase tracking-wider">
                  Clarzo
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/dashboard/ask"
                  className="text-[10px] font-medium text-accent hover:underline"
                >
                  Open full thread →
                </Link>
                <button
                  onClick={() => setMessages([])}
                  className="text-[10px] font-medium text-fg-muted hover:text-fg transition"
                  title="Clear this conversation"
                >
                  Clear
                </button>
              </div>
            </div>
            <div className="max-h-72 overflow-y-auto px-3 py-2.5 space-y-2">
              {renderable.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-xl px-2.5 py-1.5 text-xs leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-accent text-white'
                        : 'bg-canvas border border-line text-fg'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{m.text}</p>
                  </div>
                </div>
              ))}
              {isLoading && renderable.every((m) => m.role === 'user') && (
                <div className="flex justify-start">
                  <div className="bg-canvas border border-line rounded-xl px-2.5 py-1.5">
                    <div className="flex space-x-1">
                      {[0, 150, 300].map((d) => (
                        <span
                          key={d}
                          className="w-1 h-1 rounded-full animate-bounce bg-accent"
                          style={{ animationDelay: `${d}ms` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          </div>
        )}

        {/* Composer */}
        <form
          onSubmit={handleSubmit}
          className="bg-surface border border-line-strong rounded-2xl shadow-lg shadow-[#1f235b]/8 focus-within:border-accent focus-within:shadow-xl transition px-4 py-2.5"
        >
          <div className="flex items-center gap-2.5">
            <UploadButton
              size="sm"
              disabled={isLoading}
              onUploaded={({ inserted }) => {
                sendMessage({
                  text: `I just uploaded a fresh portfolio with ${inserted} holdings. Give me a 3-bullet snapshot: most important thing, biggest risk, top opportunity. Concrete numbers from my holdings.`,
                })
              }}
            />
            <VoiceButton
              size="sm"
              disabled={isLoading}
              onAppend={(text) => setInput((cur) => (cur ? `${cur} ${text}` : text))}
            />
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything..."
              disabled={isLoading}
              className="flex-1 bg-transparent text-sm text-fg placeholder-fg-subtle focus:outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              aria-label="Send"
              disabled={isLoading || !input.trim()}
              className="shrink-0 h-9 w-9 rounded-full bg-accent hover:bg-accent-hover text-white flex items-center justify-center transition shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="19" x2="12" y2="5" />
                <polyline points="5 12 12 5 19 12" />
              </svg>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
