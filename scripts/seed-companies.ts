import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

config({ path: '.env.local' })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(url, key, { auth: { persistSession: false } })

type Company = {
  isin: string
  symbol: string
  name: string
  sector: string
  industry: string | null
  mcap_category: 'large' | 'mid' | 'small'
  corp_group: string | null
}

// Hand-curated starter set: Adani group + most Nifty 50 names + a few common
// mid-caps. Covers the typical Indian retail portfolio out of the box.
// To extend: append entries to companies-seed.json or run the NSE import path.
const STARTER: Company[] = [
  // Adani group
  { isin: 'INE423A01024', symbol: 'ADANIENT', name: 'Adani Enterprises', sector: 'Diversified', industry: 'Trading', mcap_category: 'large', corp_group: 'Adani' },
  { isin: 'INE742F01042', symbol: 'ADANIPORTS', name: 'Adani Ports & SEZ', sector: 'Services', industry: 'Logistics', mcap_category: 'large', corp_group: 'Adani' },
  { isin: 'INE814H01011', symbol: 'ADANIPOWER', name: 'Adani Power', sector: 'Power', industry: 'Power Generation', mcap_category: 'large', corp_group: 'Adani' },
  { isin: 'INE364U01010', symbol: 'ADANIGREEN', name: 'Adani Green Energy', sector: 'Power', industry: 'Renewable Power', mcap_category: 'large', corp_group: 'Adani' },
  { isin: 'INE399L01023', symbol: 'ATGL', name: 'Adani Total Gas', sector: 'Energy', industry: 'Gas Distribution', mcap_category: 'large', corp_group: 'Adani' },
  { isin: 'INE931S01010', symbol: 'ADANIENSOL', name: 'Adani Energy Solutions', sector: 'Power', industry: 'Power Transmission', mcap_category: 'large', corp_group: 'Adani' },
  { isin: 'INE699H01024', symbol: 'AWL', name: 'Adani Wilmar', sector: 'FMCG', industry: 'Edible Oils', mcap_category: 'mid', corp_group: 'Adani' },
  { isin: 'INE012A01025', symbol: 'ACC', name: 'ACC', sector: 'Construction Materials', industry: 'Cement', mcap_category: 'large', corp_group: 'Adani' },
  { isin: 'INE079A01024', symbol: 'AMBUJACEM', name: 'Ambuja Cements', sector: 'Construction Materials', industry: 'Cement', mcap_category: 'large', corp_group: 'Adani' },
  { isin: 'INE155F01016', symbol: 'NDTV', name: 'NDTV', sector: 'Media', industry: 'Broadcasting', mcap_category: 'small', corp_group: 'Adani' },

  // Tata group
  { isin: 'INE467B01029', symbol: 'TCS', name: 'Tata Consultancy Services', sector: 'IT', industry: 'IT Services', mcap_category: 'large', corp_group: 'Tata' },
  { isin: 'INE155A01022', symbol: 'TATAMOTORS', name: 'Tata Motors', sector: 'Auto', industry: 'Auto', mcap_category: 'large', corp_group: 'Tata' },
  { isin: 'INE081A01020', symbol: 'TATASTEEL', name: 'Tata Steel', sector: 'Metals', industry: 'Steel', mcap_category: 'large', corp_group: 'Tata' },
  { isin: 'INE192A01025', symbol: 'TATACONSUM', name: 'Tata Consumer Products', sector: 'FMCG', industry: 'Beverages', mcap_category: 'large', corp_group: 'Tata' },
  { isin: 'INE685A01028', symbol: 'TITAN', name: 'Titan Company', sector: 'Consumer Durables', industry: 'Consumer Durables', mcap_category: 'large', corp_group: 'Tata' },

  // Reliance group
  { isin: 'INE002A01018', symbol: 'RELIANCE', name: 'Reliance Industries', sector: 'Energy', industry: 'Refineries', mcap_category: 'large', corp_group: 'Reliance' },

  // Banking & financials
  { isin: 'INE040A01034', symbol: 'HDFCBANK', name: 'HDFC Bank', sector: 'Financial Services', industry: 'Banking', mcap_category: 'large', corp_group: null },
  { isin: 'INE090A01021', symbol: 'ICICIBANK', name: 'ICICI Bank', sector: 'Financial Services', industry: 'Banking', mcap_category: 'large', corp_group: null },
  { isin: 'INE237A01028', symbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank', sector: 'Financial Services', industry: 'Banking', mcap_category: 'large', corp_group: null },
  { isin: 'INE062A01020', symbol: 'SBIN', name: 'State Bank of India', sector: 'Financial Services', industry: 'Banking', mcap_category: 'large', corp_group: null },
  { isin: 'INE238A01034', symbol: 'AXISBANK', name: 'Axis Bank', sector: 'Financial Services', industry: 'Banking', mcap_category: 'large', corp_group: null },
  { isin: 'INE296A01024', symbol: 'BAJFINANCE', name: 'Bajaj Finance', sector: 'Financial Services', industry: 'NBFC', mcap_category: 'large', corp_group: 'Bajaj' },
  { isin: 'INE118H01025', symbol: 'BSE', name: 'BSE', sector: 'Financial Services', industry: 'Stock Exchange', mcap_category: 'mid', corp_group: null },

  // IT
  { isin: 'INE009A01021', symbol: 'INFY', name: 'Infosys', sector: 'IT', industry: 'IT Services', mcap_category: 'large', corp_group: null },
  { isin: 'INE860A01027', symbol: 'HCLTECH', name: 'HCL Technologies', sector: 'IT', industry: 'IT Services', mcap_category: 'large', corp_group: null },
  { isin: 'INE075A01022', symbol: 'WIPRO', name: 'Wipro', sector: 'IT', industry: 'IT Services', mcap_category: 'large', corp_group: null },

  // FMCG / Consumer
  { isin: 'INE030A01027', symbol: 'HINDUNILVR', name: 'Hindustan Unilever', sector: 'FMCG', industry: 'FMCG', mcap_category: 'large', corp_group: null },
  { isin: 'INE154A01025', symbol: 'ITC', name: 'ITC', sector: 'FMCG', industry: 'Diversified FMCG', mcap_category: 'large', corp_group: null },
  { isin: 'INE021A01026', symbol: 'ASIANPAINT', name: 'Asian Paints', sector: 'Consumer Durables', industry: 'Paints', mcap_category: 'large', corp_group: null },

  // Auto
  { isin: 'INE585B01010', symbol: 'MARUTI', name: 'Maruti Suzuki', sector: 'Auto', industry: 'Auto', mcap_category: 'large', corp_group: null },

  // Pharma
  { isin: 'INE044A01036', symbol: 'SUNPHARMA', name: 'Sun Pharmaceutical', sector: 'Pharma', industry: 'Pharma', mcap_category: 'large', corp_group: null },

  // Power / Energy
  { isin: 'INE733E01010', symbol: 'NTPC', name: 'NTPC', sector: 'Power', industry: 'Power Generation', mcap_category: 'large', corp_group: null },
  { isin: 'INE752E01010', symbol: 'POWERGRID', name: 'Power Grid Corporation', sector: 'Power', industry: 'Power Transmission', mcap_category: 'large', corp_group: null },
  { isin: 'INE213A01029', symbol: 'ONGC', name: 'Oil & Natural Gas Corp', sector: 'Energy', industry: 'Oil Exploration', mcap_category: 'large', corp_group: null },

  // Telecom
  { isin: 'INE397D01024', symbol: 'BHARTIARTL', name: 'Bharti Airtel', sector: 'Telecom', industry: 'Telecom Services', mcap_category: 'large', corp_group: null },

  // Capital Goods
  { isin: 'INE018A01030', symbol: 'LT', name: 'Larsen & Toubro', sector: 'Capital Goods', industry: 'Construction', mcap_category: 'large', corp_group: null },
]

async function loadOptionalJson(filename: string): Promise<Company[]> {
  try {
    const path = resolve(filename)
    const raw = readFileSync(path, 'utf8')
    return JSON.parse(raw) as Company[]
  } catch {
    return []
  }
}

async function main() {
  const extras = await loadOptionalJson('scripts/companies-seed.json')
  const all = [...STARTER, ...extras]

  // Dedupe by ISIN, last write wins (so user's JSON overrides starter).
  const map = new Map(all.map((c) => [c.isin, c]))
  const rows = Array.from(map.values())

  console.log(`Upserting ${rows.length} companies (starter: ${STARTER.length}, extras: ${extras.length})…`)

  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200)
    const { error } = await supabase.from('companies').upsert(chunk, { onConflict: 'isin' })
    if (error) {
      console.error(error)
      process.exit(1)
    }
  }

  console.log(`✓ Done. ${rows.length} companies in public.companies.`)
}

main()
