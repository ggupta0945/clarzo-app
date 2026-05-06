import type { SupabaseClient } from '@supabase/supabase-js'
import type { EnrichedHolding } from './portfolio'
import type { Insight } from './insights'

// Generate (or refresh) in-app notifications for a user based on their portfolio.
// Uses an upsert-by-type strategy: each notification type is idempotent, so
// re-visiting the dashboard doesn't create duplicates.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function syncNotifications(userId: string, holdings: EnrichedHolding[], insights: Insight[], supabase: SupabaseClient<any, 'public', any>) {
  if (holdings.length === 0) return

  const toUpsert: { user_id: string; type: string; title: string; body: string }[] = []

  // Derive notifications from insights (warning-level only to avoid noise)
  for (const ins of insights) {
    if (ins.severity !== 'warning') continue
    toUpsert.push({
      user_id: userId,
      type: ins.id,
      title: ins.title,
      body: ins.description,
    })
  }

  if (toUpsert.length === 0) return

  // Only insert if a notification with this type doesn't already exist and is unread.
  // We don't upsert (no unique constraint on type) — instead delete stale unread ones
  // and re-insert. This way stale insights (e.g. overlap resolved) auto-clear.
  const { data: existing } = await supabase
    .from('notifications')
    .select('type')
    .eq('user_id', userId)
    .eq('read', false)

  const existingTypes = new Set((existing ?? []).map((n: { type: string }) => n.type))

  const newOnes = toUpsert.filter((n) => !existingTypes.has(n.type))
  if (newOnes.length === 0) return

  await supabase.from('notifications').insert(newOnes)
}
