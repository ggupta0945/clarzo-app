'use client'

import { useChat } from '@ai-sdk/react'
import { TextStreamChatTransport, isTextUIPart } from 'ai'
import { useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { captureEvent } from '@/lib/analytics/client'
import { VoiceButton } from '@/components/chat/VoiceButton'
import { MarkdownMessage } from '@/components/markdown-message'


const SUGGESTED_QUESTIONS = [
  "What's my biggest risk right now?",
  'Am I diversified enough?',
  'Which holdings should I worry about?',
  'How does my portfolio compare to a typical investor?',
]

// Extract the numbered follow-up questions the AI appends to each answer.
// Matches lines like "1. Question text?" or "2. **Bold question**?" under any
// heading that contains "follow" (case-insensitive). Returns up to 2 questions.
function parseFollowUps(text: string): string[] {
  // Find a follow-up section heading
  const sectionMatch = text.match(/(?:^|\n)#{1,3}\s*.*follow.{0,20}\n([\s\S]*?)(?:\n#{1,3}|\n---|\n\*\*\*|$)/i)
    ?? text.match(/\*\*.*follow.{0,30}\*\*\s*\n([\s\S]*?)(?:\n\*\*|\n---|\n#{1,3}|$)/i)

  const block = sectionMatch?.[1] ?? text

  const lines = block.split('\n')
  const questions: string[] = []
  for (const line of lines) {
    // Match "1. Question" or "- Question" optionally with **bold** wrapper
    const m = line.match(/^[\s\*]*\d+[\.\)]\s+\*{0,2}(.+?)\*{0,2}\s*$/)
    if (m) {
      const q = m[1].trim().replace(/\*\*/g, '')
      if (q.length > 10) questions.push(q)
    }
    if (questions.length >= 2) break
  }
  return questions
}

const AUTO_GREET_PROMPT =
  "I just opened my dashboard. Give me a 3-bullet snapshot of my portfolio: (1) the most important thing I should know right now, (2) the biggest risk, (3) the most interesting opportunity. Keep each bullet to a single sentence with concrete numbers from my actual holdings. End by asking what I want to dig into."

type StoredMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

type Attachment = {
  name: string
  content: string  // text for CSV, data URL for images
  type: 'text' | 'image'
  mimeType: string
}

type SentAttachment = {
  name: string
  type: 'image' | 'text'
  url?: string  // data URL for images only
}

type RenderMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  attachment?: SentAttachment
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
  const [attachment, setAttachment] = useState<Attachment | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const greetTriggeredRef = useRef(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  // Parallel array to liveRender user messages — tracks display metadata for attachments
  const sentAttachmentQueue = useRef<Array<SentAttachment | null>>([])

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

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!e.target) return
    e.target.value = ''
    if (!file) return

    const name = file.name.toLowerCase()
    const isImage = file.type.startsWith('image/')
    const isXlsx = name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.xlsm')
    const isCsv = name.endsWith('.csv') || file.type === 'text/csv' || file.type === 'text/plain' || name.endsWith('.txt')
    const isPdf = name.endsWith('.pdf') || file.type === 'application/pdf'

    if (isImage) {
      const reader = new FileReader()
      reader.onload = () => {
        setAttachment({ name: file.name, content: reader.result as string, type: 'image', mimeType: file.type })
      }
      reader.readAsDataURL(file)
    } else if (isXlsx) {
      const reader = new FileReader()
      reader.onload = () => {
        try {
          const wb = XLSX.read(new Uint8Array(reader.result as ArrayBuffer), { type: 'array' })
          const sheet = wb.Sheets[wb.SheetNames[0]]
          const csv = XLSX.utils.sheet_to_csv(sheet)
          setAttachment({ name: file.name, content: csv, type: 'text', mimeType: 'text/csv' })
        } catch {
          alert('Could not read this Excel file. Try saving as CSV first.')
        }
      }
      reader.readAsArrayBuffer(file)
    } else if (isCsv) {
      const reader = new FileReader()
      reader.onload = () => {
        setAttachment({ name: file.name, content: reader.result as string, type: 'text', mimeType: 'text/csv' })
      }
      reader.readAsText(file)
    } else if (isPdf) {
      const fd = new FormData()
      fd.set('file', file)
      fetch('/api/parse-pdf', { method: 'POST', body: fd })
        .then(async (res) => {
          const data = await res.json() as { text?: string; pages?: number; message?: string }
          if (!res.ok || !data.text) {
            alert(data.message ?? 'Could not read this PDF.')
            return
          }
          setAttachment({ name: file.name, content: data.text, type: 'text', mimeType: 'application/pdf' })
        })
        .catch(() => alert('Network error parsing PDF. Try again.'))
    } else {
      alert('Supported: PDF, CSV, XLSX, TXT, or images (JPG/PNG/WEBP).')
    }
  }, [])

  const handleVoice = useCallback(async () => {
    // Stop recording if already active
    if (isListening) {
      mediaRecorderRef.current?.stop()
      return
    }

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      alert('Microphone access denied. Allow microphone access in your browser settings and try again.')
      return
    }

    audioChunksRef.current = []
    const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
    const recorder = new MediaRecorder(stream, { mimeType })
    mediaRecorderRef.current = recorder

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunksRef.current.push(e.data)
    }

    recorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop())
      setIsListening(false)
      setIsTranscribing(true)
      try {
        const blob = new Blob(audioChunksRef.current, { type: mimeType })
        const form = new FormData()
        form.append('audio', blob, 'audio.webm')
        const res = await fetch('/api/transcribe', { method: 'POST', body: form })
        if (!res.ok) throw new Error(await res.text())
        const { transcript } = await res.json() as { transcript: string }
        if (transcript?.trim()) {
          setInput((prev) => (prev.trim() ? prev + ' ' + transcript : transcript))
        }
      } catch (e) {
        console.error('[voice] transcription error:', e)
        alert('Could not transcribe audio. Please try again.')
      } finally {
        setIsTranscribing(false)
      }
    }

    recorder.start()
    setIsListening(true)
  }, [isListening])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text && !attachment) return
    if (isLoading) return

    // Snapshot before clearing state
    const snap = attachment

    let messageText = text
    if (snap?.type === 'text' && snap.content) {
      messageText = `Here is a file I'm attaching (${snap.name}):\n\`\`\`\n${snap.content.slice(0, 8000)}\n\`\`\`\n\n${text || 'Please analyse this file.'}`
    }

    // Queue display metadata for this outgoing user message
    sentAttachmentQueue.current.push(
      snap
        ? { name: snap.name, type: snap.type, url: snap.type === 'image' ? snap.content : undefined }
        : null
    )

    captureEvent('chat_message_sent', {
      source: 'manual',
      message_length: messageText.length,
      has_attachment: !!snap,
    })

    if (snap?.type === 'image') {
      sendMessage({
        role: 'user',
        parts: [
          { type: 'text', text: messageText || 'Please analyse this image.' },
          { type: 'file', mediaType: snap.mimeType as 'image/jpeg', url: snap.content },
        ],
      })
    } else {
      sendMessage({ text: messageText })
    }

    setInput('')
    setAttachment(null)
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
  let _userMsgIdx = 0
  const liveRender: RenderMessage[] = messages
    .map((m) => {
      const rawText = m.parts.filter(isTextUIPart).map((p) => p.text).join('')
      let content = rawText
      let attachment: SentAttachment | undefined

      if (m.role === 'user') {
        const queued = sentAttachmentQueue.current[_userMsgIdx++] ?? null
        if (queued) {
          attachment = queued
          if (queued.type === 'text') {
            // Strip the embedded file dump — show only the user's actual question
            const afterBlock = rawText.match(/```\n[\s\S]*?\n```\n\n([\s\S]*)$/)
            content = afterBlock?.[1]?.trim() || ''
          } else {
            // For images the text part is just the user's question
            content = rawText
          }
        }
      }

      return { id: m.id, role: m.role as 'user' | 'assistant', content, attachment }
    })
    .filter((m) => (m.content || m.attachment) && m.content !== AUTO_GREET_PROMPT)

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
          <Bubble key={m.id} role={m.role} attachment={m.attachment}>
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

        {!hydrating && hasAnyMessages && !isLoading && (history.length > 0 || liveRender.length > 0) && (() => {
          const lastAssistant = [...liveRender].reverse().find(m => m.role === 'assistant')
            ?? [...history].reverse().find(m => m.role === 'assistant')
          const dynamic = lastAssistant ? parseFollowUps(lastAssistant.content) : []
          const chips = dynamic.length >= 2 ? dynamic.slice(0, 2) : SUGGESTED_QUESTIONS.slice(0, 2)
          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
              {chips.map((q) => (
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
          )
        })()}

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

      {/* Card-style composer */}
      <form
        onSubmit={handleSubmit}
        className="mt-3 flex-shrink-0 bg-surface border border-line rounded-2xl shadow-sm overflow-hidden"
      >
        {/* Hidden file input for chat attachments (images / CSV) */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.csv,.xlsx,.xls,.xlsm,.txt,.pdf"
          className="hidden"
          onChange={handleFileSelect}
        />

        {/* Attachment preview strip — visible only when a file is selected */}
        {attachment && (
          <div className="flex items-center gap-2 px-3.5 pt-3">
            {attachment.type === 'image' ? (
              <div className="relative">
                <img
                  src={attachment.content}
                  alt={attachment.name}
                  className="h-16 w-16 rounded-xl object-cover border border-line"
                />
                <button
                  type="button"
                  onClick={() => setAttachment(null)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-fg text-bg rounded-full flex items-center justify-center text-[10px] leading-none hover:bg-fg/80 transition"
                  aria-label="Remove attachment"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="relative flex items-center gap-2 bg-accent-soft border border-accent/30 rounded-xl px-3 py-2 text-xs text-fg max-w-[220px]">
                <svg className="w-4 h-4 text-accent shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="truncate">{attachment.name}</span>
                <button
                  type="button"
                  onClick={() => setAttachment(null)}
                  className="ml-1 shrink-0 text-fg-muted hover:text-fg transition"
                  aria-label="Remove attachment"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        )}

        {/* Textarea */}
        <textarea
          value={input}
          onChange={(e) => {
            setInput(e.target.value)
            // Auto-grow
            e.target.style.height = 'auto'
            e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px'
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSubmit(e as unknown as React.FormEvent)
            }
          }}
          placeholder={
            isListening
              ? 'Listening…'
              : rateLimit.blocked
              ? 'Free quota reached. Upgrade for unlimited queries.'
              : 'Write a message…'
          }
          rows={1}
          className="w-full bg-transparent px-3.5 pt-3 pb-1 text-sm text-fg placeholder-fg-subtle focus:outline-none resize-none disabled:opacity-50"
          disabled={isLoading || hydrating || rateLimit.blocked}
          style={{ minHeight: '2.5rem' }}
        />

        {/* Bottom toolbar */}
        <div className="flex items-center justify-between px-2.5 pb-2.5 pt-1">
          {/* Left: file attachment (image / CSV / XLSX / PDF) */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading || hydrating || rateLimit.blocked}
              title="Attach a file — PDF, CSV, XLSX, or image"
              className="w-8 h-8 flex items-center justify-center rounded-full text-fg-muted hover:text-fg hover:bg-line disabled:opacity-40 transition"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>
          </div>

          {/* Right: mic + send */}
          <div className="flex items-center gap-1.5">
            {rateLimit.remaining != null && !rateLimit.blocked && rateLimit.remaining <= 5 && (
              <span className="text-[11px] text-fg-muted mr-1">
                {rateLimit.remaining} left
              </span>
            )}
            {/* Voice */}
            <button
              type="button"
              onClick={handleVoice}
              disabled={isLoading || hydrating || rateLimit.blocked || isTranscribing}
              title={isListening ? 'Stop recording' : isTranscribing ? 'Transcribing…' : 'Voice input'}
              className={`relative w-8 h-8 flex items-center justify-center rounded-full transition disabled:opacity-40 ${
                isListening
                  ? 'bg-red-500 text-white'
                  : isTranscribing
                  ? 'bg-line text-fg-muted'
                  : 'text-fg-muted hover:text-fg hover:bg-line'
              }`}
            >
              {isListening && (
                <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-50" />
              )}
              {isTranscribing ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 relative z-10" fill={isListening ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                </svg>
              )}
            </button>
            {/* Send */}
            <button
              type="submit"
              disabled={isLoading || hydrating || (!input.trim() && !attachment) || rateLimit.blocked}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-accent hover:bg-accent-hover text-white disabled:opacity-40 disabled:cursor-not-allowed transition"
              title="Send (Enter)"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
              </svg>
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

function Bubble({
  role,
  children,
  attachment,
}: {
  role: 'user' | 'assistant'
  children: React.ReactNode
  attachment?: SentAttachment
}) {
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

        {/* Attachment preview inside the bubble */}
        {attachment && role === 'user' && (
          <div className="mb-2">
            {attachment.type === 'image' && attachment.url ? (
              <img
                src={attachment.url}
                alt={attachment.name}
                className="max-h-48 max-w-full rounded-xl object-cover border border-white/20"
              />
            ) : (
              <div className="flex items-center gap-1.5 bg-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white/90 w-fit max-w-[200px]">
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="truncate">{attachment.name}</span>
              </div>
            )}
          </div>
        )}

        <div className={`text-sm leading-relaxed ${role === 'user' ? 'whitespace-pre-wrap' : ''}`}>
          {children}
        </div>
      </div>
    </div>
  )
}
