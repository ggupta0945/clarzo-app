// /funds/[schemeCode] — fund detail. Header strip with name + key returns +
// watchlist; left rail with NAV chart, returns table, benchmark scorecard,
// SIP calculator, peer comparison, change history; right rail with the
// fund facts card + news feed.

import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  getSchemeByCode,
  getNavHistory,
  getPeerSchemes,
  getRecentAlerts,
  isInWatchlist,
} from '@/lib/mutual-funds/queries'
import { createClient } from '@/lib/supabase/server'
import { NavChart } from '@/components/funds/NavChart'
import { ReturnsTable } from '@/components/funds/ReturnsTable'
import { BenchmarkScorecard } from '@/components/funds/BenchmarkScorecard'
import { FundFactsCard } from '@/components/funds/FundFactsCard'
import { FundNewsFeed } from '@/components/funds/FundNewsFeed'
import { WatchlistButton } from '@/components/funds/WatchlistButton'
import { SipCalculator } from '@/components/funds/SipCalculator'
import { PeerFunds } from '@/components/funds/PeerFunds'
import { SchemeAlertsList } from '@/components/funds/SchemeAlertsList'
import { fmtPct, returnTone } from '@/lib/mutual-funds/format'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ schemeCode: string }>
}) {
  const { schemeCode } = await params
  const scheme = await getSchemeByCode(schemeCode)
  if (!scheme) return { title: 'Fund not found · Clarzo' }
  return {
    title: `${scheme.scheme_name} · Clarzo`,
    description: `${scheme.sub_category ?? 'Mutual fund'} · ${scheme.amc ?? ''}. Returns, NAV history, benchmark performance, news, and peer comparison.`,
  }
}

export default async function FundDetailPage({
  params,
}: {
  params: Promise<{ schemeCode: string }>
}) {
  const { schemeCode } = await params
  const scheme = await getSchemeByCode(schemeCode)
  if (!scheme) return notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [navHistory, peers, alerts, watching] = await Promise.all([
    getNavHistory(schemeCode, '5y'),
    scheme.sub_category ? getPeerSchemes(schemeCode, scheme.sub_category, 6) : Promise.resolve([]),
    getRecentAlerts(schemeCode, 10),
    user ? isInWatchlist(user.id, schemeCode) : Promise.resolve(false),
  ])

  const r = scheme.returns

  return (
    <div className="px-6 py-6 sm:px-10 lg:px-14 lg:py-8 pb-28 max-w-[1400px] mx-auto">
      {/* Breadcrumbs */}
      <nav className="text-xs text-fg-subtle mb-4 flex items-center gap-1.5 flex-wrap">
        <Link href="/funds" className="hover:text-fg">Mutual Funds</Link>
        {scheme.category && (
          <>
            <span>›</span>
            <span>{scheme.category}</span>
          </>
        )}
        {scheme.sub_category && (
          <>
            <span>›</span>
            <Link
              href={`/funds/category/${encodeURIComponent(scheme.sub_category)}`}
              className="hover:text-fg"
            >
              {scheme.sub_category}
            </Link>
          </>
        )}
      </nav>

      {/* Header */}
      <header className="mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 mb-2 flex-wrap">
              {scheme.amc && (
                <span className="text-[11px] font-medium text-fg-muted bg-canvas border border-line rounded px-2 py-0.5">
                  {scheme.amc}
                </span>
              )}
              {scheme.sub_category && (
                <span className="text-[11px] text-accent bg-accent-soft rounded-full px-2 py-0.5">
                  {scheme.sub_category}
                </span>
              )}
              {scheme.plan_type && scheme.option_type && (
                <span className="text-[11px] text-fg-muted bg-canvas border border-line rounded-full px-2 py-0.5">
                  {scheme.plan_type} · {scheme.option_type}
                </span>
              )}
              {scheme.riskometer && (
                <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                  Risk: {scheme.riskometer}
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-semibold text-fg tracking-tight max-w-3xl">
              {scheme.scheme_name}
            </h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={`/funds/compare?codes=${scheme.scheme_code}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-line bg-surface text-fg hover:border-accent transition"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18M3 12h18M3 18h18" />
              </svg>
              Compare
            </Link>
            <WatchlistButton schemeCode={scheme.scheme_code} initial={watching} isAuthed={!!user} />
          </div>
        </div>

        {/* Quick returns row */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2 max-w-3xl">
          <Stat label="1Y" value={fmtPct(r?.return_1y ?? null)} tone={returnTone(r?.return_1y ?? null)} />
          <Stat label="3Y CAGR" value={fmtPct(r?.return_3y ?? null)} tone={returnTone(r?.return_3y ?? null)} />
          <Stat label="5Y CAGR" value={fmtPct(r?.return_5y ?? null)} tone={returnTone(r?.return_5y ?? null)} />
          <Stat label="10Y CAGR" value={fmtPct(r?.return_10y ?? null)} tone={returnTone(r?.return_10y ?? null)} />
          <Stat label="SI CAGR" value={fmtPct(r?.return_si ?? null)} tone={returnTone(r?.return_si ?? null)} />
        </div>

        {/* Category rank ribbon */}
        {r?.category_rank_3y && r.category_size_3y && (
          <div className="mt-4 inline-flex items-center gap-2 text-xs bg-canvas border border-line rounded-full px-3 py-1.5">
            <span className="text-fg-muted">Category rank (3Y):</span>
            <span className="font-semibold text-fg">
              #{r.category_rank_3y} of {r.category_size_3y}
            </span>
            <span className="text-fg-subtle">in {scheme.sub_category}</span>
          </div>
        )}
      </header>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <NavChart series={navHistory} initialRange="1y" />
          <ReturnsTable returns={r} benchmark={scheme.benchmark} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <BenchmarkScorecard returns={r} />
            <SipCalculator defaultReturn={r?.return_3y ?? 12} />
          </div>
          {scheme.objective && (
            <div className="bg-surface border border-line rounded-xl p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-fg mb-2">Investment objective</h3>
              <p className="text-sm text-fg-muted leading-relaxed whitespace-pre-line">{scheme.objective}</p>
            </div>
          )}
          <SchemeAlertsList alerts={alerts} />
          <PeerFunds current={scheme} peers={peers} />
        </div>

        <div className="space-y-4">
          <FundFactsCard scheme={scheme} />
          <FundNewsFeed fundName={scheme.scheme_name} amc={scheme.amc} />
        </div>
      </div>

      <p className="text-[11px] text-fg-subtle leading-relaxed mt-8 max-w-3xl">
        Returns are computed from AMFI NAV history; benchmark figures are derived from the
        assigned index where available. Past performance does not guarantee future results.
        This is research, not investment advice.
      </p>
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="bg-surface border border-line rounded-lg px-3 py-2.5 shadow-sm">
      <div className="text-[10px] uppercase tracking-wider text-fg-muted font-medium">{label}</div>
      <div className={`text-lg font-semibold tabular-nums mt-0.5 ${tone ?? 'text-fg'}`}>{value}</div>
    </div>
  )
}
