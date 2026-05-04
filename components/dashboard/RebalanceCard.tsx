import type { RebalancePlan, RebalanceAction } from '@/lib/rebalance'

const ACTION_COLOR: Record<RebalanceAction, { bg: string; text: string; label: string }> = {
  add: { bg: 'var(--success-soft)', text: 'var(--success)', label: 'Add' },
  trim: { bg: 'var(--danger-soft)', text: 'var(--danger)', label: 'Trim' },
  hold: { bg: 'var(--accent-soft)', text: 'var(--accent)', label: 'Hold' },
}

function fmtInr(n: number): string {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(1)}cr`
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(1)}L`
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

export function RebalanceCard({ plan }: { plan: RebalancePlan }) {
  const top = plan.suggestions.slice(0, 4)

  return (
    <div className="bg-surface border border-line rounded-xl p-3.5 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[10px] uppercase tracking-wider text-fg-muted font-medium">
          Rebalance suggestions
        </h3>
        {plan.targetMixLabel && (
          <span className="text-[10px] text-fg-muted">Target: {plan.targetMixLabel}</span>
        )}
      </div>

      {top.length === 0 ? (
        <div className="rounded-lg bg-success-soft border border-success/30 px-3 py-3">
          <p className="text-xs text-success font-medium">In line with target mix.</p>
          <p className="text-[11px] text-fg-muted mt-0.5">
            No drift {'>'} 5% across asset classes, sectors, or single holdings. Recheck after each
            major buy/sell.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {top.map((s) => {
            const c = ACTION_COLOR[s.action]
            return (
              <li
                key={s.id}
                className="flex items-start gap-2.5 rounded-lg bg-canvas border border-line px-2.5 py-2"
              >
                <span
                  className="text-[9px] uppercase tracking-wider font-semibold rounded px-1.5 py-px shrink-0 mt-px"
                  style={{ background: c.bg, color: c.text }}
                >
                  {c.label}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-xs font-semibold text-fg truncate">{s.target}</p>
                    <p
                      className="text-[11px] font-semibold whitespace-nowrap"
                      style={{ color: c.text }}
                    >
                      {fmtInr(s.amount)}
                    </p>
                  </div>
                  <p className="text-[10px] text-fg-muted leading-snug mt-0.5">{s.rationale}</p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="text-[10px] text-fg-subtle">
                      {s.currentPct.toFixed(0)}%
                    </span>
                    {s.targetPct != null && (
                      <>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="text-fg-subtle">
                          <path d="M5 12h14M13 6l6 6-6 6" />
                        </svg>
                        <span className="text-[10px] text-fg-subtle">
                          {s.targetPct.toFixed(0)}%
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <p className="text-[10px] text-fg-subtle mt-2 leading-snug">
        Target mix is a generic guideline tied to your risk band — not personalized advice.
      </p>
    </div>
  )
}
