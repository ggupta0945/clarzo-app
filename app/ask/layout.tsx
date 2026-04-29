import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Ask Clarzo — Free AI financial assistant',
  description:
    'Ask anything about money, investments, mutual funds, FDs, taxes. Free, no signup needed.',
  openGraph: {
    title: 'Ask Clarzo — Free AI financial assistant',
    description: 'Free AI for your money questions. No signup needed.',
    url: 'https://app.clarzo.ai/ask',
    siteName: 'Clarzo',
    type: 'website',
    locale: 'en_IN',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ask Clarzo — Free AI financial assistant',
    description: 'Free AI for your money questions. No signup needed.',
  },
}

export default function AskLayout({ children }: { children: React.ReactNode }) {
  return children
}
