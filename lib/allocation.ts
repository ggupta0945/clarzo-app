import type { EnrichedHolding } from './portfolio'

export type AllocationSlice = {
  label: string
  value: number
  pct: number
  count: number
}

export type Allocation = {
  total: number
  slices: AllocationSlice[]
}

function aggregate(
  holdings: EnrichedHolding[],
  keyOf: (h: EnrichedHolding) => string | null,
  fallbackLabel = 'Unclassified',
): Allocation {
  const total = holdings.reduce((s, h) => s + h.current_value, 0)
  if (total === 0) return { total: 0, slices: [] }

  const buckets = new Map<string, { value: number; count: number }>()
  for (const h of holdings) {
    const label = keyOf(h) || fallbackLabel
    const cur = buckets.get(label) ?? { value: 0, count: 0 }
    cur.value += h.current_value
    cur.count += 1
    buckets.set(label, cur)
  }

  const slices: AllocationSlice[] = Array.from(buckets.entries())
    .map(([label, b]) => ({
      label,
      value: b.value,
      pct: (b.value / total) * 100,
      count: b.count,
    }))
    .sort((a, b) => b.value - a.value)

  return { total, slices }
}

export function aggregateBySector(holdings: EnrichedHolding[]): Allocation {
  return aggregate(holdings, (h) => h.sector)
}

export function aggregateByMcap(holdings: EnrichedHolding[]): Allocation {
  const labels: Record<string, string> = {
    large: 'Large cap',
    mid: 'Mid cap',
    small: 'Small cap',
  }
  return aggregate(holdings, (h) => (h.mcap_category ? labels[h.mcap_category] ?? h.mcap_category : null))
}

export function aggregateByCorpGroup(holdings: EnrichedHolding[]): Allocation {
  return aggregate(holdings, (h) => h.corp_group, 'Independent')
}

export function aggregateByAssetType(holdings: EnrichedHolding[]): Allocation {
  const labels: Record<string, string> = { stock: 'Stocks', mutual_fund: 'Mutual Funds' }
  return aggregate(holdings, (h) => labels[h.asset_type] ?? h.asset_type)
}

export function topHoldings(holdings: EnrichedHolding[], n = 10): EnrichedHolding[] {
  return [...holdings].sort((a, b) => b.current_value - a.current_value).slice(0, n)
}
