import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { SAMPLE_PORTFOLIO } from '@/lib/sample-portfolio'

// POST seeds the canned demo portfolio into the user's holdings (flagged
// is_sample=true). Idempotent — if a demo is already loaded we no-op.
// DELETE wipes only the sample rows for this user, leaving any real
// holdings intact.

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  // No-op if sample already loaded — prevents duplicates on double-click.
  const { count: existingSamples } = await supabase
    .from('holdings')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_sample', true)

  if ((existingSamples ?? 0) > 0) {
    return NextResponse.json({ ok: true, seeded: 0, message: 'already loaded' })
  }

  const rows = SAMPLE_PORTFOLIO.map((h) => ({
    user_id: user.id,
    isin: h.isin,
    scheme_name: h.scheme_name,
    asset_type: h.asset_type,
    units: h.units,
    avg_cost: h.avg_cost,
    current_price: h.current_price,
    current_value_at_import: h.units * h.current_price,
    is_sample: true,
  }))

  const { error } = await supabase.from('holdings').insert(rows)
  if (error) {
    console.error('[sample-portfolio] insert failed:', error)
    return NextResponse.json({ error: 'insert_failed', detail: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, seeded: rows.length })
}

export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  // Only sample rows — real holdings (if any) are not touched.
  const { error } = await supabase
    .from('holdings')
    .delete()
    .eq('user_id', user.id)
    .eq('is_sample', true)

  if (error) {
    console.error('[sample-portfolio] delete failed:', error)
    return NextResponse.json({ error: 'delete_failed', detail: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
