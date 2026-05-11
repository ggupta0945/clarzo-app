import type { EnrichedHolding, PortfolioSummary } from './portfolio'
import type { CorpAction } from './stock-events'

// Banner-only state: enough to recompute "since last visit" deltas without
// a historical price store. Kept small because it's serialized into jsonb
// on every qualifying visit.

export type VisitSnapshot = {
  taken_at: string // ISO timestamp
  net_worth: number
  // Per-holding price snapshot keyed by holdings.id. We use holding id (not
  // ISIN) so deletions and adds across visits don't accidentally match.
  prices: Record<string, number>
}

export type VisitDiff = {
  daysSinceLastVisit: number
  netWorthDelta: number
  netWorthDeltaPct: number
  topMovers: Array<{ scheme_name: string; pctMove: number; absMove: number }>
  newCorpActions: CorpAction[]
}

// Threshold below which we don't surface the banner at all — the user is
// effectively in the same session and the deltas would be noise.
export const MIN_DAYS_FOR_BANNER = 1

export function buildSnapshot(
  holdings: EnrichedHolding[],
  summary: PortfolioSummary,
): VisitSnapshot {
  const prices: Record<string, number> = {}
  for (const h of holdings) {
    if (h.current_nav != null) prices[h.id] = h.current_nav
  }
  return {
    taken_at: new Date().toISOString(),
    net_worth: summary.netWorth,
    prices,
  }
}

export function computeVisitDiff(
  prev: VisitSnapshot,
  holdings: EnrichedHolding[],
  summary: PortfolioSummary,
  recentActions: CorpAction[],
): VisitDiff | null {
  const prevDate = new Date(prev.taken_at)
  if (Number.isNaN(prevDate.getTime())) return null

  const msSince = Date.now() - prevDate.getTime()
  const daysSince = msSince / (1000 * 60 * 60 * 24)
  if (daysSince < MIN_DAYS_FOR_BANNER) return null

  const netWorthDelta = summary.netWorth - prev.net_worth
  const netWorthDeltaPct =
    prev.net_worth > 0 ? (netWorthDelta / prev.net_worth) * 100 : 0

  // Top movers — biggest pct moves on holdings that existed at the last
  // snapshot. Skip new holdings (no baseline) and holdings whose price
  // didn't change at all.
  const movers = holdings
    .map((h) => {
      const prevPrice = prev.prices[h.id]
      if (prevPrice == null || prevPrice === 0 || h.current_nav == null) return null
      const pctMove = ((h.current_nav - prevPrice) / prevPrice) * 100
      if (Math.abs(pctMove) < 0.1) return null
      const absMove = (h.current_nav - prevPrice) * h.units
      return { scheme_name: h.scheme_name, pctMove, absMove }
    })
    .filter((m): m is { scheme_name: string; pctMove: number; absMove: number } => m !== null)

  // Sort by absolute pct move, take top 3.
  movers.sort((a, b) => Math.abs(b.pctMove) - Math.abs(a.pctMove))
  const topMovers = movers.slice(0, 3)

  // New corp actions: anything with ex-date strictly after the last visit.
  const prevUnix = Math.floor(prevDate.getTime() / 1000)
  const newCorpActions = recentActions.filter((a) => a.date > prevUnix).slice(0, 3)

  // Suppress banner if there's nothing material to say.
  if (
    Math.abs(netWorthDeltaPct) < 0.1 &&
    topMovers.length === 0 &&
    newCorpActions.length === 0
  ) {
    return null
  }

  return {
    daysSinceLastVisit: Math.round(daysSince),
    netWorthDelta,
    netWorthDeltaPct,
    topMovers,
    newCorpActions,
  }
}
