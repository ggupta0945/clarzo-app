'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

// Renders the assistant's markdown output (TL;DR sections, comparison tables,
// bullet bull/bear cases) inside a chat bubble. Styled via the components
// prop because we don't ship @tailwindcss/typography — colors inherit from
// the bubble so this works in both the dark public /ask theme and the
// CSS-var-driven dashboard theme.

export function MarkdownMessage({ content }: { content: string }) {
  return (
    <div className="text-sm leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-base font-semibold mt-3 mb-2 first:mt-0">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-sm font-semibold mt-3 mb-1.5 first:mt-0">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm font-semibold mt-2.5 mb-1 first:mt-0">{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-xs font-semibold uppercase tracking-wide mt-2 mb-1 opacity-80 first:mt-0">
              {children}
            </h4>
          ),
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          ul: ({ children }) => (
            <ul className="list-disc pl-5 space-y-1 mb-2 last:mb-0">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-5 space-y-1 mb-2 last:mb-0">{children}</ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2 hover:opacity-80"
            >
              {children}
            </a>
          ),
          hr: () => <hr className="my-3 border-current opacity-20" />,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-current/40 pl-3 my-2 opacity-90">
              {children}
            </blockquote>
          ),
          code: ({ children, className }) => {
            const isBlock = /language-/.test(className ?? '')
            if (isBlock) {
              return (
                <pre className="my-2 p-2.5 rounded-lg bg-current/10 text-[0.8em] overflow-x-auto">
                  <code>{children}</code>
                </pre>
              )
            }
            return (
              <code className="px-1 py-0.5 rounded bg-current/10 text-[0.85em] font-mono">
                {children}
              </code>
            )
          },
          table: ({ children }) => (
            <div className="overflow-x-auto my-3 -mx-1">
              <table className="w-full border-collapse text-xs">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="border-b border-current/30">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="text-left px-2.5 py-1.5 font-semibold align-top">{children}</th>
          ),
          td: ({ children }) => (
            <td className="px-2.5 py-1.5 border-t border-current/15 align-top">{children}</td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
