import { PostHog } from 'posthog-node'

type ServerAnalyticsProperties = Record<string, string | number | boolean | null | undefined>

let client: PostHog | null = null

function getServerPostHog(): PostHog | null {
  const key = process.env.POSTHOG_PROJECT_API_KEY || process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!key) return null

  if (!client) {
    client = new PostHog(key, {
      host: process.env.POSTHOG_HOST || process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
      flushAt: 1,
    })
  }

  return client
}

export async function captureServerEvent(
  distinctId: string,
  event: string,
  properties?: ServerAnalyticsProperties,
) {
  const posthog = getServerPostHog()
  if (!posthog) return

  posthog.capture({
    distinctId,
    event,
    properties,
  })

  await posthog.flush()
}
