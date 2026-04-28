import { createClient } from '@/lib/supabase/server'

export type EnrichedHolding = {
  id: string
  isin: string | null
  scheme_name: string
  units: number
  avg_cost: number | null
  asset_type: string
  current_nav: number | null
  current_value: number
  invested: number
  pnl: number
  pnl_pct: number
}

export type PortfolioSummary = {
  netWorth: number
  invested: number
  pnl: number
  pnlPct: number
  count: number
}

export async function getUserHoldings(userId: string): Promise<EnrichedHolding[]> {
  const supabase = await createClient()

  const { data: holdings } = await supabase
    .from('holdings')
    .select('id, isin, scheme_name, units, avg_cost, asset_type, current_price')
    .eq('user_id', userId)

  if (!holdings || holdings.length === 0) return []

  // Mutual funds resolve current price via nav_latest. Stocks carry their
  // last-known price on the holding itself (set at upload time from the
  // broker CSV) until a dedicated stock-price feed exists.
  const mfIsins = holdings
    .filter((h) => h.asset_type === 'mutual_fund' && h.isin)
    .map((h) => h.isin as string)

  let navMap = new Map<string, number>()
  if (mfIsins.length > 0) {
    const { data: navs } = await supabase
      .from('nav_latest')
      .select('isin, nav')
      .in('isin', mfIsins)

    navMap = new Map((navs ?? []).map((n) => [n.isin as string, Number(n.nav)]))
  }

  return holdings.map((h) => {
    const units = Number(h.units)
    const avg_cost = h.avg_cost != null ? Number(h.avg_cost) : null
    const asset_type = (h.asset_type as string) ?? 'mutual_fund'

    const current_nav =
      asset_type === 'stock'
        ? h.current_price != null
          ? Number(h.current_price)
          : null
        : h.isin
          ? navMap.get(h.isin) ?? null
          : null

    const invested = avg_cost != null ? units * avg_cost : 0
    const current_value = current_nav != null ? units * current_nav : invested
    const pnl = current_value - invested
    const pnl_pct = invested > 0 ? (pnl / invested) * 100 : 0

    return {
      id: h.id as string,
      isin: h.isin,
      scheme_name: h.scheme_name as string,
      units,
      avg_cost,
      asset_type,
      current_nav,
      current_value,
      invested,
      pnl,
      pnl_pct,
    }
  })
}

export function computePortfolioSummary(holdings: EnrichedHolding[]): PortfolioSummary {
  const netWorth = holdings.reduce((s, h) => s + h.current_value, 0)
  const invested = holdings.reduce((s, h) => s + h.invested, 0)
  const pnl = netWorth - invested
  const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0

  return { netWorth, invested, pnl, pnlPct, count: holdings.length }
}
