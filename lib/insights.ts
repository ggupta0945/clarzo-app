import type { EnrichedHolding } from './portfolio'
import {
  aggregateBySector,
  aggregateByCorpGroup,
  aggregateByMcap,
  topHoldings,
} from './allocation'

export type InsightSeverity = 'info' | 'warning' | 'positive'

export type Insight = {
  id: string
  severity: InsightSeverity
  title: string
  description: string
  action?: { label: string; href: string }
}

const MIN_HOLDINGS_FOR_DIVERSIFICATION = 5

// Rule-based — pure math over the enriched holdings. No LLM, deterministic.
// Order matters: warnings/positives first so they surface above neutral info.
export function generateInsights(holdings: EnrichedHolding[]): Insight[] {
  if (holdings.length === 0) return []

  const insights: Insight[] = []
  const total = holdings.reduce((s, h) => s + h.current_value, 0)
  if (total === 0) return []

  // 1. Corporate-group concentration: e.g. "8 Adani stocks ≈ 28% of portfolio"
  const corp = aggregateByCorpGroup(holdings)
  for (const slice of corp.slices) {
    if (slice.label === 'Independent') continue
    if (slice.pct >= 25) {
      insights.push({
        id: `corp-concentration-${slice.label}`,
        severity: 'warning',
        title: `${slice.label} group is ${slice.pct.toFixed(0)}% of your portfolio`,
        description: `${slice.count} ${slice.label}-group ${slice.count === 1 ? 'stock makes' : 'stocks make'} up ₹${formatInr(slice.value)}. Single-group exposure above 25% means one corporate event can swing your whole portfolio.`,
      })
    }
  }

  // 2. Sector skew: any sector >30% of holdings
  const sector = aggregateBySector(holdings)
  for (const slice of sector.slices) {
    if (slice.label === 'Unclassified') continue
    if (slice.pct >= 30) {
      insights.push({
        id: `sector-skew-${slice.label}`,
        severity: 'warning',
        title: `${slice.pct.toFixed(0)}% of your money is in ${slice.label}`,
        description: `Heavy single-sector exposure means a sector-wide downturn hits hard. Consider balancing with other sectors.`,
      })
    }
  }

  // 3. Top performer: best pnl_pct holding above +20%
  const ranked = [...holdings].filter((h) => h.invested > 0).sort((a, b) => b.pnl_pct - a.pnl_pct)
  const best = ranked[0]
  if (best && best.pnl_pct >= 20) {
    insights.push({
      id: `top-performer-${best.id}`,
      severity: 'positive',
      title: `${best.scheme_name} is up ${best.pnl_pct.toFixed(0)}%`,
      description: `Your best performer has gained ₹${formatInr(best.pnl)} on ₹${formatInr(best.invested)} invested.`,
    })
  }

  // 4. Underperformer: worst pnl_pct, but only if it's meaningfully negative
  const worst = ranked[ranked.length - 1]
  if (worst && worst.pnl_pct <= -15) {
    insights.push({
      id: `underperformer-${worst.id}`,
      severity: 'warning',
      title: `${worst.scheme_name} is down ${Math.abs(worst.pnl_pct).toFixed(0)}%`,
      description: `Loss of ₹${formatInr(Math.abs(worst.pnl))} on ₹${formatInr(worst.invested)} invested. Worth a review — is this still part of the plan?`,
    })
  }

  // 5. Diversification: top 5 holdings >50% of value
  if (holdings.length >= MIN_HOLDINGS_FOR_DIVERSIFICATION) {
    const top5 = topHoldings(holdings, 5)
    const top5Value = top5.reduce((s, h) => s + h.current_value, 0)
    const top5Pct = (top5Value / total) * 100
    if (top5Pct >= 50) {
      insights.push({
        id: 'diversification-top5',
        severity: 'info',
        title: `Top 5 holdings are ${top5Pct.toFixed(0)}% of your portfolio`,
        description: `${holdings.length} holdings total, but most of your money sits in just 5. That's not necessarily wrong — just worth knowing.`,
      })
    }
  }

  // 6. Mid/small-cap tilt: >50% of equity in non-large
  const mcap = aggregateByMcap(holdings)
  const nonLarge = mcap.slices
    .filter((s) => s.label !== 'Large cap' && s.label !== 'Unclassified')
    .reduce((sum, s) => sum + s.pct, 0)
  if (nonLarge >= 50) {
    insights.push({
      id: 'mcap-tilt',
      severity: 'info',
      title: `${nonLarge.toFixed(0)}% of your portfolio is mid/small cap`,
      description: `Higher growth potential, higher volatility. In a market correction, mid and small caps usually fall harder than large caps.`,
    })
  }

  return insights
}

function formatInr(n: number): string {
  return n.toLocaleString('en-IN', { maximumFractionDigits: 0 })
}
