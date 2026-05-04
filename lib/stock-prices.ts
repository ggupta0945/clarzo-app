// Live price feed for Indian stocks via Yahoo Finance's public chart endpoint.
// Same data source yfinance wraps. No auth, but Yahoo can return 401/429 so
// every fetch has a graceful fallback (caller keeps the stored price).
//
// Caching: Next.js fetch cache with a 60s revalidate window — within a minute
// of the first dashboard hit we re-use the cached response, after that we
// refetch on the next request.

const YF_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart'
const REVALIDATE_SECONDS = 60

type YahooChartResponse = {
  chart?: {
    result?: Array<{
      meta?: {
        regularMarketPrice?: number
        symbol?: string
      }
    }>
    error?: { code?: string; description?: string } | null
  }
}

// Indian tickers list on both NSE (.NS) and BSE (.BO). NSE first; if Yahoo
// returns nothing (de-listed, illiquid, only on BSE), fall back to .BO.
const SUFFIXES = ['.NS', '.BO'] as const

async function fetchYahoo(symbol: string): Promise<number | null> {
  for (const suffix of SUFFIXES) {
    const url = `${YF_BASE}/${encodeURIComponent(symbol)}${suffix}?interval=1d&range=1d`
    try {
      const res = await fetch(url, {
        headers: {
          // Yahoo blocks blank User-Agents.
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          Accept: 'application/json',
        },
        next: { revalidate: REVALIDATE_SECONDS },
      })

      if (!res.ok) continue

      const json = (await res.json()) as YahooChartResponse
      const price = json.chart?.result?.[0]?.meta?.regularMarketPrice
      if (typeof price === 'number' && Number.isFinite(price) && price > 0) {
        return price
      }
    } catch {
      // network / parse — try next suffix
    }
  }
  return null
}

/**
 * Fetches live prices for a list of NSE/BSE ticker symbols. Returns a Map
 * keyed by the input symbol (uppercase). Symbols that can't be resolved are
 * absent from the map — callers should fall back to their stored price.
 *
 * Symbols are fetched in parallel; the slowest one bounds the overall latency.
 */
export async function fetchLiveStockPrices(
  symbols: string[],
): Promise<Map<string, number>> {
  const unique = Array.from(
    new Set(
      symbols
        .map((s) => s?.trim().toUpperCase())
        .filter((s): s is string => Boolean(s)),
    ),
  )
  if (unique.length === 0) return new Map()

  const results = await Promise.all(
    unique.map(async (sym) => [sym, await fetchYahoo(sym)] as const),
  )

  const map = new Map<string, number>()
  for (const [sym, price] of results) {
    if (price != null) map.set(sym, price)
  }
  return map
}
