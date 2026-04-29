import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('goals')
    .select('id, title, target_amount, target_year, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ goals: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = (await req.json()) as {
    title?: string
    target_amount?: number
    target_year?: number
  }
  const title = body.title?.trim()
  const target_amount = Number(body.target_amount)
  const target_year = Number(body.target_year)

  if (!title || !Number.isFinite(target_amount) || target_amount <= 0) {
    return NextResponse.json({ error: 'invalid_amount' }, { status: 400 })
  }
  if (!Number.isFinite(target_year) || target_year < 2020 || target_year > 2100) {
    return NextResponse.json({ error: 'invalid_year' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('goals')
    .insert({ user_id: user.id, title, target_amount, target_year })
    .select('id, title, target_amount, target_year, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ goal: data })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 })

  const { error } = await supabase
    .from('goals')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
