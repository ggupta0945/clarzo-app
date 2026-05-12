import type { SupabaseClient } from '@supabase/supabase-js'
import { getUniverse, type UniverseRow } from '../universe'

const YF_CHART = 'https://query1.finance.yahoo.com/v8/finance/chart'
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'
const SUFFIXES = ['.NS', '.BO'] as const
const BATCH_SIZE = 10 // concurrent Yahoo requests per batch

type YahooChartResponse = {
  chart?: {
    result?: Array<{
      meta?: { chartPreviousClose?: number; regularMarketPrice?: number }
      timestamp?: number[]
      indicators?: {
        quote?: Array<{
          open?: Array<number | null>
          high?: Array<number | null>
          low?: Array<number | null>
          close?: Array<number | null>
          volume?: Array<number | null>
        }>
      }
    }>
  }
}

type OHLCV = {
  date: string // YYYY-MM-DD
  open: number | null
  high: number | null
  low: number | null
  close: number | null
  volume: number | null
  prevClose: number | null
}

async function fetchYahooDailyBars(symbol: string, range = '5d'): Promise<OHLCV[]> {
  for (const suffix of SUFFIXES) {
    const url = `${YF_CHART}/${encodeURIComponent(symbol)}${suffix}?range=${range}&interval=1d`
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': UA, Accept: 'application/json' },
        cache: 'no-store',
      })
      if (!res.ok) continue
      const json = (await res.json()) as YahooChartResponse
      const result = json.chart?.result?.[0]
      const ts = result?.timestamp ?? []
      const q = result?.indicators?.quote?.[0]
      if (!q || ts.length === 0) continue
      const prevClose = result?.meta?.chartPreviousClose ?? null

      const rows: OHLCV[] = ts.map((unix, i) => ({
        date: new Date(unix * 1000).toISOString().slice(0, 10),
        open: q.open?.[i] ?? null,
        high: q.high?.[i] ?? null,
        low: q.low?.[i] ?? null,
        close: q.close?.[i] ?? null,
        volume: q.volume?.[i] ?? null,
        prevClose,
      }))
      // Yahoo sometimes returns a "today" row with all-null fields when the
      // market hasn't closed yet — drop those.
      const filtered = rows.filter((r) => r.close != null && r.close > 0)
      if (filtered.length > 0) return filtered
    } catch {
      // try next suffix
    }
  }
  return []
}

export type RefreshPricesResult = {
  job: 'prices'
  universeCount: number
  fetchedCount: number
  upsertedRows: number
  failedSymbols: string[]
  durationMs: number
}

// Refreshes daily OHLCV for the entire universe. Range=5d catches weekends
// + holidays in one pass — upsert handles overlap with existing rows.
export async function refreshPrices(
  supabase: SupabaseClient,
  opts: { range?: string; universe?: UniverseRow[] } = {},
): Promise<RefreshPricesResult> {
  const t0 = Date.now()
  const universe = opts.universe ?? (await getUniverse(supabase))
  const range = opts.range ?? '5d'

  let upsertedRows = 0
  let fetchedCount = 0
  const failedSymbols: string[] = []

  for (let i = 0; i < universe.length; i += BATCH_SIZE) {
    const batch = universe.slice(i, i + BATCH_SIZE)
    const results = await Promise.all(
      batch.map(async (row) => {
        if (!row.symbol) return { isin: row.isin, symbol: '(none)', bars: [] as OHLCV[] }
        const bars = await fetchYahooDailyBars(row.symbol, range)
        return { isin: row.isin, symbol: row.symbol, bars }
      }),
    )

    const flatRows: Array<{
      isin: string
      date: string
      open: number | null
      high: number | null
      low: number | null
      close: number | null
      prev_close: number | null
      volume: number | null
      source: string
    }> = []
    for (const { isin, symbol, bars } of results) {
      if (bars.length === 0) {
        failedSymbols.push(symbol)
        continue
      }
      fetchedCount += 1
      for (const b of bars) {
        flatRows.push({
          isin,
          date: b.date,
          open: b.open,
          high: b.high,
          low: b.low,
          close: b.close,
          prev_close: b.prevClose,
          volume: b.volume,
          source: 'yahoo',
        })
      }
    }

    if (flatRows.length > 0) {
      const { error } = await supabase
        .from('prices')
        .upsert(flatRows, { onConflict: 'isin,date' })
      if (error) {
        console.error('[refresh-prices] upsert failed:', error.message)
      } else {
        upsertedRows += flatRows.length
      }
    }
  }

  return {
    job: 'prices',
    universeCount: universe.length,
    fetchedCount,
    upsertedRows,
    failedSymbols,
    durationMs: Date.now() - t0,
  }
}
