import { createGoogleGenerativeAI } from '@ai-sdk/google'
import type { GoogleGenerativeAIProviderOptions } from '@ai-sdk/google'
import { createOpenAI } from '@ai-sdk/openai'
import Anthropic from '@anthropic-ai/sdk'
import type { LanguageModel } from 'ai'

type AIProvider = 'gemini' | 'openai'

// Default to OpenAI since the OPENAI_API_KEY is the active key in production.
// Override via AI_PROVIDER=gemini if/when the Gemini key is restored.
const AI_PROVIDER: AIProvider = (process.env.AI_PROVIDER as AIProvider) ?? 'openai'

// ---------------- Gemini ----------------

export const gemini = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
})

// Gemini 2.5 Flash — newer, smarter, same price tier as 2.0 Flash. 1M context
// is overkill for our prompts (~3K tokens) but keeps the door open for
// dropping more portfolio history in.
export const geminiModel = gemini('gemini-2.5-flash')

// Finance content occasionally trips Gemini's default safety filter — a
// question like "is my portfolio risky?" can return an empty stream with
// finishReason=SAFETY. We're not generating harmful content; loosening the
// filter is appropriate for this surface. Reused by both /api/ask and the
// PDF/image extraction path.
export const geminiSafetySettings: NonNullable<
  GoogleGenerativeAIProviderOptions['safetySettings']
> = [
  { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
]

// ---------------- OpenAI ----------------

export const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// gpt-4o-mini covers our chat / digest needs at a fraction of gpt-4o's cost.
// Override via OPENAI_MODEL if you want to bump quality.
export const openaiModel = openai(process.env.OPENAI_MODEL ?? 'gpt-4o-mini')

// ---------------- Provider-agnostic exports ----------------

// One model handle that every call site uses; swap providers via env var
// without touching route code.
export const chatModel: LanguageModel = AI_PROVIDER === 'gemini' ? geminiModel : openaiModel

// Provider-specific options bundle. Gemini needs safetySettings to avoid
// false-positive blocks on finance prompts; OpenAI doesn't need any.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const chatProviderOptions: Record<string, any> | undefined =
  AI_PROVIDER === 'gemini'
    ? { google: { safetySettings: geminiSafetySettings } }
    : undefined

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export { AI_PROVIDER }
