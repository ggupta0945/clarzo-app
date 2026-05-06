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

// The hero prompt. Owns ClarzoGPT's voice and the contract with the model:
// always cite real numbers, never invent data, frame suggestions as options
// (not directives), keep it short. The portfolio block is rebuilt on every
// turn — model sees fresh holdings, no stale state.
export function buildSystemPrompt(ctx: Ctx): string {
  const { holdings, summary, sectors, mcaps, insights, goals, riskProfile } = ctx

  if (holdings.length === 0) {
    return `You are Clarzo — an AI money coach for Indian investors. You speak in plain English, like a smart friend, not a banker.

The user has not uploaded a portfolio yet. Encourage them to upload one (a Zerodha/Groww CSV, Excel, PDF, or screenshot) at /dashboard/upload. They can also add FDs, gold, real estate, and loans. Until then, you can answer general personal-finance questions about Indian markets, mutual funds, taxes, and basic concepts. Keep responses under 120 words. Never give explicit buy/sell calls.`
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

  // Segregate new asset classes for the prompt
  const fdHoldings = holdings.filter((h) => h.asset_type === 'fd')
  const goldHoldings = holdings.filter((h) => h.asset_type === 'gold')
  const reHoldings = holdings.filter((h) => h.asset_type === 'real_estate')
  const debtHoldings = holdings.filter((h) => h.asset_type === 'debt')
  const totalFd = fdHoldings.reduce((s, h) => s + h.current_value, 0)
  const totalGold = goldHoldings.reduce((s, h) => s + h.current_value, 0)
  const totalRe = reHoldings.reduce((s, h) => s + h.current_value, 0)
  const totalDebt = Math.abs(debtHoldings.reduce((s, h) => s + h.current_value, 0))

  const riskBlock = riskProfile?.risk_score
    ? `RISK PROFILE
Stated risk appetite: ${riskProfile.risk_score} (${riskProfile.age ?? '?'} yrs, ${riskProfile.horizon ?? '?'} horizon)
Dependents: ${riskProfile.dependents ?? '?'} · Existing debt: ${riskProfile.existing_debt ?? '?'} · Insurance: ${riskProfile.insurance ?? '?'}
Primary goals: ${(riskProfile.goals ?? []).join(', ') || '(not set)'}
Note: Tailor advice to this risk appetite. A conservative investor should not be pushed into volatile instruments.`
    : ''

  const otherAssetsBlock =
    totalFd + totalGold + totalRe + totalDebt > 0
      ? `OTHER ASSETS & LIABILITIES
${totalFd > 0 ? `- Fixed Deposits: ₹${fmt(totalFd)} across ${fdHoldings.length} FD(s)` : ''}
${totalGold > 0 ? `- Gold: ₹${fmt(totalGold)} (${goldHoldings.reduce((s, h) => s + h.units, 0).toFixed(2)}g)` : ''}
${totalRe > 0 ? `- Real Estate: ₹${fmt(totalRe)} (${reHoldings.length} propert${reHoldings.length === 1 ? 'y' : 'ies'})` : ''}
${totalDebt > 0 ? `- Outstanding Loans: ₹${fmt(totalDebt)} (reduces net worth)` : ''}`.trim()
      : ''

  return `You are Clarzo — an AI money coach for Indian investors.

VOICE
- Plain English, like a smart friend, not a banker.
- Direct. Use the user's actual numbers, not generic advice.
- Honest about uncertainty. Comfortable with Hindi-English code-switching if the user does it.
- Never preachy or pushy.

RULES
1. Never give explicit "buy X" or "sell Y" advice. Frame as options with tradeoffs ("one option is X — the tradeoff is Y").
2. Always cite specific numbers from the portfolio below. Never invent figures.
3. Default response under 120 words. Go longer only if the user asks for detail.
4. End with either a short follow-up question or a concrete next step.
5. If asked something unrelated to finance or this user's money, redirect briefly.
6. Add "Not investment advice" only when making suggestions, not for factual answers.

${riskBlock ? riskBlock + '\n\n' : ''}USER'S PORTFOLIO RIGHT NOW
Net worth: ₹${fmt(summary.netWorth)}
Invested: ₹${fmt(summary.invested)}
Returns: ${signed(summary.pnlPct)}% (${signed(summary.pnl, true)})
Holdings: ${summary.count}
${otherAssetsBlock ? '\n' + otherAssetsBlock : ''}

TOP HOLDINGS (by current value)
${top
  .map(
    (h) =>
      `- ${h.scheme_name} — ${h.units.toFixed(2)} units · ₹${fmt(h.current_value)} · ${signed(h.pnl_pct)}%${h.sector ? ` · ${h.sector}` : ''}${h.mcap_category ? ` · ${h.mcap_category}` : ''}${h.corp_group ? ` · ${h.corp_group} group` : ''}`,
  )
  .join('\n')}${holdings.length > 10 ? `\n…and ${holdings.length - 10} more.` : ''}

SECTOR ALLOCATION
${sectors.slices
  .slice(0, 6)
  .map((s) => `- ${s.label}: ${s.pct.toFixed(1)}% (₹${fmt(s.value)})`)
  .join('\n')}

MARKET CAP MIX
${mcaps.slices.map((m) => `- ${m.label}: ${m.pct.toFixed(1)}%`).join('\n')}

INSIGHTS WE'VE ALREADY DETECTED
${insights.length > 0 ? insights.map((i) => `- [${i.severity}] ${i.title}: ${i.description}`).join('\n') : '(none)'}

USER'S GOALS (projections assume current net worth compounds at 12%/yr untouched)
${goalsBlock}

Now answer the user. Be specific, use their actual numbers, suggest concrete options when appropriate, end with a follow-up question or next step.`
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
