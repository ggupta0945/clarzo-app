import type { VisitDiff } from '@/lib/visit-diff'

// Returning-user surface. Shown only when computeVisitDiff returns a
// non-null diff (≥1 day gap AND at least one material change). Three
// digestible chips: P&L delta, top 1-3 price movers, any corp action
// since the user last looked.

export function WhatChangedBanner({ diff }: { diff: VisitDiff }) {
  const sinceLabel =
    diff.daysSinceLastVisit === 1
      ? 'yesterday'
      : `${diff.daysSinceLastVisit} days ago`

  const netWorthSign = diff.netWorthDelta >= 0 ? '+' : '−'
  const netWorthColor = diff.netWorthDelta >= 0 ? 'text-success' : 'text-warning'

  return (
    <div className="mb-4 bg-surface border border-line rounded-xl px-4 py-3 shadow-sm">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 mb-2">
        <span className="text-xs uppercase tracking-wider text-fg-muted font-semibold">
          Since {sinceLabel}
        </span>
        {Math.abs(diff.netWorthDeltaPct) >= 0.1 && (
          <span className={`text-sm font-medium ${netWorthColor}`}>
            {netWorthSign}₹{fmt(Math.abs(diff.netWorthDelta))} ({netWorthSign}
            {Math.abs(diff.netWorthDeltaPct).toFixed(2)}%)
          </span>
        )}
      </div>

      {diff.topMovers.length > 0 && (
        <div className="text-sm text-fg-muted mb-1">
          <span className="text-fg-muted">Top movers: </span>
          {diff.topMovers.map((m, i) => (
            <span key={m.scheme_name}>
              {i > 0 && <span className="text-fg-subtle"> · </span>}
              <span className="text-fg font-medium">{m.scheme_name}</span>{' '}
              <span className={m.pctMove >= 0 ? 'text-success' : 'text-warning'}>
                {m.pctMove >= 0 ? '+' : ''}
                {m.pctMove.toFixed(1)}%
              </span>
            </span>
          ))}
        </div>
      )}

      {diff.newCorpActions.length > 0 && (
        <div className="text-sm text-fg-muted">
          <span className="text-fg-muted">New corporate actions: </span>
          {diff.newCorpActions.map((a, i) => (
            <span key={`${a.symbol}-${a.date}-${a.type}`}>
              {i > 0 && <span className="text-fg-subtle"> · </span>}
              <span className="text-fg font-medium">{a.symbol}</span>{' '}
              {a.type === 'dividend' && a.amount != null ? (
                <span>dividend ₹{a.amount.toFixed(2)}</span>
              ) : a.type === 'split' && a.ratio ? (
                <span>
                  split {a.ratio.numerator}:{a.ratio.denominator}
                </span>
              ) : (
                <span>{a.type}</span>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function fmt(n: number): string {
  return n.toLocaleString('en-IN', { maximumFractionDigits: 0 })
}
