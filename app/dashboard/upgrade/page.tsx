'use client'

import { useState } from 'react'

export default function UpgradePage() {
  const [requested, setRequested] = useState(false)

  // Razorpay isn't wired up yet — KYC is in flight. Until then, this just
  // captures intent: hitting the button switches to a "we'll email you"
  // confirmation so users don't bounce off a dead CTA.
  function startCheckout() {
    setRequested(true)
  }

  return (
    <div className="px-4 py-6 sm:p-10 max-w-3xl mx-auto">
      <h1
        className="text-3xl text-[#e4f0e8] mb-3"
        style={{ fontFamily: 'Playfair Display, serif' }}
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
              style={{ fontFamily: 'Playfair Display, serif' }}
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
              style={{ fontFamily: 'Playfair Display, serif' }}
            >
              ₹199
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
          {requested ? (
            <div className="bg-[#0c2418] border border-[#34d399]/30 rounded-xl px-4 py-3 text-sm text-[#34d399] text-center">
              Got it — we&apos;ll email you the moment Pro goes live.
            </div>
          ) : (
            <button
              onClick={startCheckout}
              className="w-full bg-[#059669] hover:bg-[#0F6E56] text-white py-3 rounded-full font-medium text-sm transition"
            >
              Upgrade to Pro
            </button>
          )}
        </div>
      </div>

      <p className="text-center text-xs text-[#4a7a5a] mt-6">
        Cancel anytime. No questions asked.
      </p>
    </div>
  )
}
