import type { Metadata } from "next";
import { PostHogProvider } from '@/lib/analytics/client'
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL('https://app.clarzo.ai'),
  title: {
    default: 'Clarzo — Your AI money coach',
    template: '%s · Clarzo',
  },
  description:
    'Upload your portfolio. See your sector mix, market-cap exposure, and risks at a glance. Ask Clarzo anything about your money in plain English.',
  applicationName: 'Clarzo',
  openGraph: {
    title: 'Clarzo — Your AI money coach',
    description: 'Upload your portfolio. Get clear answers in plain English.',
    url: 'https://app.clarzo.ai',
    siteName: 'Clarzo',
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Clarzo — Your AI money coach',
    description: 'Upload your portfolio. Get clear answers in plain English.',
  },
  robots: { index: true, follow: true },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full bg-[#040f0a] text-[#e4f0e8]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
        <PostHogProvider>{children}</PostHogProvider>
      </body>
    </html>
  );
}
