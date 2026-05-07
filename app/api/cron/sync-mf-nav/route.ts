// Daily NAV refresh for tracked schemes. Hits AMFI's NAVAll feed and
// upserts (a) the latest NAV row into mf_nav_history (today's date) and
// (b) the legacy nav_latest row for portfolio enrichment.
//
// Requires Authorization: Bearer ${CRON_SECRET}. Wired in vercel.json.

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const maxDuration = 60

type AmfiRow = {
  scheme_code: string
  isin: string | null
  scheme_name: string
  nav: number
  scheme_type: string
}

function parseAmfi(text: string): AmfiRow[] {
  const out: AmfiRow[] = []
  let scheme_type = ''
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line) continue
    if (line.includes('Open Ended Schemes')) { scheme_type = 'open_ended'; continue }
    if (line.includes('Close Ended Schemes')) { scheme_type = 'close_ended'; continue }
    if (line.includes('Interval Fund Schemes')) { scheme_type = 'interval'; continue }
    if (!line.includes(';')) continue

    const parts = line.split(';')
    if (parts.length < 6) continue
    const [code, isin1, isin2, name, navStr] = parts
    if (!/^\d+$/.test(code?.trim() ?? '')) continue
    const nav = parseFloat(navStr)
    if (!Number.isFinite(nav) || nav <= 0) continue
    out.push({
      scheme_code: code.trim(),
      isin: (isin1?.trim() || isin2?.trim()) || null,
      scheme_name: name.trim(),
      nav,
      scheme_type: scheme_type || 'open_ended',
    })
  }
  return out
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const res = await fetch('https://www.amfiindia.com/spages/NAVAll.txt')
  if (!res.ok) return NextResponse.json({ error: 'amfi_fetch_failed', status: res.status }, { status: 502 })
  const text = await res.text()
  const rows = parseAmfi(text)
  if (rows.length === 0) return NextResponse.json({ error: 'no_rows_parsed' }, { status: 502 })

  const supabase = createAdminClient()
  const today = new Date().toISOString().slice(0, 10)

  // Update legacy nav_latest by ISIN (matches existing portfolio enrichment).
  const navLatestRows = rows
    .filter((r) => r.isin)
    .map((r) => ({
      isin: r.isin!,
      scheme_name: r.scheme_name,
      nav: r.nav,
      scheme_type: r.scheme_type,
    }))

  const CHUNK = 1000
  for (let i = 0; i < navLatestRows.length; i += CHUNK) {
    const slice = navLatestRows.slice(i, i + CHUNK)
    await supabase.from('nav_latest').upsert(slice, { onConflict: 'isin' })
  }

  // Append to mf_nav_history. Only schemes that already exist in mf_schemes
  // (FK constraint). Pull the set of known codes to filter.
  const knownCodes = new Set<string>()
  let off = 0
  while (true) {
    const { data, error } = await supabase
      .from('mf_schemes')
      .select('scheme_code')
      .range(off, off + 999)
    if (error || !data || data.length === 0) break
    for (const r of data as Array<{ scheme_code: string }>) knownCodes.add(r.scheme_code)
    if (data.length < 1000) break
    off += 1000
  }

  const histRows = rows
    .filter((r) => knownCodes.has(r.scheme_code))
    .map((r) => ({ scheme_code: r.scheme_code, nav_date: today, nav: r.nav }))

  let inserted = 0
  for (let i = 0; i < histRows.length; i += CHUNK) {
    const slice = histRows.slice(i, i + CHUNK)
    const { error } = await supabase
      .from('mf_nav_history')
      .upsert(slice, { onConflict: 'scheme_code,nav_date' })
    if (!error) inserted += slice.length
  }

  return NextResponse.json({
    parsed: rows.length,
    nav_latest_upserts: navLatestRows.length,
    history_upserts: inserted,
    date: today,
  })
}
