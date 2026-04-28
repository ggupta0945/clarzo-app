import { createGoogleGenerativeAI } from '@ai-sdk/google'
import Anthropic from '@anthropic-ai/sdk'

type AIProvider = 'gemini' | 'anthropic'

const AI_PROVIDER: AIProvider = (process.env.AI_PROVIDER as AIProvider) ?? 'gemini'

export const gemini = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
})

export const geminiModel = gemini('gemini-2.0-flash')

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export { AI_PROVIDER }
