import type { SupabaseClient } from '@supabase/supabase-js'

// The "universe" the daily-refresh cron operates over: every row in
// `public.companies` (seeded from NSE indices via scripts/sync-nse-companies.ts)
// plus any stock currently held by any user that isn't already there.
//
// Splitting into two queries (universe + held) instead of one UNION lets us
// log them separately — "300 universe + 12 long-tail held" is more
// informative than a single number.

export type UniverseRow = {
  isin: string
  symbol: string | null
  name: string | null
  mcap_category: string | null
  sector: string | null
}

export async function getUniverse(
  supabase: SupabaseClient,
): Promise<UniverseRow[]> {
  const { data, error } = await supabase
    .from('companies')
    .select('isin, symbol, name, mcap_category, sector')
    .not('isin', 'is', null)
    .not('symbol', 'is', null)
  if (error) {
    console.error('[universe] companies fetch failed:', error.message)
    return []
  }
  return (data ?? []) as UniverseRow[]
}

// Held stocks that may not be in the curated universe (someone holds an SME
// stock or a micro-cap we don't track). Daily refresh hits these too so the
// dashboard always has fresh prices for what users actually own.
export async function getHeldStockIsinsNotInUniverse(
  supabase: SupabaseClient,
): Promise<string[]> {
  // Pull distinct ISINs of stock holdings.
  const { data: heldRows, error: heldErr } = await supabase
    .from('holdings')
    .select('isin')
    .eq('asset_type', 'stock')
    .not('isin', 'is', null)
  if (heldErr) {
    console.error('[universe] held holdings fetch failed:', heldErr.message)
    return []
  }
  const heldIsins = Array.from(
    new Set((heldRows ?? []).map((r: { isin: string | null }) => r.isin).filter((v): v is string => Boolean(v))),
  )
  if (heldIsins.length === 0) return []

  // Cross-reference with companies to find the long-tail.
  const { data: known, error: knownErr } = await supabase
    .from('companies')
    .select('isin')
    .in('isin', heldIsins)
  if (knownErr) {
    console.error('[universe] companies cross-check failed:', knownErr.message)
    return []
  }
  const knownSet = new Set((known ?? []).map((r: { isin: string }) => r.isin))
  return heldIsins.filter((i) => !knownSet.has(i))
}

// Convenience: returns the full set of ISINs the daily refresh should
// process, deduped.
export async function getRefreshTargets(
  supabase: SupabaseClient,
): Promise<UniverseRow[]> {
  const universe = await getUniverse(supabase)
  return universe
}
