import { streamText, convertToModelMessages, type UIMessage } from 'ai'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserHoldings, computePortfolioSummary } from '@/lib/portfolio'
import { aggregateBySector, aggregateByMcap } from '@/lib/allocation'
import { generateInsights } from '@/lib/insights'
import { getUserGoals } from '@/lib/goals'
import { buildPortfolioBlock } from '@/lib/chat-context'
import { CLARZOGPT_PERSONA } from '@/lib/public-chat-context'
import { chatModel, chatProviderOptions, buildSystemBlocks } from '@/lib/ai'
import { checkChatLimit } from '@/lib/ratelimit'
import { getUserPlan } from '@/lib/subscription'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  // Pro-tier users bypass the free-tier rate limit entirely.
  const plan = await getUserPlan(user.id)

  // Rate limit before doing any work. checkChatLimit returns null when
  // Upstash isn't configured (local dev) — that's fine, requests pass through.
  const limit = plan === 'active' ? null : await checkChatLimit(user.id)
  if (limit && !limit.success) {
    const resetIn = Math.max(0, Math.round((limit.reset - Date.now()) / 1000 / 86400))
    return NextResponse.json(
      {
        error: 'rate_limit',
        message: `You've used your ${limit.limit} free queries. Resets in ~${resetIn} day${resetIn === 1 ? '' : 's'}.`,
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

  const [holdings, goals, profileRow] = await Promise.all([
    getUserHoldings(user.id),
    getUserGoals(user.id),
    supabase.from('profiles').select('risk_profile').eq('id', user.id).single(),
  ])
  const summary = computePortfolioSummary(holdings)
  const sectors = aggregateBySector(holdings)
  const mcaps = aggregateByMcap(holdings)
  const insights = generateInsights(holdings)
  const riskProfile = (profileRow.data?.risk_profile ?? null) as Parameters<typeof buildPortfolioBlock>[0]['riskProfile']

  const portfolioBlock = buildPortfolioBlock({ holdings, summary, sectors, mcaps, insights, goals, riskProfile })

  // Persist the user's last turn before we stream — even if streaming fails,
  // the question is captured. We stay deliberately silent on errors here:
  // chat works fine without history, no reason to break the request.
  const lastUser = [...messages].reverse().find((m) => m.role === 'user')
  if (lastUser) {
    const text = extractText(lastUser)
    if (text) {
      supabase
        .from('chat_messages')
        .insert({ user_id: user.id, role: 'user', content: text })
        .then(({ error }) => {
          if (error) console.error('chat persist (user):', error)
        })
    }
  }

  const result = streamText({
    model: chatModel,
    system: buildSystemBlocks(CLARZOGPT_PERSONA, portfolioBlock),
    messages: await convertToModelMessages(messages),
    maxOutputTokens: 10000,
    temperature: 0.5,
    providerOptions: chatProviderOptions,
    onError: ({ error }) => {
      // Surfaces auth failures (e.g. missing OPENAI_API_KEY) and provider
      // errors that would otherwise drop a silent empty stream on the client.
      console.error('[ask] stream error:', error)
    },
    onFinish: async ({ text }) => {
      if (!text) return
      const { error } = await supabase
        .from('chat_messages')
        .insert({ user_id: user.id, role: 'assistant', content: text })
      if (error) console.error('chat persist (assistant):', error)
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

function extractText(m: UIMessage): string {
  return m.parts
    .map((p) => (p.type === 'text' ? p.text : ''))
    .join('')
    .trim()
}
