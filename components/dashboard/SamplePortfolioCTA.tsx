'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useState } from 'react'
import { captureEvent } from '@/lib/analytics/client'

// Empty-state CTA pair: primary "Upload" link + secondary "Try with sample
// portfolio" button that POSTs to /api/sample-portfolio and refreshes the
// dashboard so the user lands on a fully-populated demo. The whole point is
// removing the upload-first friction for activation.

export function SamplePortfolioCTA() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleTrySample() {
    if (loading) return
    setLoading(true)
    setError(null)
    captureEvent('sample_portfolio_loaded')
    try {
      const res = await fetch('/api/sample-portfolio', { method: 'POST' })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error ?? 'seed_failed')
      }
      // router.refresh re-runs the server component so the dashboard renders
      // with the seeded holdings instead of the empty state.
      router.refresh()
    } catch (e) {
      console.error('sample portfolio load failed:', e)
      setError("Couldn't load the demo. Please try again.")
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <Link
        href="/dashboard/upload"
        className="inline-block bg-accent hover:bg-accent-hover text-white px-5 py-2.5 rounded-lg text-sm font-medium transition shadow-sm"
      >
        Upload Portfolio →
      </Link>
      <button
        onClick={handleTrySample}
        disabled={loading}
        className="text-sm text-fg-muted hover:text-accent disabled:opacity-60 transition underline-offset-4 hover:underline"
      >
        {loading ? 'Loading demo…' : 'or try with a sample portfolio'}
      </button>
      {error && <p className="text-xs text-warning">{error}</p>}
    </div>
  )
}
