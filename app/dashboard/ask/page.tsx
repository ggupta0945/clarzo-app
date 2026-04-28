'use client'

import { useChat } from '@ai-sdk/react'
import { useEffect, useRef } from 'react'

const SUGGESTED_QUESTIONS = [
  'How is my portfolio performing overall?',
  'Which holding has the best returns?',
  'What is a mutual fund NAV?',
  'How can I diversify my investments?',
]

export default function AskPage() {
  const { messages, input, handleInputChange, handleSubmit, isLoading, append } = useChat({
    api: '/api/ask',
  })
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex flex-col h-screen p-6 max-w-4xl mx-auto">
      <div className="mb-6 flex-shrink-0">
        <h1 className="text-3xl text-[#e4f0e8]" style={{ fontFamily: 'Playfair Display, serif' }}>
          Ask Clarzo
        </h1>
        <p className="text-[#88b098] mt-1">
          Your AI financial advisor — ask anything about your portfolio or personal finance.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 min-h-0">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-6 pb-10">
            <div className="text-center">
              <p className="text-[#4a7a5a] text-lg">Start a conversation with Clarzo</p>
              <p className="text-[#4a7a5a] text-sm mt-1">
                Ask about your portfolio, market concepts, or investment strategies.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 w-full">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => append({ role: 'user', content: q })}
                  className="text-left px-4 py-3 rounded-xl bg-[#071a10] border border-[#1a4a2e] text-[#88b098] text-sm hover:border-[#34d399] hover:text-[#e4f0e8] transition"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                m.role === 'user'
                  ? 'bg-[#059669] text-white'
                  : 'bg-[#071a10] border border-[#1a4a2e] text-[#e4f0e8]'
              }`}
            >
              {m.role === 'assistant' && (
                <p className="text-xs text-[#34d399] mb-1 font-medium">Clarzo</p>
              )}
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{m.content}</p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-[#071a10] border border-[#1a4a2e] rounded-2xl px-4 py-3">
              <p className="text-xs text-[#34d399] mb-2 font-medium">Clarzo</p>
              <div className="flex space-x-1">
                <span className="w-2 h-2 bg-[#34d399] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-[#34d399] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-[#34d399] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex gap-3 mt-4 flex-shrink-0">
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Ask about your portfolio or finances..."
          className="flex-1 bg-[#071a10] border border-[#1a4a2e] rounded-xl px-4 py-3 text-[#e4f0e8] placeholder-[#4a7a5a] focus:outline-none focus:border-[#34d399] transition"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !input?.trim()}
          className="bg-[#059669] hover:bg-[#0F6E56] text-white px-6 py-3 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          Send
        </button>
      </form>
    </div>
  )
}
