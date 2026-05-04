'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { signOut } from '@/app/dashboard/actions'
import { ThemeToggle } from './ThemeToggle'

type Profile = { name: string | null; email: string | null }

type NavLink = {
  href: string
  label: string
  icon: 'home' | 'sparkles' | 'bookmark' | 'briefcase' | 'chart' | 'tools' | 'sparkle' | 'goal' | 'compass' | 'crown'
}

type NavGroup = {
  label: string
  href: string
  icon: NavLink['icon']
  children?: NavLink[]
}

const GROUPS: NavGroup[] = [
  { label: 'Dashboard', href: '/dashboard', icon: 'home' },
  {
    label: 'Investments',
    href: '/dashboard/stocks',
    icon: 'briefcase',
    children: [
      { href: '/dashboard/stocks', label: 'My Stocks', icon: 'chart' },
      { href: '/dashboard/upload', label: 'Upload Portfolio', icon: 'tools' },
    ],
  },
  { label: 'Ask Clarzo', href: '/dashboard/ask', icon: 'sparkle' },
  { label: 'Goals', href: '/dashboard/goals', icon: 'goal' },
  { label: 'Discover', href: '/dashboard/discover', icon: 'compass' },
  { label: 'Upgrade', href: '/dashboard/upgrade', icon: 'crown' },
]

export function DashboardNav({ profile }: { profile: Profile }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

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
      <header className="lg:hidden sticky top-0 z-30 bg-surface border-b border-line flex items-center justify-between px-4 h-14">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Logo />
          <span className="text-lg font-semibold text-fg">Clarzo</span>
        </Link>
        <button
          aria-label="Open menu"
          aria-expanded={open}
          onClick={() => setOpen(true)}
          className="p-2 -mr-2 text-fg hover:text-accent transition"
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
          className="lg:hidden fixed inset-0 z-40 bg-black/40"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:sticky top-0 left-0 z-50 h-screen w-56 bg-surface border-r border-line p-3.5 flex flex-col
          transition-transform duration-200 lg:translate-x-0
          ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="mb-6 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Logo />
            <span className="text-base font-semibold text-fg tracking-tight">Clarzo</span>
          </Link>
          <button
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="lg:hidden p-1 text-fg-muted hover:text-accent transition"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 space-y-1">
          {GROUPS.map((g) => {
            const groupActive =
              pathname === g.href ||
              (g.children?.some((c) => pathname === c.href) ?? false)
            const expand = !!g.children && groupActive
            return (
              <div key={g.href}>
                <NavRow
                  href={g.href}
                  icon={g.icon}
                  label={g.label}
                  active={pathname === g.href}
                  highlighted={groupActive && !g.children}
                  onClick={() => setOpen(false)}
                />
                {expand && g.children && (
                  <div className="mt-1 ml-3 pl-3 border-l border-line space-y-1">
                    {g.children.map((c) => (
                      <NavRow
                        key={c.href}
                        href={c.href}
                        icon={c.icon}
                        label={c.label}
                        active={pathname === c.href}
                        highlighted={pathname === c.href}
                        onClick={() => setOpen(false)}
                        compact
                      />
                    ))}
                  </div>
                )}
              </div>
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
    </>
  )
}

function NavRow({
  href,
  icon,
  label,
  active,
  highlighted,
  onClick,
  compact,
}: {
  href: string
  icon: NavLink['icon']
  label: string
  active: boolean
  highlighted: boolean
  onClick: () => void
  compact?: boolean
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`relative flex items-center gap-2.5 ${compact ? 'px-2.5 py-1' : 'px-2.5 py-1.5'} rounded-lg transition ${
        highlighted
          ? 'bg-accent-soft text-accent font-medium'
          : active
            ? 'text-accent font-medium'
            : 'text-fg-muted hover:bg-canvas hover:text-fg'
      }`}
    >
      {highlighted && (
        <span
          aria-hidden
          className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r bg-accent"
        />
      )}
      <Icon name={icon} className={`shrink-0 ${highlighted ? 'text-accent' : 'text-current'}`} />
      <span className="text-[13px]">{label}</span>
    </Link>
  )
}

function Logo() {
  // Layered tabs evoking the Credly mark, recoloured to Clarzo's indigo accent.
  return (
    <span className="relative inline-flex h-6 w-7 items-center">
      <span className="absolute left-0 top-0 h-6 w-4 rounded bg-[#fb923c]" />
      <span className="absolute left-1.5 top-0 h-6 w-4 rounded bg-[#f5c842]" />
      <span className="absolute left-3 top-0 h-6 w-4 rounded bg-accent" />
      <span className="absolute left-[18px] top-0 h-6 w-4 rounded bg-accent" />
    </span>
  )
}

function Icon({ name, className }: { name: NavLink['icon']; className?: string }) {
  const common = {
    width: 15,
    height: 15,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
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
    case 'chart':
      return (
        <svg {...common}>
          <path d="M3 3v18h18" />
          <path d="M7 14l4-4 3 3 5-6" />
        </svg>
      )
    case 'tools':
      return (
        <svg {...common}>
          <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4l-6 6a1.5 1.5 0 0 0 2.1 2.1l6-6a4 4 0 0 0 5.4-5.4l-2.4 2.4-1.4-1.4 2.4-2.4z" />
        </svg>
      )
    case 'bookmark':
      return (
        <svg {...common}>
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
      )
    case 'sparkles':
      return (
        <svg {...common}>
          <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z" />
          <path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8z" />
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
  }
}
