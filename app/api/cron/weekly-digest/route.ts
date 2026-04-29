import { NextRequest, NextResponse } from 'next/server'
import { getUsersWithHoldings, sendWeeklyDigestForUser } from '@/lib/digest'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const userIds = await getUsersWithHoldings()
  let sent = 0
  let skipped = 0
  let failed = 0
  const errors: Array<{ userId: string; message: string }> = []

  for (const userId of userIds) {
    try {
      const result = await sendWeeklyDigestForUser(userId)
      if (result.skipped) {
        skipped += 1
      } else {
        sent += 1
      }
    } catch (error) {
      failed += 1
      const message = error instanceof Error ? error.message : 'unknown_error'
      errors.push({ userId, message })
      console.error('weekly digest failed:', { userId, error })
    }
  }

  return NextResponse.json({
    sent,
    skipped,
    failed,
    total: userIds.length,
    errors: errors.slice(0, 10),
  })
}
