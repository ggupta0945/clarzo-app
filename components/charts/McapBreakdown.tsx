import type { Allocation } from '@/lib/allocation'

const COLORS: Record<string, string> = {
  'Large cap': '#34d399',
  'Mid cap': '#f5c842',
  'Small cap': '#fb923c',
  'Micro cap': '#ef4444',
  Unclassified: '#4a7a5a',
}

// Stable ordering so Large always renders above Mid above Small etc, even when
// the user has 0 of a bucket between two non-empty ones.
const ORDER = ['Large cap', 'Mid cap', 'Small cap', 'Micro cap', 'Unclassified']

export function McapBreakdown({ allocation }: { allocation: Allocation }) {
  const sorted = [...allocation.slices].sort(
    (a, b) => indexOrFallback(a.label) - indexOrFallback(b.label),
  )

  return (
    <div className="bg-[#071a10] border border-[#1a4a2e] rounded-2xl p-6">
      <h3 className="text-sm uppercase tracking-wider text-[#88b098] mb-4">Market cap mix</h3>
      <div className="space-y-3">
        {sorted.map((item) => (
          <div key={item.label}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-[#e4f0e8]">{item.label}</span>
              <span className="font-mono text-[#88b098]">
                {item.pct.toFixed(1)}% · {item.count}
              </span>
            </div>
            <div className="h-2 bg-[#0c2418] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(100, item.pct)}%`,
                  background: COLORS[item.label] || '#4a7a5a',
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
