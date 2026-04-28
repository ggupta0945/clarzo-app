import { createClient } from '@/lib/supabase/server'
import { getUserHoldings, computePortfolioSummary } from '@/lib/portfolio'
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
      <div className="p-10 max-w-5xl mx-auto">
        <div className="mb-10">
          <h1 className="text-3xl mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
            Welcome, {profile?.name?.split(' ')[0] || 'there'}
          </h1>
          <p className="text-[#88b098]">Let&apos;s get your money in order.</p>
        </div>

        <div className="bg-[#071a10] border border-[#1a4a2e] rounded-2xl p-10 text-center">
          <div className="text-5xl mb-4">📊</div>
          <h2 className="text-2xl mb-3" style={{ fontFamily: 'Playfair Display, serif' }}>
            No portfolio yet
          </h2>
          <p className="text-[#88b098] mb-6 max-w-md mx-auto">
            Upload your Zerodha or Groww CSV to see your complete portfolio with insights.
          </p>
          <Link
            href="/dashboard/upload"
            className="inline-block bg-[#059669] hover:bg-[#0F6E56] text-white px-6 py-3 rounded-full font-medium transition"
          >
            Upload Portfolio →
          </Link>
        </div>
      </div>
    )
  }

  // With data
  return (
    <div className="p-10 max-w-5xl mx-auto">
      <div className="mb-10">
        <h1 className="text-3xl mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
          Hi {profile?.name?.split(' ')[0] || 'there'}
        </h1>
        <p className="text-[#88b098]">Here&apos;s where your money stands today.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-[#071a10] border border-[#1a4a2e] rounded-2xl p-6">
          <p className="text-xs uppercase tracking-wider text-[#88b098] mb-2">Current value</p>
          <p className="text-3xl" style={{ fontFamily: 'Playfair Display, serif' }}>
            ₹{summary.netWorth.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
        </div>
        <div className="bg-[#071a10] border border-[#1a4a2e] rounded-2xl p-6">
          <p className="text-xs uppercase tracking-wider text-[#88b098] mb-2">Invested</p>
          <p className="text-3xl" style={{ fontFamily: 'Playfair Display, serif' }}>
            ₹{summary.invested.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
        </div>
        <div className="bg-[#071a10] border border-[#1a4a2e] rounded-2xl p-6">
          <p className="text-xs uppercase tracking-wider text-[#88b098] mb-2">Returns</p>
          <p
            className="text-3xl"
            style={{
              fontFamily: 'Playfair Display, serif',
              color: summary.pnl >= 0 ? '#34d399' : '#ef4444',
            }}
          >
            {summary.pnlPct >= 0 ? '+' : ''}{summary.pnlPct.toFixed(1)}%
          </p>
          <p className={`text-sm mt-1 ${summary.pnl >= 0 ? 'text-[#34d399]' : 'text-[#ef4444]'}`}>
            {summary.pnl >= 0 ? '+' : ''}₹{Math.abs(summary.pnl).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
        </div>
      </div>

      {/* Holdings table */}
      <div className="bg-[#071a10] border border-[#1a4a2e] rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#1a4a2e] flex items-center justify-between">
          <h2 className="text-lg font-medium">Your holdings ({holdings.length})</h2>
          <Link
            href="/dashboard/upload"
            className="text-sm text-[#34d399] hover:underline"
          >
            Re-upload
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#0c2418]">
              <tr>
                <th className="text-left text-xs uppercase tracking-wider text-[#88b098] px-6 py-3 font-medium">Scheme</th>
                <th className="text-right text-xs uppercase tracking-wider text-[#88b098] px-6 py-3 font-medium">Units</th>
                <th className="text-right text-xs uppercase tracking-wider text-[#88b098] px-6 py-3 font-medium">Current Value</th>
                <th className="text-right text-xs uppercase tracking-wider text-[#88b098] px-6 py-3 font-medium">Returns</th>
              </tr>
            </thead>
            <tbody>
              {holdings.map((h) => (
                <tr key={h.id} className="border-b border-[#1a4a2e] last:border-0 hover:bg-[#0c2418] transition">
                  <td className="px-6 py-4 text-sm">
                    <span>{h.scheme_name}</span>
                    {!h.isin && (
                      <span className="ml-2 text-xs text-[#f5c842]" title="No live NAV — using avg cost">
                        est.
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-right font-mono">{h.units.toFixed(2)}</td>
                  <td className="px-6 py-4 text-sm text-right font-mono">
                    ₹{h.current_value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </td>
                  <td className={`px-6 py-4 text-sm text-right font-mono ${h.pnl >= 0 ? 'text-[#34d399]' : 'text-[#ef4444]'}`}>
                    {h.pnl_pct >= 0 ? '+' : ''}{h.pnl_pct.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
