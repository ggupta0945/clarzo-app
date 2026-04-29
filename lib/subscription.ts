import { createClient } from '@/lib/supabase/server'

// Source of truth: the `subscriptions` table. Row created by the Razorpay
// webhook on first paid subscription. Missing row = free tier (default).
//
// Pro users are exempt from /api/ask rate limits and can create unlimited
// goals. We don't have a Razorpay webhook yet, so for now everyone is 'free'
// — the gating logic still works, just no one can flip to 'active' through
// the app. That's fine for the launch.

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
