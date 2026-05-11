import { streamText, convertToModelMessages, tool, stepCountIs, type UIMessage } from 'ai'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
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
import { fetchLiveStockPrices } from '@/lib/stock-prices'
import { fetchRecentCompanyNews, fetchCompanyProfile, fetchMarketNews } from '@/lib/finnhub'

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
    stopWhen: stepCountIs(3),
    tools: {
      getStockPrice: tool({
        description: 'Get the current live market price of one or more Indian stocks by NSE ticker symbol.',
        inputSchema: z.object({
          symbols: z.array(z.string()).describe('NSE ticker symbols, e.g. ["RELIANCE", "HDFCBANK"]'),
        }),
        execute: async ({ symbols }: { symbols: string[] }) => {
          const prices = await fetchLiveStockPrices(symbols.map((s: string) => s.toUpperCase()))
          const result: Record<string, number | null> = {}
          for (const sym of symbols) {
            result[sym.toUpperCase()] = prices.get(sym.toUpperCase()) ?? null
          }
          return result
        },
      }),
      getCompanyNews: tool({
        description: 'Get recent news headlines for a specific Indian company by NSE ticker symbol.',
        inputSchema: z.object({
          symbol: z.string().describe('NSE ticker symbol, e.g. RELIANCE, HDFCBANK, INFY'),
          days: z.number().optional().describe('How many past days of news to fetch (default 7)'),
        }),
        execute: async ({ symbol, days = 7 }: { symbol: string; days?: number }) => {
          const news = await fetchRecentCompanyNews(symbol.toUpperCase(), days, 8)
          return {
            symbol: symbol.toUpperCase(),
            news: news.map(n => ({
              headline: n.headline,
              summary: n.summary,
              source: n.source,
              url: n.url,
              date: new Date(n.datetime * 1000).toISOString().split('T')[0],
            })),
          }
        },
      }),
      getCompanyProfile: tool({
        description: 'Get company profile including industry, market cap, and website for an Indian stock.',
        inputSchema: z.object({
          symbol: z.string().describe('NSE ticker symbol, e.g. RELIANCE, TCS, HDFCBANK'),
        }),
        execute: async ({ symbol }: { symbol: string }) => {
          const profile = await fetchCompanyProfile(symbol.toUpperCase())
          if (!profile) return { error: `Profile not found for ${symbol}` }
          return {
            name: profile.name,
            industry: profile.finnhubIndustry,
            exchange: profile.exchange,
            marketCapUSD: profile.marketCapitalization,
            website: profile.weburl,
            ipo: profile.ipo,
            currency: profile.currency,
            country: profile.country,
          }
        },
      }),
      getMarketNews: tool({
        description: "Get today's general Indian and global stock market news headlines.",
        inputSchema: z.object({
          limit: z.number().optional().describe('Number of headlines to return (default 8)'),
        }),
        execute: async ({ limit = 8 }: { limit?: number }) => {
          const news = await fetchMarketNews('general', limit)
          return {
            news: news.map(n => ({
              headline: n.headline,
              source: n.source,
              date: new Date(n.datetime * 1000).toISOString().split('T')[0],
            })),
          }
        },
      }),
    },
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
