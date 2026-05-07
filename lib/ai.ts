import { createGoogleGenerativeAI } from '@ai-sdk/google'
import type { GoogleGenerativeAIProviderOptions } from '@ai-sdk/google'
import { createAnthropic } from '@ai-sdk/anthropic'
import Anthropic from '@anthropic-ai/sdk'

type AIProvider = 'gemini' | 'anthropic'

const AI_PROVIDER: AIProvider = (process.env.AI_PROVIDER as AIProvider) ?? 'gemini'

export const gemini = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
})

// Gemini 2.5 Flash powers the upload/parsing path (PDFs, images) where
// throughput and structured-extraction quality matter more than reasoning.
export const geminiModel = gemini('gemini-2.5-flash')

const anthropicProvider = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// Claude Sonnet 4.6 powers the chat surfaces. Frontier-tier reasoning on
// equity research questions, tight format adherence (TL;DR + tables +
// follow-ups), and meaningfully better than Flash on Indian-market context.
// Override per-route by passing a different model id to anthropicProvider().
export const chatModel = anthropicProvider('claude-sonnet-4-6')

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

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export { AI_PROVIDER }
