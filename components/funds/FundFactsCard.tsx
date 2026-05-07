// Right-rail metadata strip on the fund detail page: AMC, category, plan,
// inception, expense ratio, AUM, riskometer, exit load, fund manager.

import type { MfScheme } from '@/lib/mutual-funds/types'
import { fmtCrore, fmtPctPlain, fmtRupee } from '@/lib/mutual-funds/format'

type Props = {
  scheme: MfScheme
}

export function FundFactsCard({ scheme }: Props) {
  const rows: Array<[string, string]> = [
    ['AMC', scheme.amc_full_name ?? scheme.amc ?? '—'],
    ['Category', scheme.category ?? '—'],
    ['Sub-category', scheme.sub_category ?? '—'],
    ['Plan / Option', `${scheme.plan_type ?? '—'} · ${scheme.option_type ?? '—'}`],
    ['Benchmark', scheme.benchmark ?? '—'],
    ['Riskometer', scheme.riskometer ?? '—'],
    ['Inception', scheme.inception_date ? new Date(scheme.inception_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'],
    ['Expense ratio', fmtPctPlain(scheme.expense_ratio, 2)],
    ['AUM', fmtCrore(scheme.aum_crores)],
    ['Min lumpsum', scheme.min_investment ? fmtRupee(scheme.min_investment) : '—'],
    ['Min SIP', scheme.min_sip ? fmtRupee(scheme.min_sip) : '—'],
    ['Exit load', scheme.exit_load ?? '—'],
    ['Fund manager', scheme.fund_manager ?? '—'],
    ['ISIN', scheme.isin_growth ?? '—'],
    ['AMFI code', scheme.scheme_code],
  ]

  return (
    <div className="bg-surface border border-line rounded-xl shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-line">
        <h3 className="text-sm font-semibold text-fg">Fund facts</h3>
      </div>
      <div className="divide-y divide-[var(--line)]">
        {rows.map(([k, v]) => (
          <div key={k} className="grid grid-cols-[40%_60%] gap-3 px-4 py-2 text-xs">
            <span className="text-fg-muted">{k}</span>
            <span className="text-fg text-right break-words">{v}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
