// Returns vs benchmark grid for the fund detail page. Renders one row per
// timeframe and color-codes alpha (scheme - benchmark).

import type { MfReturns } from '@/lib/mutual-funds/types'
import { fmtPctPlain, returnTone } from '@/lib/mutual-funds/format'

type Props = {
  returns: MfReturns | null
  benchmark: string | null
}

const ROWS: Array<{ label: string; key: keyof MfReturns; bm?: keyof MfReturns; cagr?: boolean }> = [
  { label: '1 Month', key: 'return_1m' },
  { label: '3 Months', key: 'return_3m' },
  { label: '6 Months', key: 'return_6m' },
  { label: '1 Year', key: 'return_1y', bm: 'benchmark_1y' },
  { label: '3 Years', key: 'return_3y', bm: 'benchmark_3y', cagr: true },
  { label: '5 Years', key: 'return_5y', bm: 'benchmark_5y', cagr: true },
  { label: '10 Years', key: 'return_10y', bm: 'benchmark_10y', cagr: true },
  { label: 'Since Inception', key: 'return_si', cagr: true },
]

export function ReturnsTable({ returns, benchmark }: Props) {
  return (
    <div className="bg-surface border border-line rounded-xl shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-line flex items-center justify-between">
        <h3 className="text-sm font-semibold text-fg">Performance</h3>
        {benchmark && (
          <span className="text-[10px] text-fg-muted">
            Benchmark: <span className="text-fg">{benchmark}</span>
          </span>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-canvas/50">
            <tr className="text-left text-[10px] uppercase tracking-wider text-fg-muted">
              <th className="px-4 py-2 font-medium">Period</th>
              <th className="px-4 py-2 font-medium text-right">Fund</th>
              <th className="px-4 py-2 font-medium text-right">Benchmark</th>
              <th className="px-4 py-2 font-medium text-right">Alpha</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => {
              const fund = (returns?.[row.key] as number | null) ?? null
              const bm = row.bm ? ((returns?.[row.bm] as number | null) ?? null) : null
              const alpha = fund !== null && bm !== null ? fund - bm : null
              return (
                <tr key={row.label} className="border-t border-line">
                  <td className="px-4 py-2.5 text-fg">
                    {row.label}
                    {row.cagr && <span className="text-[10px] text-fg-subtle ml-1">(p.a.)</span>}
                  </td>
                  <td className={`px-4 py-2.5 text-right tabular-nums font-medium ${returnTone(fund)}`}>
                    {fmtPctPlain(fund, 2)}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-fg-muted">
                    {fmtPctPlain(bm, 2)}
                  </td>
                  <td className={`px-4 py-2.5 text-right tabular-nums font-medium ${returnTone(alpha)}`}>
                    {alpha !== null ? `${alpha >= 0 ? '+' : ''}${alpha.toFixed(2)}` : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
