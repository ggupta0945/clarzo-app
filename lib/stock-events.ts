// Recent corporate actions (dividends, splits) for a list of stock symbols,
// sourced from Yahoo Finance's chart endpoint with `events=div,split`. This
// is the same data source yfinance wraps. Auth-free, but Yahoo can throttle —
// callers should treat empty results as a transient failure, not "no events".
//
// Note: Yahoo's "upcoming" event endpoints (quoteSummary, options) require a
// crumb cookie and are increasingly locked down. Here we return only past
// events; framing in the UI should match.

const YF_CHART = 'https://query1.finance.yahoo.com/v8/finance/chart'
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
const REVALIDATE_SECONDS = 60 * 60 * 6 // 6h — corporate actions don't change often

export type CorpAction = {
  symbol: string
  type: 'dividend' | 'split'
  date: number // unix seconds
  amount?: number // per-share for dividends
  ratio?: { numerator: number; denominator: number } // for splits
}

type ChartResponse = {
  chart?: {
    result?: Array<{
      meta?: { symbol?: string }
      events?: {
        dividends?: Record<string, { amount?: number; date: number }>
        splits?: Record<
          string,
          { date: number; numerator?: number; denominator?: number; splitRatio?: string }
        >
      }
    }>
  }
}

const SUFFIXES = ['.NS', '.BO'] as const

async function fetchOne(symbol: string, range = '2y'): Promise<CorpAction[]> {
  for (const suffix of SUFFIXES) {
    const url = `${YF_CHART}/${encodeURIComponent(symbol)}${suffix}?range=${range}&interval=1d&events=div%2Csplit`
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': UA, Accept: 'application/json' },
        next: { revalidate: REVALIDATE_SECONDS },
      })
      if (!res.ok) continue
      const json = (await res.json()) as ChartResponse
      const result = json.chart?.result?.[0]
      if (!result) continue

      const events = result.events ?? {}
      const out: CorpAction[] = []

      for (const [, d] of Object.entries(events.dividends ?? {})) {
        if (typeof d.date !== 'number') continue
        out.push({
          symbol,
          type: 'dividend',
          date: d.date,
          amount: typeof d.amount === 'number' ? d.amount : undefined,
        })
      }
      for (const [, s] of Object.entries(events.splits ?? {})) {
        if (typeof s.date !== 'number') continue
        out.push({
          symbol,
          type: 'split',
          date: s.date,
          ratio:
            typeof s.numerator === 'number' && typeof s.denominator === 'number'
              ? { numerator: s.numerator, denominator: s.denominator }
              : undefined,
        })
      }

      // Found at least one event on this exchange — don't try the other.
      if (out.length > 0) return out
      // No events here, try the other exchange suffix.
    } catch {
      // try next suffix
    }
  }
  return []
}

/**
 * Fetches recent corporate actions across the given symbols, returning a flat
 * list sorted by date descending (most recent first).
 */
export async function fetchRecentCorpActions(
  symbols: string[],
  options: { range?: string; limit?: number } = {},
): Promise<CorpAction[]> {
  const { range = '2y', limit = 20 } = options
  const unique = Array.from(
    new Set(
      symbols
        .map((s) => s?.trim().toUpperCase())
        .filter((s): s is string => Boolean(s)),
    ),
  )
  if (unique.length === 0) return []

  const results = await Promise.all(unique.map((sym) => fetchOne(sym, range)))
  const flat = results.flat()
  flat.sort((a, b) => b.date - a.date)
  return flat.slice(0, limit)
}

// ── Estimated upcoming earnings ────────────────────────────────────────────
//
// Yahoo's quoteSummary endpoint (which carries calendarEvents.earnings) needs
// a crumb cookie and is increasingly locked down — see the note at the top
// of this file. Until we plumb a real data source, we surface a *seasonal
// estimate*: Indian companies follow an April-March fiscal year and almost
// universally announce quarterly results in well-defined windows starting
// ~25 days after each quarter-end.
//
// Q1 (Apr-Jun)  → announced ~Jul 25 – Aug 12
// Q2 (Jul-Sep)  → announced ~Oct 25 – Nov 12
// Q3 (Oct-Dec)  → announced ~Jan 25 – Feb 12
// Q4 (Jan-Mar)  → announced ~Apr 25 – May 20  (annual results often run later)
//
// Honest framing in the UI: this is "expected", not a confirmed date. Per-
// company precision will need a real exchange-filings feed.

export type UpcomingEarning = {
  symbol: string
  quarter: string // e.g. "Q3 FY26"
  windowStart: number // unix seconds (inclusive)
  windowEnd: number // unix seconds (inclusive)
  label: string // human-readable window, e.g. "late Jan – mid Feb"
}

type QuarterIndex = 1 | 2 | 3 | 4

function quarterOf(date: Date): QuarterIndex {
  const m = date.getUTCMonth() + 1 // 1..12
  if (m >= 4 && m <= 6) return 1
  if (m >= 7 && m <= 9) return 2
  if (m >= 10 && m <= 12) return 3
  return 4
}

// Indian fiscal year = year of March in which it ends. So Apr 2025–Mar 2026 is FY26.
function fyOf(date: Date): number {
  const y = date.getUTCFullYear()
  const m = date.getUTCMonth() + 1
  return m >= 4 ? y + 1 : y
}

// Quarter-end (last day of the quarter, UTC midnight).
function quarterEnd(fy: number, q: QuarterIndex): Date {
  // FY ends March of `fy`. Q1 = Jun of (fy-1), Q2 = Sep of (fy-1),
  // Q3 = Dec of (fy-1), Q4 = Mar of fy.
  const calYear = q === 4 ? fy : fy - 1
  const monthDay: Record<QuarterIndex, [number, number]> = {
    1: [6, 30],
    2: [9, 30],
    3: [12, 31],
    4: [3, 31],
  }
  const [month, day] = monthDay[q]
  return new Date(Date.UTC(calYear, month - 1, day))
}

// Days post-quarter-end before the announcement window opens / closes.
// Q4 (annual) results trend later than quarterly — ~25-50 days vs ~25-45.
const WINDOW_DAYS: Record<QuarterIndex, [number, number]> = {
  1: [25, 45],
  2: [25, 45],
  3: [25, 45],
  4: [25, 50],
}

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

function windowLabel(start: Date, end: Date): string {
  const startMonth = MONTH_LABELS[start.getUTCMonth()]
  const endMonth = MONTH_LABELS[end.getUTCMonth()]
  if (startMonth === endMonth) {
    return `late ${startMonth}`
  }
  return `late ${startMonth} – mid ${endMonth}`
}

function previousQuarter(fy: number, q: QuarterIndex): { fy: number; q: QuarterIndex } {
  if (q === 1) return { fy: fy - 1, q: 4 }
  return { fy, q: (q - 1) as QuarterIndex }
}

// Compute the *next* earnings window relative to `now` — picks the window
// whose end is still in the future, walking back from the upcoming quarter
// to the previous quarter as needed.
function nextEarningsWindow(now: Date): {
  quarter: string
  windowStart: Date
  windowEnd: Date
} {
  const fy = fyOf(now)
  const q = quarterOf(now)
  // Walk through candidates: previous quarter, current quarter. The
  // first whose windowEnd is in the future wins.
  const candidates: Array<{ fy: number; q: QuarterIndex }> = [
    previousQuarter(fy, q),
    { fy, q },
    // Fallback if we're past current quarter's window (e.g. mid-quarter):
    // surface NEXT quarter's window. q is 1..4; quarterAfter wraps.
    q === 4
      ? { fy: fy + 1, q: 1 }
      : { fy, q: (q + 1) as QuarterIndex },
  ]

  for (const c of candidates) {
    const qend = quarterEnd(c.fy, c.q)
    const [d1, d2] = WINDOW_DAYS[c.q]
    const start = new Date(qend.getTime() + d1 * 86400 * 1000)
    const end = new Date(qend.getTime() + d2 * 86400 * 1000)
    if (end.getTime() >= now.getTime()) {
      return {
        quarter: `Q${c.q} FY${String(c.fy).slice(-2)}`,
        windowStart: start,
        windowEnd: end,
      }
    }
  }

  // Unreachable in practice — at least one candidate window is always future.
  const qend = quarterEnd(fy, q)
  const [d1, d2] = WINDOW_DAYS[q]
  return {
    quarter: `Q${q} FY${String(fy).slice(-2)}`,
    windowStart: new Date(qend.getTime() + d1 * 86400 * 1000),
    windowEnd: new Date(qend.getTime() + d2 * 86400 * 1000),
  }
}

export function estimateUpcomingEarnings(
  symbols: string[],
  now: Date = new Date(),
): UpcomingEarning[] {
  const unique = Array.from(
    new Set(
      symbols
        .map((s) => s?.trim().toUpperCase())
        .filter((s): s is string => Boolean(s)),
    ),
  )
  if (unique.length === 0) return []

  const { quarter, windowStart, windowEnd } = nextEarningsWindow(now)
  const label = windowLabel(windowStart, windowEnd)
  const windowStartUnix = Math.floor(windowStart.getTime() / 1000)
  const windowEndUnix = Math.floor(windowEnd.getTime() / 1000)

  return unique.map((symbol) => ({
    symbol,
    quarter,
    windowStart: windowStartUnix,
    windowEnd: windowEndUnix,
    label,
  }))
}
