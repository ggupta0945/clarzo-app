'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// Minimal typing for the Web Speech API. The DOM lib doesn't ship these
// because the API is still vendor-prefixed in Safari, so we declare just
// enough to consume it. We never import these names — they're runtime
// lookups off `window`.
type SpeechRecognitionEventLike = {
  results: ArrayLike<{
    isFinal: boolean
    0: { transcript: string }
  }>
  resultIndex: number
}

type SpeechRecognitionLike = {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

// Web Speech API wrapper for the chat inputs. Returns `null` for `start`
// when the browser doesn't support it — callers should hide the mic button
// in that case rather than render a no-op control.
//
// `onFinalChunk` fires with the committed transcript every time the API
// commits a result (typically on natural pauses). `onInterimChunk` fires
// continuously with the live partial. Callers use the interim to show
// preview text and the final to actually append to the input value.
export function useSpeechToText({
  lang = 'en-IN',
  onFinalChunk,
  onInterimChunk,
}: {
  lang?: string
  onFinalChunk?: (text: string) => void
  onInterimChunk?: (text: string) => void
} = {}): {
  supported: boolean
  listening: boolean
  error: string | null
  start: () => void
  stop: () => void
} {
  const [supported, setSupported] = useState(false)
  const [listening, setListening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const recRef = useRef<SpeechRecognitionLike | null>(null)
  const onFinalRef = useRef(onFinalChunk)
  const onInterimRef = useRef(onInterimChunk)

  useEffect(() => {
    onFinalRef.current = onFinalChunk
    onInterimRef.current = onInterimChunk
  }, [onFinalChunk, onInterimChunk])

  useEffect(() => {
    setSupported(getRecognitionCtor() !== null)
  }, [])

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor()
    if (!Ctor) return
    if (recRef.current) {
      // Already running — toggle off so the button acts as a hard switch.
      recRef.current.stop()
      return
    }
    setError(null)
    const rec = new Ctor()
    rec.lang = lang
    rec.continuous = true
    rec.interimResults = true
    rec.onresult = (event) => {
      let interim = ''
      let final = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]!
        const chunk = result[0].transcript
        if (result.isFinal) final += chunk
        else interim += chunk
      }
      if (final) onFinalRef.current?.(final)
      if (interim) onInterimRef.current?.(interim)
    }
    rec.onerror = (e) => {
      // "no-speech" fires on long silences and is benign; everything else
      // we surface to the user.
      if (e.error !== 'no-speech' && e.error !== 'aborted') {
        setError(e.error)
      }
    }
    rec.onend = () => {
      recRef.current = null
      setListening(false)
    }
    try {
      rec.start()
      recRef.current = rec
      setListening(true)
    } catch (e) {
      // Throws "InvalidStateError" if start is called twice in a row.
      console.error('SpeechRecognition.start failed:', e)
      recRef.current = null
      setListening(false)
    }
  }, [lang])

  const stop = useCallback(() => {
    recRef.current?.stop()
  }, [])

  // Defensive cleanup if the consuming component unmounts mid-stream.
  useEffect(() => {
    return () => {
      recRef.current?.abort()
      recRef.current = null
    }
  }, [])

  return { supported, listening, error, start, stop }
}
