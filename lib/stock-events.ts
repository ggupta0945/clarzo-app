// Recent corporate actions (dividends, splits) for a list of stock symbols,
// sourced from Yahoo Finance's chart endpoint with `events=div,split`. This
// is the same data source yfinance wraps. Auth-free, but Yahoo can throttle —
// callers should treat empty results as a transient failure, not "no events".
//
// Note: Yahoo's "upcoming" event endpoints (quoteSummary, options) require a
// crumb cookie and are increasingly locked down. Here we return only past
// events; framing in the UI should match.

const YF_CHART = 'https://query1.finance.yahoo.com/v8/finance/chart'
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
const REVALIDATE_SECONDS = 60 * 60 * 6 // 6h — corporate actions don't change often

export type CorpAction = {
  symbol: string
  type: 'dividend' | 'split'
  date: number // unix seconds
  amount?: number // per-share for dividends
  ratio?: { numerator: number; denominator: number } // for splits
}

type ChartResponse = {
  chart?: {
    result?: Array<{
      meta?: { symbol?: string }
      events?: {
        dividends?: Record<string, { amount?: number; date: number }>
        splits?: Record<
          string,
          { date: number; numerator?: number; denominator?: number; splitRatio?: string }
        >
      }
    }>
  }
}

const SUFFIXES = ['.NS', '.BO'] as const

async function fetchOne(symbol: string, range = '2y'): Promise<CorpAction[]> {
  for (const suffix of SUFFIXES) {
    const url = `${YF_CHART}/${encodeURIComponent(symbol)}${suffix}?range=${range}&interval=1d&events=div%2Csplit`
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': UA, Accept: 'application/json' },
        next: { revalidate: REVALIDATE_SECONDS },
      })
      if (!res.ok) continue
      const json = (await res.json()) as ChartResponse
      const result = json.chart?.result?.[0]
      if (!result) continue

      const events = result.events ?? {}
      const out: CorpAction[] = []

      for (const [, d] of Object.entries(events.dividends ?? {})) {
        if (typeof d.date !== 'number') continue
        out.push({
          symbol,
          type: 'dividend',
          date: d.date,
          amount: typeof d.amount === 'number' ? d.amount : undefined,
        })
      }
      for (const [, s] of Object.entries(events.splits ?? {})) {
        if (typeof s.date !== 'number') continue
        out.push({
          symbol,
          type: 'split',
          date: s.date,
          ratio:
            typeof s.numerator === 'number' && typeof s.denominator === 'number'
              ? { numerator: s.numerator, denominator: s.denominator }
              : undefined,
        })
      }

      // Found at least one event on this exchange — don't try the other.
      if (out.length > 0) return out
      // No events here, try the other exchange suffix.
    } catch {
      // try next suffix
    }
  }
  return []
}

/**
 * Fetches recent corporate actions across the given symbols, returning a flat
 * list sorted by date descending (most recent first).
 */
export async function fetchRecentCorpActions(
  symbols: string[],
  options: { range?: string; limit?: number } = {},
): Promise<CorpAction[]> {
  const { range = '2y', limit = 20 } = options
  const unique = Array.from(
    new Set(
      symbols
        .map((s) => s?.trim().toUpperCase())
        .filter((s): s is string => Boolean(s)),
    ),
  )
  if (unique.length === 0) return []

  const results = await Promise.all(unique.map((sym) => fetchOne(sym, range)))
  const flat = results.flat()
  flat.sort((a, b) => b.date - a.date)
  return flat.slice(0, limit)
}
