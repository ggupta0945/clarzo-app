import { NextResponse } from 'next/server'
import { sendWeeklyDigestForUser } from '@/lib/digest'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  try {
    const result = await sendWeeklyDigestForUser(user.id, { sample: true })
    if (result.skipped) {
      return NextResponse.json({ error: result.reason }, { status: 400 })
    }

    return NextResponse.json({ success: true, email_id: result.emailId })
  } catch (error) {
    console.error('sample digest failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'sample_digest_failed' },
      { status: 500 },
    )
  }
}
