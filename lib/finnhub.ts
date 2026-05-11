// Finnhub API client for market news, company profiles, and earnings.
// All fetches use Next.js fetch cache — market news 5 min, company data 30 min.
// Finnhub uses NSE:SYMBOL format for Indian stocks.

const BASE = 'https://finnhub.io/api/v1'

function key() {
  return process.env.FINNHUB_API_KEY ?? ''
}

// Convert Yahoo Finance ticker (RELIANCE.NS) → Finnhub exchange:symbol format
export function toFinnhubSymbol(symbol: string): string {
  const s = symbol.trim().toUpperCase()
  if (s.includes(':')) return s
  if (s.endsWith('.NS')) return `NSE:${s.slice(0, -3)}`
  if (s.endsWith('.BO')) return `BSE:${s.slice(0, -3)}`
  return `NSE:${s}`
}

export type NewsItem = {
  id: number
  headline: string
  summary: string
  source: string
  url: string
  image: string
  datetime: number // unix seconds
  category: string
  related: string
}

export type CompanyProfile = {
  name: string
  ticker: string
  exchange: string
  finnhubIndustry: string
  marketCapitalization: number // USD millions
  shareOutstanding: number
  logo: string
  weburl: string
  ipo: string
  currency: string
  country: string
}

export type EarningsEvent = {
  symbol: string
  date: string
  hour: string
  epsEstimate: number | null
  epsActual: number | null
  revenueEstimate: number | null
  revenueActual: number | null
}

export async function fetchMarketNews(
  category: 'general' | 'forex' | 'crypto' | 'merger' = 'general',
  limit = 20,
): Promise<NewsItem[]> {
  const k = key()
  if (!k) return []
  try {
    const res = await fetch(`${BASE}/news?category=${category}&token=${k}`, {
      next: { revalidate: 300 },
    })
    if (!res.ok) return []
    const data = (await res.json()) as NewsItem[]
    return Array.isArray(data) ? data.slice(0, limit) : []
  } catch {
    return []
  }
}

export async function fetchCompanyNews(
  symbol: string,
  from: string, // YYYY-MM-DD
  to: string,   // YYYY-MM-DD
  limit = 10,
): Promise<NewsItem[]> {
  const k = key()
  if (!k) return []
  const sym = toFinnhubSymbol(symbol)
  try {
    const res = await fetch(
      `${BASE}/company-news?symbol=${sym}&from=${from}&to=${to}&token=${k}`,
      { next: { revalidate: 1800 } },
    )
    if (!res.ok) return []
    const data = (await res.json()) as NewsItem[]
    return Array.isArray(data) ? data.slice(0, limit) : []
  } catch {
    return []
  }
}

export async function fetchCompanyProfile(symbol: string): Promise<CompanyProfile | null> {
  const k = key()
  if (!k) return null
  const sym = toFinnhubSymbol(symbol)
  try {
    const res = await fetch(`${BASE}/stock/profile2?symbol=${sym}&token=${k}`, {
      next: { revalidate: 3600 },
    })
    if (!res.ok) return null
    const data = (await res.json()) as CompanyProfile
    return data?.name ? data : null
  } catch {
    return null
  }
}

export async function fetchEarningsCalendar(
  from: string,
  to: string,
): Promise<EarningsEvent[]> {
  const k = key()
  if (!k) return []
  try {
    const res = await fetch(
      `${BASE}/calendar/earnings?from=${from}&to=${to}&token=${k}`,
      { next: { revalidate: 3600 } },
    )
    if (!res.ok) return []
    const data = (await res.json()) as { earningsCalendar?: EarningsEvent[] }
    return data.earningsCalendar ?? []
  } catch {
    return []
  }
}

// Convenience: news for the past N days for a symbol
export async function fetchRecentCompanyNews(symbol: string, days = 7, limit = 10): Promise<NewsItem[]> {
  const to = new Date().toISOString().split('T')[0]
  const from = new Date(Date.now() - days * 86400_000).toISOString().split('T')[0]
  return fetchCompanyNews(symbol, from, to, limit)
}