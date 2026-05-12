// Standalone smoke test for the daily-refresh pipeline. Runs each of the
// 5 jobs against a 5-stock slice of the universe so you can validate end
// to end without burning 10 minutes on a full Nifty 100 refresh.
//
// Run: npx dotenv -e .env.local -- npx tsx scripts/smoke-daily-refresh.ts
//
// Required env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
// Optional env: FINNHUB_API_KEY (news + quarterly results jobs no-op without it).

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: '.env.local' })

import { getUniverse } from '../lib/universe'
import { refreshPrices } from '../lib/cron/refresh-prices'
import { refreshMetrics } from '../lib/cron/refresh-metrics'
import { refreshNews } from '../lib/cron/refresh-news'
import { refreshCorpEvents } from '../lib/cron/refresh-corp-events'
import { refreshQuarterlyResults } from '../lib/cron/refresh-quarterly-results'

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } })

  const fullUniverse = await getUniverse(supabase)
  if (fullUniverse.length === 0) {
    console.error('Universe is empty — run scripts/sync-nse-companies.ts first.')
    process.exit(1)
  }

  // Take the first 5 for the smoke run.
  const universe = fullUniverse.slice(0, 5)
  console.log(`Smoke universe: ${universe.map((u) => u.symbol).join(', ')}`)
  console.log()

  for (const [name, fn] of [
    ['prices', () => refreshPrices(supabase, { universe })],
    ['metrics', () => refreshMetrics(supabase, { universe })],
    ['news', () => refreshNews(supabase, { universe })],
    ['corp_events', () => refreshCorpEvents(supabase, { universe })],
    ['quarterly_results', () => refreshQuarterlyResults(supabase, { universe })],
  ] as const) {
    process.stdout.write(`▶ ${name}… `)
    try {
      const result = await fn()
      console.log('done')
      console.dir(result, { depth: null })
      console.log()
    } catch (e) {
      console.log('failed')
      console.error(e)
      console.log()
    }
  }
}

main()
