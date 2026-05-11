'use client'

import { useSpeechToText } from '@/lib/hooks/use-speech-to-text'

// Mic toggle for chat inputs. Hides itself entirely on browsers without
// SpeechRecognition support (Firefox today, older Safari). The hook
// streams final chunks into `onAppend` — the consumer is responsible for
// appending to whatever input value it owns.
//
// `lang='en-IN'` is the default — picks up Indian-accented English and
// Hinglish reasonably well. Callers can override.

type Props = {
  onAppend: (text: string) => void
  disabled?: boolean
  size?: 'sm' | 'md'
  lang?: string
}

export function VoiceButton({ onAppend, disabled, size = 'md', lang }: Props) {
  const { supported, listening, error, start, stop } = useSpeechToText({
    lang,
    onFinalChunk: (text) => onAppend(text),
  })

  if (!supported) return null

  const dim = size === 'sm' ? 'h-8 w-8' : 'h-10 w-10'
  const iconSize = size === 'sm' ? 14 : 16

  return (
    <button
      type="button"
      onClick={() => (listening ? stop() : start())}
      disabled={disabled}
      title={listening ? 'Stop listening' : error ? `Mic error: ${error}` : 'Speak'}
      aria-label={listening ? 'Stop listening' : 'Start voice input'}
      aria-pressed={listening}
      className={`${dim} shrink-0 inline-flex items-center justify-center rounded-full transition disabled:opacity-50 disabled:cursor-not-allowed ${
        listening
          ? 'bg-danger text-white animate-pulse'
          : 'bg-surface border border-line-strong text-fg-muted hover:border-accent hover:text-accent'
      }`}
    >
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="9" y="2" width="6" height="12" rx="3" />
        <path d="M5 11a7 7 0 0 0 14 0" />
        <line x1="12" y1="18" x2="12" y2="22" />
        <line x1="8" y1="22" x2="16" y2="22" />
      </svg>
    </button>
  )
}
