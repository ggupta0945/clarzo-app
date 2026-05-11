import { createGoogleGenerativeAI } from '@ai-sdk/google'
import type { GoogleGenerativeAIProviderOptions } from '@ai-sdk/google'
import { createOpenAI } from '@ai-sdk/openai'
import Anthropic from '@anthropic-ai/sdk'
import type { LanguageModel } from 'ai'

type AIProvider = 'gemini' | 'openai'

// Default to OpenAI since the OPENAI_API_KEY is the key wired up in
// production. Set AI_PROVIDER=gemini in env to flip without code changes.
const AI_PROVIDER: AIProvider = (process.env.AI_PROVIDER as AIProvider) ?? 'openai'

// ---------------- Gemini ----------------

export const gemini = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
})

// Gemini 2.5 Flash. Used for file parsing (PDFs / images) regardless of the
// active chat provider since the extraction prompt is tuned for it. Also
// available as a chat fallback when AI_PROVIDER=gemini.
export const geminiModel = gemini('gemini-2.5-flash')

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

// ---------------- OpenAI ----------------

export const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// gpt-4o-mini covers our chat / digest needs at a fraction of gpt-4o's cost.
// Override via OPENAI_MODEL if you want to bump quality.
export const openaiModel = openai(process.env.OPENAI_MODEL ?? 'gpt-4o-mini')

// ---------------- Provider-agnostic chat exports ----------------

// One model handle that every chat call site uses; swap providers via env
// var without touching route code.
export const chatModel: LanguageModel = AI_PROVIDER === 'gemini' ? geminiModel : openaiModel

// Provider-specific options bundle. Gemini needs safetySettings to avoid
// false-positive blocks on finance prompts; OpenAI doesn't need any.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const chatProviderOptions: Record<string, any> | undefined =
  AI_PROVIDER === 'gemini'
    ? { google: { safetySettings: geminiSafetySettings } }
    : undefined

// buildSystemBlocks concatenates system prompt blocks into a single string.
// Used by chat surfaces to keep persona + per-route context cleanly separated
// while sending one final system prompt to the model.
export function buildSystemBlocks(...blocks: string[]): string {
  return blocks.join('\n\n')
}

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export { AI_PROVIDER }
