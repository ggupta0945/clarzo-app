// Compact card used in the discover grid + watchlist + peer panel. Shows
// scheme name, AMC chip, sub-category chip, 1Y/3Y/5Y returns. The whole
// card is a Link to the fund detail page.

import Link from 'next/link'
import type { MfSchemeWithReturns } from '@/lib/mutual-funds/types'
import { fmtPct, returnTone } from '@/lib/mutual-funds/format'

type Props = {
  scheme: MfSchemeWithReturns
  rank?: number
}

export function FundCard({ scheme, rank }: Props) {
  const r = scheme.returns
  return (
    <Link
      href={`/funds/${scheme.scheme_code}`}
      className="group block bg-surface border border-line rounded-xl p-4 shadow-sm transition hover:border-accent hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            {rank !== undefined && (
              <span className="text-[10px] font-mono text-fg-subtle bg-canvas border border-line rounded px-1.5 py-0.5">
                #{rank}
              </span>
            )}
            {scheme.amc && (
              <span className="text-[10px] font-medium text-fg-muted bg-canvas border border-line rounded px-1.5 py-0.5">
                {scheme.amc}
              </span>
            )}
          </div>
          <h3 className="text-sm font-medium text-fg leading-tight line-clamp-2 group-hover:text-accent transition">
            {scheme.scheme_name}
          </h3>
        </div>
      </div>

      <div className="flex items-center gap-1.5 mb-3">
        {scheme.sub_category && (
          <span className="text-[10px] text-accent bg-accent-soft rounded-full px-2 py-0.5">
            {scheme.sub_category}
          </span>
        )}
        {scheme.plan_type === 'Direct' && (
          <span className="text-[10px] text-fg-muted bg-canvas border border-line rounded-full px-2 py-0.5">
            Direct
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <ReturnCell label="1Y" value={r?.return_1y ?? null} />
        <ReturnCell label="3Y" value={r?.return_3y ?? null} note="p.a." />
        <ReturnCell label="5Y" value={r?.return_5y ?? null} note="p.a." />
      </div>

      {r?.category_rank_3y && r.category_size_3y ? (
        <p className="text-[10px] text-fg-subtle mt-2.5">
          Category rank · {r.category_rank_3y} of {r.category_size_3y} (3Y)
        </p>
      ) : null}
    </Link>
  )
}

function ReturnCell({ label, value, note }: { label: string; value: number | null; note?: string }) {
  return (
    <div className="text-left">
      <div className="text-[9px] uppercase tracking-wider text-fg-subtle font-medium">
        {label}{note ? ` ${note}` : ''}
      </div>
      <div className={`text-sm font-semibold tabular-nums ${returnTone(value)}`}>
        {fmtPct(value, 1)}
      </div>
    </div>
  )
}
