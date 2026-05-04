import { createClient } from '@/lib/supabase/server'
import { getUserHoldings, computePortfolioSummary } from '@/lib/portfolio'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { StocksView } from './StocksView'

export default async function StocksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', user.id)
    .single()

  const holdings = await getUserHoldings(user.id)
  const stockHoldings = holdings.filter((h) => h.asset_type === 'stock')

  if (stockHoldings.length === 0) {
    return (
      <div className="px-4 py-10 sm:p-10 max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-fg mb-2">My Stocks</h1>
          <p className="text-fg-muted text-sm">
            Live breakdown of your equity holdings.
          </p>
        </div>

        <div className="bg-surface border border-line rounded-2xl p-10 text-center shadow-sm">
          <div className="text-5xl mb-4">📈</div>
          <h2 className="text-2xl font-semibold mb-3 text-fg">No stocks yet</h2>
          <p className="text-fg-muted mb-6 max-w-md mx-auto">
            Upload your portfolio once and you&apos;ll see it here, on the dashboard, and in Ask
            Clarzo — all in sync.
          </p>
          <Link
            href="/dashboard/upload"
            className="inline-block bg-accent hover:bg-accent-hover text-white px-6 py-3 rounded-xl font-medium transition shadow-sm"
          >
            Upload portfolio →
          </Link>
        </div>
      </div>
    )
  }

  const summary = computePortfolioSummary(stockHoldings)

  return (
    <StocksView
      holdings={stockHoldings}
      summary={summary}
      profileName={profile?.name ?? null}
    />
  )
}
