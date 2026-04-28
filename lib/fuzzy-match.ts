import type { SupabaseClient } from '@supabase/supabase-js'

// Resolve missing ISINs by matching scheme names against nav_latest.
// Done in two passes to avoid N+1 round trips:
//   1. Batch exact match on scheme_name
//   2. Per-name ILIKE fuzzy match for whatever's still missing
export async function fuzzyMatchISINs(
  supabase: SupabaseClient,
  schemeNames: string[]
): Promise<Map<string, string>> {
  const result = new Map<string, string>()
  const unique = Array.from(new Set(schemeNames.filter(Boolean)))
  if (unique.length === 0) return result

  const { data: exact } = await supabase
    .from('nav_latest')
    .select('isin, scheme_name')
    .in('scheme_name', unique)

  for (const row of exact ?? []) {
    if (row.scheme_name && row.isin) result.set(row.scheme_name, row.isin)
  }

  const unmatched = unique.filter((n) => !result.has(n))
  for (const name of unmatched) {
    const tokens = name
      .toLowerCase()
      .replace(/fund|growth|direct|plan|regular|option|idcw|dividend/gi, '')
      .split(/\s+/)
      .filter((t) => t.length > 2)
      .slice(0, 3)

    if (tokens.length === 0) continue

    const pattern = `%${tokens.join('%')}%`
    const { data: fuzzy } = await supabase
      .from('nav_latest')
      .select('isin')
      .ilike('scheme_name', pattern)
      .limit(1)
      .maybeSingle()

    if (fuzzy?.isin) result.set(name, fuzzy.isin)
  }

  return result
}
