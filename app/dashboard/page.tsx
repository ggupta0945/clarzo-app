import { createClient } from '@/lib/supabase/server'
import { getUserHoldings, computePortfolioSummary } from '@/lib/portfolio'
import { generateInsights } from '@/lib/insights'
import { syncNotifications } from '@/lib/notifications'
import { computeHealthScore } from '@/lib/portfolio-health'
import { getUserGoals } from '@/lib/goals'
import { fetchRecentCorpActions, estimateUpcomingEarnings } from '@/lib/stock-events'
import { aggregateAssetClasses } from '@/lib/asset-class'
import { assessRiskAndHorizon } from '@/lib/risk-horizon'
import { generateRebalanceSuggestions } from '@/lib/rebalance'
import { InsightCard } from '@/components/dashboard/InsightCard'
import { PortfolioHealthCard } from '@/components/dashboard/PortfolioHealthCard'
import { GoalProgress } from '@/components/dashboard/GoalProgress'
import { CorporateActions } from '@/components/dashboard/CorporateActions'
import { UpcomingEarnings } from '@/components/dashboard/UpcomingEarnings'
import { TaxSnapshot } from '@/components/dashboard/TaxSnapshot'
import { AssetClassBreakdown } from '@/components/dashboard/AssetClassBreakdown'
import { RiskHorizonCard } from '@/components/dashboard/RiskHorizonCard'
import { RebalanceCard } from '@/components/dashboard/RebalanceCard'
import { AskClarzoBar } from '@/components/dashboard/AskClarzoBar'
import { PortfolioHero } from '@/components/dashboard/PortfolioHero'
import { NiftyChart } from '@/components/dashboard/NiftyChart'
import { SamplePortfolioCTA } from '@/components/dashboard/SamplePortfolioCTA'
import { SamplePortfolioBanner } from '@/components/dashboard/SamplePortfolioBanner'
import { WhatChangedBanner } from '@/components/dashboard/WhatChangedBanner'
import { TrackEvent } from '@/components/analytics/TrackEvent'
import { aggregateBySector } from '@/lib/allocation'
import { fetchNifty } from '@/lib/nifty-data'
import {
  buildSnapshot,
  computeVisitDiff,
  MIN_DAYS_FOR_BANNER,
  type VisitSnapshot,
} from '@/lib/visit-diff'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Try selecting the migration-009 fields; fall back to a name-only select
  // if those columns don't exist yet so we don't regress the welcome message
  // when the migration is delayed.
  let profile: {
    name?: string | null
    last_dashboard_visit_at?: string | null
    last_visit_snapshot?: VisitSnapshot | null
  } | null = null
  {
    const res = await supabase
      .from('profiles')
      .select('name, last_dashboard_visit_at, last_visit_snapshot')
      .eq('id', user!.id)
      .single()
    if (res.error) {
      const fb = await supabase
        .from('profiles')
        .select('name')
        .eq('id', user!.id)
        .single()
      profile = fb.data
    } else {
      profile = res.data
    }
  }

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
            Upload your portfolio to see a complete picture with auto-generated insights — or load a sample to explore the product first.
          </p>
          <SamplePortfolioCTA />
        </div>
      </div>
    )
  }

  const insights = generateInsights(holdings)

  // Fire-and-forget: sync portfolio-derived notifications. Non-blocking.
  void syncNotifications(user!.id, holdings, insights, supabase)

  const health = computeHealthScore(holdings)
  const goals = await getUserGoals(user!.id)
  const assetMix = aggregateAssetClasses(holdings)
  const riskHorizon = assessRiskAndHorizon(holdings, goals)
  const rebalancePlan = generateRebalanceSuggestions(holdings, riskHorizon)
  const sectorAlloc = aggregateBySector(holdings)
  const topSectors = sectorAlloc.slices
    .filter((s) => s.label !== 'Unclassified')
    .slice(0, 3)
    .map((s) => ({ label: s.label, pct: s.pct }))

  // Pull recent corporate actions for the user's largest stock holdings.
  const topStockSymbols = [...holdings]
    .filter((h) => h.asset_type === 'stock')
    .sort((a, b) => b.current_value - a.current_value)
    .slice(0, 8)
    .map((h) => h.scheme_name)
  const recentActions = topStockSymbols.length > 0 ? await fetchRecentCorpActions(topStockSymbols) : []
  const upcomingEarnings = estimateUpcomingEarnings(topStockSymbols)

  // Nifty 50 — default 6-month series; client can re-fetch shorter ranges.
  const nifty = await fetchNifty('6mo')

  const firstName = profile?.name?.split(' ')[0] || 'there'
  const isSampleMode = holdings.some((h) => h.is_sample)

  // "What changed since last visit" — compute the diff against the prior
  // snapshot, then refresh the snapshot if at least MIN_DAYS_FOR_BANNER
  // have elapsed. Visits closer than that don't bump the snapshot, so the
  // user's "yesterday" reference doesn't get clobbered by an afternoon
  // re-open. Suppressed entirely in sample mode — fake P&L deltas would
  // be noise.
  const prevSnapshot = profile?.last_visit_snapshot as VisitSnapshot | null
  const visitDiff =
    !isSampleMode && prevSnapshot
      ? computeVisitDiff(prevSnapshot, holdings, summary, recentActions)
      : null

  if (!isSampleMode) {
    const shouldUpdateSnapshot =
      !profile?.last_dashboard_visit_at ||
      (Date.now() - new Date(profile.last_dashboard_visit_at).getTime()) /
        (1000 * 60 * 60 * 24) >=
        MIN_DAYS_FOR_BANNER
    if (shouldUpdateSnapshot) {
      const nextSnapshot = buildSnapshot(holdings, summary)
      // Fire-and-forget: a write failure here shouldn't break the page render.
      void supabase
        .from('profiles')
        .update({
          last_dashboard_visit_at: nextSnapshot.taken_at,
          last_visit_snapshot: nextSnapshot,
        })
        .eq('id', user!.id)
        .then(({ error }) => {
          if (error) console.error('visit snapshot write failed:', error)
        })
    }
  }

  return (
    <div className="px-6 py-4 sm:px-10 sm:py-6 lg:px-14 lg:py-8 pb-28">
      <TrackEvent
        event="dashboard_viewed"
        properties={{
          holdings_count: holdings.length,
          insights_count: insights.length,
          health_score: health.score,
          is_sample_mode: isSampleMode,
        }}
      />

      {isSampleMode && <SamplePortfolioBanner />}
      {visitDiff && <WhatChangedBanner diff={visitDiff} />}

      {/* Portfolio hero — title, segment pills, invested/returns, total arc.
          Re-upload + ticker chips live inside the hero header now. */}
      <PortfolioHero
        firstName={firstName}
        summary={summary}
        assetSlices={assetMix.slices}
        topSectors={topSectors}
      />

      {/* Nifty graph (left half) + Portfolio Health (right half) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3 items-stretch">
        <NiftyChart initialData={nifty} />
        <PortfolioHealthCard health={health} />
      </div>

      {/* Risk + Asset Class row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <RiskHorizonCard assessment={riskHorizon} />
        <AssetClassBreakdown slices={assetMix.slices} total={assetMix.total} />
      </div>

      {/* Goals + Rebalance row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
        <GoalProgress goals={goals} currentValue={summary.netWorth} />
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

      {/* Upcoming earnings (estimated) + Corporate actions — calendar row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <UpcomingEarnings earnings={upcomingEarnings} />
        <CorporateActions actions={recentActions} />
      </div>

      {/* Tax */}
      <div className="grid grid-cols-1 gap-3 mb-5">
        <TaxSnapshot holdings={holdings} />
      </div>

      {/* Fixed Ask Clarzo bar — pinned to viewport bottom */}
      <AskClarzoBar />
    </div>
  )
}
