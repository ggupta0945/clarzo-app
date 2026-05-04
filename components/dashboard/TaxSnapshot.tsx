import type { EnrichedHolding } from '@/lib/portfolio'

const TAX_TIPS: Array<{ title: string; body: string }> = [
  {
    title: 'LTCG exemption',
    body: 'First ₹1.25L of long-term equity gains in FY25-26 is tax-free. Plan exits to fit under the cap.',
  },
  {
    title: 'STCG rate hike',
    body: 'Short-term equity gains are taxed at 20% (up from 15%) since July 2024. Holding past 12 months halves the rate to 12.5%.',
  },
  {
    title: '80C window',
    body: 'ELSS, PPF, and tax-saver FDs together cap at ₹1.5L deduction under 80C in the old regime.',
  },
]

function fmtInr(n: number): string {
  return n.toLocaleString('en-IN', { maximumFractionDigits: 0 })
}

export function TaxSnapshot({ holdings }: { holdings: EnrichedHolding[] }) {
  // Loss-harvest candidates: only stocks (no purchase-date data, so we can't
  // distinguish ST/LT — surface losers honestly without a tax-period label).
  const losers = holdings
    .filter((h) => h.asset_type === 'stock' && h.pnl < 0)
    .sort((a, b) => a.pnl - b.pnl)
    .slice(0, 4)

  const totalLoss = losers.reduce((s, h) => s + h.pnl, 0)

  return (
    <div className="bg-surface border border-line rounded-xl p-3.5 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[10px] uppercase tracking-wider text-fg-muted font-medium">
          Tax snapshot
        </h3>
      </div>

      {losers.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] uppercase tracking-wider text-fg-muted font-medium mb-1.5">
            Loss harvesting · ₹{fmtInr(Math.abs(totalLoss))} potential
          </p>
          <ul className="space-y-1">
            {losers.map((h) => (
              <li key={h.id} className="flex items-center justify-between gap-2">
                <span className="text-xs text-fg truncate flex-1">{h.scheme_name}</span>
                <span className="text-[11px] text-danger font-medium whitespace-nowrap">
                  −₹{fmtInr(Math.abs(h.pnl))}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-[10px] text-fg-subtle mt-1.5 leading-snug">
            Selling losers can offset gains and lower tax. Set off ST losses against ST gains first;
            LT losses only offset LT gains.
          </p>
        </div>
      )}

      <div className="border-t border-line pt-2.5 space-y-2">
        {TAX_TIPS.map((t) => (
          <div key={t.title}>
            <p className="text-[11px] font-semibold text-fg">{t.title}</p>
            <p className="text-[10px] text-fg-muted leading-snug">{t.body}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
