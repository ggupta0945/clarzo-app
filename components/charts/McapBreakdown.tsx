import type { Allocation } from '@/lib/allocation'

const COLORS: Record<string, string> = {
  'Large cap': 'var(--accent)',
  'Mid cap': '#6172f3',
  'Small cap': '#a4bcfd',
  'Micro cap': '#fb923c',
  Unclassified: 'var(--fg-subtle)',
}

const ORDER = ['Large cap', 'Mid cap', 'Small cap', 'Micro cap', 'Unclassified']

export function McapBreakdown({ allocation }: { allocation: Allocation }) {
  const sorted = [...allocation.slices].sort(
    (a, b) => indexOrFallback(a.label) - indexOrFallback(b.label),
  )

  return (
    <div className="bg-surface border border-line rounded-xl p-4 shadow-sm">
      <h3 className="text-[10px] uppercase tracking-wider text-fg-muted font-medium mb-2">Market cap mix</h3>
      <div className="space-y-2">
        {sorted.map((item) => (
          <div key={item.label}>
            <div className="flex justify-between text-xs mb-0.5">
              <span className="text-fg font-medium">{item.label}</span>
              <span className="text-fg-muted">
                {item.pct.toFixed(1)}% · {item.count}
              </span>
            </div>
            <div className="h-1.5 bg-accent-soft rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(100, item.pct)}%`,
                  background: COLORS[item.label] || 'var(--fg-subtle)',
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function indexOrFallback(label: string): number {
  const i = ORDER.indexOf(label)
  return i === -1 ? ORDER.length : i
}
