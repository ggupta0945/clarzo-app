import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ messages: [] })

  // Most recent 50 turns. RLS guarantees the user_id filter, but we add it
  // explicitly so the query plan uses the (user_id, created_at) index.
  const { data, error } = await supabase
    .from('chat_messages')
    .select('id, role, content, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(50)

  if (error) {
    console.error('chat history fetch:', error)
    return NextResponse.json({ messages: [] })
  }

  return NextResponse.json({ messages: data ?? [] })
}
