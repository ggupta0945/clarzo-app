// Google News RSS fetcher for fund-specific news. Public RSS endpoint, no
// API key. We do a lightweight regex parse rather than pull in an XML lib —
// the items we need (title, link, pubDate, source) sit in predictable tags.

import type { NewsItem } from './types'

const FEED_BASE = 'https://news.google.com/rss/search'

function buildQuery(fundName: string): string {
  // Strip plan/option/scheme noise so the query targets the fund itself.
  const cleaned = fundName
    .replace(/\b(direct|regular|growth|idcw|dividend|payout|reinvestment|plan|option)\b/gi, '')
    .replace(/\s+-\s+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return `"${cleaned}" mutual fund`
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
}

function stripCdata(s: string): string {
  const m = s.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/)
  return m ? m[1] : s
}

export async function fetchFundNews(fundName: string, limit = 8): Promise<NewsItem[]> {
  const q = encodeURIComponent(buildQuery(fundName))
  const url = `${FEED_BASE}?q=${q}&hl=en-IN&gl=IN&ceid=IN:en`
  let res: Response
  try {
    res = await fetch(url, {
      next: { revalidate: 1800 }, // 30 min server cache
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ClarzoApp/1.0)' },
    })
  } catch {
    return []
  }
  if (!res.ok) return []
  const xml = await res.text()

  const items: NewsItem[] = []
  const itemRegex = /<item>([\s\S]*?)<\/item>/g
  let match: RegExpExecArray | null
  while ((match = itemRegex.exec(xml)) !== null && items.length < limit) {
    const block = match[1]
    const title = block.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? ''
    const link = block.match(/<link>([\s\S]*?)<\/link>/)?.[1] ?? ''
    const pub = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] ?? ''
    const source = block.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1] ?? ''
    if (!title || !link) continue

    const titleClean = decodeEntities(stripCdata(title)).trim()
    const sourceClean = decodeEntities(stripCdata(source)).trim() || 'Google News'
    items.push({
      title: titleClean,
      link: link.trim(),
      source: sourceClean,
      published_at: pub ? new Date(pub).toISOString() : new Date().toISOString(),
    })
  }
  return items
}
