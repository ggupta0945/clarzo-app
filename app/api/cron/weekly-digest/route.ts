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
  let failed = 0
  // Tally skips by reason so the log line is informative instead of
  // collapsing "user has no holdings" and "Resend sender domain not
  // verified" into the same counter.
  const skipReasons: Record<string, number> = {}
  const errors: Array<{ userId: string; message: string }> = []

  for (const userId of userIds) {
    try {
      const result = await sendWeeklyDigestForUser(userId)
      if (result.skipped) {
        skipReasons[result.reason] = (skipReasons[result.reason] ?? 0) + 1
      } else {
        sent += 1
      }
    } catch (error) {
      failed += 1
      const message = error instanceof Error ? error.message : 'unknown_error'
      errors.push({ userId, message })
      // Only log genuine failures — Resend domain/recipient skips are
      // classified inside sendWeeklyDigestForUser and don't reach here.
      console.error('weekly digest failed:', { userId, error })
    }
  }

  const skipped = Object.values(skipReasons).reduce((s, n) => s + n, 0)

  return NextResponse.json({
    sent,
    skipped,
    skipReasons,
    failed,
    total: userIds.length,
    errors: errors.slice(0, 10),
  })
}
