// /funds/category/[category] — leaderboard for a single sub-category. Same
// table as the discover page but pinned to the sub-category and supporting
// any window via ?window=. URL-decoded so spaces and case match the master.

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getTopPerformers } from '@/lib/mutual-funds/queries'
import { TopPerformersTable } from '@/components/funds/TopPerformersTable'
import { SUB_CATEGORIES } from '@/lib/mutual-funds/categories'

const ALL_SUBS = new Set(Object.values(SUB_CATEGORIES).flat())

type Window = '1y' | '3y' | '5y' | '10y'
function parseWindow(v: string | string[] | undefined): Window {
  const s = Array.isArray(v) ? v[0] : v
  return s === '1y' || s === '5y' || s === '10y' ? s : '3y'
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>
}) {
  const { category } = await params
  const decoded = decodeURIComponent(category)
  return { title: `${decoded} mutual funds · Clarzo` }
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>
  searchParams: Promise<{ window?: string }>
}) {
  const { category } = await params
  const { window: w } = await searchParams
  const win = parseWindow(w)
  const subCategory = decodeURIComponent(category)

  if (!ALL_SUBS.has(subCategory)) return notFound()

  const rows = await getTopPerformers({
    window: win,
    sub_category: subCategory,
    limit: 100,
  })

  return (
    <div className="px-6 py-6 sm:px-10 lg:px-14 lg:py-8 pb-28 max-w-[1400px] mx-auto">
      <nav className="text-xs text-fg-subtle mb-3 flex items-center gap-1.5">
        <Link href="/funds" className="hover:text-fg">Mutual Funds</Link>
        <span>›</span>
        <span>{subCategory}</span>
      </nav>

      <header className="mb-5">
        <h1 className="text-2xl font-semibold text-fg tracking-tight mb-1">{subCategory}</h1>
        <p className="text-sm text-fg-muted">
          Top {subCategory} mutual funds ranked by {win === '1y' ? '1-year' : win === '3y' ? '3-year' : win === '5y' ? '5-year' : '10-year'} return
          (Direct, Growth plans).
        </p>
      </header>

      <TopPerformersTable
        rows={rows}
        window={win}
        basePath={`/funds/category/${encodeURIComponent(subCategory)}`}
      />
    </div>
  )
}
