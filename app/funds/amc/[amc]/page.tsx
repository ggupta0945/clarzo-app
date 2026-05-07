// /funds/amc/[amc] — every Direct/Growth scheme from one AMC. Useful for
// "I want to see all Mirae funds" use cases.

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TopPerformersTable } from '@/components/funds/TopPerformersTable'
import type { MfScheme, MfReturns, MfSchemeWithReturns } from '@/lib/mutual-funds/types'

type Window = '1y' | '3y' | '5y' | '10y'
function parseWindow(v: string | string[] | undefined): Window {
  const s = Array.isArray(v) ? v[0] : v
  return s === '1y' || s === '5y' || s === '10y' ? s : '3y'
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ amc: string }>
}) {
  const { amc } = await params
  return { title: `${decodeURIComponent(amc)} Mutual Fund schemes · Clarzo` }
}

export default async function AmcPage({
  params,
  searchParams,
}: {
  params: Promise<{ amc: string }>
  searchParams: Promise<{ window?: string }>
}) {
  const { amc } = await params
  const { window: w } = await searchParams
  const win = parseWindow(w)
  const amcDecoded = decodeURIComponent(amc)

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('mf_schemes')
    .select('*, returns:mf_returns(*)')
    .eq('amc', amcDecoded)
    .eq('plan_type', 'Direct')
    .eq('option_type', 'Growth')
    .eq('is_active', true)
    .limit(500)

  if (error) return notFound()
  const rows = (data as unknown as Array<MfScheme & { returns: MfReturns | MfReturns[] | null }> ?? []).map((r) => ({
    ...r,
    returns: Array.isArray(r.returns) ? (r.returns[0] ?? null) : r.returns,
  })) as MfSchemeWithReturns[]

  if (rows.length === 0) return notFound()

  return (
    <div className="px-6 py-6 sm:px-10 lg:px-14 lg:py-8 pb-28 max-w-[1400px] mx-auto">
      <nav className="text-xs text-fg-subtle mb-3 flex items-center gap-1.5">
        <Link href="/funds" className="hover:text-fg">Mutual Funds</Link>
        <span>›</span>
        <span>{amcDecoded}</span>
      </nav>

      <header className="mb-5">
        <h1 className="text-2xl font-semibold text-fg tracking-tight mb-1">{amcDecoded} Mutual Fund</h1>
        <p className="text-sm text-fg-muted">
          {rows.length} Direct/Growth schemes — sorted by {win === '1y' ? '1Y' : win === '3y' ? '3Y CAGR' : win === '5y' ? '5Y CAGR' : '10Y CAGR'}.
        </p>
      </header>

      <TopPerformersTable
        rows={rows}
        window={win}
        basePath={`/funds/amc/${encodeURIComponent(amcDecoded)}`}
      />
    </div>
  )
}
