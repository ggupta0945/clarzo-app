import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Manual asset entry for FD, Gold, Real Estate, and Debt.
// These can't be parsed from broker CSVs so the user fills a form.

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = await req.json()
  const { asset_type } = body as { asset_type: string }

  let toInsert: Record<string, unknown> | null = null

  if (asset_type === 'fd') {
    const { bank, principal, interest_rate, tenure_months, deposit_date } = body
    if (!bank || !principal || principal <= 0) {
      return NextResponse.json({ error: 'bank and principal are required' }, { status: 400 })
    }
    const rate = Number(interest_rate) || 0
    const months = Number(tenure_months) || 12
    // Simple interest to estimate current value
    const depositDate = deposit_date ? new Date(deposit_date) : new Date()
    const now = new Date()
    const monthsElapsed = Math.max(
      0,
      (now.getFullYear() - depositDate.getFullYear()) * 12 + (now.getMonth() - depositDate.getMonth()),
    )
    const currentValue = Number(principal) * (1 + (rate / 100) * (Math.min(monthsElapsed, months) / 12))

    toInsert = {
      user_id: user.id,
      scheme_name: `FD — ${bank}`,
      asset_type: 'fd',
      units: 1,
      avg_cost: Number(principal),
      current_price: currentValue,
      isin: null,
      source: 'manual',
      metadata: { bank, interest_rate: rate, tenure_months: months, deposit_date: depositDate.toISOString() },
    }
  } else if (asset_type === 'gold') {
    const { gold_type, weight_grams, purchase_price_per_gram, current_price_per_gram } = body
    if (!weight_grams || weight_grams <= 0) {
      return NextResponse.json({ error: 'weight_grams is required' }, { status: 400 })
    }
    toInsert = {
      user_id: user.id,
      scheme_name: `Gold — ${gold_type || 'Physical'}`,
      asset_type: 'gold',
      units: Number(weight_grams),
      avg_cost: Number(purchase_price_per_gram) || null,
      current_price: Number(current_price_per_gram) || null,
      isin: null,
      source: 'manual',
      metadata: { gold_type: gold_type || 'physical' },
    }
  } else if (asset_type === 'real_estate') {
    const { property_desc, city, purchase_price, current_market_value, emi_amount } = body
    if (!property_desc || !current_market_value || current_market_value <= 0) {
      return NextResponse.json({ error: 'property_desc and current_market_value are required' }, { status: 400 })
    }
    toInsert = {
      user_id: user.id,
      scheme_name: property_desc,
      asset_type: 'real_estate',
      units: 1,
      avg_cost: Number(purchase_price) || Number(current_market_value),
      current_price: Number(current_market_value),
      isin: null,
      source: 'manual',
      metadata: { city, emi_amount: Number(emi_amount) || 0 },
    }
  } else if (asset_type === 'debt') {
    const { loan_type, lender, outstanding_amount, emi_amount, interest_rate } = body
    if (!loan_type || !outstanding_amount || outstanding_amount <= 0) {
      return NextResponse.json({ error: 'loan_type and outstanding_amount are required' }, { status: 400 })
    }
    toInsert = {
      user_id: user.id,
      scheme_name: `Loan — ${loan_type}`,
      asset_type: 'debt',
      // units × current_price = outstanding_amount; portfolio.ts negates debt
      units: Number(outstanding_amount),
      avg_cost: 1,
      current_price: 1,
      isin: null,
      source: 'manual',
      metadata: { loan_type, lender, emi_amount: Number(emi_amount) || 0, interest_rate: Number(interest_rate) || 0 },
    }
  } else {
    return NextResponse.json({ error: 'unknown asset_type' }, { status: 400 })
  }

  const { error } = await supabase.from('holdings').insert(toInsert)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Ensure dashboard cookie is set so the layout picks up holdings
  const res = NextResponse.json({ ok: true })
  res.cookies.set('clz_has_holdings', '1', {
    httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30,
  })
  return res
}
