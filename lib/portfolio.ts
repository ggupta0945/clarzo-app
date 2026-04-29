import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

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
  sector: string | null
  mcap_category: string | null
  corp_group: string | null
}

export type PortfolioSummary = {
  netWorth: number
  invested: number
  pnl: number
  pnlPct: number
  count: number
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getUserHoldings(userId: string, client?: SupabaseClient<any, 'public', any>): Promise<EnrichedHolding[]> {
  const supabase = client ?? (await createClient())

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

  // Enrich with sector/mcap/corp_group from the companies reference table.
  // Stocks not in the seed fall through with nulls, which the dashboard
  // groups under "Unclassified".
  const allIsins = holdings.map((h) => h.isin).filter((v): v is string => Boolean(v))
  let companyMap = new Map<string, { sector: string | null; mcap_category: string | null; corp_group: string | null }>()
  if (allIsins.length > 0) {
    const { data: companies } = await supabase
      .from('companies')
      .select('isin, sector, mcap_category, corp_group')
      .in('isin', allIsins)

    companyMap = new Map(
      (companies ?? []).map((c) => [
        c.isin as string,
        {
          sector: (c.sector as string) ?? null,
          mcap_category: (c.mcap_category as string) ?? null,
          corp_group: (c.corp_group as string) ?? null,
        },
      ]),
    )
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

    const meta = h.isin ? companyMap.get(h.isin) : undefined

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
      sector: meta?.sector ?? null,
      mcap_category: meta?.mcap_category ?? null,
      corp_group: meta?.corp_group ?? null,
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
