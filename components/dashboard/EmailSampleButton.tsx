'use client'

import { captureEvent } from '@/lib/analytics/client'
import { useState } from 'react'

type State = 'idle' | 'sending' | 'sent' | 'error'

export function EmailSampleButton() {
  const [state, setState] = useState<State>('idle')
  const [message, setMessage] = useState<string | null>(null)

  async function sendSample() {
    if (state === 'sending') return

    setState('sending')
    setMessage(null)
    captureEvent('weekly_digest_sample_clicked')

    try {
      const res = await fetch('/api/digest/sample', { method: 'POST' })
      const body = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(body.error ?? 'sample_digest_failed')
      }

      captureEvent('weekly_digest_sample_sent')
      setState('sent')
      setMessage('Sample sent. Check your inbox.')
    } catch (error) {
      captureEvent('weekly_digest_sample_failed')
      setState('error')
      setMessage(error instanceof Error ? error.message : 'Could not send sample.')
    }
  }

  return (
    <div className="flex flex-col items-start sm:items-end gap-2">
      <button
        onClick={sendSample}
        disabled={state === 'sending'}
        className="border border-[#1a4a2e] hover:border-[#34d399] hover:bg-[#0c2418] disabled:opacity-50 text-[#e4f0e8] px-4 py-2 rounded-full text-sm transition"
      >
        {state === 'sending' ? 'Sending sample...' : state === 'sent' ? 'Sample sent' : 'Email me a sample'}
      </button>
      {message && (
        <p className={`text-xs ${state === 'error' ? 'text-[#f5c842]' : 'text-[#88b098]'}`}>
          {message}
        </p>
      )}
    </div>
  )
}
