import type { EnrichedHolding } from './portfolio'

// Coarse asset-class classification used for the dashboard breakdown.
// Stocks are always Equity. Mutual funds get keyword-matched against the
// scheme name — broker-export names usually indicate fund type clearly.
//
// Order matters: more specific keywords first (e.g. "gold" before "equity").

export type AssetClass = 'Equity' | 'Equity MF' | 'Debt' | 'Gold' | 'International' | 'Hybrid' | 'Other'

const RULES: Array<{ test: RegExp; klass: AssetClass }> = [
  { test: /\b(gold|silver|precious)\b/i, klass: 'Gold' },
  { test: /\b(liquid|debt|bond|gilt|treasury|money\s*market|overnight|corporate\s*bond|short\s*term)\b/i, klass: 'Debt' },
  { test: /\b(international|global|us\s*equity|nasdaq|s&p|emerging\s*market|world)\b/i, klass: 'International' },
  { test: /\b(hybrid|balanced|equity\s*&\s*debt|aggressive\s*hybrid|conservative\s*hybrid|multi\s*asset)\b/i, klass: 'Hybrid' },
  { test: /\b(equity|nifty|sensex|index|elss|tax\s*saver|small\s*cap|mid\s*cap|large\s*cap|flexi\s*cap|focused)\b/i, klass: 'Equity MF' },
]

export function classify(h: EnrichedHolding): AssetClass {
  if (h.asset_type === 'stock') return 'Equity'

  const name = h.scheme_name ?? ''
  for (const r of RULES) {
    if (r.test.test(name)) return r.klass
  }
  // MF with no keyword hit — most often an equity mutual fund without obvious
  // markers in the broker label. Default to Equity MF rather than Other.
  return h.asset_type === 'mutual_fund' ? 'Equity MF' : 'Other'
}

export type AssetClassSlice = {
  label: AssetClass
  value: number
  pct: number
  count: number
}

export function aggregateAssetClasses(
  holdings: EnrichedHolding[],
): { total: number; slices: AssetClassSlice[] } {
  const total = holdings.reduce((s, h) => s + h.current_value, 0)
  if (total === 0) return { total: 0, slices: [] }

  const buckets = new Map<AssetClass, { value: number; count: number }>()
  for (const h of holdings) {
    const k = classify(h)
    const cur = buckets.get(k) ?? { value: 0, count: 0 }
    cur.value += h.current_value
    cur.count += 1
    buckets.set(k, cur)
  }

  const slices: AssetClassSlice[] = Array.from(buckets.entries())
    .map(([label, b]) => ({
      label,
      value: b.value,
      pct: (b.value / total) * 100,
      count: b.count,
    }))
    .sort((a, b) => b.value - a.value)

  return { total, slices }
}
