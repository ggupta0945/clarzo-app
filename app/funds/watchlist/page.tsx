// /funds/watchlist — signed-in only. Lists every fund the user has tracked.

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserWatchlist } from '@/lib/mutual-funds/queries'
import { FundCard } from '@/components/funds/FundCard'

export const metadata = { title: 'My fund watchlist · Clarzo' }

export default async function WatchlistPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/funds/watchlist')

  const items = await getUserWatchlist(user.id)

  return (
    <div className="px-6 py-6 sm:px-10 lg:px-14 lg:py-8 pb-28 max-w-[1400px] mx-auto">
      <nav className="text-xs text-fg-subtle mb-3 flex items-center gap-1.5">
        <Link href="/funds" className="hover:text-fg">Mutual Funds</Link>
        <span>›</span>
        <span>Watchlist</span>
      </nav>

      <header className="mb-5">
        <h1 className="text-2xl font-semibold text-fg tracking-tight mb-1">Watchlist</h1>
        <p className="text-sm text-fg-muted">
          Funds you&apos;re tracking. We&apos;ll surface fund-manager, category, and asset-mix changes for these.
        </p>
      </header>

      {items.length === 0 ? (
        <div className="bg-surface border border-line rounded-xl p-8 shadow-sm text-center">
          <h2 className="text-base font-semibold text-fg mb-2">Nothing in your watchlist yet</h2>
          <p className="text-sm text-fg-muted mb-5 max-w-md mx-auto">
            Open any fund and tap the heart icon to start tracking it.
          </p>
          <Link
            href="/funds"
            className="inline-block bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            Browse funds →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((s) => (
            <FundCard key={s.scheme_code} scheme={s} />
          ))}
        </div>
      )}
    </div>
  )
}
