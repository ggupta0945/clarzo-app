import { streamText, convertToModelMessages, type UIMessage } from 'ai'
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserHoldings, computePortfolioSummary } from '@/lib/portfolio'
import { aggregateBySector, aggregateByMcap } from '@/lib/allocation'
import { generateInsights } from '@/lib/insights'
import { buildSystemPrompt } from '@/lib/chat-context'
import { geminiModel } from '@/lib/ai'

export const maxDuration = 30

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { messages } = (await req.json()) as { messages: UIMessage[] }

  const holdings = await getUserHoldings(user.id)
  const summary = computePortfolioSummary(holdings)
  const sectors = aggregateBySector(holdings)
  const mcaps = aggregateByMcap(holdings)
  const insights = generateInsights(holdings)

  const system = buildSystemPrompt({ holdings, summary, sectors, mcaps, insights })

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
    model: geminiModel,
    system,
    messages: await convertToModelMessages(messages),
    onFinish: async ({ text }) => {
      if (!text) return
      const { error } = await supabase
        .from('chat_messages')
        .insert({ user_id: user.id, role: 'assistant', content: text })
      if (error) console.error('chat persist (assistant):', error)
    },
  })

  return result.toTextStreamResponse()
}

function extractText(m: UIMessage): string {
  return m.parts
    .map((p) => (p.type === 'text' ? p.text : ''))
    .join('')
    .trim()
}
