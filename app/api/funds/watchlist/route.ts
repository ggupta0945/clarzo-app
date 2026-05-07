// Toggle a scheme in the user's watchlist. Authenticated; RLS on
// mf_watchlist enforces user_id = auth.uid(). POST { scheme_code, action }
// where action is 'add' | 'remove'.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = (await req.json().catch(() => null)) as
    | { scheme_code?: string; action?: 'add' | 'remove' }
    | null
  if (!body?.scheme_code || (body.action !== 'add' && body.action !== 'remove')) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  if (body.action === 'add') {
    const { error } = await supabase
      .from('mf_watchlist')
      .upsert({ user_id: user.id, scheme_code: body.scheme_code }, { onConflict: 'user_id,scheme_code' })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ added: true })
  }

  const { error } = await supabase
    .from('mf_watchlist')
    .delete()
    .eq('user_id', user.id)
    .eq('scheme_code', body.scheme_code)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ removed: true })
}
