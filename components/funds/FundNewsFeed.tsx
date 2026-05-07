'use client'

// Client-side fund news pane. Pulls /api/funds/news on mount; lazy-loads
// so the detail page TTFB isn't blocked by the upstream RSS fetch.

import { useEffect, useState } from 'react'
import type { NewsItem } from '@/lib/mutual-funds/types'
import { relativeTime } from '@/lib/mutual-funds/format'

type Props = {
  fundName: string
  amc?: string | null
}

export function FundNewsFeed({ fundName, amc }: Props) {
  const [items, setItems] = useState<NewsItem[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        // Search using AMC + first few significant tokens of the fund name
        // for cleaner results; falls back to full name.
        const q = `${amc ?? ''} ${fundName}`.trim()
        const res = await fetch(`/api/funds/news?name=${encodeURIComponent(q)}&limit=8`)
        if (!res.ok) throw new Error('fetch failed')
        const json = (await res.json()) as { items: NewsItem[] }
        if (!cancelled) setItems(json.items)
      } catch (e) {
        if (!cancelled) setErr((e as Error).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [fundName, amc])

  return (
    <div className="bg-surface border border-line rounded-xl shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-line flex items-center justify-between">
        <h3 className="text-sm font-semibold text-fg">News</h3>
        <span className="text-[10px] text-fg-subtle">via Google News</span>
      </div>
      <div className="divide-y divide-[var(--line)]">
        {loading && (
          <div className="px-4 py-6 text-sm text-fg-muted">Loading news…</div>
        )}
        {err && !loading && (
          <div className="px-4 py-6 text-sm text-fg-muted">News unavailable right now.</div>
        )}
        {!loading && !err && items && items.length === 0 && (
          <div className="px-4 py-6 text-sm text-fg-muted">No recent news for this fund.</div>
        )}
        {!loading && items && items.map((n, i) => (
          <a
            key={i}
            href={n.link}
            target="_blank"
            rel="noopener noreferrer"
            className="block px-4 py-3 hover:bg-canvas/60 transition"
          >
            <div className="text-sm text-fg leading-snug line-clamp-2">{n.title}</div>
            <div className="flex items-center gap-1.5 mt-1 text-[10px] text-fg-subtle">
              <span>{n.source}</span>
              <span>·</span>
              <span>{relativeTime(n.published_at)}</span>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}
