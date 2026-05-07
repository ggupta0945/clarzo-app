// Compact tile grid: every AMC with at least one Direct/Growth scheme. Each
// tile links to the AMC leaderboard.

import Link from 'next/link'
import type { AmcCount } from '@/lib/mutual-funds/queries'

type Props = {
  counts: AmcCount[]
}

export function AmcGrid({ counts }: Props) {
  return (
    <div className="bg-surface border border-line rounded-xl p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-fg mb-3">Browse by AMC</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {counts.map((c) => (
          <Link
            key={c.amc}
            href={`/funds/amc/${encodeURIComponent(c.amc)}`}
            className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-line bg-canvas hover:bg-surface-2 hover:border-accent transition group"
          >
            <span className="text-xs text-fg group-hover:text-accent truncate">{c.amc}</span>
            <span className="text-[10px] text-fg-subtle tabular-nums shrink-0">{c.count}</span>
          </Link>
        ))}
        {counts.length === 0 && (
          <p className="col-span-full text-xs text-fg-muted">
            No AMCs in the master yet — run scripts/sync-mf-master.ts.
          </p>
        )}
      </div>
    </div>
  )
}
