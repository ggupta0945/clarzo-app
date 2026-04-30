import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Discover Where to Invest — Clarzo',
  description:
    'Explore sectors, research BSE-listed companies, and ask CompanyGPT for plain-English answers. Educational only — not investment advice.',
  openGraph: {
    title: 'Discover Where to Invest — Clarzo',
    description: 'Sector-by-sector research with pros, cons, and CompanyGPT.',
    url: 'https://app.clarzo.ai/discover',
    siteName: 'Clarzo',
    type: 'website',
    locale: 'en_IN',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Discover Where to Invest — Clarzo',
    description: 'Sector-by-sector research with pros, cons, and CompanyGPT.',
  },
}

export default function DiscoverLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
