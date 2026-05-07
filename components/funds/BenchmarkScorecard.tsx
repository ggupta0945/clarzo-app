// Pass / fail badges for "beats benchmark over 5/10/15Y" — the headline
// metric for filtering quality long-only funds. Based on mf_returns flags
// computed offline.

import type { MfReturns } from '@/lib/mutual-funds/types'

type Props = {
  returns: MfReturns | null
}

type Cell = {
  label: string
  beats: boolean | null
  diff: number | null
}

export function BenchmarkScorecard({ returns }: Props) {
  const cells: Cell[] = [
    {
      label: '5Y',
      beats: returns?.beats_benchmark_5y ?? null,
      diff:
        returns?.return_5y !== null && returns?.return_5y !== undefined &&
        returns?.benchmark_5y !== null && returns?.benchmark_5y !== undefined
          ? returns.return_5y - returns.benchmark_5y
          : null,
    },
    {
      label: '10Y',
      beats: returns?.beats_benchmark_10y ?? null,
      diff:
        returns?.return_10y !== null && returns?.return_10y !== undefined &&
        returns?.benchmark_10y !== null && returns?.benchmark_10y !== undefined
          ? returns.return_10y - returns.benchmark_10y
          : null,
    },
    {
      label: '15Y',
      beats: returns?.beats_benchmark_15y ?? null,
      diff: null,
    },
  ]

  return (
    <div className="bg-surface border border-line rounded-xl p-4 shadow-sm">
      <h3 className="text-[10px] uppercase tracking-wider text-fg-muted font-medium mb-3">
        Beat the benchmark?
      </h3>
      <div className="grid grid-cols-3 gap-2">
        {cells.map((c) => (
          <BadgeCell key={c.label} cell={c} />
        ))}
      </div>
      <p className="text-[10px] text-fg-subtle mt-3 leading-relaxed">
        Pass = scheme&apos;s rolling CAGR exceeds the assigned benchmark over the period.
        Funds with a long pass streak tend to be lower-regret holdings.
      </p>
    </div>
  )
}

function BadgeCell({ cell }: { cell: Cell }) {
  if (cell.beats === null) {
    return (
      <div className="rounded-lg border border-line bg-canvas px-3 py-3">
        <div className="text-[10px] text-fg-subtle">{cell.label}</div>
        <div className="text-sm font-medium text-fg-muted mt-0.5">No data</div>
      </div>
    )
  }
  const cls = cell.beats
    ? 'bg-success-soft border-success/30 text-success'
    : 'bg-danger-soft border-danger/30 text-danger'
  return (
    <div className={`rounded-lg border px-3 py-3 ${cls}`}>
      <div className="text-[10px] opacity-80">{cell.label}</div>
      <div className="text-sm font-semibold mt-0.5">{cell.beats ? 'Pass' : 'Fail'}</div>
      {cell.diff !== null && (
        <div className="text-[10px] mt-0.5 tabular-nums">
          {cell.diff >= 0 ? '+' : ''}
          {cell.diff.toFixed(2)}%
        </div>
      )}
    </div>
  )
}
