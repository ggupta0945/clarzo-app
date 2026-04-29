import { streamText, convertToModelMessages, type UIMessage } from 'ai'
import { NextRequest, NextResponse } from 'next/server'
import { geminiModel, geminiSafetySettings } from '@/lib/ai'
import { buildPublicSystemPrompt } from '@/lib/public-chat-context'
import { checkPublicAskLimit, hashIP, getClientIP } from '@/lib/ratelimit'

export const maxDuration = 30

// Public, unauthenticated chat endpoint. Rate limited by hashed IP — 3
// questions per 30 days. Hashed because raw IPs are PII; Upstash only ever
// sees the hash. When Upstash isn't configured (local dev), the limit is
// skipped — same convention as /api/ask.

export async function POST(req: NextRequest) {
  const ip = getClientIP(req)
  const ipHash = hashIP(ip)

  const limit = await checkPublicAskLimit(ipHash)
  if (limit && !limit.success) {
    return NextResponse.json(
      {
        error: 'rate_limit',
        message:
          "You've used your 3 free questions. Sign up free at clarzo.ai for unlimited general questions and personalized portfolio answers.",
        remaining: 0,
        limit: limit.limit,
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': String(limit.limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(limit.reset),
        },
      },
    )
  }

  const { messages } = (await req.json()) as { messages: UIMessage[] }

  const result = streamText({
    model: geminiModel,
    system: buildPublicSystemPrompt(),
    messages: await convertToModelMessages(messages),
    maxOutputTokens: 400,
    temperature: 0.7,
    providerOptions: {
      google: {
        safetySettings: geminiSafetySettings,
      },
    },
  })

  const response = result.toTextStreamResponse()
  if (limit) {
    response.headers.set('X-RateLimit-Limit', String(limit.limit))
    response.headers.set('X-RateLimit-Remaining', String(limit.remaining))
    response.headers.set('X-RateLimit-Reset', String(limit.reset))
  }
  return response
}
