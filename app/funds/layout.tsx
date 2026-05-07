// Public layout for the Mutual Funds segment. Anonymous users can browse,
// search, and view fund detail pages — they only need to sign in to use
// watchlist or to mix MF research with their own portfolio.
//
// Mirrors the dashboard chrome (top nav + theme) so a signed-in user moving
// between /dashboard and /funds gets a continuous shell.

import { createClient } from '@/lib/supabase/server'
import { DashboardNav } from '@/components/dashboard/Nav'
import { AnalyticsIdentity } from '@/components/analytics/AnalyticsIdentity'
import { FloatingAskClarzo } from '@/components/dashboard/FloatingAskClarzo'
import Link from 'next/link'

export default async function FundsLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  let profileName: string | null = null
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', user.id)
      .single()
    profileName = profile?.name ?? null
  }

  return (
    <div className="min-h-screen bg-canvas text-fg flex flex-col">
      {user ? (
        <>
          <AnalyticsIdentity user={{ id: user.id, email: user.email, name: profileName }} />
          <DashboardNav profile={{ name: profileName, email: user.email ?? null }} />
        </>
      ) : (
        <PublicHeader />
      )}
      <main className="flex-1">{children}</main>
      {user && <FloatingAskClarzo />}
    </div>
  )
}

function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 bg-canvas border-b border-line">
      <div className="h-16 px-6 sm:px-10 lg:px-14 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-accent-hover text-accent-fg text-sm font-bold tracking-tight shadow-sm">
            C
          </span>
          <span className="text-base font-semibold text-fg tracking-tight">Clarzo</span>
        </Link>
        <nav className="hidden md:flex items-center gap-5 text-sm">
          <Link href="/funds" className="text-fg-muted hover:text-fg transition">Mutual Funds</Link>
          <Link href="/ask" className="text-fg-muted hover:text-fg transition">Ask Clarzo</Link>
          <Link href="/discover" className="text-fg-muted hover:text-fg transition">Discover</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="text-sm text-fg-muted hover:text-fg transition px-3 py-1.5"
          >
            Sign in
          </Link>
          <Link
            href="/login"
            className="text-sm bg-accent hover:bg-accent-hover text-white px-3.5 py-1.5 rounded-lg font-medium transition"
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  )
}
