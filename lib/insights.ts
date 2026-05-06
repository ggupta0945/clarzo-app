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

  // 2. Sector skew: any sector >35% of holdings
  const sector = aggregateBySector(holdings)
  for (const slice of sector.slices) {
    if (slice.label === 'Unclassified') continue
    if (slice.pct >= 35) {
      insights.push({
        id: `sector-skew-${slice.label}`,
        severity: 'warning',
        title: `${slice.pct.toFixed(0)}% of your portfolio is in ${slice.label}`,
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

  // 6. Small/micro-cap exposure: typical balanced guidance is 15–25%
  const mcap = aggregateByMcap(holdings)
  const smallPct = mcap.slices
    .filter((s) => s.label === 'Small cap' || s.label === 'Micro cap')
    .reduce((sum, s) => sum + s.pct, 0)
  if (smallPct >= 30) {
    insights.push({
      id: 'small-cap-heavy',
      severity: 'warning',
      title: `${smallPct.toFixed(0)}% of your portfolio is in small/micro cap`,
      description: `Higher return potential, but also much higher volatility. Typical guidance for balanced portfolios is 15–25%.`,
    })
  }

  // 7. Mid/small tilt overall: >50% in anything below large
  const nonLarge = mcap.slices
    .filter((s) => s.label !== 'Large cap' && s.label !== 'Unclassified')
    .reduce((sum, s) => sum + s.pct, 0)
  if (nonLarge >= 50 && smallPct < 30) {
    insights.push({
      id: 'mcap-tilt',
      severity: 'info',
      title: `${nonLarge.toFixed(0)}% of your portfolio is mid or small cap`,
      description: `Higher growth potential, higher volatility. In a market correction, mid and small caps usually fall harder than large caps.`,
    })
  }

  // 8. Mutual fund overlap: multiple funds with "Large Cap", "Flexi", "Multi"
  //    in their name targeting the same market-cap segment — likely overlapping holdings.
  const mfHoldings = holdings.filter((h) => h.asset_type === 'mutual_fund')
  if (mfHoldings.length >= 2) {
    const OVERLAP_KEYWORDS: Record<string, string> = {
      'large cap': 'Large Cap', 'largecap': 'Large Cap',
      'flexi cap': 'Flexi Cap', 'flexicap': 'Flexi Cap',
      'multi cap': 'Multi Cap', 'multicap': 'Multi Cap',
      'mid cap': 'Mid Cap', 'midcap': 'Mid Cap',
      'small cap': 'Small Cap', 'smallcap': 'Small Cap',
      'bluechip': 'Large Cap', 'blue chip': 'Large Cap',
    }
    const categoryCount: Record<string, string[]> = {}
    for (const h of mfHoldings) {
      const lower = h.scheme_name.toLowerCase()
      for (const [kw, cat] of Object.entries(OVERLAP_KEYWORDS)) {
        if (lower.includes(kw)) {
          categoryCount[cat] = categoryCount[cat] ?? []
          categoryCount[cat].push(h.scheme_name)
          break
        }
      }
    }
    for (const [cat, names] of Object.entries(categoryCount)) {
      if (names.length >= 2) {
        insights.push({
          id: `fund-overlap-${cat.replace(/\s/g, '-').toLowerCase()}`,
          severity: 'warning',
          title: `Possible overlap: ${names.length} ${cat} funds`,
          description: `You hold multiple funds in the same category (${names.slice(0, 2).join(', ')}${names.length > 2 ? '…' : ''}). They likely own the same top 20 stocks, reducing diversification. Consider consolidating.`,
          action: { label: 'Ask Clarzo', href: `/dashboard/ask?q=${encodeURIComponent(`I have ${names.length} ${cat} funds. Do they overlap? Should I consolidate?`)}` },
        })
      }
    }
  }

  // 9. Debt-heavy: outstanding loans > 40% of gross portfolio value
  const debtHoldings = holdings.filter((h) => h.asset_type === 'debt')
  if (debtHoldings.length > 0) {
    const totalDebt = debtHoldings.reduce((s, h) => s + h.units * (h.current_nav ?? 1), 0)
    const grossAssets = total + totalDebt // total is already net of debt because debt is negative
    const debtRatio = grossAssets > 0 ? (totalDebt / grossAssets) * 100 : 0
    if (debtRatio >= 40) {
      insights.push({
        id: 'high-debt-ratio',
        severity: 'warning',
        title: `Loans are ${debtRatio.toFixed(0)}% of your gross assets`,
        description: `High leverage means market downturns hit harder — you still owe the EMI regardless of portfolio performance. Consider accelerating loan repayment before increasing equity exposure.`,
      })
    }
  }

  // 10. Gold under-allocation: many financial planners suggest 5–10%
  const goldValue = holdings
    .filter((h) => h.asset_type === 'gold')
    .reduce((s, h) => s + h.current_value, 0)
  const goldPct = total > 0 ? (goldValue / total) * 100 : 0
  if (goldPct === 0 && holdings.length >= 5) {
    insights.push({
      id: 'no-gold',
      severity: 'info',
      title: 'No gold in your portfolio',
      description: 'Gold acts as a hedge during equity market corrections. Most planners suggest 5–10% allocation. Consider Sovereign Gold Bonds (SGBs) for tax-efficient gold exposure.',
      action: { label: 'Add gold', href: '/dashboard/upload' },
    })
  }

  return insights
}

function formatInr(n: number): string {
  return n.toLocaleString('en-IN', { maximumFractionDigits: 0 })
}
