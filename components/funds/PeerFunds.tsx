// "Compare with peers" rail at the bottom of the fund detail page. Shows
// the next-best 6 schemes in the same sub-category. Card title links to
// the peer's detail page; a separate Compare link below sends both into
// the comparison view.

import Link from 'next/link'
import type { MfSchemeWithReturns } from '@/lib/mutual-funds/types'
import { fmtPct, returnTone } from '@/lib/mutual-funds/format'

type Props = {
  current: MfSchemeWithReturns
  peers: MfSchemeWithReturns[]
}

export function PeerFunds({ current, peers }: Props) {
  if (peers.length === 0) return null
  return (
    <div className="bg-surface border border-line rounded-xl shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-line flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-fg">Top peers in {current.sub_category ?? 'this category'}</h3>
        <Link
          href={`/funds/category/${encodeURIComponent(current.sub_category ?? '')}`}
          className="text-xs text-accent hover:underline"
        >
          See all →
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-[var(--line)]">
        {peers.map((p) => (
          <div key={p.scheme_code} className="px-4 py-3 hover:bg-canvas/60 transition">
            <Link
              href={`/funds/${p.scheme_code}`}
              className="block text-sm text-fg hover:text-accent leading-tight line-clamp-2 mb-1 font-medium"
            >
              {p.scheme_name}
            </Link>
            {p.amc && (
              <div className="text-[10px] text-fg-muted mb-2">{p.amc}</div>
            )}
            <div className="flex items-center justify-between text-xs">
              <span className="text-fg-subtle">3Y CAGR</span>
              <span className={`font-semibold tabular-nums ${returnTone(p.returns?.return_3y ?? null)}`}>
                {fmtPct(p.returns?.return_3y ?? null, 1)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs mt-1">
              <span className="text-fg-subtle">5Y CAGR</span>
              <span className={`font-semibold tabular-nums ${returnTone(p.returns?.return_5y ?? null)}`}>
                {fmtPct(p.returns?.return_5y ?? null, 1)}
              </span>
            </div>
            <Link
              href={`/funds/compare?codes=${current.scheme_code},${p.scheme_code}`}
              className="inline-block mt-2 text-[11px] text-accent hover:underline"
            >
              Compare →
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}
