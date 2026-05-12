import type { SupabaseClient } from '@supabase/supabase-js'
import { getUniverse, type UniverseRow } from '../universe'
import { fetchEarningsCalendar, toFinnhubSymbol } from '../finnhub'

export type RefreshQuarterlyResultsResult = {
  job: 'quarterly_results'
  symbolsProcessed: number
  earningsRecorded: number
  durationMs: number
}

// Picks up earnings announcements in a ±14-day window and inserts them as
// 'earnings' rows in corporate_events. Finnhub's earnings calendar is a
// single global fetch (no per-symbol filter), so we fetch once and join
// against the universe in-process.
//
// Actual quarterly numbers — full revenue / EBITDA / PAT — aren't pulled
// here; that requires parsing exchange filings (the BSE/NSE PDFs), which
// is a follow-up. For now we surface the *date* + estimates so the
// dashboard's upcoming-earnings card can flag "ICICIBANK reports Thu" —
// that alone is useful.

export async function refreshQuarterlyResults(
  supabase: SupabaseClient,
  opts: { universe?: UniverseRow[] } = {},
): Promise<RefreshQuarterlyResultsResult> {
  const t0 = Date.now()
  const universe = opts.universe ?? (await getUniverse(supabase))

  const today = new Date()
  const from = new Date(today.getTime() - 14 * 86400 * 1000).toISOString().slice(0, 10)
  const to = new Date(today.getTime() + 14 * 86400 * 1000).toISOString().slice(0, 10)

  // Single global fetch — Finnhub returns the full calendar in one call.
  const allEvents = await fetchEarningsCalendar(from, to).catch(() => [])

  // Build a Finnhub-symbol → universe-row lookup so we can join O(1).
  const symbolMap = new Map<string, UniverseRow>()
  for (const row of universe) {
    if (!row.symbol) continue
    symbolMap.set(toFinnhubSymbol(row.symbol), row)
    // Also index by raw symbol — Finnhub sometimes returns "RELIANCE.NS"
    // instead of "NSE:RELIANCE" depending on endpoint version.
    symbolMap.set(row.symbol.toUpperCase(), row)
    symbolMap.set(`${row.symbol.toUpperCase()}.NS`, row)
  }

  const rows: Array<{
    isin: string
    event_type: string
    event_date: string
    details: Record<string, unknown>
    source: string
  }> = []

  const matchedIsins = new Set<string>()
  for (const e of allEvents) {
    if (!e.date || !e.symbol) continue
    const row = symbolMap.get(e.symbol.toUpperCase())
    if (!row) continue
    rows.push({
      isin: row.isin,
      event_type: 'earnings',
      event_date: e.date,
      details: {
        hour: e.hour ?? null,
        eps_estimate: e.epsEstimate,
        eps_actual: e.epsActual,
        revenue_estimate: e.revenueEstimate,
        revenue_actual: e.revenueActual,
      },
      source: 'finnhub',
    })
    matchedIsins.add(row.isin)
  }

  let earningsRecorded = 0
  if (rows.length > 0) {
    const { error, count } = await supabase
      .from('corporate_events')
      .upsert(rows, {
        onConflict: 'isin,event_type,event_date',
        ignoreDuplicates: false, // do update — Finnhub may revise estimates
        count: 'exact',
      })
    if (error) {
      console.error('[refresh-quarterly-results] upsert failed:', error.message)
    } else {
      earningsRecorded = count ?? rows.length
    }
  }

  return {
    job: 'quarterly_results',
    symbolsProcessed: matchedIsins.size,
    earningsRecorded,
    durationMs: Date.now() - t0,
  }
}
