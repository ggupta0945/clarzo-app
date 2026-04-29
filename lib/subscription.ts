import { createClient } from '@/lib/supabase/server'

// Source of truth: the `subscriptions` table. Row created by the Razorpay
// webhook on first paid subscription. Missing row = free tier (default).
//
// Pro users are exempt from /api/ask rate limits and can create unlimited
// goals. Razorpay checkout parks a pending row, and the signed webhook flips
// the status to active once payment/subscription activation lands.

export type Plan = 'free' | 'active'

export async function getUserPlan(userId: string): Promise<Plan> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('subscriptions')
    .select('status')
    .eq('user_id', userId)
    .maybeSingle()

  return data?.status === 'active' ? 'active' : 'free'
}

export const FREE_TIER_LIMITS = {
  chatQueriesPerMonth: 10,
  goals: 3,
} as const
