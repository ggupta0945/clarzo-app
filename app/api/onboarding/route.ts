import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = await req.json()
  const { age, dependents, income, existing_debt, insurance, horizon, drop_reaction, goals, risk_score } = body

  const { error } = await supabase
    .from('profiles')
    .update({
      onboarding_completed: true,
      risk_profile: { age, dependents, income, existing_debt, insurance, horizon, drop_reaction, goals, risk_score },
    })
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
