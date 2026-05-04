import type { CorpAction } from '@/lib/stock-events'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function fmtDate(unixSeconds: number): string {
  const d = new Date(unixSeconds * 1000)
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`
}

function describe(a: CorpAction): string {
  if (a.type === 'dividend') {
    return a.amount != null ? `Dividend · ₹${a.amount.toFixed(2)}/share` : 'Dividend'
  }
  if (a.ratio) {
    return `Split ${a.ratio.numerator}:${a.ratio.denominator}`
  }
  return 'Split'
}

export function CorporateActions({ actions }: { actions: CorpAction[] }) {
  return (
    <div className="bg-surface border border-line rounded-xl p-3.5 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[10px] uppercase tracking-wider text-fg-muted font-medium">
          Recent corporate actions
        </h3>
        <span className="text-[9px] text-fg-subtle">via Yahoo Finance</span>
      </div>

      {actions.length === 0 ? (
        <p className="text-xs text-fg-muted">
          No recent dividends or splits found across your top holdings.
        </p>
      ) : (
        <ul className="space-y-2">
          {actions.slice(0, 6).map((a, i) => (
            <li
              key={`${a.symbol}-${a.type}-${a.date}-${i}`}
              className="flex items-center justify-between gap-2"
            >
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-fg truncate">{a.symbol}</p>
                <p className="text-[10px] text-fg-muted">{describe(a)}</p>
              </div>
              <span className="text-[10px] text-fg-muted whitespace-nowrap font-medium">
                {fmtDate(a.date)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
