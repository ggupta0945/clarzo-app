import type { EnrichedHolding } from './portfolio'
import type { RiskAssessment } from './risk-horizon'
import { aggregateAssetClasses, type AssetClass } from './asset-class'
import { aggregateBySector, topHoldings } from './allocation'

// Target asset-class mix per risk band. These are conservative-ish defaults
// inspired by typical Indian advisory templates — the bands map to a glide
// path from defensive (more debt + gold) to aggressive (heavy equity).
//
// Equity is split implicitly between domestic stocks/MFs and international —
// we don't separate the recommendation here, the card just suggests "Equity"
// as a single bucket.
const TARGET_MIX: Record<RiskAssessment['riskBand'], { equity: number; debt: number; gold: number }> = {
  Aggressive: { equity: 80, debt: 5, gold: 15 },
  High: { equity: 70, debt: 15, gold: 15 },
  Moderate: { equity: 60, debt: 25, gold: 15 },
  Low: { equity: 40, debt: 50, gold: 10 },
}

// Threshold below which an asset-class deviation is considered noise.
const ASSET_DRIFT_THRESHOLD_PCT = 5
// Sector concentration that triggers a trim suggestion.
const SECTOR_CONCENTRATION_PCT = 35
// Single-stock concentration that triggers a trim suggestion.
const SINGLE_HOLDING_PCT = 20

export type RebalanceAction = 'add' | 'trim' | 'hold'

export type RebalanceSuggestion = {
  id: string
  action: RebalanceAction
  category: 'asset-class' | 'sector' | 'concentration'
  target: string
  currentPct: number
  targetPct: number | null // null when there's no specific target (e.g. concentration trim)
  deltaPct: number // signed: +ve means add, -ve means trim
  amount: number // absolute ₹ to move
  rationale: string
}

export type RebalancePlan = {
  suggestions: RebalanceSuggestion[]
  targetMixLabel: string
  totalDriftPct: number // sum of |asset-class deviations|
}

const EQUITY_BUCKETS: AssetClass[] = ['Equity', 'Equity MF', 'International']
const DEBT_BUCKETS: AssetClass[] = ['Debt', 'Hybrid']

/**
 * Builds a list of rebalance suggestions ordered by impact. Aimed at the
 * dashboard card — top 3 are usually enough for users to act on.
 */
export function generateRebalanceSuggestions(
  holdings: EnrichedHolding[],
  riskAssessment: RiskAssessment,
): RebalancePlan {
  if (holdings.length === 0) {
    return { suggestions: [], targetMixLabel: '', totalDriftPct: 0 }
  }

  const total = holdings.reduce((s, h) => s + h.current_value, 0)
  if (total === 0) {
    return { suggestions: [], targetMixLabel: '', totalDriftPct: 0 }
  }

  const target = TARGET_MIX[riskAssessment.riskBand]
  const assetMix = aggregateAssetClasses(holdings)
  const get = (label: AssetClass) =>
    assetMix.slices.find((s) => s.label === label)?.pct ?? 0

  const equityPct = EQUITY_BUCKETS.reduce((s, k) => s + get(k), 0)
  const debtPct = DEBT_BUCKETS.reduce((s, k) => s + get(k), 0)
  const goldPct = get('Gold')

  const suggestions: RebalanceSuggestion[] = []

  // ── Asset-class drift ─────────────────────────────────────────────────
  const drifts: Array<{
    label: 'Equity' | 'Debt' | 'Gold'
    current: number
    target: number
  }> = [
    { label: 'Equity', current: equityPct, target: target.equity },
    { label: 'Debt', current: debtPct, target: target.debt },
    { label: 'Gold', current: goldPct, target: target.gold },
  ]

  for (const d of drifts) {
    const delta = d.target - d.current // +ve → need to add, -ve → trim
    if (Math.abs(delta) < ASSET_DRIFT_THRESHOLD_PCT) continue
    const amount = (Math.abs(delta) / 100) * total
    suggestions.push({
      id: `asset-${d.label}`,
      action: delta > 0 ? 'add' : 'trim',
      category: 'asset-class',
      target: d.label,
      currentPct: d.current,
      targetPct: d.target,
      deltaPct: delta,
      amount,
      rationale: `${d.label} is ${d.current.toFixed(0)}% vs ${d.target}% target for a ${riskAssessment.riskBand.toLowerCase()}-risk portfolio.`,
    })
  }

  // ── Sector concentration ──────────────────────────────────────────────
  const sectorAlloc = aggregateBySector(holdings)
  for (const slice of sectorAlloc.slices) {
    if (slice.label === 'Unclassified') continue
    if (slice.pct < SECTOR_CONCENTRATION_PCT) continue
    const excessPct = slice.pct - SECTOR_CONCENTRATION_PCT
    suggestions.push({
      id: `sector-${slice.label}`,
      action: 'trim',
      category: 'sector',
      target: slice.label,
      currentPct: slice.pct,
      targetPct: SECTOR_CONCENTRATION_PCT,
      deltaPct: -excessPct,
      amount: (excessPct / 100) * total,
      rationale: `${slice.label} is ${slice.pct.toFixed(0)}% of your portfolio — sector swings will hit hard.`,
    })
  }

  // ── Single-stock concentration ────────────────────────────────────────
  const top = topHoldings(holdings, 3)
  for (const h of top) {
    const pct = (h.current_value / total) * 100
    if (pct < SINGLE_HOLDING_PCT) continue
    const excessPct = pct - SINGLE_HOLDING_PCT
    suggestions.push({
      id: `concentration-${h.id}`,
      action: 'trim',
      category: 'concentration',
      target: h.scheme_name,
      currentPct: pct,
      targetPct: SINGLE_HOLDING_PCT,
      deltaPct: -excessPct,
      amount: (excessPct / 100) * total,
      rationale: `${h.scheme_name} is ${pct.toFixed(0)}% of portfolio — concentrated bets cut both ways.`,
    })
  }

  // Sort by abs(deltaPct) desc so the biggest movers surface first.
  suggestions.sort((a, b) => Math.abs(b.deltaPct) - Math.abs(a.deltaPct))

  const totalDriftPct = drifts.reduce((s, d) => s + Math.abs(d.target - d.current), 0)
  const targetMixLabel = `${target.equity}% equity · ${target.debt}% debt · ${target.gold}% gold`

  return { suggestions, targetMixLabel, totalDriftPct }
}
