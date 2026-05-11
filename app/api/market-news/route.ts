import { NextRequest, NextResponse } from 'next/server'
import { fetchMarketNews } from '@/lib/finnhub'

// GET /api/market-news?category=general&limit=20
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const category = (searchParams.get('category') ?? 'general') as Parameters<typeof fetchMarketNews>[0]
  const limit = Math.min(Number(searchParams.get('limit') ?? 20), 50)

  const news = await fetchMarketNews(category, limit)
  return NextResponse.json({ news })
}
