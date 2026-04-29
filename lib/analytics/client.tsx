'use client'

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { usePathname, useSearchParams } from 'next/navigation'
import { Suspense, useEffect } from 'react'

type AnalyticsProperties = Record<string, string | number | boolean | null | undefined>

let initialized = false

function ensurePostHog() {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (initialized || typeof window === 'undefined' || !key) return

  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
    person_profiles: 'identified_only',
    capture_pageview: false,
  })
  initialized = true
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  ensurePostHog()
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return <>{children}</>

  return (
    <PHProvider client={posthog}>
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      {children}
    </PHProvider>
  )
}

export function captureEvent(event: string, properties?: AnalyticsProperties) {
  ensurePostHog()
  if (!initialized) return
  posthog.capture(event, properties)
}

export function identifyUser(
  userId: string,
  properties?: {
    email?: string | null
    name?: string | null
  },
) {
  ensurePostHog()
  if (!initialized) return
  posthog.identify(userId, {
    email: properties?.email ?? undefined,
    name: properties?.name ?? undefined,
  })
}

function PostHogPageView() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!pathname) return

    const queryString = searchParams.toString()
    const currentUrl = `${window.location.origin}${pathname}${queryString ? `?${queryString}` : ''}`

    captureEvent('$pageview', {
      $current_url: currentUrl,
      pathname,
    })
  }, [pathname, searchParams])

  return null
}
