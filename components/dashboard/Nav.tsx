'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { signOut } from '@/app/dashboard/actions'

type Profile = { name: string | null; email: string | null }

const LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/dashboard/stocks', label: 'My Stocks' },
  { href: '/dashboard/upload', label: 'Upload Portfolio' },
  { href: '/dashboard/ask', label: 'Ask Clarzo' },
  { href: '/dashboard/goals', label: 'Goals' },
  { href: '/discover', label: 'Discover' },
  { href: '/dashboard/upgrade', label: 'Upgrade' },
]

export function DashboardNav({ profile }: { profile: Profile }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // Lock body scroll while the drawer is open so the page underneath doesn't
  // scroll along with it on iOS.
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  return (
    <>
      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-30 bg-[#071a10] border-b border-[#1a4a2e] flex items-center justify-between px-4 h-14">
        <Link href="/dashboard" className="text-xl text-[#34d399]">
          Clarzo
        </Link>
        <button
          aria-label="Open menu"
          aria-expanded={open}
          onClick={() => setOpen(true)}
          className="p-2 -mr-2 text-[#e4f0e8] hover:text-[#34d399] transition"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </header>

      {/* Mobile drawer overlay */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar — drawer on mobile, fixed on desktop */}
      <aside
        className={`
          fixed lg:sticky top-0 left-0 z-50 h-screen w-64 bg-[#071a10] border-r border-[#1a4a2e] p-6 flex flex-col
          transition-transform duration-200 lg:translate-x-0
          ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="mb-10 flex items-center justify-between">
          <h1 className="text-2xl text-[#34d399]">
            Clarzo
          </h1>
          <button
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="lg:hidden p-1 text-[#88b098] hover:text-[#34d399] transition"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 space-y-1">
          {LINKS.map((l) => {
            const active = pathname === l.href
            return (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={`block px-4 py-2 rounded-lg transition ${
                  active
                    ? 'bg-[#0c2418] text-[#34d399]'
                    : 'text-[#88b098] hover:bg-[#0c2418] hover:text-[#e4f0e8]'
                }`}
              >
                {l.label}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-[#1a4a2e] pt-4">
          <div className="px-4 py-2 mb-2">
            <p className="text-sm text-[#e4f0e8] truncate">{profile.name}</p>
            <p className="text-xs text-[#4a7a5a] truncate">{profile.email}</p>
          </div>
          <form action={signOut}>
            <button className="w-full text-left px-4 py-2 rounded-lg hover:bg-[#0c2418] text-[#88b098] text-sm transition">
              Sign out
            </button>
          </form>
        </div>
      </aside>
    </>
  )
}
