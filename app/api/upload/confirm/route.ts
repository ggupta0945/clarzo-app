import { createClient } from '@/lib/supabase/server'
import { type ParsedHolding } from '@/lib/parsers'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  let holdings: ParsedHolding[]
  try {
    const body = await request.json()
    holdings = body.holdings
    if (!Array.isArray(holdings) || holdings.length === 0) {
      return Response.json({ success: false, error: 'No holdings provided' }, { status: 400 })
    }
  } catch {
    return Response.json({ success: false, error: 'Invalid request body' }, { status: 400 })
  }

  // Validate each row minimally
  for (const h of holdings) {
    if (!h.scheme_name || typeof h.units !== 'number' || h.units <= 0) {
      return Response.json(
        { success: false, error: `Invalid holding: ${h.scheme_name ?? 'unknown'}` },
        { status: 400 }
      )
    }
  }

  // Replace all holdings for this user atomically
  const { error: deleteError } = await supabase
    .from('holdings')
    .delete()
    .eq('user_id', user.id)

  if (deleteError) {
    return Response.json({ success: false, error: 'Failed to clear existing holdings' }, { status: 500 })
  }

  const rows = holdings.map((h) => ({
    user_id: user.id,
    isin: h.isin ?? null,
    scheme_name: h.scheme_name,
    units: h.units,
    avg_cost: h.avg_cost ?? null,
    asset_type: h.asset_type,
    source: h.source,
  }))

  const { error: insertError } = await supabase.from('holdings').insert(rows)

  if (insertError) {
    console.error('Insert error:', insertError)
    return Response.json({ success: false, error: 'Failed to save holdings' }, { status: 500 })
  }

  return Response.json({ success: true, count: rows.length })
}
