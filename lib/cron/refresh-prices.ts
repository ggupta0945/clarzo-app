import type { SupabaseClient } from '@supabase/supabase-js'
import { getUniverse, type UniverseRow } from '../universe'

// NSE equity bhavcopy — published after market close (~6 PM IST).
// One CSV download covers the entire universe; no per-symbol rate limits.
// Falls back up to 3 prior trading days to handle weekends, holidays, and
// crons that fire before the file is published.
const NSE_BHAV_BASE =
  'https://archives.nseindia.com/products/content/sec_bhavdata_full_'
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'

function dateStr(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}${mm}${yyyy}`
}

// "11-May-2026" → "2026-05-11"
function parseBhavDate(raw: string): string {
  const months: Record<string, string> = {
    Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
    Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
  }
  const [dd, mon, yyyy] = raw.trim().split('-')
  return `${yyyy}-${months[mon] ?? '01'}-${dd.padStart(2, '0')}`
}

type BhavRow = {
  symbol: string
  date: string
  open: number | null
  high: number | null
  low: number | null
  close: number | null
  prev_close: number | null
  volume: number | null
}

async function fetchBhavCSV(): Promise<BhavRow[] | null> {
  for (let daysBack = 0; daysBack <= 4; daysBack++) {
    const d = new Date()
    d.setDate(d.getDate() - daysBack)
    const url = `${NSE_BHAV_BASE}${dateStr(d)}.csv`
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': UA },
        cache: 'no-store',
      })
      if (!res.ok) continue
      const text = await res.text()
      const lines = text.trim().split('\n')
      if (lines.length < 2) continue

      const header = lines[0].split(',').map((h) => h.trim())
      const idx = (name: string) => header.indexOf(name)
      const iSymbol = idx('SYMBOL')
      const iSeries = idx('SERIES')
      const iDate = idx('DATE1')
      const iPrevClose = idx('PREV_CLOSE')
      const iOpen = idx('OPEN_PRICE')
      const iHigh = idx('HIGH_PRICE')
      const iLow = idx('LOW_PRICE')
      const iClose = idx('CLOSE_PRICE')
      const iVol = idx('TTL_TRD_QNTY')

      if (iSymbol < 0 || iClose < 0) continue

      const rows: BhavRow[] = []
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map((c) => c.trim())
        if (cols[iSeries] !== 'EQ') continue
        const close = parseFloat(cols[iClose])
        if (!isFinite(close) || close <= 0) continue
        rows.push({
          symbol: cols[iSymbol],
          date: parseBhavDate(cols[iDate]),
          open: parseFloat(cols[iOpen]) || null,
          high: parseFloat(cols[iHigh]) || null,
          low: parseFloat(cols[iLow]) || null,
          close,
          prev_close: parseFloat(cols[iPrevClose]) || null,
          volume: parseInt(cols[iVol], 10) || null,
        })
      }
      if (rows.length > 0) return rows
    } catch {
      // try previous day
    }
  }
  return null
}

export type RefreshPricesResult = {
  job: 'prices'
  universeCount: number
  fetchedCount: number
  upsertedRows: number
  failedSymbols: string[]
  upsertError?: string
  durationMs: number
}

export async function refreshPrices(
  supabase: SupabaseClient,
  opts: { range?: string; universe?: UniverseRow[] } = {},
): Promise<RefreshPricesResult> {
  const t0 = Date.now()
  const universe = opts.universe ?? (await getUniverse(supabase))

  const bhavRows = await fetchBhavCSV()
  if (!bhavRows) {
    return {
      job: 'prices',
      universeCount: universe.length,
      fetchedCount: 0,
      upsertedRows: 0,
      failedSymbols: universe.map((r) => r.symbol ?? r.isin),
      durationMs: Date.now() - t0,
    }
  }

  // Build a symbol → ISIN map from the universe
  const symbolToIsin = new Map<string, string>()
  for (const row of universe) {
    if (row.symbol) symbolToIsin.set(row.symbol.toUpperCase(), row.isin)
  }

  // Build a set of universe symbols for failure tracking
  const universSymbols = new Set(
    universe.map((r) => (r.symbol ?? r.isin).toUpperCase()),
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
  const fetchedSymbols = new Set<string>()

  for (const row of bhavRows) {
    const isin = symbolToIsin.get(row.symbol.toUpperCase())
    if (!isin) continue
    fetchedSymbols.add(row.symbol.toUpperCase())
    flatRows.push({
      isin,
      date: row.date,
      open: row.open,
      high: row.high,
      low: row.low,
      close: row.close,
      prev_close: row.prev_close,
      volume: row.volume,
      source: 'nse_bhav',
    })
  }

  const failedSymbols = [...universSymbols].filter((s) => !fetchedSymbols.has(s))

  let upsertedRows = 0
  let upsertError: string | undefined
  if (flatRows.length > 0) {
    const CHUNK = 500
    for (let i = 0; i < flatRows.length; i += CHUNK) {
      const { error } = await supabase
        .from('prices')
        .upsert(flatRows.slice(i, i + CHUNK), { onConflict: 'isin,date' })
      if (error) {
        console.error('[refresh-prices] upsert failed:', error.message)
        upsertError ??= error.message
      } else {
        upsertedRows += Math.min(CHUNK, flatRows.length - i)
      }
    }
  }

  return {
    job: 'prices',
    universeCount: universe.length,
    fetchedCount: fetchedSymbols.size,
    upsertedRows,
    failedSymbols,
    ...(upsertError ? { upsertError } : {}),
    durationMs: Date.now() - t0,
  }
}
