// /funds — discover landing. Three rails:
//   1. Hero: search + window-switcher leaderboard of top performers
//   2. Curated category buckets (Large Cap / Mid Cap / Small Cap / Flexi Cap / ELSS / Hybrid)
//      so a user can compare leaders within each segment
//   3. Browse-by-category and browse-by-AMC tile grids
//
// Public RSC page; anonymous users can read everything. Watchlist/CTA copy
// shifts depending on auth state.

import { Suspense } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  getTopPerformers,
  getCategoryCounts,
  getAmcCounts,
} from '@/lib/mutual-funds/queries'
import { FundsSearchBar } from '@/components/funds/FundsSearchBar'
import { TopPerformersTable } from '@/components/funds/TopPerformersTable'
import { FundCard } from '@/components/funds/FundCard'
import { CategoryGrid } from '@/components/funds/CategoryGrid'
import { AmcGrid } from '@/components/funds/AmcGrid'

const CURATED_CATEGORIES = ['Large Cap', 'Mid Cap', 'Small Cap', 'Flexi Cap', 'ELSS', 'Aggressive Hybrid']

type Window = '1y' | '3y' | '5y' | '10y'

function parseWindow(v: string | string[] | undefined): Window {
  const s = Array.isArray(v) ? v[0] : v
  return s === '1y' || s === '5y' || s === '10y' ? s : '3y'
}

export default async function FundsLandingPage({
  searchParams,
}: {
  searchParams: Promise<{ window?: string }>
}) {
  const { window: windowParam } = await searchParams
  const win = parseWindow(windowParam)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Parallel-fetch the rails
  const [
    overallTop,
    categoryCounts,
    amcCounts,
    ...curatedLists
  ] = await Promise.all([
    getTopPerformers({ window: win, limit: 10 }),
    getCategoryCounts(),
    getAmcCounts(),
    ...CURATED_CATEGORIES.map((sub_category) =>
      getTopPerformers({ window: win, sub_category, limit: 4 })
    ),
  ])

  return (
    <div className="px-6 py-6 sm:px-10 lg:px-14 lg:py-8 pb-28 max-w-[1400px] mx-auto">
      {/* Hero */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] uppercase tracking-wider font-medium text-accent bg-accent-soft rounded-full px-2 py-0.5">
            Mutual funds
          </span>
          <span className="text-[10px] text-fg-subtle">Live · AMFI feed</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-semibold text-fg tracking-tight mb-2">
          Find your next great mutual fund
        </h1>
        <p className="text-sm text-fg-muted mb-5 max-w-2xl">
          Compare every Indian mutual fund on returns, peer rank, and benchmark performance.
          Track changes to fund manager, category, and asset mix as they happen.
        </p>
        <div className="max-w-2xl">
          <FundsSearchBar />
        </div>

        {!user && (
          <div className="mt-4 inline-flex items-center gap-2 text-xs text-fg-muted bg-accent-soft border border-accent/20 rounded-full px-3 py-1.5">
            <span>Sign in to save funds to your watchlist and track changes</span>
            <Link href="/login" className="text-accent font-medium hover:underline">Get started →</Link>
          </div>
        )}
      </div>

      {/* Top performers leaderboard */}
      <section className="mb-10">
        <Suspense fallback={null}>
          <TopPerformersTable
            rows={overallTop}
            window={win}
            basePath="/funds"
            title="Top performers across all categories"
          />
        </Suspense>
      </section>

      {/* Curated category rails */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-fg mb-4">Leaders by category</h2>
        <div className="space-y-6">
          {CURATED_CATEGORIES.map((cat, idx) => (
            <CategoryRail
              key={cat}
              category={cat}
              window={win}
              funds={curatedLists[idx]}
            />
          ))}
        </div>
      </section>

      {/* Browse grids */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        <CategoryGrid counts={categoryCounts} />
        <AmcGrid counts={amcCounts.slice(0, 32)} />
      </section>

      {/* Footer microcopy */}
      <p className="text-[11px] text-fg-subtle leading-relaxed max-w-3xl mt-6">
        Data sources: AMFI scheme master, AMFI daily NAV, mfapi.in for historical NAV,
        Google News for fund-specific news. Returns are gross of taxes; for periods over
        1 year we report annualised CAGR. This is research, not investment advice.
      </p>
    </div>
  )
}

function CategoryRail({
  category, window, funds,
}: {
  category: string
  window: Window
  funds: Awaited<ReturnType<typeof getTopPerformers>>
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-fg">{category}</h3>
        <Link
          href={`/funds/category/${encodeURIComponent(category)}?window=${window}`}
          className="text-xs text-accent hover:underline"
        >
          See all →
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {funds.length === 0 ? (
          <div className="col-span-full bg-surface border border-line rounded-xl p-4 text-sm text-fg-muted">
            No data yet for {category}. Run the sync scripts to populate this rail.
          </div>
        ) : (
          funds.map((f, i) => <FundCard key={f.scheme_code} scheme={f} rank={i + 1} />)
        )}
      </div>
    </div>
  )
}
