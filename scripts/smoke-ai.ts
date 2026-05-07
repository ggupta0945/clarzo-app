// Standalone smoke test for the AI provider. Uses the SAME chatModel +
// chatProviderOptions the production routes use, so success here means the
// production routes should work too.
//
// Run: npx dotenv -e .env.local -- npx tsx scripts/smoke-ai.ts

import { generateText } from 'ai'
import { chatModel, chatProviderOptions, AI_PROVIDER } from '../lib/ai'

async function main() {
  console.log('Active provider:', AI_PROVIDER)
  console.log('Has OPENAI_API_KEY:', !!process.env.OPENAI_API_KEY)
  console.log('Has GOOGLE_GENERATIVE_AI_API_KEY:', !!process.env.GOOGLE_GENERATIVE_AI_API_KEY)
  console.log('OPENAI_MODEL:', process.env.OPENAI_MODEL ?? '(default gpt-4o-mini)')
  console.log()

  try {
    const { text, usage } = await generateText({
      model: chatModel,
      system: 'You are a helpful assistant.',
      prompt: 'Say "hello" in exactly one word.',
      maxOutputTokens: 20,
      providerOptions: chatProviderOptions,
    })
    console.log('✓ AI responded:', JSON.stringify(text))
    console.log('  usage:', usage)
  } catch (e) {
    console.error('✗ AI call failed')
    console.error(e)
    process.exit(1)
  }
}

main()
