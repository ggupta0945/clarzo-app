import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUniverse } from '@/lib/universe'
import { refreshPrices } from '@/lib/cron/refresh-prices'
import { refreshMetrics } from '@/lib/cron/refresh-metrics'
import { refreshNews } from '@/lib/cron/refresh-news'
import { refreshCorpEvents } from '@/lib/cron/refresh-corp-events'
import { refreshQuarterlyResults } from '@/lib/cron/refresh-quarterly-results'

export const runtime = 'nodejs'
// Vercel Pro fluid compute supports up to 300s. The whole pipeline aims
// for ~3-5 min on a 300-stock universe; if you grow the universe or hit
// rate limits, split the orchestrator into per-job routes triggered by
// separate cron entries.
export const maxDuration = 300

// Daily market-data refresh. Single route runs all 5 jobs sequentially
// against the same universe snapshot — that way slower jobs don't see
// midway-changed inputs, and the same Yahoo throttle pool is shared.
//
// Auth: Bearer ${CRON_SECRET} matching the weekly-digest pattern. Vercel
// cron sends this automatically when configured in vercel.json. Manual
// triggers (curl from your laptop) need to set the header explicitly.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  // Pull the universe once and reuse — saves four duplicate fetches and
  // ensures every job operates on the same set.
  const universe = await getUniverse(supabase)
  if (universe.length === 0) {
    return NextResponse.json(
      {
        error: 'empty_universe',
        message:
          'No companies in public.companies. Run scripts/sync-nse-companies.ts first.',
      },
      { status: 500 },
    )
  }

  const t0 = Date.now()
  const errors: Array<{ job: string; message: string }> = []

  async function safe<T>(jobName: string, fn: () => Promise<T>): Promise<T | null> {
    try {
      return await fn()
    } catch (e) {
      const message = e instanceof Error ? e.message : 'unknown_error'
      console.error(`[daily-refresh] ${jobName} failed:`, message)
      errors.push({ job: jobName, message })
      return null
    }
  }

  // Run sequentially. The Yahoo + Finnhub free tiers are rate-limited;
  // running jobs in parallel would just trip them faster.
  const prices = await safe('prices', () => refreshPrices(supabase, { universe }))
  const metrics = await safe('metrics', () => refreshMetrics(supabase, { universe }))
  const news = await safe('news', () => refreshNews(supabase, { universe }))
  const corpEvents = await safe('corp_events', () => refreshCorpEvents(supabase, { universe }))
  const quarterlyResults = await safe('quarterly_results', () =>
    refreshQuarterlyResults(supabase, { universe }),
  )

  return NextResponse.json({
    ok: errors.length === 0,
    universeCount: universe.length,
    totalDurationMs: Date.now() - t0,
    jobs: { prices, metrics, news, corpEvents, quarterlyResults },
    errors,
  })
}
