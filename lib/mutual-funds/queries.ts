// Server-only data access for the Mutual Funds segment. Every function uses
// the SSR Supabase client (RLS-enforced); reference tables (mf_schemes,
// mf_nav_history, mf_returns, mf_alerts) are world-readable so anonymous
// users can browse /funds. Watchlist queries require auth.

import { createClient } from '@/lib/supabase/server'
import type {
  MfScheme,
  MfReturns,
  MfSchemeWithReturns,
  NavPoint,
  MfAlert,
} from './types'

export type TopPerformersOptions = {
  window: '1y' | '3y' | '5y' | '10y'
  category?: string
  sub_category?: string
  plan_type?: 'Direct' | 'Regular'
  limit?: number
}

type ReturnNumberKey = 'return_1y' | 'return_3y' | 'return_5y' | 'return_10y'

const RETURN_COLUMN: Record<TopPerformersOptions['window'], ReturnNumberKey> = {
  '1y': 'return_1y',
  '3y': 'return_3y',
  '5y': 'return_5y',
  '10y': 'return_10y',
}

// Top performers across the universe. Defaults to Direct plans only — those
// are what informed investors care about and the field is consistently set.
export async function getTopPerformers(opts: TopPerformersOptions): Promise<MfSchemeWithReturns[]> {
  const supabase = await createClient()
  const sortColumn = RETURN_COLUMN[opts.window]
  const limit = opts.limit ?? 25
  const planType = opts.plan_type ?? 'Direct'

  let q = supabase
    .from('mf_schemes')
    .select('*, returns:mf_returns(*)')
    .eq('plan_type', planType)
    .eq('option_type', 'Growth')
    .eq('is_active', true)

  if (opts.category) q = q.eq('category', opts.category)
  if (opts.sub_category) q = q.eq('sub_category', opts.sub_category)

  // Supabase can't sort on a joined table, so we over-fetch then sort/slice
  // in-process. Cap pull to keep the round-trip cheap.
  const { data, error } = await q.limit(500)
  if (error) {
    console.error('getTopPerformers error', error)
    return []
  }

  const rows: MfSchemeWithReturns[] = (data as unknown as Array<MfScheme & { returns: MfReturns | MfReturns[] | null }>)
    .map((r) => ({
      ...r,
      returns: Array.isArray(r.returns) ? (r.returns[0] ?? null) : r.returns,
    }))
    .filter((r) => r.returns && r.returns[sortColumn] !== null)

  rows.sort((a, b) => {
    const av = a.returns?.[sortColumn] ?? -Infinity
    const bv = b.returns?.[sortColumn] ?? -Infinity
    return bv - av
  })

  return rows.slice(0, limit)
}

export async function getSchemeByCode(scheme_code: string): Promise<MfSchemeWithReturns | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('mf_schemes')
    .select('*, returns:mf_returns(*)')
    .eq('scheme_code', scheme_code)
    .single()

  if (error || !data) return null
  const row = data as unknown as MfScheme & { returns: MfReturns | MfReturns[] | null }
  return {
    ...row,
    returns: Array.isArray(row.returns) ? (row.returns[0] ?? null) : row.returns,
  } as MfSchemeWithReturns
}

export async function getNavHistory(
  scheme_code: string,
  range: '1m' | '3m' | '6m' | '1y' | '3y' | '5y' | 'all' = '1y'
): Promise<NavPoint[]> {
  const supabase = await createClient()

  let from: string | null = null
  if (range !== 'all') {
    const d = new Date()
    const months = range === '1m' ? 1 : range === '3m' ? 3 : range === '6m' ? 6 : range === '1y' ? 12 : range === '3y' ? 36 : 60
    d.setMonth(d.getMonth() - months)
    from = d.toISOString().slice(0, 10)
  }

  let q = supabase
    .from('mf_nav_history')
    .select('nav_date, nav')
    .eq('scheme_code', scheme_code)
    .order('nav_date', { ascending: true })
    .limit(2500)

  if (from) q = q.gte('nav_date', from)

  const { data, error } = await q
  if (error || !data) return []
  return data as NavPoint[]
}

export type SchemeSearchResult = Pick<
  MfScheme,
  'scheme_code' | 'scheme_name' | 'amc' | 'category' | 'sub_category' | 'plan_type'
>

export async function searchSchemes(query: string, limit = 20): Promise<SchemeSearchResult[]> {
  const supabase = await createClient()
  const trimmed = query.trim()
  if (trimmed.length < 2) return []

  const { data, error } = await supabase
    .from('mf_schemes')
    .select('scheme_code, scheme_name, amc, category, sub_category, plan_type')
    .ilike('scheme_name', `%${trimmed}%`)
    .eq('is_active', true)
    .limit(limit)

  if (error || !data) return []
  return data as SchemeSearchResult[]
}

export type CategoryCount = { sub_category: string; category: string; count: number }

// Used on /funds landing for the category tile grid.
export async function getCategoryCounts(): Promise<CategoryCount[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('mf_schemes')
    .select('category, sub_category')
    .eq('plan_type', 'Direct')
    .eq('option_type', 'Growth')
    .eq('is_active', true)
    .not('sub_category', 'is', null)
    .limit(5000)

  if (error || !data) return []

  const counts = new Map<string, CategoryCount>()
  for (const r of data as Array<{ category: string | null; sub_category: string | null }>) {
    if (!r.sub_category || !r.category) continue
    const key = `${r.category}|${r.sub_category}`
    const existing = counts.get(key)
    if (existing) existing.count += 1
    else counts.set(key, { category: r.category, sub_category: r.sub_category, count: 1 })
  }
  return Array.from(counts.values()).sort((a, b) => b.count - a.count)
}

export type AmcCount = { amc: string; count: number }

export async function getAmcCounts(): Promise<AmcCount[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('mf_schemes')
    .select('amc')
    .eq('plan_type', 'Direct')
    .eq('option_type', 'Growth')
    .eq('is_active', true)
    .not('amc', 'is', null)
    .limit(5000)

  if (error || !data) return []

  const counts = new Map<string, number>()
  for (const r of data as Array<{ amc: string | null }>) {
    if (!r.amc) continue
    counts.set(r.amc, (counts.get(r.amc) ?? 0) + 1)
  }
  return Array.from(counts.entries())
    .map(([amc, count]) => ({ amc, count }))
    .sort((a, b) => b.count - a.count)
}

export async function getRecentAlerts(scheme_code?: string, limit = 20): Promise<MfAlert[]> {
  const supabase = await createClient()
  let q = supabase
    .from('mf_alerts')
    .select('*')
    .order('detected_at', { ascending: false })
    .limit(limit)
  if (scheme_code) q = q.eq('scheme_code', scheme_code)
  const { data, error } = await q
  if (error || !data) return []
  return data as MfAlert[]
}

// User-scoped: watchlist read & toggle.
export async function getUserWatchlist(user_id: string): Promise<MfSchemeWithReturns[]> {
  const supabase = await createClient()
  const { data: rows, error } = await supabase
    .from('mf_watchlist')
    .select('scheme_code')
    .eq('user_id', user_id)

  if (error || !rows || rows.length === 0) return []
  const codes = (rows as Array<{ scheme_code: string }>).map((r) => r.scheme_code)

  const { data, error: e2 } = await supabase
    .from('mf_schemes')
    .select('*, returns:mf_returns(*)')
    .in('scheme_code', codes)

  if (e2 || !data) return []
  return (data as unknown as Array<MfScheme & { returns: MfReturns | MfReturns[] | null }>).map((r) => ({
    ...r,
    returns: Array.isArray(r.returns) ? (r.returns[0] ?? null) : r.returns,
  })) as MfSchemeWithReturns[]
}

export async function isInWatchlist(user_id: string, scheme_code: string): Promise<boolean> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('mf_watchlist')
    .select('scheme_code')
    .eq('user_id', user_id)
    .eq('scheme_code', scheme_code)
    .maybeSingle()
  return !!data
}

// Find peer schemes in same sub-category for the "compare with similar" panel.
export async function getPeerSchemes(
  scheme_code: string,
  sub_category: string,
  limit = 6
): Promise<MfSchemeWithReturns[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('mf_schemes')
    .select('*, returns:mf_returns(*)')
    .eq('sub_category', sub_category)
    .eq('plan_type', 'Direct')
    .eq('option_type', 'Growth')
    .eq('is_active', true)
    .neq('scheme_code', scheme_code)
    .limit(80)

  if (error || !data) return []
  const rows = (data as unknown as Array<MfScheme & { returns: MfReturns | MfReturns[] | null }>)
    .map((r) => ({
      ...r,
      returns: Array.isArray(r.returns) ? (r.returns[0] ?? null) : r.returns,
    })) as MfSchemeWithReturns[]

  rows.sort((a, b) => {
    const av = a.returns?.return_3y ?? -Infinity
    const bv = b.returns?.return_3y ?? -Infinity
    return bv - av
  })
  return rows.slice(0, limit)
}
