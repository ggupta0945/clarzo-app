import type { UpcomingEarning } from '@/lib/stock-events'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function fmtRange(startUnix: number, endUnix: number): string {
  const s = new Date(startUnix * 1000)
  const e = new Date(endUnix * 1000)
  const sMonth = MONTHS[s.getUTCMonth()]
  const eMonth = MONTHS[e.getUTCMonth()]
  const sd = s.getUTCDate()
  const ed = e.getUTCDate()
  if (sMonth === eMonth) {
    return `${sMonth} ${sd}–${ed}`
  }
  return `${sMonth} ${sd} – ${eMonth} ${ed}`
}

// Estimated upcoming earnings — derived from Indian fiscal-year quarter-end
// + announcement-window heuristic in lib/stock-events.ts. Labelled clearly
// as "expected" so the user knows this isn't a confirmed per-company date.
// All listed symbols share the same window (same fiscal calendar applies);
// per-company precision is a future enhancement once we have a real
// exchange-filings feed.

export function UpcomingEarnings({ earnings }: { earnings: UpcomingEarning[] }) {
  if (earnings.length === 0) return null

  // All entries share the same quarter / window (companies differ only in symbol).
  const { quarter, windowStart, windowEnd, label } = earnings[0]!
  const symbols = earnings.map((e) => e.symbol)

  return (
    <div className="bg-surface border border-line rounded-xl p-3.5 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[10px] uppercase tracking-wider text-fg-muted font-medium">
          Upcoming earnings (expected)
        </h3>
        <span className="text-[9px] text-fg-subtle">{quarter}</span>
      </div>

      <p className="text-xs text-fg mb-1.5">
        <span className="font-semibold text-accent">{label}</span>
        <span className="text-fg-muted"> · {fmtRange(windowStart, windowEnd)}</span>
      </p>

      <p className="text-[11px] text-fg-muted mb-2 leading-relaxed">
        Based on the typical Indian fiscal-year announcement window. Per-company
        dates may vary by a few days.
      </p>

      <div className="flex flex-wrap gap-1.5">
        {symbols.map((s) => (
          <span
            key={s}
            className="text-[10px] px-1.5 py-px rounded-full font-medium border border-line text-fg bg-canvas"
          >
            {s}
          </span>
        ))}
      </div>
    </div>
  )
}
