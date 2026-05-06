// Nifty 50 historical fetcher. Yahoo's `^NSEI` endpoint returns daily OHLC
// arrays without auth; we keep just the closes for the area chart. Cached
// for an hour because index-level data doesn't move minute-to-minute, and
// we want the dashboard server render to be fast.

const YF_CHART = 'https://query1.finance.yahoo.com/v8/finance/chart'
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'

export type NiftyRange = '1mo' | '3mo' | '6mo' | '1y'

export type NiftyPoint = {
  t: number // unix seconds
  close: number
}

export type NiftyData = {
  range: NiftyRange
  points: NiftyPoint[]
  current: number | null
  rangeStart: number | null // close at the start of the range
  change: number
  changePct: number
}

type ChartResponse = {
  chart?: {
    result?: Array<{
      meta?: {
        regularMarketPrice?: number
        chartPreviousClose?: number
      }
      timestamp?: number[]
      indicators?: {
        quote?: Array<{
          close?: Array<number | null>
        }>
      }
    }>
  }
}

export async function fetchNifty(range: NiftyRange = '6mo'): Promise<NiftyData | null> {
  const url = `${YF_CHART}/%5ENSEI?range=${range}&interval=1d`
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      next: { revalidate: 60 * 60 }, // 1h
    })
    if (!res.ok) return null
    const json = (await res.json()) as ChartResponse
    const result = json.chart?.result?.[0]
    if (!result) return null

    const timestamps = result.timestamp ?? []
    const closes = result.indicators?.quote?.[0]?.close ?? []

    const points: NiftyPoint[] = []
    for (let i = 0; i < timestamps.length; i++) {
      const close = closes[i]
      if (typeof close === 'number' && Number.isFinite(close)) {
        points.push({ t: timestamps[i], close })
      }
    }

    if (points.length < 2) return null

    const current = result.meta?.regularMarketPrice ?? points[points.length - 1].close
    // For the displayed change, we compare the latest close to the first
    // point in the requested range — that's what users expect when they
    // pick "1Y" vs "1M".
    const rangeStart = points[0].close
    const change = current - rangeStart
    const changePct = rangeStart > 0 ? (change / rangeStart) * 100 : 0

    return { range, points, current, rangeStart, change, changePct }
  } catch {
    return null
  }
}
