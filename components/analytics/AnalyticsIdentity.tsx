'use client'

import { identifyUser } from '@/lib/analytics/client'
import { useEffect } from 'react'

export function AnalyticsIdentity({
  user,
}: {
  user: {
    id: string
    email?: string | null
    name?: string | null
  }
}) {
  useEffect(() => {
    identifyUser(user.id, { email: user.email, name: user.name })
  }, [user.email, user.id, user.name])

  return null
}
