'use client'

import Script from 'next/script'
import { useState } from 'react'
import { captureEvent } from '@/lib/analytics/client'

// Minimal type for the bit of Razorpay Checkout we touch. Razorpay doesn't
// publish first-party TS types, so we declare the shape we use and skip the
// rest. All payment auth happens inside the Razorpay popup — we never see
// card data.
type RazorpayOptions = {
  key: string
  subscription_id: string
  name: string
  description: string
  prefill?: { name?: string; email?: string }
  theme?: { color: string }
  handler?: (response: unknown) => void
  modal?: { ondismiss?: () => void }
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => { open: () => void }
  }
}

export default function UpgradePage() {
  const [state, setState] = useState<'idle' | 'creating' | 'opened' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function startCheckout() {
    if (state === 'creating' || state === 'opened') return
    if (!window.Razorpay) {
      setErrorMsg('Payment script still loading — try again in a moment.')
      setState('error')
      return
    }

    captureEvent('upgrade_clicked')
    setState('creating')
    setErrorMsg(null)

    try {
      const res = await fetch('/api/razorpay/checkout', { method: 'POST' })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error ?? 'checkout_failed')
      }
      const { subscription_id, key_id, user } = await res.json()

      const rzp = new window.Razorpay({
        key: key_id,
        subscription_id,
        name: 'Clarzo',
        description: 'Clarzo Pro — ₹99/mo',
        prefill: { name: user?.name, email: user?.email },
        theme: { color: 'var(--accent)' },
        handler: () => {
          // Razorpay confirms payment client-side, but we still rely on the
          // webhook for the source-of-truth status flip. Just show
          // confirmation here; the user's plan will activate within seconds.
          captureEvent('checkout_payment_confirmed', { plan: 'pro' })
          setState('success')
        },
        modal: {
          ondismiss: () => {
            // User closed the popup without paying — back to idle so they
            // can retry without a page refresh.
            setState((prev) => (prev === 'success' ? prev : 'idle'))
          },
        },
      })
      setState('opened')
      rzp.open()
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'checkout_failed')
      setState('error')
    }
  }

  const buttonLabel =
    state === 'creating' ? 'Opening checkout…' : state === 'opened' ? 'Complete in popup…' : 'Upgrade to Pro'
  const buttonDisabled = state === 'creating' || state === 'opened'

  return (
    <div className="px-4 py-4 sm:p-8 max-w-3xl mx-auto">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />

      <h1 className="text-xl font-semibold text-fg mb-1">
        Upgrade to Clarzo Pro
      </h1>
      <p className="text-fg-muted mb-5 text-xs">
        Unlimited insights, deeper analysis, family portfolios.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Free plan */}
        <div className="bg-surface border border-line rounded-xl p-5 shadow-sm">
          <div className="mb-3">
            <p className="text-[10px] uppercase tracking-wider text-fg-muted font-medium">Free</p>
            <p className="text-2xl font-bold tracking-tight text-fg">₹0</p>
          </div>
          <ul className="text-xs text-fg space-y-1.5 mb-5">
            <li className="flex gap-1.5"><span className="text-success">✓</span> Portfolio tracking</li>
            <li className="flex gap-1.5"><span className="text-success">✓</span> Sector + market-cap breakdown</li>
            <li className="flex gap-1.5"><span className="text-success">✓</span> 10 ClarzoGPT questions / month</li>
            <li className="flex gap-1.5"><span className="text-success">✓</span> 3 goals</li>
          </ul>
          <button
            disabled
            className="w-full bg-canvas text-fg-subtle py-2 rounded-lg text-xs font-medium cursor-default"
          >
            Current plan
          </button>
        </div>

        {/* Pro plan */}
        <div className="bg-surface border-2 border-accent rounded-xl p-5 relative shadow-sm">
          <span className="absolute -top-2.5 right-4 bg-accent text-white px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider">
            Recommended
          </span>
          <div className="mb-3">
            <p className="text-[10px] uppercase tracking-wider text-fg-muted font-medium">Pro</p>
            <p className="text-2xl font-bold tracking-tight text-fg">
              ₹99
              <span className="text-sm font-medium text-fg-muted"> / mo</span>
            </p>
          </div>
          <ul className="text-xs text-fg space-y-1.5 mb-5">
            <li className="flex gap-1.5 text-accent font-medium"><span>✓</span> Everything in Free</li>
            <li className="flex gap-1.5"><span className="text-success">✓</span> <span><strong>Unlimited</strong> ClarzoGPT</span></li>
            <li className="flex gap-1.5"><span className="text-success">✓</span> Unlimited goals + tracking</li>
            <li className="flex gap-1.5"><span className="text-success">✓</span> Rebalancing recommendations</li>
            <li className="flex gap-1.5"><span className="text-success">✓</span> Family portfolio view</li>
            <li className="flex gap-1.5"><span className="text-success">✓</span> Tax harvesting alerts</li>
            <li className="flex gap-1.5"><span className="text-success">✓</span> Priority support</li>
          </ul>
          {state === 'success' ? (
            <div className="bg-success-soft border border-success/30 rounded-lg px-3 py-2 text-xs text-success text-center font-medium">
              Payment received! Your Pro features will activate in a few seconds.
            </div>
          ) : (
            <button
              onClick={startCheckout}
              disabled={buttonDisabled}
              className="w-full bg-accent hover:bg-accent-hover disabled:opacity-60 disabled:cursor-wait text-white py-2.5 rounded-lg text-sm font-medium transition shadow-sm"
            >
              {buttonLabel}
            </button>
          )}
          {errorMsg && (
            <p className="mt-2 text-[11px] text-danger text-center">
              Could not start checkout: {errorMsg}
            </p>
          )}
        </div>
      </div>

      <p className="text-center text-[11px] text-fg-muted mt-5">
        Cancel anytime. No questions asked.
      </p>
    </div>
  )
}
