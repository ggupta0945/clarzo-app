import { NextRequest, NextResponse } from 'next/server'
import { fetchCompanyProfile, fetchRecentCompanyNews } from '@/lib/finnhub'

// GET /api/company?symbol=RELIANCE&days=7
// Returns company profile + recent news in one call.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const symbol = searchParams.get('symbol')?.trim()
  if (!symbol) {
    return NextResponse.json({ error: 'symbol required' }, { status: 400 })
  }
  const days = Math.min(Number(searchParams.get('days') ?? 7), 30)

  const [profile, news] = await Promise.all([
    fetchCompanyProfile(symbol),
    fetchRecentCompanyNews(symbol, days, 10),
  ])

  return NextResponse.json({ symbol, profile, news })
}
