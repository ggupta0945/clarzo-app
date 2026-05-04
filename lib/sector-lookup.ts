// Resolve sectors for stock names that aren't in our `companies` seed table.
// Uses Yahoo Finance's search endpoint, which returns `sectorDisp` per quote
// — same category data Moneycontrol shows but accessible without scraping.
//
// Typical use: enrich `getUserHoldings` for stocks where the companies table
// has no row (or no sector). Cached aggressively via Next's fetch cache (24h)
// because sector classifications rarely change.

const YF_SEARCH = 'https://query1.finance.yahoo.com/v1/finance/search'
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
const REVALIDATE_SECONDS = 60 * 60 * 24

type SearchResponse = {
  quotes?: Array<{
    symbol?: string
    exchange?: string
    quoteType?: string
    sectorDisp?: string
    sector?: string
  }>
}

async function fetchOne(name: string): Promise<string | null> {
  const url = `${YF_SEARCH}?q=${encodeURIComponent(name)}&quotesCount=6&newsCount=0`
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      next: { revalidate: REVALIDATE_SECONDS },
    })
    if (!res.ok) return null
    const json = (await res.json()) as SearchResponse
    const quotes = json.quotes ?? []

    // Prefer NSE → BSE → first equity match. Yahoo typically attaches
    // sectorDisp on equity results; ETFs/funds usually don't have it.
    const candidates = [
      ...quotes.filter((q) => q.exchange === 'NSI' && q.quoteType === 'EQUITY'),
      ...quotes.filter((q) => q.exchange === 'BSE' && q.quoteType === 'EQUITY'),
      ...quotes.filter((q) => q.quoteType === 'EQUITY'),
    ]
    for (const c of candidates) {
      const s = c.sectorDisp ?? c.sector
      if (s && s.trim()) return s.trim()
    }
    return null
  } catch {
    return null
  }
}

/**
 * Looks up sectors for a batch of stock names in parallel. Returns a Map keyed
 * by the input name (uppercase). Names that can't be resolved are absent.
 */
export async function fetchSectorsForNames(
  names: string[],
): Promise<Map<string, string>> {
  const unique = Array.from(
    new Set(
      names
        .map((s) => s?.trim())
        .filter((s): s is string => Boolean(s)),
    ),
  )
  if (unique.length === 0) return new Map()

  const results = await Promise.all(
    unique.map(async (name) => [name, await fetchOne(name)] as const),
  )

  const map = new Map<string, string>()
  for (const [name, sector] of results) {
    if (sector) map.set(name.toUpperCase(), sector)
  }
  return map
}
