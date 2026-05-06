import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  // All rows where I'm owner OR member
  const { data: rows } = await supabase
    .from('family_members')
    .select('id, owner_id, member_id, relationship, created_at')
    .or(`owner_id.eq.${user.id},member_id.eq.${user.id}`)

  if (!rows || rows.length === 0) return NextResponse.json({ members: [] })

  // Collect the other person's user_id for each row
  const otherIds = rows.map((r) => (r.owner_id === user.id ? r.member_id : r.owner_id)) as string[]
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, name, avatar_url')
    .in('id', otherIds)

  const profileMap = new Map((profiles ?? []).map((p) => [p.id as string, p]))

  const members = rows.map((r) => {
    const otherId = (r.owner_id === user.id ? r.member_id : r.owner_id) as string
    const prof = profileMap.get(otherId)
    return {
      id: r.id,
      user_id: otherId,
      name: prof?.name ?? 'Unknown',
      relationship: r.relationship,
      is_owner: r.owner_id === user.id,
      created_at: r.created_at,
    }
  })

  return NextResponse.json({ members })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { id } = await req.json() as { id: string }
  await supabase
    .from('family_members')
    .delete()
    .eq('id', id)
    .or(`owner_id.eq.${user.id},member_id.eq.${user.id}`)

  return NextResponse.json({ ok: true })
}
