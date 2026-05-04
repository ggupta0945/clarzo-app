import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import { cookies } from "next/headers";
import { PostHogProvider } from '@/lib/analytics/client'
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-dm-sans-loaded",
  display: "swap",
});

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Theme is persisted in a cookie so the server renders the right palette
  // on first paint — avoids the light-flash-then-dark hydration glitch.
  const cookieStore = await cookies()
  const theme = cookieStore.get('theme')?.value === 'dark' ? 'dark' : 'light'

  return (
    <html lang="en" data-theme={theme} className={`h-full antialiased ${dmSans.variable}`}>
      <body className="min-h-full bg-canvas text-fg">
        <PostHogProvider>{children}</PostHogProvider>
      </body>
    </html>
  );
}
