import { createGoogleGenerativeAI } from '@ai-sdk/google'
import type { GoogleGenerativeAIProviderOptions } from '@ai-sdk/google'
import { createOpenAI } from '@ai-sdk/openai'
import Anthropic from '@anthropic-ai/sdk'
import type { LanguageModel } from 'ai'

type AIProvider = 'gemini' | 'openai'

// Default to OpenAI. Set AI_PROVIDER=gemini in env to flip without code changes.
const AI_PROVIDER: AIProvider = (process.env.AI_PROVIDER as AIProvider) ?? 'openai'

// ---------------- Gemini ----------------

export const gemini = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
})

export const geminiModel = gemini('gemini-2.5-flash')

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

export const openaiModel = openai(process.env.OPENAI_MODEL ?? 'gpt-4o-mini')

// ---------------- Provider-agnostic exports ----------------

export const chatModel: LanguageModel = AI_PROVIDER === 'gemini' ? geminiModel : openaiModel

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const chatProviderOptions: Record<string, any> | undefined =
  AI_PROVIDER === 'gemini'
    ? { google: { safetySettings: geminiSafetySettings } }
    : undefined

export function buildSystemBlocks(...blocks: string[]): string {
  return blocks.join('\n\n')
}

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export { AI_PROVIDER }
