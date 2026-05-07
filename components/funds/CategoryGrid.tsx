// Grid of category tiles for the discover page. Groups sub-categories under
// their SEBI parent category (Equity / Debt / Hybrid / etc.). Each tile
// shows count + deep-links to the category leaderboard.

import Link from 'next/link'
import type { CategoryCount } from '@/lib/mutual-funds/queries'

type Props = {
  counts: CategoryCount[]
}

const SECTION_ORDER: Array<[string, string]> = [
  ['Equity', 'Equity'],
  ['Hybrid', 'Hybrid'],
  ['Debt', 'Debt'],
  ['Index', 'Index'],
  ['ETF', 'ETF'],
  ['Solution Oriented', 'Goal-based'],
  ['Fund of Funds', 'Fund of Funds'],
  ['Other', 'Other'],
]

export function CategoryGrid({ counts }: Props) {
  const grouped = new Map<string, CategoryCount[]>()
  for (const c of counts) {
    if (!grouped.has(c.category)) grouped.set(c.category, [])
    grouped.get(c.category)!.push(c)
  }

  return (
    <div className="bg-surface border border-line rounded-xl p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-fg mb-3">Browse by category</h3>
      <div className="space-y-4">
        {SECTION_ORDER.map(([key, label]) => {
          const items = grouped.get(key)
          if (!items || items.length === 0) return null
          return (
            <div key={key}>
              <h4 className="text-[10px] uppercase tracking-wider text-fg-muted font-medium mb-2">{label}</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {items.map((c) => (
                  <Link
                    key={`${c.category}-${c.sub_category}`}
                    href={`/funds/category/${encodeURIComponent(c.sub_category)}`}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-line bg-canvas hover:bg-surface-2 hover:border-accent transition group"
                  >
                    <span className="text-xs text-fg group-hover:text-accent truncate">{c.sub_category}</span>
                    <span className="text-[10px] text-fg-subtle tabular-nums shrink-0">{c.count}</span>
                  </Link>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
