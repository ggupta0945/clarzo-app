import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyWebhookSignature } from '@/lib/razorpay'
import { captureServerEvent } from '@/lib/analytics/server'

export const runtime = 'nodejs'

// Razorpay subscription lifecycle webhook. We trust nothing without the HMAC
// signature check. On valid events:
//   subscription.activated / charged → status = 'active'
//   subscription.cancelled / completed / halted → status = 'cancelled'
//
// We always read the raw body BEFORE parsing because the HMAC is computed
// over the exact bytes Razorpay sent. Re-serializing JSON would change
// whitespace/key order and break verification.

type RazorpayWebhookEvent = {
  event: string
  payload: {
    subscription?: {
      entity: {
        id: string
        status: string
        current_end?: number
        current_start?: number
      }
    }
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get('x-razorpay-signature')

  if (!verifyWebhookSignature(rawBody, signature)) {
    console.warn('razorpay webhook: bad signature')
    return NextResponse.json({ error: 'bad_signature' }, { status: 400 })
  }

  let event: RazorpayWebhookEvent
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'bad_json' }, { status: 400 })
  }

  const sub = event.payload.subscription?.entity
  if (!sub?.id) {
    // Not a subscription event we care about — ack 200 so Razorpay stops retrying.
    return NextResponse.json({ ok: true, ignored: event.event })
  }

  const status = mapStatus(event.event)
  if (!status) {
    return NextResponse.json({ ok: true, ignored: event.event })
  }

  const admin = createAdminClient()
  const update: Record<string, unknown> = {
    status,
    plan: status === 'active' ? 'pro' : 'free',
    updated_at: new Date().toISOString(),
  }
  if (sub.current_end) {
    update.current_period_end = new Date(sub.current_end * 1000).toISOString()
  }

  const { data: subscriptionRow, error } = await admin
    .from('subscriptions')
    .update(update)
    .eq('razorpay_subscription_id', sub.id)
    .select('user_id')
    .maybeSingle()

  if (error) {
    // Don't 500 — Razorpay would just retry. Log and ack so we can
    // reconcile manually instead of getting hammered.
    console.error('razorpay webhook: db update failed', { event: event.event, sub_id: sub.id, error })
    return NextResponse.json({ ok: false, logged: true })
  }

  if (status === 'active' && subscriptionRow?.user_id) {
    try {
      await captureServerEvent(subscriptionRow.user_id, 'subscription_activated', {
        plan: 'pro',
        razorpay_event: event.event,
        razorpay_subscription_id: sub.id,
      })
    } catch (analyticsError) {
      console.error('razorpay webhook: analytics capture failed', analyticsError)
    }
  }

  return NextResponse.json({ ok: true })
}

function mapStatus(eventName: string): 'active' | 'cancelled' | 'past_due' | null {
  switch (eventName) {
    case 'subscription.activated':
    case 'subscription.charged':
    case 'subscription.resumed':
      return 'active'
    case 'subscription.halted':
      return 'past_due'
    case 'subscription.cancelled':
    case 'subscription.completed':
    case 'subscription.expired':
      return 'cancelled'
    default:
      return null
  }
}
