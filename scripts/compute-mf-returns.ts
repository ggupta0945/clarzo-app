// Compute 1M / 3M / 6M / 1Y / 3Y / 5Y / 10Y / SI returns from mf_nav_history
// and upsert into mf_returns. Also computes category rank for 1Y/3Y/5Y so
// the discover UI can display "rank N of M" without runtime heavy lifting.
//
// Run: npx dotenv -e .env.local -- npx tsx scripts/compute-mf-returns.ts

import { createClient } from '@supabase/supabase-js'
import { computeReturns } from '../lib/mutual-funds/returns'
import type { NavPoint } from '../lib/mutual-funds/types'

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing env. Run: npx dotenv -e .env.local -- npx tsx scripts/compute-mf-returns.ts')
  process.exit(1)
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type SchemeRow = {
  scheme_code: string
  sub_category: string | null
  plan_type: string | null
  option_type: string | null
}

type ReturnRow = {
  scheme_code: string
  return_1m: number | null
  return_3m: number | null
  return_6m: number | null
  return_1y: number | null
  return_3y: number | null
  return_5y: number | null
  return_10y: number | null
  return_si: number | null
  category_rank_1y: number | null
  category_rank_3y: number | null
  category_rank_5y: number | null
  category_size_1y: number | null
  category_size_3y: number | null
  category_size_5y: number | null
  computed_at: string
}

async function fetchAllSchemes(): Promise<SchemeRow[]> {
  const all: SchemeRow[] = []
  let offset = 0
  while (true) {
    const { data, error } = await supabase
      .from('mf_schemes')
      .select('scheme_code, sub_category, plan_type, option_type')
      .eq('is_active', true)
      .range(offset, offset + 999)
    if (error) {
      console.error('scheme fetch error', error)
      break
    }
    if (!data || data.length === 0) break
    all.push(...(data as SchemeRow[]))
    if (data.length < 1000) break
    offset += 1000
  }
  return all
}

async function fetchHistory(scheme_code: string): Promise<NavPoint[]> {
  const all: NavPoint[] = []
  // Supabase caps a single response at 1000 rows even when range() asks
  // for more. Page in chunks of exactly 1000.
  const PAGE = 1000
  let offset = 0
  while (true) {
    const { data, error } = await supabase
      .from('mf_nav_history')
      .select('nav_date, nav')
      .eq('scheme_code', scheme_code)
      .order('nav_date', { ascending: true })
      .range(offset, offset + PAGE - 1)
    if (error || !data || data.length === 0) break
    all.push(...(data as NavPoint[]))
    if (data.length < PAGE) break
    offset += PAGE
  }
  return all
}

async function main() {
  const schemes = await fetchAllSchemes()
  console.log(`Computing returns for ${schemes.length} schemes…`)

  const computed: ReturnRow[] = []

  let processed = 0
  const concurrency = 8
  let cursor = 0

  async function worker() {
    while (cursor < schemes.length) {
      const i = cursor++
      const s = schemes[i]
      try {
        const history = await fetchHistory(s.scheme_code)
        if (history.length < 2) {
          processed++
          continue
        }
        const r = computeReturns(history)
        computed.push({
          scheme_code: s.scheme_code,
          ...r,
          category_rank_1y: null,
          category_rank_3y: null,
          category_rank_5y: null,
          category_size_1y: null,
          category_size_3y: null,
          category_size_5y: null,
          computed_at: new Date().toISOString(),
        })
        processed++
        if (processed % 100 === 0) console.log(`processed ${processed}/${schemes.length}`)
      } catch (e) {
        console.warn(`error ${s.scheme_code}:`, (e as Error).message)
        processed++
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()))

  // Compute category ranks (Direct + Growth only, within sub_category).
  const schemeMeta = new Map(schemes.map((s) => [s.scheme_code, s]))

  function rankByWindow(window: '1y' | '3y' | '5y') {
    const col =
      window === '1y' ? 'return_1y' : window === '3y' ? 'return_3y' : 'return_5y'
    const rankCol =
      window === '1y' ? 'category_rank_1y' : window === '3y' ? 'category_rank_3y' : 'category_rank_5y'
    const sizeCol =
      window === '1y' ? 'category_size_1y' : window === '3y' ? 'category_size_3y' : 'category_size_5y'

    const groups = new Map<string, ReturnRow[]>()
    for (const r of computed) {
      const meta = schemeMeta.get(r.scheme_code)
      if (!meta || !meta.sub_category) continue
      if (meta.plan_type !== 'Direct' || meta.option_type !== 'Growth') continue
      if (r[col as keyof ReturnRow] === null) continue
      const key = meta.sub_category
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(r)
    }

    for (const [, group] of groups) {
      group.sort((a, b) => {
        const av = (a[col as keyof ReturnRow] as number | null) ?? -Infinity
        const bv = (b[col as keyof ReturnRow] as number | null) ?? -Infinity
        return bv - av
      })
      group.forEach((row, idx) => {
        ;(row as Record<string, unknown>)[rankCol] = idx + 1
        ;(row as Record<string, unknown>)[sizeCol] = group.length
      })
    }
  }

  rankByWindow('1y')
  rankByWindow('3y')
  rankByWindow('5y')

  console.log(`Upserting ${computed.length} return rows…`)
  const CHUNK = 500
  for (let i = 0; i < computed.length; i += CHUNK) {
    const slice = computed.slice(i, i + CHUNK)
    const { error } = await supabase
      .from('mf_returns')
      .upsert(slice, { onConflict: 'scheme_code' })
    if (error) {
      console.error('upsert error at', i, error)
      process.exit(1)
    }
    console.log(`upserted ${Math.min(i + CHUNK, computed.length)}/${computed.length}`)
  }

  console.log('✓ Returns compute complete')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
