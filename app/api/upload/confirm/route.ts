import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fuzzyMatchISINs } from '@/lib/fuzzy-match'
import type { ParsedHolding } from '@/lib/parsers'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const holdings = body.holdings as ParsedHolding[] | undefined

  if (!Array.isArray(holdings) || holdings.length === 0) {
    return NextResponse.json({ error: 'no_holdings' }, { status: 400 })
  }

  const namesNeedingISIN = holdings.filter((h) => !h.isin).map((h) => h.scheme_name)
  const isinMap = await fuzzyMatchISINs(supabase, namesNeedingISIN)

  const enriched = holdings.map((h) => ({
    ...h,
    isin: h.isin ?? isinMap.get(h.scheme_name) ?? null,
  }))

  // Pipe through current prices from the source CSV (e.g. Zerodha "Closing
  // price" for stocks) into nav_latest so dashboard P&L works without a
  // separate stock-price feed.
  const priceRows = enriched
    .filter((h) => h.isin && h.current_price && h.current_price > 0)
    .map((h) => ({
      isin: h.isin!,
      scheme_name: h.scheme_name,
      nav: h.current_price!,
      scheme_type: h.asset_type,
    }))

  if (priceRows.length > 0) {
    const { error: priceErr } = await supabase
      .from('nav_latest')
      .upsert(priceRows, { onConflict: 'isin' })
    if (priceErr) {
      console.error('Price upsert error:', priceErr)
    }
  }

  const toInsert = enriched.map((h) => ({
    user_id: user.id,
    isin: h.isin,
    scheme_name: h.scheme_name,
    units: h.units,
    avg_cost: h.avg_cost,
    asset_type: h.asset_type,
    source: h.source,
  }))

  const { error } = await supabase.from('holdings').insert(toInsert)

  if (error) {
    console.error('Holdings insert error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const matchedCount = enriched.filter((h) => h.isin).length

  return NextResponse.json({
    success: true,
    inserted: toInsert.length,
    matched: matchedCount,
    unmatched: toInsert.length - matchedCount,
  })
}
