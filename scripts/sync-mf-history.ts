// Pull historical NAV per scheme from mfapi.in (a free, public mirror of
// AMFI data) and append to mf_nav_history.
//
// mfapi.in returns the full history per scheme code at:
//   https://api.mfapi.in/mf/{scheme_code}
// Response shape: { meta: {...}, data: [{date: "DD-MM-YYYY", nav: "10.234"}, ...] }
// data is in DESCENDING order (latest first); we insert ascending.
//
// CLI flags:
//   --limit N            cap how many schemes to process this run
//   --only-direct        only Direct + Growth schemes (default = false)
//   --skip-existing      skip schemes that already have any history rows
//   --refresh-days N     refresh schemes whose latest nav_date is older than N days
//   --scheme-codes a,b,c only process these specific codes
//
// Run: npx dotenv -e .env.local -- npx tsx scripts/sync-mf-history.ts --only-direct --limit 1000

import { createClient } from '@supabase/supabase-js'

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing env. Run: npx dotenv -e .env.local -- npx tsx scripts/sync-mf-history.ts')
  process.exit(1)
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type Args = {
  limit?: number
  onlyDirect: boolean
  skipExisting: boolean
  refreshDays?: number
  schemeCodes?: string[]
}

function parseArgs(): Args {
  const argv = process.argv.slice(2)
  const args: Args = { onlyDirect: false, skipExisting: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--only-direct') args.onlyDirect = true
    else if (a === '--skip-existing') args.skipExisting = true
    else if (a === '--limit') args.limit = Number(argv[++i])
    else if (a === '--refresh-days') args.refreshDays = Number(argv[++i])
    else if (a === '--scheme-codes') args.schemeCodes = argv[++i].split(',').map((s) => s.trim())
  }
  return args
}

function ddmmyyyyToIso(s: string): string | null {
  const m = s.match(/^(\d{2})-(\d{2})-(\d{4})$/)
  if (!m) return null
  return `${m[3]}-${m[2]}-${m[1]}`
}

async function fetchSchemeHistory(scheme_code: string): Promise<Array<{ nav_date: string; nav: number }>> {
  const url = `https://api.mfapi.in/mf/${scheme_code}`
  let res: Response
  try {
    res = await fetch(url, { headers: { 'User-Agent': 'ClarzoApp/1.0 (mf-sync)' } })
  } catch (e) {
    console.warn(`fetch failed for ${scheme_code}:`, (e as Error).message)
    return []
  }
  if (!res.ok) {
    console.warn(`mfapi ${res.status} for ${scheme_code}`)
    return []
  }
  const json = (await res.json()) as { data?: Array<{ date: string; nav: string }> }
  if (!json.data) return []

  const out: Array<{ nav_date: string; nav: number }> = []
  for (const row of json.data) {
    const iso = ddmmyyyyToIso(row.date)
    const nav = parseFloat(row.nav)
    if (!iso || !Number.isFinite(nav) || nav <= 0) continue
    out.push({ nav_date: iso, nav })
  }
  // mfapi returns descending; flip to ascending for storage
  out.sort((a, b) => (a.nav_date < b.nav_date ? -1 : 1))
  return out
}

async function pickSchemeCodes(args: Args): Promise<string[]> {
  if (args.schemeCodes) return args.schemeCodes

  let q = supabase.from('mf_schemes').select('scheme_code').eq('is_active', true)
  if (args.onlyDirect) q = q.eq('plan_type', 'Direct').eq('option_type', 'Growth')

  // Pull all matching codes (chunked client-side; Supabase caps at 1000 per query)
  const all: string[] = []
  let offset = 0
  while (true) {
    const { data, error } = await q.range(offset, offset + 999)
    if (error) {
      console.error('scheme list error', error)
      break
    }
    if (!data || data.length === 0) break
    all.push(...(data as Array<{ scheme_code: string }>).map((r) => r.scheme_code))
    if (data.length < 1000) break
    offset += 1000
  }

  let filtered = all
  if (args.skipExisting) {
    const haveSet = await fetchSchemesWithAnyHistory()
    filtered = filtered.filter((c) => !haveSet.has(c))
    console.log(`Filtered out ${all.length - filtered.length} schemes that already have history`)
  } else if (args.refreshDays !== undefined) {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - args.refreshDays)
    const cutoffIso = cutoff.toISOString().slice(0, 10)
    const stale = await fetchStaleSchemes(cutoffIso)
    filtered = filtered.filter((c) => stale.has(c))
    console.log(`${filtered.length} schemes are stale (latest nav < ${cutoffIso})`)
  }

  if (args.limit) filtered = filtered.slice(0, args.limit)
  return filtered
}

async function fetchSchemesWithAnyHistory(): Promise<Set<string>> {
  // Distinct scheme_code with at least one row.
  const set = new Set<string>()
  let offset = 0
  while (true) {
    const { data, error } = await supabase
      .from('mf_nav_history')
      .select('scheme_code')
      .range(offset, offset + 9999)
    if (error || !data || data.length === 0) break
    for (const r of data as Array<{ scheme_code: string }>) set.add(r.scheme_code)
    if (data.length < 10000) break
    offset += 10000
  }
  return set
}

async function fetchStaleSchemes(_cutoffIso: string): Promise<Set<string>> {
  // Without a server-side max-aggregation, we approximate by selecting all
  // codes that have at least one row before cutoff but treat lack of row as
  // also stale upstream.
  const set = new Set<string>()
  let offset = 0
  while (true) {
    const { data, error } = await supabase
      .from('mf_nav_history')
      .select('scheme_code, nav_date')
      .range(offset, offset + 9999)
    if (error || !data || data.length === 0) break
    for (const r of data as Array<{ scheme_code: string; nav_date: string }>) {
      const cur = set.has(r.scheme_code)
      if (!cur || r.nav_date > '0000-00-00') set.add(r.scheme_code)
    }
    if (data.length < 10000) break
    offset += 10000
  }
  return set
}

async function main() {
  const args = parseArgs()
  const codes = await pickSchemeCodes(args)
  console.log(`Will sync history for ${codes.length} schemes`)

  let ok = 0
  let fail = 0
  let totalRows = 0
  const concurrency = 6
  let cursor = 0

  async function worker(id: number) {
    while (cursor < codes.length) {
      const i = cursor++
      const code = codes[i]
      try {
        const rows = await fetchSchemeHistory(code)
        if (rows.length === 0) {
          fail++
          continue
        }
        // Insert in chunks of 1000
        const withCode = rows.map((r) => ({ scheme_code: code, ...r }))
        const CHUNK = 1000
        for (let j = 0; j < withCode.length; j += CHUNK) {
          const slice = withCode.slice(j, j + CHUNK)
          const { error } = await supabase
            .from('mf_nav_history')
            .upsert(slice, { onConflict: 'scheme_code,nav_date' })
          if (error) {
            console.warn(`insert error ${code}:`, error.message)
            fail++
            break
          }
        }
        ok++
        totalRows += withCode.length
        if (ok % 25 === 0) console.log(`[w${id}] processed ${ok}/${codes.length} (rows: ${totalRows})`)
      } catch (e) {
        fail++
        console.warn(`error ${code}:`, (e as Error).message)
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, (_, i) => worker(i)))
  console.log(`✓ Done. ok=${ok} fail=${fail} rows=${totalRows}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
