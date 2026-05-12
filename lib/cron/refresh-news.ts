import type { SupabaseClient } from '@supabase/supabase-js'
import { getUniverse, type UniverseRow } from '../universe'
import { fetchRecentCompanyNews, fetchMarketNews, type NewsItem } from '../finnhub'

const BATCH_SIZE = 5 // Finnhub free tier is 60 req/min — keep concurrency low

export type RefreshNewsResult = {
  job: 'news'
  companiesCovered: number
  marketNewsCount: number
  insertedDocs: number
  durationMs: number
}

// Pulls last-24h news for stocks currently held by users, plus general
// market news. We deliberately don't fetch news for the entire universe
// every day — that's 100+ Finnhub calls for stocks no one is asking about.
// Held stocks is the right scope until we have a real query signal.

async function getHeldStockTargets(
  supabase: SupabaseClient,
  universe: UniverseRow[],
): Promise<UniverseRow[]> {
  const { data: heldRows } = await supabase
    .from('holdings')
    .select('isin')
    .eq('asset_type', 'stock')
    .not('isin', 'is', null)
  const heldIsins = new Set(
    (heldRows ?? [])
      .map((r: { isin: string | null }) => r.isin)
      .filter((v): v is string => Boolean(v)),
  )
  if (heldIsins.size === 0) {
    // Nothing held yet — fall back to refreshing top 20 by Nifty 100 so
    // empty databases still pick up some news for the public /ask page.
    return universe.slice(0, 20)
  }
  return universe.filter((u) => heldIsins.has(u.isin))
}

function newsToDocRow(isin: string | null, item: NewsItem) {
  return {
    isin,
    doc_type: 'news',
    source: 'finnhub',
    source_id: String(item.id),
    title: item.headline,
    content: item.summary,
    metadata: {
      category: item.category,
      source_publisher: item.source,
      related: item.related,
      image_url: item.image,
    },
    source_url: item.url,
    published_at: new Date(item.datetime * 1000).toISOString(),
  }
}

export async function refreshNews(
  supabase: SupabaseClient,
  opts: { universe?: UniverseRow[]; days?: number } = {},
): Promise<RefreshNewsResult> {
  const t0 = Date.now()
  const universe = opts.universe ?? (await getUniverse(supabase))
  const days = opts.days ?? 1
  const heldTargets = await getHeldStockTargets(supabase, universe)

  let insertedDocs = 0

  // Per-company news in batches.
  for (let i = 0; i < heldTargets.length; i += BATCH_SIZE) {
    const batch = heldTargets.slice(i, i + BATCH_SIZE)
    const results = await Promise.all(
      batch.map(async (row) => {
        if (!row.symbol) return { isin: row.isin, items: [] as NewsItem[] }
        const items = await fetchRecentCompanyNews(row.symbol, days, 8).catch(() => [])
        return { isin: row.isin, items }
      }),
    )
    const rows = results.flatMap(({ isin, items }) =>
      items.map((it) => newsToDocRow(isin, it)),
    )
    if (rows.length === 0) continue
    const { error } = await supabase
      .from('documents')
      .upsert(rows, { onConflict: 'source,source_id', ignoreDuplicates: true })
    if (error) console.error('[refresh-news] doc upsert failed:', error.message)
    else insertedDocs += rows.length
  }

  // Market-wide news (no isin → general).
  const marketNews = await fetchMarketNews('general', 20).catch(() => [])
  if (marketNews.length > 0) {
    const rows = marketNews.map((it) => newsToDocRow(null, it))
    const { error } = await supabase
      .from('documents')
      .upsert(rows, { onConflict: 'source,source_id', ignoreDuplicates: true })
    if (error) console.error('[refresh-news] market upsert failed:', error.message)
    else insertedDocs += rows.length
  }

  return {
    job: 'news',
    companiesCovered: heldTargets.length,
    marketNewsCount: marketNews.length,
    insertedDocs,
    durationMs: Date.now() - t0,
  }
}
