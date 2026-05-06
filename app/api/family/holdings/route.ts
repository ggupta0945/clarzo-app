import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserHoldings, computePortfolioSummary } from '@/lib/portfolio'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  // Get all family member user IDs
  const { data: rows } = await supabase
    .from('family_members')
    .select('owner_id, member_id')
    .or(`owner_id.eq.${user.id},member_id.eq.${user.id}`)

  const memberIds: string[] = [user.id]
  for (const r of rows ?? []) {
    const other = r.owner_id === user.id ? r.member_id : r.owner_id
    if (!memberIds.includes(other as string)) memberIds.push(other as string)
  }

  // Fetch + compute per member
  const results = await Promise.all(
    memberIds.map(async (uid) => {
      const holdings = await getUserHoldings(uid, supabase)
      const summary = computePortfolioSummary(holdings)
      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', uid)
        .single()
      return { user_id: uid, name: profile?.name ?? 'Unknown', summary, isSelf: uid === user.id }
    }),
  )

  return NextResponse.json({ members: results })
}
