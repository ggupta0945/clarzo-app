import { createClient } from '@supabase/supabase-js'

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing env vars. Run with: npx dotenv -e .env.local -- npx tsx scripts/sync-nav.ts')
  process.exit(1)
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type NavRecord = {
  isin: string
  scheme_name: string
  nav: number
  scheme_type: string
}

async function syncNav() {
  console.log('Fetching AMFI NAV data...')
  const res = await fetch('https://www.amfiindia.com/spages/NAVAll.txt')
  const text = await res.text()
  const lines = text.split('\n')

  const records: NavRecord[] = []
  let currentSchemeType = ''

  for (const line of lines) {
    const trimmed = line.trim()

    if (trimmed.includes('Open Ended Schemes')) {
      currentSchemeType = 'open_ended'
      continue
    }
    if (trimmed.includes('Close Ended Schemes')) {
      currentSchemeType = 'close_ended'
      continue
    }

    const parts = trimmed.split(';')
    if (parts.length < 6) continue

    const [, isin1, isin2, name, nav] = parts
    const navNum = parseFloat(nav)
    const isin = isin1?.trim() || isin2?.trim()

    if (!isin || isNaN(navNum) || navNum <= 0) continue

    records.push({
      isin,
      scheme_name: name?.trim(),
      nav: navNum,
      scheme_type: currentSchemeType,
    })
  }

  console.log(`Parsed ${records.length} valid NAVs`)

  const CHUNK = 500
  for (let i = 0; i < records.length; i += CHUNK) {
    const chunk = records.slice(i, i + CHUNK)
    const { error } = await supabase
      .from('nav_latest')
      .upsert(chunk, { onConflict: 'isin' })

    if (error) {
      console.error('Insert error:', error)
      process.exit(1)
    }
    console.log(`Inserted ${Math.min(i + CHUNK, records.length)}/${records.length}`)
  }

  console.log('✓ NAV sync complete')
}

syncNav()
