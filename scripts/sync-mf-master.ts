// Seed / refresh mf_schemes from AMFI's daily NAVAll feed.
//
// AMFI's NAVAll.txt is the authoritative source for Indian mutual fund
// scheme codes, ISINs, scheme names, and current NAV. It does NOT carry
// expense ratio, AUM, fund manager, or inception date — those come from
// AMC factsheets and would need separate ingestion. This script populates
// what AMFI gives us and infers AMC + category + plan + option from the
// scheme name using lib/mutual-funds/categories.ts.
//
// Run: npx dotenv -e .env.local -- npx tsx scripts/sync-mf-master.ts

import { createClient } from '@supabase/supabase-js'
import { inferCategory, inferAmc, inferPlanAndOption, DEFAULT_BENCHMARK } from '../lib/mutual-funds/categories'

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing env. Run: npx dotenv -e .env.local -- npx tsx scripts/sync-mf-master.ts')
  process.exit(1)
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type SchemeRow = {
  scheme_code: string
  isin_growth: string | null
  isin_div_reinvestment: string | null
  scheme_name: string
  amc: string | null
  amc_full_name: string | null
  category: string | null
  sub_category: string | null
  plan_type: 'Direct' | 'Regular'
  option_type: 'Growth' | 'IDCW'
  scheme_type: string
  benchmark: string | null
  is_active: boolean
  search_tokens: string
}

function tokenize(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

async function main() {
  console.log('Fetching AMFI NAVAll feed…')
  const res = await fetch('https://www.amfiindia.com/spages/NAVAll.txt')
  if (!res.ok) {
    console.error('AMFI fetch failed:', res.status, res.statusText)
    process.exit(1)
  }
  const text = await res.text()
  const lines = text.split('\n')

  const rows = new Map<string, SchemeRow>()
  let currentSchemeType = ''

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue
    if (line.includes('Open Ended Schemes')) {
      currentSchemeType = 'open_ended'
      continue
    }
    if (line.includes('Close Ended Schemes')) {
      currentSchemeType = 'close_ended'
      continue
    }
    if (line.includes('Interval Fund Schemes')) {
      currentSchemeType = 'interval'
      continue
    }
    // Skip section headers + non-data lines
    if (!line.includes(';')) continue

    const parts = line.split(';')
    if (parts.length < 6) continue

    const [scheme_code, isin1, isin2, name] = parts
    const code = scheme_code?.trim()
    const schemeName = name?.trim()
    if (!code || !schemeName) continue
    if (!/^\d+$/.test(code)) continue  // AMFI codes are numeric

    const { amc, full } = inferAmc(schemeName)
    const { plan_type, option_type } = inferPlanAndOption(schemeName)
    const { category, sub_category } = inferCategory(schemeName)
    const benchmark = DEFAULT_BENCHMARK[sub_category] ?? null

    rows.set(code, {
      scheme_code: code,
      isin_growth: isin1?.trim() || null,
      isin_div_reinvestment: isin2?.trim() || null,
      scheme_name: schemeName,
      amc,
      amc_full_name: full,
      category,
      sub_category,
      plan_type,
      option_type,
      scheme_type: currentSchemeType || 'open_ended',
      benchmark,
      is_active: true,
      search_tokens: tokenize(`${schemeName} ${amc ?? ''} ${sub_category}`),
    })
  }

  const all = Array.from(rows.values())
  console.log(`Parsed ${all.length} unique schemes from AMFI`)

  // Distribution sanity check
  const byCat = new Map<string, number>()
  for (const r of all) byCat.set(r.sub_category ?? 'Other', (byCat.get(r.sub_category ?? 'Other') ?? 0) + 1)
  const top = Array.from(byCat.entries()).sort((a, b) => b[1] - a[1]).slice(0, 12)
  console.log('Top sub-categories:', top.map(([k, v]) => `${k}=${v}`).join(', '))

  const CHUNK = 500
  for (let i = 0; i < all.length; i += CHUNK) {
    const chunk = all.slice(i, i + CHUNK)
    const { error } = await supabase
      .from('mf_schemes')
      .upsert(chunk, { onConflict: 'scheme_code' })
    if (error) {
      console.error('Insert error at offset', i, error)
      process.exit(1)
    }
    console.log(`Upserted ${Math.min(i + CHUNK, all.length)}/${all.length}`)
  }

  console.log('✓ MF master sync complete')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
