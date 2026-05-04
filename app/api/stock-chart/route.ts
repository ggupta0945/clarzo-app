import { NextRequest, NextResponse } from 'next/server'

// Proxies Yahoo Finance for the /dashboard/stocks sparklines. The page is a
// client component and Yahoo doesn't set CORS headers, so the browser can't
// hit Yahoo directly — this route does the fetch server-side.
//
// Inputs (any one):
//   ?symbol=RELIANCE.NS       — direct ticker, fastest path
//   ?name=RELIANCE INDUSTRIES — full name, resolved via Yahoo search
//
// Cache: Next's fetch cache, 60s revalidate. Search results live longer (1d)
// because name→symbol is effectively static.

const YF_CHART = 'https://query1.finance.yahoo.com/v8/finance/chart'
const YF_SEARCH = 'https://query1.finance.yahoo.com/v1/finance/search'

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'

type SearchResponse = {
  quotes?: Array<{
    symbol?: string
    exchange?: string
    quoteType?: string
  }>
}

type ChartResponse = {
  chart?: {
    result?: Array<{
      meta?: {
        regularMarketPrice?: number
        chartPreviousClose?: number
        symbol?: string
      }
      timestamp?: number[]
      indicators?: {
        quote?: Array<{
          close?: Array<number | null>
        }>
      }
    }>
    error?: { code?: string; description?: string } | null
  }
}

async function resolveSymbol(name: string): Promise<string | null> {
  const url = `${YF_SEARCH}?q=${encodeURIComponent(name)}&quotesCount=6&newsCount=0`
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      next: { revalidate: 60 * 60 * 24 },
    })
    if (!res.ok) return null
    const json = (await res.json()) as SearchResponse
    const quotes = json.quotes ?? []
    // Prefer NSE; fall back to BSE; fall back to first equity match.
    const nse = quotes.find((q) => q.exchange === 'NSI' && q.quoteType === 'EQUITY')
    if (nse?.symbol) return nse.symbol
    const bse = quotes.find((q) => q.exchange === 'BSE' && q.quoteType === 'EQUITY')
    if (bse?.symbol) return bse.symbol
    const eq = quotes.find((q) => q.quoteType === 'EQUITY')
    return eq?.symbol ?? null
  } catch {
    return null
  }
}

async function fetchChart(symbol: string) {
  const url = `${YF_CHART}/${encodeURIComponent(symbol)}?interval=5m&range=1d`
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'application/json' },
    next: { revalidate: 60 },
  })
  if (!res.ok) return null
  const json = (await res.json()) as ChartResponse
  const result = json.chart?.result?.[0]
  if (!result) return null

  const closes = result.indicators?.quote?.[0]?.close ?? []
  const points = closes.filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
  if (points.length < 2) return null

  const previousClose = result.meta?.chartPreviousClose ?? points[0]
  const last = points[points.length - 1]
  const change = last - previousClose
  const changePct = previousClose > 0 ? (change / previousClose) * 100 : 0

  return {
    symbol,
    points,
    previousClose,
    last,
    change,
    changePct,
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const symbolParam = searchParams.get('symbol')?.trim()
  const nameParam = searchParams.get('name')?.trim()

  if (!symbolParam && !nameParam) {
    return NextResponse.json({ error: 'symbol or name required' }, { status: 400 })
  }

  let symbol = symbolParam || null

  if (!symbol && nameParam) {
    symbol = await resolveSymbol(nameParam)
  }

  if (!symbol) {
    return NextResponse.json({ error: 'symbol_not_found' }, { status: 404 })
  }

  const chart = await fetchChart(symbol)
  if (!chart) {
    // If a direct .NS lookup didn't work, try the search-derived ticker as a
    // fallback. This handles cases like "HDFCBANK" vs "HDFC BANK".
    if (symbolParam && nameParam) {
      const resolved = await resolveSymbol(nameParam)
      if (resolved && resolved !== symbol) {
        const retry = await fetchChart(resolved)
        if (retry) return NextResponse.json(retry)
      }
    }
    return NextResponse.json({ error: 'chart_unavailable', symbol }, { status: 502 })
  }

  return NextResponse.json(chart)
}
