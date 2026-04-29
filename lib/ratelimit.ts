import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { createHash } from 'crypto'

// Free tier cap: 10 ClarzoGPT queries per 30 days, per user. Sliding window so
// a user who hit the limit on day 1 doesn't have to wait until day 30 — old
// hits drop off the trailing edge.
//
// Returns null when Upstash env vars are missing (local dev without Upstash
// configured). Callers must treat null as "no limit applies."

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN

let chatLimitInstance: Ratelimit | null = null
let publicAskLimitInstance: Ratelimit | null = null

if (UPSTASH_URL && UPSTASH_TOKEN) {
  chatLimitInstance = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(10, '30 d'),
    prefix: 'clarzo_chat',
    analytics: true,
  })

  // Public /ask gets 3 questions per IP per 30 days. Hashed IP = key, so we
  // never store raw IPs anywhere (Upstash sees only the hash).
  publicAskLimitInstance = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(3, '30 d'),
    prefix: 'clarzo_public_ask',
    analytics: true,
  })
}

export const chatLimit = chatLimitInstance
export const publicAskLimit = publicAskLimitInstance

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

export async function checkPublicAskLimit(ipHash: string): Promise<ChatLimitResult | null> {
  if (!publicAskLimit) return null
  const { success, remaining, reset, limit } = await publicAskLimit.limit(ipHash)
  return { success, remaining, reset, limit }
}

const IP_SALT = process.env.IP_SALT || 'clarzo-default-salt'

export function hashIP(ip: string): string {
  return createHash('sha256').update(ip + IP_SALT).digest('hex')
}

export function getClientIP(req: Request): string {
  const forwardedFor = req.headers.get('x-forwarded-for')
  if (forwardedFor) return forwardedFor.split(',')[0]!.trim()
  const realIp = req.headers.get('x-real-ip')
  if (realIp) return realIp.trim()
  return 'unknown'
}
