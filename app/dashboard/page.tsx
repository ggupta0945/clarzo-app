import { createClient } from '@/lib/supabase/server'
import { getUserHoldings, computePortfolioSummary } from '@/lib/portfolio'
import { generateInsights } from '@/lib/insights'
import { computeHealthScore } from '@/lib/portfolio-health'
import { getUserGoals } from '@/lib/goals'
import { fetchRecentCorpActions } from '@/lib/stock-events'
import { aggregateAssetClasses } from '@/lib/asset-class'
import { assessRiskAndHorizon } from '@/lib/risk-horizon'
import { generateRebalanceSuggestions } from '@/lib/rebalance'
import { InsightCard } from '@/components/dashboard/InsightCard'
import { PortfolioHealthCard } from '@/components/dashboard/PortfolioHealthCard'
import { GoalProgress } from '@/components/dashboard/GoalProgress'
import { CorporateActions } from '@/components/dashboard/CorporateActions'
import { TaxSnapshot } from '@/components/dashboard/TaxSnapshot'
import { AssetClassBreakdown } from '@/components/dashboard/AssetClassBreakdown'
import { RiskHorizonCard } from '@/components/dashboard/RiskHorizonCard'
import { RebalanceCard } from '@/components/dashboard/RebalanceCard'
import { AskClarzoBar } from '@/components/dashboard/AskClarzoBar'
import { TrackEvent } from '@/components/analytics/TrackEvent'
import { EmailSampleButton } from '@/components/dashboard/EmailSampleButton'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', user!.id)
    .single()

  const holdings = await getUserHoldings(user!.id)
  const summary = computePortfolioSummary(holdings)

  // Empty state
  if (holdings.length === 0) {
    return (
      <div className="px-4 py-4 sm:p-8 max-w-5xl mx-auto">
        <TrackEvent event="dashboard_viewed" properties={{ holdings_count: 0 }} />
        <div className="mb-6">
          <h1 className="text-xl font-semibold mb-1 text-fg">
            Welcome, {profile?.name?.split(' ')[0] || 'there'}
          </h1>
          <p className="text-sm text-fg-muted">Let&apos;s get your money in order.</p>
        </div>

        <div className="bg-surface border border-line rounded-xl p-8 text-center shadow-sm">
          <div className="text-4xl mb-3">📊</div>
          <h2 className="text-lg mb-2 text-fg font-semibold">No portfolio yet</h2>
          <p className="text-sm text-fg-muted mb-5 max-w-md mx-auto">
            Upload your portfolio to see a complete picture with auto-generated insights.
          </p>
          <Link
            href="/dashboard/upload"
            className="inline-block bg-accent hover:bg-accent-hover text-white px-5 py-2.5 rounded-lg text-sm font-medium transition shadow-sm"
          >
            Upload Portfolio →
          </Link>
        </div>
      </div>
    )
  }

  const insights = generateInsights(holdings)
  const health = computeHealthScore(holdings)
  const goals = await getUserGoals(user!.id)
  const assetMix = aggregateAssetClasses(holdings)
  const riskHorizon = assessRiskAndHorizon(holdings, goals)
  const rebalancePlan = generateRebalanceSuggestions(holdings, riskHorizon)

  // Pull recent corporate actions for the user's largest stock holdings.
  const topStockSymbols = [...holdings]
    .filter((h) => h.asset_type === 'stock')
    .sort((a, b) => b.current_value - a.current_value)
    .slice(0, 8)
    .map((h) => h.scheme_name)
  const recentActions = topStockSymbols.length > 0 ? await fetchRecentCorpActions(topStockSymbols) : []

  const firstName = profile?.name?.split(' ')[0] || 'there'

  return (
    <div className="px-4 py-4 sm:p-6 lg:p-8 pb-28 max-w-7xl mx-auto">
      <TrackEvent
        event="dashboard_viewed"
        properties={{
          holdings_count: holdings.length,
          insights_count: insights.length,
          health_score: health.score,
        }}
      />

      {/* Top bar: greeting + actions */}
      <div className="mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[#a4bcfd] to-[#444ce7] flex items-center justify-center text-white text-sm font-semibold">
            {firstName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold text-fg">Hi {firstName}</h1>
              <span className="text-[9px] uppercase tracking-wider font-semibold text-accent bg-accent-soft border border-line-strong rounded px-1.5 py-px">
                PRO
              </span>
            </div>
            <p className="text-xs text-fg-muted">Here&apos;s where your money stands today.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <EmailSampleButton />
          <Link
            href="/dashboard/upload"
            className="inline-flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-white px-3 py-1.5 rounded-lg text-sm font-medium transition shadow-sm"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Upload
          </Link>
        </div>
      </div>

      {/* Summary cards */}
      <div className="bg-surface border border-line rounded-xl p-4 mb-5 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:border-r sm:border-line sm:pr-4">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-accent-soft text-accent">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="6" width="18" height="13" rx="2" />
                  <path d="M16 12h2" />
                </svg>
              </span>
              <p className="text-[10px] uppercase tracking-wider text-fg-muted font-medium">Current</p>
            </div>
            <p className="text-xl font-bold tracking-tight text-fg">
              ₹{summary.netWorth.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="sm:border-r sm:border-line sm:pr-4">
            <p className="text-[10px] uppercase tracking-wider text-fg-muted font-medium mb-1">Invested</p>
            <p className="text-xl font-bold tracking-tight text-fg">
              ₹{summary.invested.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-fg-muted font-medium mb-1">Total Returns</p>
            <p
              className="text-xl font-bold tracking-tight"
              style={{ color: summary.pnl >= 0 ? 'var(--success)' : 'var(--danger)' }}
            >
              {summary.pnlPct >= 0 ? '+' : ''}{summary.pnlPct.toFixed(1)}%
            </p>
            <p
              className="text-xs mt-0.5 font-medium"
              style={{ color: summary.pnl >= 0 ? 'var(--success)' : 'var(--danger)' }}
            >
              {summary.pnl >= 0 ? '+' : ''}₹{Math.abs(summary.pnl).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </p>
          </div>
        </div>
      </div>

      {/* Health + Risk-Horizon row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <PortfolioHealthCard health={health} />
        <RiskHorizonCard assessment={riskHorizon} />
      </div>

      {/* Goals + Asset Class row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <GoalProgress goals={goals} currentValue={summary.netWorth} />
        <AssetClassBreakdown slices={assetMix.slices} total={assetMix.total} />
      </div>

      {/* Rebalance suggestions */}
      <div className="mb-5">
        <RebalanceCard plan={rebalancePlan} />
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <div className="mb-5">
          <h2 className="text-[10px] uppercase tracking-wider text-fg-muted font-medium mb-2">What we noticed</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {insights.map((i) => (
              <InsightCard key={i.id} insight={i} />
            ))}
          </div>
        </div>
      )}

      {/* Corporate actions + Tax — bottom row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
        <CorporateActions actions={recentActions} />
        <TaxSnapshot holdings={holdings} />
      </div>

      {/* Fixed Ask Clarzo bar — pinned to viewport bottom */}
      <AskClarzoBar />
    </div>
  )
}
