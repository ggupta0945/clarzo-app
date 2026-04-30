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
        theme: { color: '#059669' },
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
    <div className="px-4 py-6 sm:p-10 max-w-3xl mx-auto">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />

      <h1
        className="text-3xl text-[#e4f0e8] mb-3"
      >
        Upgrade to Clarzo Pro
      </h1>
      <p className="text-[#88b098] mb-8 text-sm">
        Unlimited insights, deeper analysis, family portfolios.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#071a10] border border-[#1a4a2e] rounded-2xl p-6">
          <div className="mb-4">
            <p className="text-sm text-[#88b098]">Free</p>
            <p
              className="text-3xl text-[#e4f0e8]"
            >
              ₹0
            </p>
          </div>
          <ul className="text-sm text-[#88b098] space-y-2 mb-6">
            <li>✓ Portfolio tracking</li>
            <li>✓ Sector + market-cap breakdown</li>
            <li>✓ 10 ClarzoGPT questions / month</li>
            <li>✓ 3 goals</li>
          </ul>
          <button
            disabled
            className="w-full bg-[#0c2418] text-[#4a7a5a] py-3 rounded-full text-sm cursor-default"
          >
            Current plan
          </button>
        </div>

        <div className="bg-[#071a10] border border-[#34d399] rounded-2xl p-6 relative">
          <span className="absolute -top-3 right-4 bg-[#34d399] text-[#040f0a] px-3 py-1 rounded-full text-xs font-medium">
            Recommended
          </span>
          <div className="mb-4">
            <p className="text-sm text-[#88b098]">Pro</p>
            <p
              className="text-3xl text-[#e4f0e8]"
            >
              ₹99
              <span className="text-base text-[#88b098]"> / mo</span>
            </p>
          </div>
          <ul className="text-sm text-[#e4f0e8] space-y-2 mb-6">
            <li className="text-[#34d399]">✓ Everything in Free</li>
            <li>✓ <strong>Unlimited</strong> ClarzoGPT</li>
            <li>✓ Unlimited goals + tracking</li>
            <li>✓ Rebalancing recommendations</li>
            <li>✓ Family portfolio view</li>
            <li>✓ Tax harvesting alerts</li>
            <li>✓ Priority support</li>
          </ul>
          {state === 'success' ? (
            <div className="bg-[#0c2418] border border-[#34d399]/30 rounded-xl px-4 py-3 text-sm text-[#34d399] text-center">
              Payment received! Your Pro features will activate in a few seconds.
            </div>
          ) : (
            <button
              onClick={startCheckout}
              disabled={buttonDisabled}
              className="w-full bg-[#059669] hover:bg-[#0F6E56] disabled:opacity-60 disabled:cursor-wait text-white py-3 rounded-full font-medium text-sm transition"
            >
              {buttonLabel}
            </button>
          )}
          {errorMsg && (
            <p className="mt-3 text-xs text-[#f5c842] text-center">
              Could not start checkout: {errorMsg}
            </p>
          )}
        </div>
      </div>

      <p className="text-center text-xs text-[#4a7a5a] mt-6">
        Cancel anytime. No questions asked.
      </p>
    </div>
  )
}
