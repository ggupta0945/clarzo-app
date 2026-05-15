import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import type { GoogleGenerativeAIProviderOptions } from '@ai-sdk/google'
import { createOpenAI } from '@ai-sdk/openai'
import Anthropic from '@anthropic-ai/sdk'
import type { LanguageModel } from 'ai'

type AIProvider = 'anthropic' | 'gemini' | 'openai'

// Default to Claude. Override with AI_PROVIDER env var.
const AI_PROVIDER: AIProvider = (process.env.AI_PROVIDER as AIProvider) ?? 'anthropic'

// ---------------- Anthropic / Claude ----------------

export const anthropicProvider = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// claude-sonnet-4-6 — best balance of reasoning and speed for equity analysis
export const claudeModel = anthropicProvider('claude-sonnet-4-6')

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

export const openaiModel = openai(process.env.OPENAI_MODEL ?? 'gpt-4o')

// ---------------- Provider-agnostic exports ----------------

export const chatModel: LanguageModel =
  AI_PROVIDER === 'anthropic' ? claudeModel :
  AI_PROVIDER === 'gemini'   ? geminiModel :
                               openaiModel

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const chatProviderOptions: Record<string, any> | undefined =
  AI_PROVIDER === 'gemini'
    ? { google: { safetySettings: geminiSafetySettings } }
    : undefined

// Builds the system prompt string (persona only — no user data).
// With Anthropic, this string goes into the `system` field and is automatically
// cached after the first request (min 1024 tokens; our persona is ~1500 tokens).
export function buildSystemBlocks(...blocks: string[]): string {
  return blocks.join('\n\n')
}

// Builds the per-user portfolio block as a primed context pair that gets
// injected before the real conversation. Returns undefined if no portfolio
// block is provided (public/unauthenticated chat).
//
// Why a fake assistant turn? Anthropic's cache_control on message content
// lets us cache per-user portfolio context independently of the shared system
// prompt. The "Understood." reply is the minimum valid assistant turn.
export function buildPortfolioContextMessages(
  portfolioBlock: string,
): Array<{ role: 'user' | 'assistant'; content: Array<{ type: 'text'; text: string; providerMetadata?: Record<string, unknown> }> }> {
  return [
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: portfolioBlock,
          providerMetadata: {
            anthropic: { cacheControl: { type: 'ephemeral' } },
          },
        },
      ],
    },
    {
      role: 'assistant',
      content: [{ type: 'text', text: 'Portfolio context loaded. Ready for your questions.' }],
    },
  ]
}

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export { AI_PROVIDER }
