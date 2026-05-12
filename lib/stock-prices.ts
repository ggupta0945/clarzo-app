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

type YahooMetaExtended = {
  regularMarketPrice?: number
  previousClose?: number
  regularMarketChangePercent?: number
  regularMarketDayHigh?: number
  regularMarketDayLow?: number
  fiftyTwoWeekHigh?: number
  fiftyTwoWeekLow?: number
  symbol?: string
}

type YahooChartResponseExtended = {
  chart?: {
    result?: Array<{ meta?: YahooMetaExtended }>
    error?: { code?: string; description?: string } | null
  }
}

async function fetchYahooRaw(ticker: string): Promise<YahooMetaExtended | null> {
  const url = `${YF_BASE}/${encodeURIComponent(ticker)}?interval=1d&range=1d`
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        Accept: 'application/json',
      },
      next: { revalidate: REVALIDATE_SECONDS },
    })
    if (!res.ok) return null
    const json = (await res.json()) as YahooChartResponseExtended
    const meta = json.chart?.result?.[0]?.meta
    if (!meta?.regularMarketPrice) return null
    return meta
  } catch {
    return null
  }
}

export type IndexSnapshot = {
  name: string
  price: number
  changePct: number
  dayHigh: number
  dayLow: number
  week52High: number
  week52Low: number
}

const INDICES: Array<{ ticker: string; name: string }> = [
  { ticker: '^NSEI',    name: 'Nifty 50' },
  { ticker: '^BSESN',   name: 'BSE Sensex' },
  { ticker: '^NSEBANK', name: 'Nifty Bank' },
  { ticker: 'NIFTYIT.NS', name: 'Nifty IT' },
  { ticker: '^CNXAUTO', name: 'Nifty Auto' },
  { ticker: '^CNXPHARMA', name: 'Nifty Pharma' },
]

/**
 * Fetches live levels for key Indian indices (Nifty 50, Sensex, Bank Nifty,
 * Nifty IT, Auto, Pharma) including % change from previous close.
 */
export async function fetchIndices(): Promise<IndexSnapshot[]> {
  const results = await Promise.all(
    INDICES.map(async ({ ticker, name }) => {
      const meta = await fetchYahooRaw(ticker)
      if (!meta?.regularMarketPrice) return null
      return {
        name,
        price: meta.regularMarketPrice,
        changePct: meta.regularMarketChangePercent ?? 0,
        dayHigh: meta.regularMarketDayHigh ?? meta.regularMarketPrice,
        dayLow: meta.regularMarketDayLow ?? meta.regularMarketPrice,
        week52High: meta.fiftyTwoWeekHigh ?? meta.regularMarketPrice,
        week52Low: meta.fiftyTwoWeekLow ?? meta.regularMarketPrice,
      } satisfies IndexSnapshot
    }),
  )
  return results.filter((r): r is IndexSnapshot => r !== null)
}

export type StockSnapshot = {
  price: number
  changePct: number
  changeAbs: number
  previousClose: number
  dayHigh: number
  dayLow: number
  week52High: number
  week52Low: number
}

/**
 * Fetches a rich snapshot for a single NSE/BSE stock symbol.
 * Returns null if the symbol can't be resolved.
 */
async function fetchStockSnapshotSingle(symbol: string): Promise<StockSnapshot | null> {
  for (const suffix of SUFFIXES) {
    const meta = await fetchYahooRaw(`${symbol}${suffix}`)
    if (!meta?.regularMarketPrice) continue
    const price = meta.regularMarketPrice
    const prev = meta.previousClose ?? price
    // Prefer the API's reported changePct; compute from prices as fallback
    const changePct = meta.regularMarketChangePercent != null
      ? meta.regularMarketChangePercent
      : prev > 0 ? ((price - prev) / prev) * 100 : 0
    return {
      price,
      changePct: parseFloat(changePct.toFixed(2)),
      changeAbs: parseFloat((price - prev).toFixed(2)),
      previousClose: prev,
      dayHigh: meta.regularMarketDayHigh ?? price,
      dayLow: meta.regularMarketDayLow ?? price,
      week52High: meta.fiftyTwoWeekHigh ?? price,
      week52Low: meta.fiftyTwoWeekLow ?? price,
    }
  }
  return null
}

/**
 * Fetches rich snapshots (price, % change, 52W range, etc.) for multiple symbols.
 * Symbols that can't be resolved are absent from the returned map.
 */
export async function fetchStockSnapshots(
  symbols: string[],
): Promise<Map<string, StockSnapshot>> {
  const unique = Array.from(
    new Set(symbols.map((s) => s?.trim().toUpperCase()).filter((s): s is string => Boolean(s))),
  )
  if (unique.length === 0) return new Map()

  const results = await Promise.all(
    unique.map(async (sym) => [sym, await fetchStockSnapshotSingle(sym)] as const),
  )

  const map = new Map<string, StockSnapshot>()
  for (const [sym, snap] of results) {
    if (snap != null) map.set(sym, snap)
  }
  return map
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
