import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { chatModel, chatProviderOptions, buildSystemBlocks } from '@/lib/ai'
import { CLARZOGPT_PERSONA } from '@/lib/public-chat-context'
import { generateText } from 'ai'

export const maxDuration = 60

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

  const companyBlock = `## COMPANY CONTEXT (the user is currently viewing this company)

Name: ${company.full} (${company.bse})
About: ${company.about}
Current Price: ${company.price} | Market Cap: ${company.mcap}
P/E: ${company.pe} | ROE: ${company.roe} | Dividend Yield: ${company.div} | Revenue: ${company.rev}
Sector: ${company.facts['Sector'] ?? 'N/A'} | Founded: ${company.facts['Founded'] ?? 'N/A'}

### Strengths
${company.pros.map((p) => `- ${p}`).join('\n')}

### Risks
${company.cons.map((c) => `- ${c}`).join('\n')}

Anchor your answer in the company data above. When you go beyond it, label the inference. Stick to your standard analyst response format.`

  try {
    const { text } = await generateText({
      model: chatModel,
      system: buildSystemBlocks(CLARZOGPT_PERSONA, companyBlock),
      prompt: question,
      maxOutputTokens: 10000,
      temperature: 0.5,
      providerOptions: chatProviderOptions,
    })
    return NextResponse.json({ text })
  } catch (err) {
    console.error('company-ask error:', err)
    return NextResponse.json({ error: 'ai_error' }, { status: 500 })
  }
}
