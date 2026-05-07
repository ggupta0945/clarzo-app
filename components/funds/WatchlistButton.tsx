'use client'

// Toggle the current scheme in the user's watchlist. Optimistic UI; falls
// back to a sign-in prompt if the user is anonymous.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  schemeCode: string
  initial: boolean
  isAuthed: boolean
}

export function WatchlistButton({ schemeCode, initial, isAuthed }: Props) {
  const router = useRouter()
  const [isOn, setIsOn] = useState(initial)
  const [pending, startTransition] = useTransition()

  function toggle() {
    if (!isAuthed) {
      router.push(`/login?next=${encodeURIComponent(`/funds/${schemeCode}`)}`)
      return
    }
    const next = !isOn
    setIsOn(next)  // optimistic
    startTransition(async () => {
      try {
        const res = await fetch('/api/funds/watchlist', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ scheme_code: schemeCode, action: next ? 'add' : 'remove' }),
        })
        if (!res.ok) throw new Error('failed')
      } catch {
        setIsOn(!next)  // revert on error
      }
    })
  }

  return (
    <button
      onClick={toggle}
      disabled={pending}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition ${
        isOn
          ? 'bg-accent text-white border-accent hover:bg-accent-hover'
          : 'bg-surface text-fg border-line hover:border-accent'
      } ${pending ? 'opacity-60' : ''}`}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill={isOn ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z" />
      </svg>
      {isOn ? 'Watching' : 'Watchlist'}
    </button>
  )
}
