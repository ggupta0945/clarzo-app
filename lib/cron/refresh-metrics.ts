import type { SupabaseClient } from '@supabase/supabase-js'
import { getUniverse, type UniverseRow } from '../universe'
import { fetchCompanyProfile } from '../finnhub'

const YF_QUOTE = 'https://query1.finance.yahoo.com/v8/finance/chart'
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
const SUFFIXES = ['.NS', '.BO'] as const
const BATCH_SIZE = 10

// Pulled from Yahoo chart-meta — cheap and rate-limit-friendly. The
// quoteSummary endpoint has richer fundamentals but requires a crumb
// cookie (see lib/stock-events.ts comment).
type YahooMeta = {
  regularMarketPrice?: number
  fiftyTwoWeekHigh?: number
  fiftyTwoWeekLow?: number
  regularMarketDayHigh?: number
  regularMarketDayLow?: number
  regularMarketVolume?: number
  averageVolume?: number
  marketCap?: number
  trailingPE?: number
  sharesOutstanding?: number
}

type YahooMetaResp = {
  chart?: {
    result?: Array<{ meta?: YahooMeta & Record<string, unknown> }>
  }
}

async function fetchYahooMeta(symbol: string): Promise<YahooMeta | null> {
  for (const suffix of SUFFIXES) {
    const url = `${YF_QUOTE}/${encodeURIComponent(symbol)}${suffix}?range=1d&interval=1d`
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': UA, Accept: 'application/json' },
        cache: 'no-store',
      })
      if (!res.ok) continue
      const json = (await res.json()) as YahooMetaResp
      const meta = json.chart?.result?.[0]?.meta
      if (meta) return meta as YahooMeta
    } catch {
      // try next
    }
  }
  return null
}

export type RefreshMetricsResult = {
  job: 'metrics'
  universeCount: number
  updatedCount: number
  failedSymbols: string[]
  durationMs: number
}

// Overwrites companies.fundamentals + .profile with the latest snapshot.
// Yahoo chart-meta covers 52w range, P/E, market cap, shares outstanding.
// Finnhub company profile fills in description + website + industry +
// market cap (in USD, kept separately as a sanity check vs Yahoo's INR cap).
//
// We do NOT write to fundamentals_history here — that's a quarterly job
// that runs when new results are announced. This job is daily-stale-OK.
export async function refreshMetrics(
  supabase: SupabaseClient,
  opts: { universe?: UniverseRow[] } = {},
): Promise<RefreshMetricsResult> {
  const t0 = Date.now()
  const universe = opts.universe ?? (await getUniverse(supabase))

  let updatedCount = 0
  const failedSymbols: string[] = []

  for (let i = 0; i < universe.length; i += BATCH_SIZE) {
    const batch = universe.slice(i, i + BATCH_SIZE)
    const updates = await Promise.all(
      batch.map(async (row) => {
        if (!row.symbol) return null
        const [meta, profile] = await Promise.all([
          fetchYahooMeta(row.symbol),
          fetchCompanyProfile(row.symbol).catch(() => null),
        ])
        if (!meta && !profile) {
          failedSymbols.push(row.symbol)
          return null
        }
        // Compose JSONB payloads. Keep keys snake_case for consistency
        // with everything else in the DB.
        const fundamentals: Record<string, unknown> = {}
        if (meta?.regularMarketPrice != null) fundamentals.current_price = meta.regularMarketPrice
        if (meta?.fiftyTwoWeekHigh != null) fundamentals['52w_high'] = meta.fiftyTwoWeekHigh
        if (meta?.fiftyTwoWeekLow != null) fundamentals['52w_low'] = meta.fiftyTwoWeekLow
        if (meta?.regularMarketVolume != null) fundamentals.volume = meta.regularMarketVolume
        if (meta?.averageVolume != null) fundamentals.avg_volume = meta.averageVolume
        if (meta?.marketCap != null) fundamentals.market_cap = meta.marketCap
        if (meta?.trailingPE != null) fundamentals.pe = meta.trailingPE
        if (meta?.sharesOutstanding != null) fundamentals.shares_outstanding = meta.sharesOutstanding
        fundamentals.source = 'yahoo'

        const profileBlock: Record<string, unknown> = {}
        if (profile) {
          if (profile.name) profileBlock.name = profile.name
          if (profile.finnhubIndustry) profileBlock.industry_finnhub = profile.finnhubIndustry
          if (profile.exchange) profileBlock.exchange = profile.exchange
          if (profile.marketCapitalization) profileBlock.market_cap_usd_m = profile.marketCapitalization
          if (profile.weburl) profileBlock.website = profile.weburl
          if (profile.ipo) profileBlock.ipo = profile.ipo
          if (profile.country) profileBlock.country = profile.country
          if (profile.currency) profileBlock.currency = profile.currency
        }

        return {
          isin: row.isin,
          fundamentals: Object.keys(fundamentals).length > 0 ? fundamentals : null,
          profile: Object.keys(profileBlock).length > 0 ? profileBlock : null,
          last_refreshed_at: new Date().toISOString(),
        }
      }),
    )

    const validUpdates = updates.filter((u): u is NonNullable<typeof u> => u !== null)
    if (validUpdates.length === 0) continue

    // upsert can't partial-update only specific columns easily — issue
    // one update per row instead. They run in parallel so it's still fast.
    const upsertResults = await Promise.all(
      validUpdates.map((u) =>
        supabase
          .from('companies')
          .update({
            fundamentals: u.fundamentals,
            profile: u.profile,
            last_refreshed_at: u.last_refreshed_at,
          })
          .eq('isin', u.isin),
      ),
    )
    for (const r of upsertResults) {
      if (!r.error) updatedCount += 1
      else console.error('[refresh-metrics] update failed:', r.error.message)
    }
  }

  return {
    job: 'metrics',
    universeCount: universe.length,
    updatedCount,
    failedSymbols,
    durationMs: Date.now() - t0,
  }
}
