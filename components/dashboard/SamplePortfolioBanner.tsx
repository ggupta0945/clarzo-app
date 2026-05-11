'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { captureEvent } from '@/lib/analytics/client'

// Top-of-dashboard banner shown while sample holdings are loaded. Two
// affordances: "Replace with my portfolio" wipes the demo and routes to
// upload, "Clear demo" wipes and refreshes back to the empty state. Both
// hit DELETE /api/sample-portfolio — only sample rows are touched, so a
// user who later mixes real + sample (shouldn't happen, but) doesn't lose
// real data.

export function SamplePortfolioBanner() {
  const router = useRouter()
  const [working, setWorking] = useState<'replace' | 'clear' | null>(null)

  async function clear(): Promise<boolean> {
    const res = await fetch('/api/sample-portfolio', { method: 'DELETE' })
    return res.ok
  }

  async function handleReplace() {
    if (working) return
    setWorking('replace')
    captureEvent('sample_portfolio_replace_clicked')
    const ok = await clear()
    if (ok) {
      router.push('/dashboard/upload')
    } else {
      setWorking(null)
    }
  }

  async function handleClear() {
    if (working) return
    setWorking('clear')
    captureEvent('sample_portfolio_cleared')
    const ok = await clear()
    if (ok) {
      router.refresh()
    } else {
      setWorking(null)
    }
  }

  return (
    <div className="mb-4 bg-accent-soft border border-accent/30 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
      <div className="text-sm text-fg">
        <span className="font-medium text-accent">Demo portfolio loaded.</span>{' '}
        <span className="text-fg-muted">
          You're exploring with a sample of 8 Indian stocks — nothing here is your real money yet.
        </span>
      </div>
      <div className="flex gap-2 shrink-0">
        <button
          onClick={handleClear}
          disabled={working !== null}
          className="text-xs font-medium px-3 py-1.5 rounded-full border border-line text-fg-muted hover:text-fg hover:border-line-strong disabled:opacity-50 transition"
        >
          {working === 'clear' ? 'Clearing…' : 'Clear demo'}
        </button>
        <button
          onClick={handleReplace}
          disabled={working !== null}
          className="text-xs font-medium px-3 py-1.5 rounded-full bg-accent hover:bg-accent-hover text-white disabled:opacity-50 transition"
        >
          {working === 'replace' ? 'Working…' : 'Replace with my portfolio'}
        </button>
      </div>
    </div>
  )
}
