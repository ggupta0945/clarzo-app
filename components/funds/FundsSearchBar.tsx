'use client'

// Client-side autocomplete for the funds segment. Hits a search server
// action for each keystroke (debounced) and shows up to 10 suggestions.
// Pressing Enter on a highlighted result navigates to the detail page.

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

type Suggestion = {
  scheme_code: string
  scheme_name: string
  amc: string | null
  sub_category: string | null
  plan_type: string | null
}

type Props = {
  initialQuery?: string
  placeholder?: string
}

export function FundsSearchBar({ initialQuery = '', placeholder = 'Search 10,000+ mutual fund schemes…' }: Props) {
  const router = useRouter()
  const [q, setQ] = useState(initialQuery)
  const [results, setResults] = useState<Suggestion[]>([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [loading, setLoading] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([])
      return
    }
    setLoading(true)
    const controller = new AbortController()
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/funds/search?q=${encodeURIComponent(q.trim())}`, {
          signal: controller.signal,
        })
        if (!res.ok) throw new Error('search_failed')
        const json = (await res.json()) as { results: Suggestion[] }
        setResults(json.results.slice(0, 10))
        setActive(0)
        setOpen(true)
      } catch {
        // ignore — abort or transient failure
      } finally {
        setLoading(false)
      }
    }, 200)
    return () => {
      controller.abort()
      clearTimeout(t)
    }
  }, [q])

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  function go(s: Suggestion) {
    router.push(`/funds/${s.scheme_code}`)
    setOpen(false)
    setQ('')
  }

  return (
    <div className="relative" ref={wrapRef}>
      <div className="relative">
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted pointer-events-none"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          type="text"
          value={q}
          placeholder={placeholder}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          onKeyDown={(e) => {
            if (!open || results.length === 0) {
              if (e.key === 'Enter' && q.trim().length > 0) {
                router.push(`/funds/search?q=${encodeURIComponent(q.trim())}`)
              }
              return
            }
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setActive((i) => Math.min(results.length - 1, i + 1))
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setActive((i) => Math.max(0, i - 1))
            } else if (e.key === 'Enter') {
              e.preventDefault()
              const target = results[active]
              if (target) go(target)
            } else if (e.key === 'Escape') {
              setOpen(false)
            }
          }}
          className="w-full pl-9 pr-3 py-2.5 bg-surface border border-line rounded-xl text-sm text-fg placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-accent-soft focus:border-accent transition"
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-fg-subtle">searching…</span>
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-30 mt-1 w-full bg-surface border border-line rounded-xl shadow-lg overflow-hidden max-h-[26rem] overflow-y-auto">
          {results.map((r, i) => (
            <button
              key={r.scheme_code}
              onMouseDown={(e) => {
                e.preventDefault()
                go(r)
              }}
              onMouseEnter={() => setActive(i)}
              className={`w-full text-left px-3.5 py-2.5 transition ${
                i === active ? 'bg-canvas' : 'hover:bg-canvas/60'
              }`}
            >
              <div className="text-sm text-fg leading-tight line-clamp-1">{r.scheme_name}</div>
              <div className="flex items-center gap-1.5 mt-1 text-[10px] text-fg-muted">
                {r.amc && <span>{r.amc}</span>}
                {r.amc && r.sub_category && <span>·</span>}
                {r.sub_category && <span>{r.sub_category}</span>}
                {r.plan_type && <span className="text-fg-subtle">· {r.plan_type}</span>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
