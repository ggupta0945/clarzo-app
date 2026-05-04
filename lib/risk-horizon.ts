import type { EnrichedHolding } from './portfolio'
import type { Goal } from './goals'
import { aggregateAssetClasses } from './asset-class'
import { aggregateBySector, aggregateByMcap } from './allocation'

export type RiskBand = 'Low' | 'Moderate' | 'High' | 'Aggressive'
export type HorizonBand = 'Short term' | 'Medium term' | 'Long term'

export type RiskAssessment = {
  riskScore: number // 0-100
  riskBand: RiskBand
  horizonYears: number
  horizonBand: HorizonBand
  notes: string[]
}

function riskBandFor(score: number): RiskBand {
  if (score >= 75) return 'Aggressive'
  if (score >= 55) return 'High'
  if (score >= 30) return 'Moderate'
  return 'Low'
}

function horizonBandFor(years: number): HorizonBand {
  if (years >= 7) return 'Long term'
  if (years >= 3) return 'Medium term'
  return 'Short term'
}

const DEFAULT_HORIZON_YEARS = 7 // fallback when user has no goals

export function assessRiskAndHorizon(
  holdings: EnrichedHolding[],
  goals: Goal[],
): RiskAssessment {
  const notes: string[] = []

  // ── Risk score ────────────────────────────────────────────────────────
  const assetMix = aggregateAssetClasses(holdings)
  const total = assetMix.total
  const get = (label: string) =>
    assetMix.slices.find((s) => s.label === label)?.pct ?? 0

  const equityPct = get('Equity') + get('Equity MF') + get('International')
  const debtPct = get('Debt')
  const goldPct = get('Gold')
  const hybridPct = get('Hybrid')

  const mcap = aggregateByMcap(holdings)
  const smallMicroPct = mcap.slices
    .filter((s) => s.label === 'Small cap' || s.label === 'Micro cap')
    .reduce((s, x) => s + x.pct, 0)

  const sector = aggregateBySector(holdings)
  const heaviestSector = sector.slices.find((s) => s.label !== 'Unclassified')

  let risk = 50

  // Equity tilt: above 60% equity nudges risk up; below pulls it down.
  risk += (equityPct - 60) * 0.4

  // Small/micro cap weight is the biggest equity-risk amplifier.
  risk += smallMicroPct * 0.5

  // Defensive sleeves cool the score.
  risk -= (debtPct + goldPct + hybridPct * 0.5) * 0.5

  // Sector concentration bumps risk.
  if (heaviestSector && heaviestSector.pct > 35) {
    risk += Math.min(15, (heaviestSector.pct - 35) * 0.7)
    notes.push(`${heaviestSector.label} is ${heaviestSector.pct.toFixed(0)}% of portfolio`)
  }

  if (smallMicroPct > 25) notes.push(`${smallMicroPct.toFixed(0)}% in small/micro cap`)
  if (debtPct + goldPct < 5 && total > 0) notes.push('No debt or gold buffer')
  if (debtPct + goldPct > 25) notes.push(`${(debtPct + goldPct).toFixed(0)}% in defensives`)

  const riskScore = Math.max(0, Math.min(100, Math.round(risk)))
  const riskBand = riskBandFor(riskScore)

  // ── Horizon ──────────────────────────────────────────────────────────
  const currentYear = new Date().getFullYear()
  let horizonYears = DEFAULT_HORIZON_YEARS

  if (goals.length > 0) {
    const totalTarget = goals.reduce((s, g) => s + g.target_amount, 0)
    if (totalTarget > 0) {
      // Weight years by goal size — bigger goals dominate horizon.
      horizonYears =
        goals.reduce(
          (s, g) => s + Math.max(0, g.target_year - currentYear) * g.target_amount,
          0,
        ) / totalTarget
    } else {
      horizonYears =
        goals.reduce((s, g) => s + Math.max(0, g.target_year - currentYear), 0) /
        goals.length
    }
  }

  const horizonBand = horizonBandFor(horizonYears)

  return {
    riskScore,
    riskBand,
    horizonYears: Math.round(horizonYears * 10) / 10,
    horizonBand,
    notes,
  }
}
