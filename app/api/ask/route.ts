import { streamText } from 'ai'
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserHoldings, computePortfolioSummary } from '@/lib/portfolio'
import { geminiModel } from '@/lib/ai'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { messages } = await req.json()

  const holdings = await getUserHoldings(user.id)
  const summary = computePortfolioSummary(holdings)

  const portfolioContext =
    holdings.length > 0
      ? `User portfolio — Net worth: ₹${summary.netWorth.toFixed(2)}, Invested: ₹${summary.invested.toFixed(2)}, P&L: ₹${summary.pnl.toFixed(2)} (${summary.pnlPct.toFixed(2)}%).\n\nHoldings:\n${holdings.map((h) => `- ${h.scheme_name} (${h.asset_type}): ${h.units} units, Current value: ₹${h.current_value.toFixed(2)}, P&L: ${h.pnl_pct.toFixed(2)}%`).join('\n')}`
      : 'The user has not uploaded any portfolio data yet.'

  const result = streamText({
    model: geminiModel,
    system: `You are Clarzo, a friendly and knowledgeable AI financial advisor. Help users understand their investment portfolio and answer questions about finance, mutual funds, stocks, and personal wealth management. Be concise and clear. Always use Indian Rupees (₹) for amounts. Do not provide specific regulated investment advice — educate and inform instead.\n\n${portfolioContext}`,
    messages,
  })

  return result.toDataStreamResponse()
}
