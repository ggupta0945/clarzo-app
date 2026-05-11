import { NextRequest, NextResponse } from 'next/server'
import { fetchEarningsCalendar } from '@/lib/finnhub'

// GET /api/earnings?from=2026-05-01&to=2026-05-31
// Defaults to current month if params are omitted.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)

  const now = new Date()
  const defaultFrom = now.toISOString().split('T')[0]
  const defaultTo = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

  const from = searchParams.get('from') ?? defaultFrom
  const to = searchParams.get('to') ?? defaultTo

  const earnings = await fetchEarningsCalendar(from, to)
  return NextResponse.json({ from, to, earnings })
}
