// Returns math. Pure functions, no DB. Used both by the offline compute job
// and by RSC pages that want to derive a quick number on the fly.

import type { NavPoint } from './types'

// Find the NAV at-or-just-before a target date. Walks the array (assumed
// ascending) and returns the last point with nav_date <= target.
function navAtOrBefore(history: NavPoint[], target: Date): NavPoint | null {
  const t = target.toISOString().slice(0, 10)
  let last: NavPoint | null = null
  for (const p of history) {
    if (p.nav_date <= t) last = p
    else break
  }
  return last
}

// Absolute return (not annualised). Used for windows < 1 year.
export function simpleReturnPct(start: number, end: number): number {
  if (start <= 0) return 0
  return ((end - start) / start) * 100
}

// CAGR for windows >= 1 year. years can be fractional.
export function cagrPct(start: number, end: number, years: number): number {
  if (start <= 0 || years <= 0) return 0
  return (Math.pow(end / start, 1 / years) - 1) * 100
}

export type ComputedReturns = {
  return_1m: number | null
  return_3m: number | null
  return_6m: number | null
  return_1y: number | null
  return_3y: number | null
  return_5y: number | null
  return_10y: number | null
  return_si: number | null
}

// Compute the standard return windows from an ascending NAV history.
// Latest NAV is taken as the last entry.
export function computeReturns(history: NavPoint[]): ComputedReturns {
  if (history.length === 0) {
    return {
      return_1m: null, return_3m: null, return_6m: null,
      return_1y: null, return_3y: null, return_5y: null, return_10y: null, return_si: null,
    }
  }

  const latest = history[history.length - 1]
  const latestDate = new Date(latest.nav_date)

  function lookback(months: number): NavPoint | null {
    const d = new Date(latestDate)
    d.setMonth(d.getMonth() - months)
    return navAtOrBefore(history, d)
  }

  const m1 = lookback(1)
  const m3 = lookback(3)
  const m6 = lookback(6)
  const y1 = lookback(12)
  const y3 = lookback(36)
  const y5 = lookback(60)
  const y10 = lookback(120)
  const inception = history[0]

  const sinceInceptionYears =
    (latestDate.getTime() - new Date(inception.nav_date).getTime()) / (365.25 * 24 * 3600 * 1000)

  return {
    return_1m: m1 ? simpleReturnPct(m1.nav, latest.nav) : null,
    return_3m: m3 ? simpleReturnPct(m3.nav, latest.nav) : null,
    return_6m: m6 ? simpleReturnPct(m6.nav, latest.nav) : null,
    return_1y: y1 ? simpleReturnPct(y1.nav, latest.nav) : null,
    return_3y: y3 ? cagrPct(y3.nav, latest.nav, 3) : null,
    return_5y: y5 ? cagrPct(y5.nav, latest.nav, 5) : null,
    return_10y: y10 ? cagrPct(y10.nav, latest.nav, 10) : null,
    return_si: sinceInceptionYears >= 1 ? cagrPct(inception.nav, latest.nav, sinceInceptionYears) : null,
  }
}

// Project a SIP outcome — useful for the fund detail page calculator.
// Assumes monthly contribution at month-end, gross of taxes/loads.
export function sipProjection(
  monthly: number,
  years: number,
  annualReturnPct: number
): { invested: number; future_value: number; gain: number } {
  const months = Math.round(years * 12)
  const r = annualReturnPct / 100 / 12
  let value = 0
  for (let i = 0; i < months; i++) {
    value = (value + monthly) * (1 + r)
  }
  const invested = monthly * months
  return { invested, future_value: value, gain: value - invested }
}

// Lumpsum projection.
export function lumpsumProjection(
  amount: number,
  years: number,
  annualReturnPct: number
): { invested: number; future_value: number; gain: number } {
  const fv = amount * Math.pow(1 + annualReturnPct / 100, years)
  return { invested: amount, future_value: fv, gain: fv - amount }
}
