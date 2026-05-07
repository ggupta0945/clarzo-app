// /funds/compare?codes=A,B,C — side-by-side comparison of up to 4 funds.
// Server-rendered; the codes live in the URL so the comparison is shareable.

import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { MfScheme, MfReturns, MfSchemeWithReturns } from '@/lib/mutual-funds/types'
import { fmtPct, fmtPctPlain, returnTone, fmtCrore } from '@/lib/mutual-funds/format'

const MAX_FUNDS = 4

async function loadFunds(codes: string[]): Promise<MfSchemeWithReturns[]> {
  if (codes.length === 0) return []
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('mf_schemes')
    .select('*, returns:mf_returns(*)')
    .in('scheme_code', codes)
  if (error || !data) return []

  const rows = (data as unknown as Array<MfScheme & { returns: MfReturns | MfReturns[] | null }>).map((r) => ({
    ...r,
    returns: Array.isArray(r.returns) ? (r.returns[0] ?? null) : r.returns,
  })) as MfSchemeWithReturns[]

  // Preserve URL order
  const order = new Map(codes.map((c, i) => [c, i]))
  return rows.sort((a, b) => (order.get(a.scheme_code) ?? 0) - (order.get(b.scheme_code) ?? 0))
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ codes?: string }>
}) {
  const { codes: codesParam } = await searchParams
  const codes = (codesParam ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, MAX_FUNDS)
  const funds = await loadFunds(codes)

  return (
    <div className="px-6 py-6 sm:px-10 lg:px-14 lg:py-8 pb-28 max-w-[1400px] mx-auto">
      <nav className="text-xs text-fg-subtle mb-3 flex items-center gap-1.5">
        <Link href="/funds" className="hover:text-fg">Mutual Funds</Link>
        <span>›</span>
        <span>Compare</span>
      </nav>

      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-fg tracking-tight mb-1">Compare funds</h1>
        <p className="text-sm text-fg-muted">
          Side-by-side returns, benchmark, fees, and rank. Up to {MAX_FUNDS} funds.
        </p>
      </header>

      {funds.length === 0 ? (
        <EmptyState />
      ) : (
        <CompareTable funds={funds} />
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="bg-surface border border-line rounded-xl p-8 shadow-sm text-center">
      <h2 className="text-base font-semibold text-fg mb-2">Pick two or more funds</h2>
      <p className="text-sm text-fg-muted mb-5 max-w-md mx-auto">
        Open any fund detail page and click <span className="text-fg">Compare</span>, or pass scheme codes in the URL like
        <code className="text-[11px] mx-1 px-1.5 py-0.5 rounded bg-canvas border border-line text-fg">?codes=120503,118989</code>.
      </p>
      <Link
        href="/funds"
        className="inline-block bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg text-sm font-medium transition"
      >
        Browse funds →
      </Link>
    </div>
  )
}

function CompareTable({ funds }: { funds: MfSchemeWithReturns[] }) {
  const rows: Array<{ label: string; render: (f: MfSchemeWithReturns) => React.ReactNode }> = [
    { label: 'AMC', render: (f) => f.amc ?? '—' },
    { label: 'Category', render: (f) => f.sub_category ?? '—' },
    { label: 'Plan / Option', render: (f) => `${f.plan_type ?? '—'} · ${f.option_type ?? '—'}` },
    { label: 'Benchmark', render: (f) => f.benchmark ?? '—' },
    { label: 'Riskometer', render: (f) => f.riskometer ?? '—' },
    {
      label: '1Y',
      render: (f) => (
        <span className={`tabular-nums font-medium ${returnTone(f.returns?.return_1y ?? null)}`}>
          {fmtPct(f.returns?.return_1y ?? null)}
        </span>
      ),
    },
    {
      label: '3Y CAGR',
      render: (f) => (
        <span className={`tabular-nums font-medium ${returnTone(f.returns?.return_3y ?? null)}`}>
          {fmtPct(f.returns?.return_3y ?? null)}
        </span>
      ),
    },
    {
      label: '5Y CAGR',
      render: (f) => (
        <span className={`tabular-nums font-medium ${returnTone(f.returns?.return_5y ?? null)}`}>
          {fmtPct(f.returns?.return_5y ?? null)}
        </span>
      ),
    },
    {
      label: '10Y CAGR',
      render: (f) => (
        <span className={`tabular-nums font-medium ${returnTone(f.returns?.return_10y ?? null)}`}>
          {fmtPct(f.returns?.return_10y ?? null)}
        </span>
      ),
    },
    {
      label: 'SI CAGR',
      render: (f) => (
        <span className={`tabular-nums font-medium ${returnTone(f.returns?.return_si ?? null)}`}>
          {fmtPct(f.returns?.return_si ?? null)}
        </span>
      ),
    },
    {
      label: 'Beats benchmark 5Y',
      render: (f) =>
        f.returns?.beats_benchmark_5y === null || f.returns?.beats_benchmark_5y === undefined
          ? '—'
          : f.returns.beats_benchmark_5y ? <Pill ok>Pass</Pill> : <Pill ok={false}>Fail</Pill>,
    },
    {
      label: 'Beats benchmark 10Y',
      render: (f) =>
        f.returns?.beats_benchmark_10y === null || f.returns?.beats_benchmark_10y === undefined
          ? '—'
          : f.returns.beats_benchmark_10y ? <Pill ok>Pass</Pill> : <Pill ok={false}>Fail</Pill>,
    },
    {
      label: 'Category rank 3Y',
      render: (f) => f.returns?.category_rank_3y && f.returns.category_size_3y
        ? `#${f.returns.category_rank_3y} of ${f.returns.category_size_3y}`
        : '—',
    },
    { label: 'Expense ratio', render: (f) => fmtPctPlain(f.expense_ratio, 2) },
    { label: 'AUM', render: (f) => fmtCrore(f.aum_crores) },
    { label: 'Fund manager', render: (f) => f.fund_manager ?? '—' },
    { label: 'Inception', render: (f) => f.inception_date ? new Date(f.inception_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—' },
  ]

  return (
    <div className="bg-surface border border-line rounded-xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="bg-canvas/50 px-4 py-3 text-left text-[10px] uppercase tracking-wider text-fg-muted font-medium border-b border-line">
                Metric
              </th>
              {funds.map((f) => (
                <th key={f.scheme_code} className="bg-canvas/50 px-4 py-3 border-b border-line align-bottom min-w-[200px]">
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/funds/${f.scheme_code}`}
                      className="text-fg hover:text-accent text-sm font-medium leading-tight line-clamp-2"
                    >
                      {f.scheme_name}
                    </Link>
                    <Link
                      href={`/funds/compare?codes=${funds.filter((x) => x.scheme_code !== f.scheme_code).map((x) => x.scheme_code).join(',')}`}
                      className="text-[10px] text-fg-subtle hover:text-danger transition shrink-0"
                      aria-label={`Remove ${f.scheme_name}`}
                    >
                      ✕
                    </Link>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-t border-line">
                <td className="px-4 py-2.5 text-xs text-fg-muted bg-canvas/30">{row.label}</td>
                {funds.map((f) => (
                  <td key={f.scheme_code} className="px-4 py-2.5 text-fg align-top">
                    {row.render(f)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Pill({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  const cls = ok
    ? 'bg-success-soft text-success border-success/30'
    : 'bg-danger-soft text-danger border-danger/30'
  return <span className={`inline-block text-[10px] uppercase tracking-wider font-medium border rounded-full px-2 py-0.5 ${cls}`}>{children}</span>
}
