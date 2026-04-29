import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import Papa from 'papaparse'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

config({ path: '.env.local' })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(url, key, { auth: { persistSession: false } })

// NSE publishes index constituents as public CSVs. Each list maps to a market
// cap bucket: Nifty 100 = large cap, Midcap 150 = mid, Smallcap 250 = small.
// NSE often blocks server requests — fall back to local CSVs at
// scripts/nse/<file>.csv if a fetch returns 403/empty.
const SOURCES: Array<{ mcap: 'large' | 'mid' | 'small'; url: string; localFile: string }> = [
  {
    mcap: 'large',
    url: 'https://archives.nseindia.com/content/indices/ind_nifty100list.csv',
    localFile: 'scripts/nse/ind_nifty100list.csv',
  },
  {
    mcap: 'mid',
    url: 'https://archives.nseindia.com/content/indices/ind_niftymidcap150list.csv',
    localFile: 'scripts/nse/ind_niftymidcap150list.csv',
  },
  {
    mcap: 'small',
    url: 'https://archives.nseindia.com/content/indices/ind_niftysmallcap250list.csv',
    localFile: 'scripts/nse/ind_niftysmallcap250list.csv',
  },
]

type Company = {
  isin: string
  symbol: string
  name: string
  sector: string | null
  industry: string | null
  mcap_category: 'large' | 'mid' | 'small'
  index_membership: string[]
}

async function fetchCsv(remote: string, localFile: string): Promise<string | null> {
  // Local fallback wins if present — useful when the user pre-downloads the
  // CSV from a browser to bypass NSE's bot blocking.
  const localPath = resolve(localFile)
  if (existsSync(localPath)) {
    console.log(`  using local file ${localFile}`)
    return readFileSync(localPath, 'utf8')
  }

  try {
    const res = await fetch(remote, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
        Accept: 'text/csv,*/*',
      },
    })
    if (!res.ok) {
      console.warn(`  fetch ${remote} -> ${res.status}`)
      return null
    }
    const text = await res.text()
    if (text.length < 100) return null
    return text
  } catch (e) {
    console.warn(`  fetch ${remote} failed:`, (e as Error).message)
    return null
  }
}

function parseCsv(text: string, mcap: 'large' | 'mid' | 'small'): Company[] {
  const { data } = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  })

  const out: Company[] = []
  for (const row of data) {
    const isin = (row['ISIN Code'] || row['ISIN'] || '').trim()
    const symbol = (row['Symbol'] || '').trim()
    const name = (row['Company Name'] || row['Name'] || '').trim()
    const industry = (row['Industry'] || '').trim() || null
    if (!isin || !name) continue

    out.push({
      isin,
      symbol,
      name,
      sector: industry,
      industry,
      mcap_category: mcap,
      index_membership: [`nifty_${mcap}`],
    })
  }
  return out
}

async function main() {
  const all = new Map<string, Company>()
  let fetched = 0

  for (const src of SOURCES) {
    console.log(`Fetching ${src.mcap} cap...`)
    const text = await fetchCsv(src.url, src.localFile)
    if (!text) {
      console.warn(`  ⚠️  skipped ${src.mcap} — no data (NSE may have blocked the request; download to ${src.localFile} and re-run)`)
      continue
    }
    const rows = parseCsv(text, src.mcap)
    fetched += rows.length
    for (const r of rows) all.set(r.isin, r)
    console.log(`  parsed ${rows.length} rows`)
  }

  if (all.size === 0) {
    console.error('No companies parsed. NSE likely blocked all requests.')
    console.error('Manual fallback: open each URL in a browser, save the CSV to scripts/nse/, then re-run.')
    process.exit(1)
  }

  const rows = Array.from(all.values())
  console.log(`\nUpserting ${rows.length} companies (deduped from ${fetched})...`)

  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200)
    const { error } = await supabase.from('companies').upsert(chunk, { onConflict: 'isin' })
    if (error) {
      console.error('Upsert error:', error)
      process.exit(1)
    }
    console.log(`  ${Math.min(i + 200, rows.length)}/${rows.length}`)
  }

  console.log(`\n✓ ${rows.length} companies in public.companies.`)
}

main()
