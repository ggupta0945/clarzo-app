import { streamText, convertToModelMessages, tool, stepCountIs, type UIMessage } from 'ai'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { chatModel, chatProviderOptions, buildSystemBlocks } from '@/lib/ai'
import { CLARZOGPT_PERSONA } from '@/lib/public-chat-context'
import { checkPublicAskLimit, hashIP, getClientIP } from '@/lib/ratelimit'
import { fetchStockSnapshots, fetchIndices } from '@/lib/stock-prices'
import { fetchRecentCompanyNews, fetchCompanyProfile, fetchMarketNews } from '@/lib/finnhub'

export const maxDuration = 60

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
    model: chatModel,
    system: buildSystemBlocks(CLARZOGPT_PERSONA),
    messages: await convertToModelMessages(messages),
    maxOutputTokens: 16000,
    temperature: 0.5,
    providerOptions: chatProviderOptions,
    stopWhen: stepCountIs(5),
    tools: {
      getStockPrice: tool({
        description: 'Get live price snapshot for one or more Indian stocks: current price, % change from previous close, absolute change, day high/low, and 52-week high/low.',
        inputSchema: z.object({
          symbols: z.array(z.string()).describe('NSE ticker symbols, e.g. ["RELIANCE", "HDFCBANK"]'),
        }),
        execute: async ({ symbols }: { symbols: string[] }) => {
          const snapshots = await fetchStockSnapshots(symbols.map((s: string) => s.toUpperCase()))
          const result: Record<string, ReturnType<typeof snapshots.get> | null> = {}
          for (const sym of symbols) {
            result[sym.toUpperCase()] = snapshots.get(sym.toUpperCase()) ?? null
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
          }
        },
      }),
      getMarketNews: tool({
        description: "Get today's general Indian and global stock market news headlines.",
        inputSchema: z.object({
          limit: z.number().optional().describe('Number of headlines to return (default 10)'),
        }),
        execute: async ({ limit = 10 }: { limit?: number }) => {
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
      getIndices: tool({
        description: 'Get live levels and % change for key Indian indices: Nifty 50, Sensex, Nifty Bank, Nifty IT, Nifty Auto, Nifty Pharma. Always call this when asked about market performance, how the market is doing today, or broad market direction.',
        inputSchema: z.object({}),
        execute: async () => {
          const indices = await fetchIndices()
          return {
            asOf: new Date().toISOString(),
            indices: indices.map(i => ({
              name: i.name,
              price: i.price,
              changePct: parseFloat(i.changePct.toFixed(2)),
              dayHigh: i.dayHigh,
              dayLow: i.dayLow,
              week52High: i.week52High,
              week52Low: i.week52Low,
            })),
          }
        },
      }),
    },
    onError: ({ error }) => {
      // Surfaces auth failures (e.g. missing OPENAI_API_KEY) and provider
      // errors that would otherwise drop a silent empty stream on the client.
      console.error('[public-ask] stream error:', error)
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
