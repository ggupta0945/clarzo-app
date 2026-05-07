import type { EnrichedHolding, PortfolioSummary } from './portfolio'
import type { Allocation } from './allocation'
import type { Insight } from './insights'
import type { Goal } from './goals'
import { projectGoal } from './goal-projection'

type RiskProfile = {
  age?: string
  income?: string
  dependents?: string
  horizon?: string
  drop_reaction?: string
  existing_debt?: string
  insurance?: string
  goals?: string[]
  risk_score?: 'conservative' | 'moderate' | 'aggressive'
}

type Ctx = {
  holdings: EnrichedHolding[]
  summary: PortfolioSummary
  sectors: Allocation
  mcaps: Allocation
  insights: Insight[]
  goals: Goal[]
  riskProfile?: RiskProfile | null
}

// Builds ONLY the dynamic portfolio block — the persona is injected
// separately in the route so it can be marked as a cache breakpoint.
// Returning this as a separate string keeps the cached half byte-stable
// across users while this half varies per turn.
export function buildPortfolioBlock(ctx: Ctx): string {
  const { holdings, summary, sectors, mcaps, insights, goals, riskProfile } = ctx

  if (holdings.length === 0) {
    return `## USER CONTEXT

The user is signed in but has not uploaded a portfolio yet. Encourage them to upload one (Zerodha/Groww CSV, Excel, PDF, or screenshot) at /dashboard/upload — they can also add FDs, gold, real estate, and loans. Until then, keep answers focused on Indian equities, IPOs, ETFs, indices, and screening as per your scope.`
  }

  const goalsBlock =
    goals.length > 0
      ? goals
          .map((g) => {
            const proj = projectGoal(summary.netWorth, g.target_amount, g.target_year)
            const statusLabel =
              proj.status === 'ahead'
                ? 'on track / ahead'
                : proj.status === 'behind'
                  ? 'behind'
                  : 'on track'
            const sip =
              proj.monthlySipNeeded > 0
                ? ` · needs ~₹${fmt(proj.monthlySipNeeded)}/mo SIP to close gap`
                : ''
            return `- ${g.title}: ₹${fmt(g.target_amount)} by ${g.target_year} (${proj.yearsToGoal}y) — ${statusLabel}${sip}`
          })
          .join('\n')
      : '(none set)'

  const top = holdings
    .slice()
    .sort((a, b) => b.current_value - a.current_value)
    .slice(0, 10)

  const fdHoldings = holdings.filter((h) => h.asset_type === 'fd')
  const goldHoldings = holdings.filter((h) => h.asset_type === 'gold')
  const reHoldings = holdings.filter((h) => h.asset_type === 'real_estate')
  const debtHoldings = holdings.filter((h) => h.asset_type === 'debt')
  const totalFd = fdHoldings.reduce((s, h) => s + h.current_value, 0)
  const totalGold = goldHoldings.reduce((s, h) => s + h.current_value, 0)
  const totalRe = reHoldings.reduce((s, h) => s + h.current_value, 0)
  const totalDebt = Math.abs(debtHoldings.reduce((s, h) => s + h.current_value, 0))

  const riskBlock = riskProfile?.risk_score
    ? `### Risk profile
Stated risk appetite: ${riskProfile.risk_score} (${riskProfile.age ?? '?'} yrs, ${riskProfile.horizon ?? '?'} horizon)
Dependents: ${riskProfile.dependents ?? '?'} · Existing debt: ${riskProfile.existing_debt ?? '?'} · Insurance: ${riskProfile.insurance ?? '?'}
Primary goals: ${(riskProfile.goals ?? []).join(', ') || '(not set)'}
Tailor analysis to this risk appetite — don't push a conservative investor toward volatile instruments.`
    : ''

  const otherAssetsBlock =
    totalFd + totalGold + totalRe + totalDebt > 0
      ? `### Other assets & liabilities
${totalFd > 0 ? `- Fixed Deposits: ₹${fmt(totalFd)} across ${fdHoldings.length} FD(s)` : ''}
${totalGold > 0 ? `- Gold: ₹${fmt(totalGold)} (${goldHoldings.reduce((s, h) => s + h.units, 0).toFixed(2)}g)` : ''}
${totalRe > 0 ? `- Real Estate: ₹${fmt(totalRe)} (${reHoldings.length} propert${reHoldings.length === 1 ? 'y' : 'ies'})` : ''}
${totalDebt > 0 ? `- Outstanding Loans: ₹${fmt(totalDebt)} (reduces net worth)` : ''}`.trim()
      : ''

  return `## USER'S LIVE PORTFOLIO

This user has connected their portfolio. Use these numbers when answering — never invent figures, always cite the user's actual holdings.

### Snapshot
Net worth: ₹${fmt(summary.netWorth)}
Invested: ₹${fmt(summary.invested)}
Returns: ${signed(summary.pnlPct)}% (${signed(summary.pnl, true)})
Holdings: ${summary.count}

${otherAssetsBlock ? otherAssetsBlock + '\n\n' : ''}### Top holdings (by current value)
${top
  .map(
    (h) =>
      `- ${h.scheme_name} — ${h.units.toFixed(2)} units · ₹${fmt(h.current_value)} · ${signed(h.pnl_pct)}%${h.sector ? ` · ${h.sector}` : ''}${h.mcap_category ? ` · ${h.mcap_category}` : ''}${h.corp_group ? ` · ${h.corp_group} group` : ''}`,
  )
  .join('\n')}${holdings.length > 10 ? `\n…and ${holdings.length - 10} more.` : ''}

### Sector allocation
${sectors.slices
  .slice(0, 6)
  .map((s) => `- ${s.label}: ${s.pct.toFixed(1)}% (₹${fmt(s.value)})`)
  .join('\n')}

### Market cap mix
${mcaps.slices.map((m) => `- ${m.label}: ${m.pct.toFixed(1)}%`).join('\n')}

### Insights already detected
${insights.length > 0 ? insights.map((i) => `- [${i.severity}] ${i.title}: ${i.description}`).join('\n') : '(none)'}

### User's goals (projections assume current net worth compounds at 12%/yr untouched)
${goalsBlock}

${riskBlock ? riskBlock + '\n\n' : ''}When the user asks about their portfolio, anchor every claim in the numbers above. When they ask about a stock or sector outside their portfolio, answer in your standard analyst format.`
}

function fmt(n: number): string {
  return n.toLocaleString('en-IN', { maximumFractionDigits: 0 })
}

function signed(n: number, withRupee = false): string {
  const sign = n >= 0 ? '+' : '-'
  const abs = Math.abs(n)
  if (withRupee) return `${sign}₹${fmt(abs)}`
  return `${sign}${abs.toFixed(1)}`
}
