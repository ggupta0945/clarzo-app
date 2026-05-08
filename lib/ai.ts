import { createGoogleGenerativeAI } from '@ai-sdk/google'
import type { GoogleGenerativeAIProviderOptions } from '@ai-sdk/google'
import type { SystemModelMessage } from 'ai'

type AIProvider = 'gemini' | 'anthropic'

const AI_PROVIDER: AIProvider = (process.env.AI_PROVIDER as AIProvider) ?? 'gemini'

export const gemini = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
})

// Gemini 2.5 Flash powers all chat and file-parsing surfaces.
// Switch to Anthropic by setting AI_PROVIDER=anthropic and adding
// @ai-sdk/anthropic + a valid ANTHROPIC_API_KEY to .env.local.
export const geminiModel = gemini('gemini-2.5-flash')

export const chatModel = geminiModel

// Finance content occasionally trips Gemini's default safety filter — a
// question like "is my portfolio risky?" can return an empty stream with
// finishReason=SAFETY. Loosening the filter is appropriate for this surface.
export const geminiSafetySettings: NonNullable<
  GoogleGenerativeAIProviderOptions['safetySettings']
> = [
  { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
]

// buildSystemBlocks concatenates system prompt blocks into a single string
// for Gemini. When switching to Anthropic, this is where prompt-caching
// blocks would be constructed instead.
export function buildSystemBlocks(...blocks: string[]): string {
  return blocks.join('\n\n')
}

export { AI_PROVIDER }
