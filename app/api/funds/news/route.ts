// Server-side proxy for fund-specific Google News results. Public RSS, no
// API key, but we keep the call server-side so we can apply caching headers
// and stay clear of CORS.

import { NextRequest, NextResponse } from 'next/server'
import { fetchFundNews } from '@/lib/mutual-funds/news'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const name = searchParams.get('name')?.trim()
  const limit = Math.min(20, Math.max(1, Number(searchParams.get('limit') ?? '8')))
  if (!name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }

  const items = await fetchFundNews(name, limit)
  return NextResponse.json({ items }, {
    headers: {
      'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
    },
  })
}
