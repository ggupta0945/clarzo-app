import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getRazorpayPlanId, razorpayClient } from '@/lib/razorpay'

// Creates a Razorpay subscription for the signed-in user, stashes the
// subscription_id on our subscriptions row (keyed by user_id), and returns
// the IDs the frontend Razorpay Checkout needs.
//
// total_count is set to 12 (one year of monthly billing) — Razorpay requires
// it. We can extend by creating a new subscription if the user wants to
// continue past year one.

export const runtime = 'nodejs'

export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const planId = getRazorpayPlanId()
  if (!planId) {
    console.error('Razorpay checkout misconfigured: RAZORPAY_PLAN_ID is missing in server runtime.')
    return NextResponse.json({ error: 'plan_not_configured' }, { status: 500 })
  }

  const rzp = razorpayClient()

  let subscription
  try {
    subscription = await rzp.subscriptions.create({
      plan_id: planId,
      total_count: 12,
      customer_notify: 1,
      notes: { user_id: user.id, email: user.email ?? '' },
    })
  } catch (e) {
    console.error('razorpay subscription create failed:', e)
    return NextResponse.json({ error: 'razorpay_failed' }, { status: 502 })
  }

  // Park the subscription on our row so the webhook (which only knows the
  // razorpay subscription id) can locate the user. Upsert by user_id since
  // the row may not exist yet for free-tier users.
  const admin = createAdminClient()
  const { error: upsertErr } = await admin
    .from('subscriptions')
    .upsert(
      {
        user_id: user.id,
        razorpay_subscription_id: subscription.id,
        status: 'free',
        plan: 'pro_pending',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )
  if (upsertErr) {
    console.error('subscription upsert failed:', upsertErr)
    return NextResponse.json({ error: 'persist_failed' }, { status: 500 })
  }

  return NextResponse.json({
    subscription_id: subscription.id,
    key_id: process.env.RAZORPAY_KEY_ID,
    user: { name: user.user_metadata?.name ?? '', email: user.email ?? '' },
  })
}
