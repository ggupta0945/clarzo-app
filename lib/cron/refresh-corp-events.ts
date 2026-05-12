import type { SupabaseClient } from '@supabase/supabase-js'
import { getUniverse, type UniverseRow } from '../universe'
import { fetchRecentCorpActions, type CorpAction } from '../stock-events'

const BATCH_SIZE = 8 // Yahoo chart endpoint — slightly higher concurrency OK

export type RefreshCorpEventsResult = {
  job: 'corp_events'
  symbolsProcessed: number
  newEvents: number
  durationMs: number
}

function actionToRow(isin: string, action: CorpAction) {
  const details: Record<string, unknown> = {}
  if (action.type === 'dividend' && action.amount != null) {
    details.amount = action.amount
  }
  if (action.type === 'split' && action.ratio) {
    details.numerator = action.ratio.numerator
    details.denominator = action.ratio.denominator
  }
  return {
    isin,
    event_type: action.type,
    event_date: new Date(action.date * 1000).toISOString().slice(0, 10),
    details: Object.keys(details).length > 0 ? details : null,
    source: 'yahoo',
  }
}

// Reuses fetchRecentCorpActions from lib/stock-events.ts (which already
// powers the dashboard's CorporateActions card). Pulls a 1-month window;
// upsert dedups by (isin, event_type, event_date) so re-running is safe.
export async function refreshCorpEvents(
  supabase: SupabaseClient,
  opts: { universe?: UniverseRow[] } = {},
): Promise<RefreshCorpEventsResult> {
  const t0 = Date.now()
  const universe = opts.universe ?? (await getUniverse(supabase))

  let newEvents = 0
  let processed = 0

  for (let i = 0; i < universe.length; i += BATCH_SIZE) {
    const batch = universe.slice(i, i + BATCH_SIZE)
    const rows: Array<ReturnType<typeof actionToRow>> = []

    await Promise.all(
      batch.map(async (row) => {
        if (!row.symbol) return
        const actions = await fetchRecentCorpActions([row.symbol], {
          range: '1mo',
          limit: 20,
        }).catch(() => [] as CorpAction[])
        for (const a of actions) rows.push(actionToRow(row.isin, a))
        processed += 1
      }),
    )

    if (rows.length === 0) continue
    const { error, count } = await supabase
      .from('corporate_events')
      .upsert(rows, {
        onConflict: 'isin,event_type,event_date',
        ignoreDuplicates: true,
        count: 'exact',
      })
    if (error) {
      console.error('[refresh-corp-events] upsert failed:', error.message)
    } else if (count != null) {
      newEvents += count
    } else {
      newEvents += rows.length // best-effort fallback when count isn't returned
    }
  }

  return {
    job: 'corp_events',
    symbolsProcessed: processed,
    newEvents,
    durationMs: Date.now() - t0,
  }
}
