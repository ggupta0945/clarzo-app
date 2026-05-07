// /funds/search?q=... — full search results page (the dropdown only shows
// 12). Uses the same ILIKE search; renders FundCards.

import Link from 'next/link'
import { searchSchemes } from '@/lib/mutual-funds/queries'
import { createClient } from '@/lib/supabase/server'
import { FundsSearchBar } from '@/components/funds/FundsSearchBar'
import type { MfScheme, MfReturns, MfSchemeWithReturns } from '@/lib/mutual-funds/types'
import { FundCard } from '@/components/funds/FundCard'

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const query = (q ?? '').trim()

  const results = query.length >= 2 ? await searchSchemes(query, 60) : []

  // Look up returns for the matched codes so the cards aren't empty.
  let withReturns: MfSchemeWithReturns[] = []
  if (results.length > 0) {
    const supabase = await createClient()
    const codes = results.map((r) => r.scheme_code)
    const { data } = await supabase
      .from('mf_schemes')
      .select('*, returns:mf_returns(*)')
      .in('scheme_code', codes)
    withReturns = (data as unknown as Array<MfScheme & { returns: MfReturns | MfReturns[] | null }> ?? []).map((r) => ({
      ...r,
      returns: Array.isArray(r.returns) ? (r.returns[0] ?? null) : r.returns,
    })) as MfSchemeWithReturns[]
    const order = new Map(codes.map((c, i) => [c, i]))
    withReturns.sort((a, b) => (order.get(a.scheme_code) ?? 0) - (order.get(b.scheme_code) ?? 0))
  }

  return (
    <div className="px-6 py-6 sm:px-10 lg:px-14 lg:py-8 pb-28 max-w-[1400px] mx-auto">
      <nav className="text-xs text-fg-subtle mb-3 flex items-center gap-1.5">
        <Link href="/funds" className="hover:text-fg">Mutual Funds</Link>
        <span>›</span>
        <span>Search</span>
      </nav>

      <header className="mb-5 max-w-2xl">
        <h1 className="text-2xl font-semibold text-fg tracking-tight mb-3">
          {query ? `Search: "${query}"` : 'Search funds'}
        </h1>
        <FundsSearchBar initialQuery={query} />
      </header>

      {query.length < 2 ? (
        <p className="text-sm text-fg-muted">Type at least 2 characters to search.</p>
      ) : withReturns.length === 0 ? (
        <p className="text-sm text-fg-muted">No funds matched &ldquo;{query}&rdquo;.</p>
      ) : (
        <>
          <p className="text-xs text-fg-muted mb-4">{withReturns.length} match{withReturns.length === 1 ? '' : 'es'}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {withReturns.map((s) => (
              <FundCard key={s.scheme_code} scheme={s} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
