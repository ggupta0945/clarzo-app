/**
 * Seeds company data from NSE index CSVs into both:
 *  1. public.companies — the existing lightweight reference table
 *  2. public.company_profile — the rich detail table from market_schema.sql
 *
 * Sources (downloaded to scripts/nse/ by the accompanying shell step):
 *   ind_nifty500list.csv       → 500 large/mid/small-cap stocks
 *   ind_niftymicrocap250_list.csv → 250 microcap stocks
 *   ind_nifty100list.csv       → marks Nifty 100 membership
 *   ind_niftymidcap150list.csv → marks Midcap 150 membership
 *   ind_niftysmallcap250list.csv → marks Smallcap 250 membership
 *
 * Run:  npx tsx scripts/seed-nifty1000.ts
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import Papa from 'papaparse'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

config({ path: '.env.local' })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(url, key, { auth: { persistSession: false } })

// ── Sector → normalised label ────────────────────────────────────────────────
const SECTOR_MAP: Record<string, string> = {
  'Financial Services': 'Financial Services',
  'Information Technology': 'IT',
  'Diversified': 'Diversified',
  'Capital Goods': 'Capital Goods',
  'Construction Materials': 'Construction Materials',
  'Automobile and Auto Components': 'Automobile',
  'Automobile': 'Automobile',
  'Fast Moving Consumer Goods': 'FMCG',
  'Consumer Goods': 'FMCG',
  'Chemicals': 'Chemicals',
  'Oil Gas & Consumable Fuels': 'Energy',
  'Oil Gas & Fuels': 'Energy',
  'Power': 'Power',
  'Metals & Mining': 'Metals & Mining',
  'Healthcare': 'Pharma & Healthcare',
  'Pharma': 'Pharma & Healthcare',
  'Telecommunication': 'Telecom',
  'Media Entertainment & Publication': 'Media',
  'Realty': 'Real Estate',
  'Textiles': 'Textiles',
  'Consumer Durables': 'Consumer Durables',
  'Services': 'Services',
  'Forest Materials': 'Forest & Paper',
  'Agriculture': 'Agriculture',
  'Construction': 'Infrastructure',
  'Infrastructure': 'Infrastructure',
  'Retailing': 'Retail',
  'IT': 'IT',
}

function normaliseIndustry(raw: string): string {
  return SECTOR_MAP[raw.trim()] ?? raw.trim()
}

// ── Industry → mcap derivation via index membership ─────────────────────────
type McapCategory = 'large' | 'mid' | 'small' | 'micro'

type RawRow = {
  'Company Name': string
  Industry: string
  Symbol: string
  Series: string
  'ISIN Code': string
}

type StockRecord = {
  isin: string
  symbol: string
  company_name: string
  sector: string
  industry: string
  mcap_category: McapCategory
  index_membership: string[]
}

function parseCsv(path: string): RawRow[] {
  const text = readFileSync(path, 'utf8')
  const { data } = Papa.parse<RawRow>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  })
  return data.filter((r) => r['ISIN Code'] && r.Symbol && r['Company Name'])
}

function buildStockMap(): Map<string, StockRecord> {
  const map = new Map<string, StockRecord>()

  const sources: Array<{ file: string; mcap: McapCategory; indexName: string }> = [
    { file: 'scripts/nse/ind_nifty100list.csv',          mcap: 'large', indexName: 'Nifty 100'       },
    { file: 'scripts/nse/ind_niftymidcap150list.csv',    mcap: 'mid',   indexName: 'Nifty Midcap 150' },
    { file: 'scripts/nse/ind_niftysmallcap250list.csv',  mcap: 'small', indexName: 'Nifty Smallcap 250' },
    { file: 'scripts/nse/ind_nifty500list.csv',          mcap: 'small', indexName: 'Nifty 500'        },
    { file: 'scripts/nse/ind_niftymicrocap250_list.csv', mcap: 'micro', indexName: 'Nifty Microcap 250' },
  ]

  for (const { file, mcap, indexName } of sources) {
    const fullPath = resolve(file)
    if (!existsSync(fullPath)) {
      console.warn(`  ⚠️  skipped ${file} — file not found`)
      continue
    }
    const rows = parseCsv(fullPath)
    console.log(`  ${file}: ${rows.length} rows`)

    for (const r of rows) {
      const isin = r['ISIN Code'].trim()
      const existing = map.get(isin)
      if (existing) {
        if (!existing.index_membership.includes(indexName)) {
          existing.index_membership.push(indexName)
        }
        // Prefer more specific (higher cap) category from earlier sources
        const priority: McapCategory[] = ['large', 'mid', 'small', 'micro']
        if (priority.indexOf(mcap) < priority.indexOf(existing.mcap_category)) {
          existing.mcap_category = mcap
        }
      } else {
        const sector = normaliseIndustry(r.Industry)
        map.set(isin, {
          isin,
          symbol: r.Symbol.trim(),
          company_name: r['Company Name'].trim(),
          sector,
          industry: r.Industry.trim(),
          mcap_category: mcap,
          index_membership: [indexName],
        })
      }
    }
  }

  return map
}

// ── Upsert to public.companies ───────────────────────────────────────────────
async function upsertCompanies(stocks: StockRecord[]) {
  console.log(`\nUpserting ${stocks.length} rows → public.companies …`)

  const rows = stocks.map((s) => ({
    isin: s.isin,
    symbol: s.symbol,
    name: s.company_name,
    sector: s.sector,
    industry: s.industry,
    mcap_category: s.mcap_category === 'micro' ? 'small' : s.mcap_category,
    corp_group: null,
  }))

  let ok = 0
  const CHUNK = 200
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK)
    const { error } = await supabase.from('companies').upsert(chunk, { onConflict: 'isin' })
    if (error) {
      console.error(`  chunk ${i / CHUNK + 1} error:`, error.message)
    } else {
      ok += chunk.length
      process.stdout.write(`  ${ok}/${rows.length}\r`)
    }
  }
  console.log(`  ✓ ${ok} rows upserted to companies`)
}

// ── Upsert to public.company_profile ────────────────────────────────────────
async function upsertCompanyProfile(stocks: StockRecord[]) {
  // Check if table exists first
  const { error: checkErr } = await supabase
    .from('company_profile')
    .select('symbol')
    .limit(1)

  if (checkErr?.code === 'PGRST205' || checkErr?.message?.includes('does not exist')) {
    console.log('\n⚠️  company_profile table not found — skipping.')
    console.log('   Run scripts/market_schema.sql in the Supabase SQL Editor first, then re-run this script.')
    return
  }

  console.log(`\nUpserting ${stocks.length} rows → public.company_profile …`)

  const rows = stocks.map((s) => ({
    symbol: s.symbol,
    company_name: s.company_name,
    sector: s.sector,
    industry: s.industry,
    mcap_category: s.mcap_category === 'micro' ? 'small' : s.mcap_category,
    nse_symbol: s.symbol,
    isin: s.isin,
    index_membership: s.index_membership,
  }))

  let ok = 0
  const CHUNK = 200
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK)
    const { error } = await supabase
      .from('company_profile')
      .upsert(chunk, { onConflict: 'symbol' })
    if (error) {
      console.error(`  chunk ${i / CHUNK + 1} error:`, error.message)
    } else {
      ok += chunk.length
      process.stdout.write(`  ${ok}/${rows.length}\r`)
    }
  }
  console.log(`  ✓ ${ok} rows upserted to company_profile`)
}

// ── Merge with hand-curated details from seed_stocks.sql ────────────────────
// After the NSE CSV upsert, the richer fields (CEO, employees, headquarters,
// business_summary, thematic_tags, listing_date) come from seed_stocks.sql
// which you run separately in the Supabase SQL Editor. That file uses
// ON CONFLICT DO UPDATE so it safely overwrites just the fields it knows.

async function main() {
  console.log('Building stock map from NSE CSVs …')
  const stockMap = buildStockMap()
  const stocks = Array.from(stockMap.values())
  console.log(`\nTotal unique stocks: ${stocks.length}`)
  console.log(`  large: ${stocks.filter((s) => s.mcap_category === 'large').length}`)
  console.log(`  mid:   ${stocks.filter((s) => s.mcap_category === 'mid').length}`)
  console.log(`  small: ${stocks.filter((s) => s.mcap_category === 'small').length}`)
  console.log(`  micro: ${stocks.filter((s) => s.mcap_category === 'micro').length}`)

  await upsertCompanies(stocks)
  await upsertCompanyProfile(stocks)

  console.log('\n✅  Done.')
  console.log('\nNext steps:')
  console.log('  1. Run scripts/market_schema.sql in Supabase SQL Editor (creates company_profile + 40 other tables)')
  console.log('  2. Run scripts/seed_stocks.sql in Supabase SQL Editor (enriches Nifty 50 + your portfolio with full details)')
  console.log('  3. Re-run this script to populate company_profile with all 750 stocks')
}

main().catch((e) => { console.error(e); process.exit(1) })
