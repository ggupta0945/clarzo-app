'use client'

import { captureEvent } from '@/lib/analytics/client'
import { useEffect } from 'react'

type TrackEventProps = {
  event: string
  properties?: Record<string, string | number | boolean | null | undefined>
}

export function TrackEvent({ event, properties }: TrackEventProps) {
  useEffect(() => {
    captureEvent(event, properties)
    // We only want the mount event. Callers should pass stable literals.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
