import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { geminiModel, geminiSafetySettings } from '@/lib/ai'
import { generateText } from 'ai'

export const maxDuration = 30

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { question, company } = await req.json() as {
    question: string
    company: {
      name: string
      full: string
      bse: string
      about: string
      price: string
      mcap: string
      pe: string
      roe: string
      div: string
      rev: string
      facts: Record<string, string>
      pros: string[]
      cons: string[]
    }
  }

  if (!question?.trim() || !company?.name) {
    return NextResponse.json({ error: 'question and company are required' }, { status: 400 })
  }

  const system = `You are ClarzoGPT — an expert Indian equity research analyst embedded in Clarzo, a personal finance app.

COMPANY CONTEXT
Name: ${company.full} (${company.bse})
About: ${company.about}
Current Price: ${company.price} | Market Cap: ${company.mcap}
P/E: ${company.pe} | ROE: ${company.roe} | Dividend Yield: ${company.div} | Revenue: ${company.rev}
Sector: ${company.facts['Sector'] ?? 'N/A'} | Founded: ${company.facts['Founded'] ?? 'N/A'}

STRENGTHS
${company.pros.map((p) => `- ${p}`).join('\n')}

RISKS
${company.cons.map((c) => `- ${c}`).join('\n')}

RULES
1. Answer in under 150 words unless the user asks for detail.
2. Use the company data above as your primary source. Acknowledge when you are reasoning beyond it.
3. Never give explicit "buy" or "sell" directives. Frame as options with tradeoffs.
4. End with either a follow-up question or a concrete next step.
5. Always add "Not investment advice." at the end when making suggestions.
6. Keep the tone like a smart, well-read friend — not a sales pitch.`

  try {
    const { text } = await generateText({
      model: geminiModel,
      system,
      prompt: question,
      maxOutputTokens: 400,
      temperature: 0.7,
      providerOptions: {
        google: { safetySettings: geminiSafetySettings },
      },
    })
    return NextResponse.json({ text })
  } catch (err) {
    console.error('company-ask error:', err)
    return NextResponse.json({ error: 'ai_error' }, { status: 500 })
  }
}
