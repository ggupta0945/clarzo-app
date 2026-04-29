import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Free tier cap: 10 ClarzoGPT queries per 30 days, per user. Sliding window so
// a user who hit the limit on day 1 doesn't have to wait until day 30 — old
// hits drop off the trailing edge.
//
// Returns null when Upstash env vars are missing (local dev without Upstash
// configured). Callers must treat null as "no limit applies."

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN

let chatLimitInstance: Ratelimit | null = null

if (UPSTASH_URL && UPSTASH_TOKEN) {
  chatLimitInstance = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(10, '30 d'),
    prefix: 'clarzo_chat',
    analytics: true,
  })
}

export const chatLimit = chatLimitInstance

export type ChatLimitResult = {
  success: boolean
  remaining: number
  reset: number
  limit: number
}

export async function checkChatLimit(userId: string): Promise<ChatLimitResult | null> {
  if (!chatLimit) return null
  const { success, remaining, reset, limit } = await chatLimit.limit(userId)
  return { success, remaining, reset, limit }
}
