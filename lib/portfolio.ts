import { createClient } from '@/lib/supabase/server'

export type EnrichedHolding = {
  id: string
  isin: string | null
  scheme_name: string
  units: number
  avg_cost: number | null
  current_nav: number | null
  current_value: number
  invested: number
  pnl: number
  pnl_pct: number
  asset_type: string
}

export async function getUserHoldings(userId: string): Promise<EnrichedHolding[]> {
  const supabase = await createClient()

  const { data: holdings } = await supabase
    .from('holdings')
    .select('*')
    .eq('user_id', userId)

  if (!holdings) return []

  const isins = holdings.filter((h) => h.isin).map((h) => h.isin)
  const { data: navs } = await supabase
    .from('nav_latest')
    .select('isin, nav')
    .in('isin', isins)

  const navMap = new Map((navs || []).map((n) => [n.isin, n.nav]))

  return holdings.map((h) => {
    const current_nav = h.isin ? (navMap.get(h.isin) ?? null) : null
    const current_value = current_nav
      ? h.units * current_nav
      : h.avg_cost
        ? h.units * h.avg_cost
        : 0
    const invested = h.avg_cost ? h.units * h.avg_cost : 0
    const pnl = current_value - invested
    const pnl_pct = invested > 0 ? (pnl / invested) * 100 : 0

    return {
      ...h,
      current_nav,
      current_value,
      invested,
      pnl,
      pnl_pct,
    }
  })
}

export function computePortfolioSummary(holdings: EnrichedHolding[]) {
  const netWorth = holdings.reduce((s, h) => s + h.current_value, 0)
  const invested = holdings.reduce((s, h) => s + h.invested, 0)
  const pnl = netWorth - invested
  const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0

  return { netWorth, invested, pnl, pnlPct, count: holdings.length }
}
