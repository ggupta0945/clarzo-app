import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { id } = await params
  const { error } = await supabase
    .from('holdings')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id) // RLS guard

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  // Only allow updating these fields
  const allowed: Record<string, unknown> = {}
  if (body.units != null) allowed.units = Number(body.units)
  if (body.avg_cost != null) allowed.avg_cost = Number(body.avg_cost)
  if (body.current_price != null) allowed.current_price = Number(body.current_price)
  if (body.scheme_name != null) allowed.scheme_name = String(body.scheme_name)
  if (body.metadata != null) allowed.metadata = body.metadata

  if (Object.keys(allowed).length === 0) {
    return NextResponse.json({ error: 'no valid fields' }, { status: 400 })
  }

  const { error } = await supabase
    .from('holdings')
    .update(allowed)
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
