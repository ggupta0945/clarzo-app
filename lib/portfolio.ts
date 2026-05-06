import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchLiveStockPrices } from '@/lib/stock-prices'
import { fetchSectorsForNames } from '@/lib/sector-lookup'

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

  const { data: holdings, error: holdingsErr } = await supabase
    .from('holdings')
    .select('id, isin, scheme_name, units, avg_cost, asset_type, current_price')
    .eq('user_id', userId)

  if (holdingsErr) {
    console.error('getUserHoldings error:', holdingsErr.message)
    return []
  }

  if (!holdings || holdings.length === 0) return []

  // Non-market asset types (FD, gold, real_estate, debt) carry their value
  // directly in current_price / avg_cost and don't need external price feeds.
  const manualTypes = new Set(['fd', 'gold', 'real_estate', 'debt'])

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

  // Enrich with sector/mcap/corp_group/symbol from the companies reference
  // table. Stocks not in the seed fall through with nulls, which the
  // dashboard groups under "Unclassified".
  const allIsins = holdings.map((h) => h.isin).filter((v): v is string => Boolean(v))
  let companyMap = new Map<
    string,
    { sector: string | null; mcap_category: string | null; corp_group: string | null; symbol: string | null }
  >()
  if (allIsins.length > 0) {
    const { data: companies } = await supabase
      .from('companies')
      .select('isin, symbol, sector, mcap_category, corp_group')
      .in('isin', allIsins)

    companyMap = new Map(
      (companies ?? []).map((c) => [
        c.isin as string,
        {
          symbol: (c.symbol as string) ?? null,
          sector: (c.sector as string) ?? null,
          mcap_category: (c.mcap_category as string) ?? null,
          corp_group: (c.corp_group as string) ?? null,
        },
      ]),
    )
  }

  // Live prices for stocks. Pull tickers via the companies map; gracefully
  // degrade to the stored current_price when Yahoo is rate-limited or the
  // symbol isn't in our reference table.
  const stockSymbols: string[] = []
  for (const h of holdings) {
    if (h.asset_type !== 'stock' || !h.isin || manualTypes.has(h.asset_type as string)) continue
    const sym = companyMap.get(h.isin)?.symbol
    if (sym) stockSymbols.push(sym)
  }
  const livePriceMap =
    stockSymbols.length > 0 ? await fetchLiveStockPrices(stockSymbols) : new Map<string, number>()

  // Fallback sector enrichment for stocks the seed doesn't classify. Yahoo's
  // search endpoint returns `sectorDisp` per quote, so we hit it for any
  // stock whose companies row is missing or has no sector. Cached for 24h.
  const stocksMissingSector = holdings
    .filter(
      (h) =>
        h.asset_type === 'stock' &&
        !(h.isin && companyMap.get(h.isin)?.sector),
    )
    .map((h) => h.scheme_name as string)
  const lookedUpSectors =
    stocksMissingSector.length > 0
      ? await fetchSectorsForNames(stocksMissingSector)
      : new Map<string, string>()

  return holdings.map((h) => {
    const units = Number(h.units)
    const avg_cost = h.avg_cost != null ? Number(h.avg_cost) : null
    const asset_type = (h.asset_type as string) ?? 'mutual_fund'
    const isManual = manualTypes.has(asset_type)

    const meta = h.isin ? companyMap.get(h.isin) : undefined
    const live_stock_price =
      asset_type === 'stock' && meta?.symbol
        ? livePriceMap.get(meta.symbol.toUpperCase()) ?? null
        : null

    let current_nav: number | null = null
    if (isManual) {
      // FD, gold, real_estate, debt: current_price holds the per-unit value
      current_nav = h.current_price != null ? Number(h.current_price) : avg_cost
    } else if (asset_type === 'stock') {
      current_nav = live_stock_price ?? (h.current_price != null ? Number(h.current_price) : null)
    } else {
      current_nav = h.isin ? navMap.get(h.isin) ?? null : null
    }

    const invested = avg_cost != null ? units * avg_cost : 0
    let current_value = current_nav != null ? units * current_nav : invested

    // Debt is a liability — it reduces net worth
    if (asset_type === 'debt') current_value = -Math.abs(current_value)

    const pnl = current_value - (asset_type === 'debt' ? -Math.abs(invested) : invested)
    const pnl_pct = invested > 0 ? (pnl / invested) * 100 : 0

    const sector =
      meta?.sector ??
      (asset_type === 'stock'
        ? lookedUpSectors.get((h.scheme_name as string).toUpperCase()) ?? null
        : null)

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
      sector,
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
