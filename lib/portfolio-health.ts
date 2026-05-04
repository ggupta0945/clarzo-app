import type { EnrichedHolding } from './portfolio'
import {
  aggregateBySector,
  aggregateByMcap,
  aggregateByCorpGroup,
  topHoldings,
} from './allocation'

// Deterministic 0-100 score combining diversification, concentration penalties,
// market-cap balance, and a small performance signal. Tuned so a typical
// healthy portfolio lands in the 65-80 range; heavily concentrated or
// undiversified portfolios drop below 50.

export type HealthScore = {
  score: number
  band: 'Excellent' | 'Good' | 'Fair' | 'Needs work'
  headline: string
  factors: Array<{ label: string; delta: number; positive: boolean }>
}

const BASE = 50

function bandFor(score: number): HealthScore['band'] {
  if (score >= 80) return 'Excellent'
  if (score >= 60) return 'Good'
  if (score >= 40) return 'Fair'
  return 'Needs work'
}

export function computeHealthScore(holdings: EnrichedHolding[]): HealthScore {
  const factors: HealthScore['factors'] = []

  if (holdings.length === 0) {
    return {
      score: 0,
      band: 'Needs work',
      headline: 'Upload a portfolio to see your health score.',
      factors: [],
    }
  }

  let score = BASE

  // ── Diversification: number of sectors with meaningful allocation ──────
  const sector = aggregateBySector(holdings)
  const meaningfulSectors = sector.slices.filter(
    (s) => s.label !== 'Unclassified' && s.pct >= 5,
  ).length
  const sectorBonus = Math.min(20, meaningfulSectors * 4)
  score += sectorBonus
  factors.push({
    label: `${meaningfulSectors} sector${meaningfulSectors === 1 ? '' : 's'} ≥ 5%`,
    delta: sectorBonus,
    positive: true,
  })

  // ── Mcap balance: reward exposure across large / mid / small ───────────
  const mcap = aggregateByMcap(holdings)
  const buckets = new Set(
    mcap.slices.filter((s) => s.pct >= 5 && s.label !== 'Unclassified').map((s) => s.label),
  )
  const mcapBonus =
    buckets.has('Large cap') && buckets.has('Mid cap') && (buckets.has('Small cap') || buckets.has('Micro cap'))
      ? 15
      : buckets.size === 2
        ? 8
        : 0
  if (mcapBonus > 0) {
    score += mcapBonus
    factors.push({ label: 'Market-cap mix', delta: mcapBonus, positive: true })
  }

  // ── Single-holding concentration penalty ───────────────────────────────
  const total = holdings.reduce((s, h) => s + h.current_value, 0)
  const top1 = topHoldings(holdings, 1)[0]
  if (top1 && total > 0) {
    const top1Pct = (top1.current_value / total) * 100
    if (top1Pct > 25) {
      const penalty = -Math.min(20, Math.round((top1Pct - 25) * 1.5))
      score += penalty
      factors.push({
        label: `Top holding ${top1Pct.toFixed(0)}%`,
        delta: penalty,
        positive: false,
      })
    }
  }

  // ── Top-5 concentration penalty ────────────────────────────────────────
  if (holdings.length >= 5) {
    const top5Value = topHoldings(holdings, 5).reduce((s, h) => s + h.current_value, 0)
    const top5Pct = (top5Value / total) * 100
    if (top5Pct > 65) {
      const penalty = -Math.min(15, Math.round((top5Pct - 65) * 0.6))
      score += penalty
      factors.push({
        label: `Top 5 = ${top5Pct.toFixed(0)}%`,
        delta: penalty,
        positive: false,
      })
    }
  }

  // ── Sector concentration penalty ───────────────────────────────────────
  const heaviestSector = sector.slices.find((s) => s.label !== 'Unclassified')
  if (heaviestSector && heaviestSector.pct > 40) {
    const penalty = -Math.min(15, Math.round((heaviestSector.pct - 40) * 0.6))
    score += penalty
    factors.push({
      label: `${heaviestSector.label} ${heaviestSector.pct.toFixed(0)}%`,
      delta: penalty,
      positive: false,
    })
  }

  // ── Corporate-group concentration penalty ──────────────────────────────
  const corp = aggregateByCorpGroup(holdings)
  const heaviestCorp = corp.slices.find((s) => s.label !== 'Independent')
  if (heaviestCorp && heaviestCorp.pct > 25) {
    const penalty = -Math.min(15, Math.round((heaviestCorp.pct - 25) * 0.7))
    score += penalty
    factors.push({
      label: `${heaviestCorp.label} group ${heaviestCorp.pct.toFixed(0)}%`,
      delta: penalty,
      positive: false,
    })
  }

  // ── Small/micro tilt penalty ───────────────────────────────────────────
  const smallPct = mcap.slices
    .filter((s) => s.label === 'Small cap' || s.label === 'Micro cap')
    .reduce((s, x) => s + x.pct, 0)
  if (smallPct > 30) {
    const penalty = -Math.min(10, Math.round((smallPct - 30) * 0.4))
    score += penalty
    factors.push({
      label: `Small/micro cap ${smallPct.toFixed(0)}%`,
      delta: penalty,
      positive: false,
    })
  }

  // ── Performance signal: more gainers than losers nudges score up ───────
  const gainers = holdings.filter((h) => h.pnl > 0).length
  const losers = holdings.filter((h) => h.pnl < 0).length
  if (gainers > losers) {
    const bonus = Math.min(5, gainers - losers)
    score += bonus
    factors.push({ label: `${gainers}/${holdings.length} gainers`, delta: bonus, positive: true })
  }

  score = Math.max(0, Math.min(100, score))
  const band = bandFor(score)

  // Headline: pick the largest-magnitude factor, prefer negatives so issues
  // surface; fall back to the band description.
  const ranked = [...factors].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
  const headline = (() => {
    const topNeg = ranked.find((f) => !f.positive)
    if (topNeg) return `Watch: ${topNeg.label.toLowerCase()}`
    if (band === 'Excellent') return 'Well-diversified across sectors and caps'
    if (band === 'Good') return 'Solid spread, room to balance further'
    if (band === 'Fair') return 'Some imbalance worth a closer look'
    return 'Significant concentration — review allocation'
  })()

  return { score, band, headline, factors }
}
