'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { signOut } from '@/app/dashboard/actions'
import { ThemeToggle } from './ThemeToggle'
import { NotificationBell } from './NotificationBell'

type Profile = { name: string | null; email: string | null }

type IconName = 'home' | 'briefcase' | 'sparkle' | 'goal' | 'compass' | 'crown' | 'tools' | 'family'

type NavLink = {
  href: string
  label: string
  icon: IconName
}

// Top navbar order — flat list, no nested groups. Upload is intentionally
// not surfaced here; users hit it via the "Re-upload" button on the
// dashboard or are redirected when no holdings exist.
const LINKS: NavLink[] = [
  { href: '/dashboard', label: 'My Portfolio', icon: 'home' },
  { href: '/dashboard/stocks', label: 'Stocks', icon: 'briefcase' },
  { href: '/dashboard/ask', label: 'Ask Clarzo', icon: 'sparkle' },
  { href: '/dashboard/goals', label: 'Goals', icon: 'goal' },
  { href: '/dashboard/discover', label: 'Discover', icon: 'compass' },
  { href: '/dashboard/family', label: 'Family', icon: 'family' },
  { href: '/dashboard/upgrade', label: 'Upgrade', icon: 'crown' },
]

function isActive(pathname: string, href: string): boolean {
  if (href === '/dashboard') return pathname === '/dashboard'
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function DashboardNav({ profile }: { profile: Profile }) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!mobileOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [mobileOpen])

  // Close the right-side user dropdown when clicking outside.
  useEffect(() => {
    if (!menuOpen) return
    function onClick(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [menuOpen])

  return (
    <>
      <header className="sticky top-0 z-40 bg-canvas">
        <div className="relative h-16 px-6 sm:px-10 lg:px-14 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
            <Logo />
            <span className="text-base font-semibold text-fg tracking-tight">Clarzo</span>
          </Link>

          {/* Nav pill — absolutely centered against the header so the
              logo/right-cluster widths don't shift its position. */}
          <nav className="hidden md:flex items-center gap-0.5 rounded-full bg-surface border border-line p-1 shadow-sm absolute left-1/2 -translate-x-1/2">
            {LINKS.map((l) => {
              const active = isActive(pathname, l.href)
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`px-3.5 py-1.5 rounded-full text-[13px] whitespace-nowrap transition ${
                    active
                      ? 'bg-surface text-fg font-medium shadow-md ring-1 ring-line'
                      : 'text-fg-muted hover:text-fg'
                  }`}
                >
                  {l.label}
                </Link>
              )
            })}
          </nav>

          {/* Right cluster: status pill, theme toggle, notifications, avatar */}
          <div className="hidden md:flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 rounded-full bg-surface border border-line px-3 py-1.5 shadow-sm">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-fg-muted">
                <circle cx="12" cy="12" r="9" />
                <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
              </svg>
              <span className="text-[12px] text-fg">Market: NSE / BSE</span>
            </div>

            <CompactThemeToggle />

            <NotificationBell />

            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-label="Account menu"
                className="h-9 w-9 rounded-full overflow-hidden bg-gradient-to-br from-accent-soft to-accent flex items-center justify-center text-accent-fg text-xs font-semibold shadow-sm border border-line transition hover:shadow-md"
              >
                {(profile.name ?? profile.email ?? 'U').charAt(0).toUpperCase()}
              </button>
              {menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-56 bg-surface border border-line rounded-xl shadow-lg overflow-hidden"
                >
                  <div className="px-3 py-2 border-b border-line">
                    <p className="text-xs font-medium text-fg truncate">{profile.name}</p>
                    <p className="text-[11px] text-fg-muted truncate">{profile.email}</p>
                  </div>
                  <form action={signOut}>
                    <button
                      type="submit"
                      className="w-full text-left px-3 py-2 text-xs text-fg-muted hover:bg-surface-2 hover:text-fg transition"
                    >
                      Sign out
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>

          {/* Mobile hamburger */}
          <button
            aria-label="Open menu"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(true)}
            className="md:hidden p-2 -mr-2 text-fg hover:text-accent transition"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative ml-auto h-full w-72 bg-surface border-l border-line p-4 flex flex-col">
            <div className="flex items-center justify-between mb-5">
              <Link href="/dashboard" className="flex items-center gap-2" onClick={() => setMobileOpen(false)}>
                <Logo />
                <span className="text-base font-semibold text-fg tracking-tight">Clarzo</span>
              </Link>
              <button
                aria-label="Close menu"
                onClick={() => setMobileOpen(false)}
                className="p-1 text-fg-muted hover:text-fg transition"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <nav className="flex-1 space-y-1">
              {LINKS.map((l) => {
                const active = isActive(pathname, l.href)
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition text-[13px] ${
                      active
                        ? 'bg-accent-soft text-accent font-medium'
                        : 'text-fg-muted hover:bg-surface-2 hover:text-fg'
                    }`}
                  >
                    <Icon name={l.icon} />
                    <span>{l.label}</span>
                  </Link>
                )
              })}
            </nav>

            <div className="border-t border-line pt-3 mt-3 space-y-0.5">
              <div className="px-2.5 py-1.5">
                <p className="text-xs font-medium text-fg truncate">{profile.name}</p>
                <p className="text-[10px] text-fg-muted truncate">{profile.email}</p>
              </div>
              <ThemeToggle />
              <form action={signOut}>
                <button className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-surface-2 text-fg-muted hover:text-fg text-[13px] transition">
                  Sign out
                </button>
              </form>
            </div>
          </aside>
        </div>
      )}
    </>
  )
}

// Compact icon-only theme toggle for the topbar; the labelled version still
// lives in the mobile drawer.
function CompactThemeToggle() {
  return (
    <div className="relative">
      <CompactToggleInner />
    </div>
  )
}

function CompactToggleInner() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof document === 'undefined') return 'light'
    return (document.documentElement.getAttribute('data-theme') as 'light' | 'dark') ?? 'light'
  })

  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
    document.cookie = `theme=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
  }

  const isDark = theme === 'dark'
  return (
    <button
      onClick={toggle}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      className="h-8 w-8 flex items-center justify-center rounded-full text-fg-muted hover:text-fg hover:bg-surface-2 transition"
    >
      {isDark ? (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      ) : (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  )
}

function Logo() {
  return (
    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-accent-hover text-accent-fg text-sm font-bold tracking-tight shadow-sm">
      C
    </span>
  )
}

function Icon({ name }: { name: IconName }) {
  const common = {
    width: 14,
    height: 14,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className: 'shrink-0',
  }
  switch (name) {
    case 'home':
      return (
        <svg {...common}>
          <path d="M3 11l9-8 9 8" />
          <path d="M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10" />
        </svg>
      )
    case 'briefcase':
      return (
        <svg {...common}>
          <rect x="3" y="7" width="18" height="13" rx="2" />
          <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
          <path d="M3 13h18" />
        </svg>
      )
    case 'tools':
      return (
        <svg {...common}>
          <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4l-6 6a1.5 1.5 0 0 0 2.1 2.1l6-6a4 4 0 0 0 5.4-5.4l-2.4 2.4-1.4-1.4 2.4-2.4z" />
        </svg>
      )
    case 'sparkle':
      return (
        <svg {...common}>
          <path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l2.5 2.5M16.5 16.5L19 19M5 19l2.5-2.5M16.5 7.5L19 5" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      )
    case 'goal':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="5" />
          <circle cx="12" cy="12" r="1.5" />
        </svg>
      )
    case 'compass':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M16 8l-2 6-6 2 2-6z" />
        </svg>
      )
    case 'crown':
      return (
        <svg {...common}>
          <path d="M3 7l4 4 5-7 5 7 4-4-2 12H5z" />
        </svg>
      )
    case 'family':
      return (
        <svg {...common}>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      )
  }
}
