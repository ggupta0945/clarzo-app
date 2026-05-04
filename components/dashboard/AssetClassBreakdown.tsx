import type { AssetClass, AssetClassSlice } from '@/lib/asset-class'

const COLORS: Record<AssetClass, string> = {
  Equity: 'var(--accent)',
  'Equity MF': '#6172f3',
  Debt: '#0ea5e9',
  Gold: '#f59e0b',
  International: '#a78bfa',
  Hybrid: 'var(--success)',
  Other: 'var(--fg-subtle)',
}

function fmtInr(n: number): string {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(1)}cr`
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(1)}L`
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

export function AssetClassBreakdown({
  slices,
  total,
}: {
  slices: AssetClassSlice[]
  total: number
}) {
  if (slices.length === 0) {
    return null
  }

  return (
    <div className="bg-surface border border-line rounded-xl p-3.5 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[10px] uppercase tracking-wider text-fg-muted font-medium">
          Asset class
        </h3>
        <span className="text-[10px] text-fg-muted">{fmtInr(total)} total</span>
      </div>

      {/* Stacked bar */}
      <div className="flex h-2 rounded-full overflow-hidden bg-accent-soft mb-2.5">
        {slices.map((s) => (
          <div
            key={s.label}
            style={{ width: `${s.pct}%`, background: COLORS[s.label] }}
            title={`${s.label}: ${s.pct.toFixed(1)}%`}
          />
        ))}
      </div>

      {/* Legend */}
      <ul className="space-y-1">
        {slices.map((s) => (
          <li key={s.label} className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 min-w-0">
              <span
                className="w-2 h-2 rounded-sm shrink-0"
                style={{ background: COLORS[s.label] }}
              />
              <span className="text-fg truncate">{s.label}</span>
            </span>
            <span className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] text-fg-muted">{s.count}</span>
              <span className="text-[11px] text-fg-muted font-medium w-10 text-right">
                {s.pct.toFixed(1)}%
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
