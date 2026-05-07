// Sortable leaderboard with a window switcher (1Y / 3Y / 5Y / 10Y).
// Server-rendered table; the switcher is plain anchor links so the URL
// stays shareable and the page can prefetch.

import Link from 'next/link'
import type { MfSchemeWithReturns } from '@/lib/mutual-funds/types'
import { fmtPct, returnTone, fmtCrore } from '@/lib/mutual-funds/format'

type Window = '1y' | '3y' | '5y' | '10y'

type Props = {
  rows: MfSchemeWithReturns[]
  window: Window
  basePath: string  // e.g. '/funds' or '/funds/category/Mid Cap'
  title?: string
}

const WINDOW_LABEL: Record<Window, string> = {
  '1y': '1Y',
  '3y': '3Y CAGR',
  '5y': '5Y CAGR',
  '10y': '10Y CAGR',
}

const RETURN_KEY: Record<Window, 'return_1y' | 'return_3y' | 'return_5y' | 'return_10y'> = {
  '1y': 'return_1y',
  '3y': 'return_3y',
  '5y': 'return_5y',
  '10y': 'return_10y',
}

export function TopPerformersTable({ rows, window, basePath, title }: Props) {
  const sortKey = RETURN_KEY[window]
  return (
    <div className="bg-surface border border-line rounded-xl shadow-sm overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-line">
        <h3 className="text-sm font-semibold text-fg">{title ?? 'Top performers'}</h3>
        <div className="flex items-center gap-1 rounded-full bg-canvas border border-line p-0.5">
          {(Object.keys(WINDOW_LABEL) as Window[]).map((w) => (
            <Link
              key={w}
              href={`${basePath}?window=${w}`}
              className={`px-2.5 py-1 text-[11px] rounded-full transition ${
                w === window
                  ? 'bg-surface text-fg font-medium shadow-sm ring-1 ring-line'
                  : 'text-fg-muted hover:text-fg'
              }`}
            >
              {WINDOW_LABEL[w]}
            </Link>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-canvas/50">
            <tr className="text-left text-[10px] uppercase tracking-wider text-fg-muted">
              <th className="px-4 py-2 font-medium">#</th>
              <th className="px-4 py-2 font-medium">Scheme</th>
              <th className="px-4 py-2 font-medium">Category</th>
              <th className="px-4 py-2 font-medium text-right">{WINDOW_LABEL[window]}</th>
              <th className="px-4 py-2 font-medium text-right hidden sm:table-cell">1Y</th>
              <th className="px-4 py-2 font-medium text-right hidden md:table-cell">3Y</th>
              <th className="px-4 py-2 font-medium text-right hidden md:table-cell">5Y</th>
              <th className="px-4 py-2 font-medium text-right hidden lg:table-cell">AUM</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s, i) => (
              <tr
                key={s.scheme_code}
                className="border-t border-line hover:bg-canvas/40 transition"
              >
                <td className="px-4 py-3 text-fg-subtle font-mono text-xs">{i + 1}</td>
                <td className="px-4 py-3">
                  <Link
                    href={`/funds/${s.scheme_code}`}
                    className="text-fg hover:text-accent font-medium leading-tight line-clamp-2 max-w-[20rem] block"
                  >
                    {s.scheme_name}
                  </Link>
                  {s.amc && <div className="text-[10px] text-fg-subtle mt-0.5">{s.amc}</div>}
                </td>
                <td className="px-4 py-3 text-xs text-fg-muted whitespace-nowrap">
                  {s.sub_category ?? '—'}
                </td>
                <td className={`px-4 py-3 text-right font-semibold tabular-nums ${returnTone(s.returns?.[sortKey] ?? null)}`}>
                  {fmtPct(s.returns?.[sortKey] ?? null, 1)}
                </td>
                <td className={`px-4 py-3 text-right tabular-nums hidden sm:table-cell ${returnTone(s.returns?.return_1y ?? null)}`}>
                  {fmtPct(s.returns?.return_1y ?? null, 1)}
                </td>
                <td className={`px-4 py-3 text-right tabular-nums hidden md:table-cell ${returnTone(s.returns?.return_3y ?? null)}`}>
                  {fmtPct(s.returns?.return_3y ?? null, 1)}
                </td>
                <td className={`px-4 py-3 text-right tabular-nums hidden md:table-cell ${returnTone(s.returns?.return_5y ?? null)}`}>
                  {fmtPct(s.returns?.return_5y ?? null, 1)}
                </td>
                <td className="px-4 py-3 text-right text-fg-muted text-xs hidden lg:table-cell">
                  {fmtCrore(s.aum_crores)}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-sm text-fg-muted">
                  No funds available yet — run the sync scripts to populate data.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
