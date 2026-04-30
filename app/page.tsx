import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Clarzo — Your AI money coach',
  description:
    'Upload your portfolio, understand your allocation, spot risks, and ask plain-English money questions built for Indian investors.',
  openGraph: {
    title: 'Clarzo — Your AI money coach',
    description: 'Upload your portfolio. Get clear answers in plain English.',
    url: 'https://clarzo.ai',
    siteName: 'Clarzo',
    type: 'website',
    locale: 'en_IN',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Clarzo — Your AI money coach',
    description: 'Upload your portfolio. Get clear answers in plain English.',
  },
}

const steps = [
  {
    label: 'Upload',
    title: 'Bring holdings from any broker',
    body: 'Drop a CSV or Excel file from Zerodha, Groww, ICICI Direct, or paste holdings manually.',
  },
  {
    label: 'Understand',
    title: 'See the shape of your money',
    body: 'Clarzo breaks down sector exposure, market-cap mix, top holdings, and simple risk signals.',
  },
  {
    label: 'Ask',
    title: 'Get answers in plain English',
    body: 'Ask what is risky, what is concentrated, how a goal looks, or what to review next.',
  },
]

const notices = [
  'Top-heavy positions',
  'Sector concentration',
  'Market-cap imbalance',
  'Goal funding gaps',
]

export default function Home() {
  return (
    <main className="min-h-screen bg-[#040f0a] text-[#e4f0e8]">
      <header className="sticky top-0 z-30 border-b border-[#1a4a2e] bg-[#040f0a]/95 px-4 py-4 backdrop-blur sm:px-6">
        <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Link href="/" className="text-2xl font-bold text-[#34d399]">
            Clarzo
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <Link href="/discover" className="hidden text-[#a8cdb7] transition hover:text-[#e4f0e8] sm:inline">
              Discover
            </Link>
            <Link href="/ask" className="hidden text-[#a8cdb7] transition hover:text-[#e4f0e8] sm:inline">
              Ask free
            </Link>
            <Link href="/login" className="rounded-full bg-[#059669] px-5 py-2 font-medium text-white transition hover:bg-[#0f6e56]">
              Sign in
            </Link>
          </div>
        </nav>
      </header>

      <section className="relative isolate overflow-hidden border-b border-[#1a4a2e]">
        <ProductBackdrop />
        <div className="absolute inset-0 -z-10 bg-[#040f0a]/45" />

        <div className="mx-auto grid min-h-[78svh] max-w-6xl content-center px-4 py-12 sm:px-6 lg:grid-cols-[1fr_0.9fr] lg:py-16">
          <div className="max-w-2xl">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-[#f5c842]">
              AI money coach for Indian investors
            </p>
            <h1 className="text-5xl font-bold leading-[0.95] text-white sm:text-7xl">
              Clarzo
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-[#c1d6c8] sm:text-xl">
              Upload your portfolio. See where your money sits. Ask clear questions about risk,
              allocation, goals, and next steps.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/ask" className="rounded-full bg-[#34d399] px-6 py-3 text-center font-semibold text-[#04110a] transition hover:bg-[#8ee8bf]">
                Ask 3 free questions
              </Link>
              <Link href="/login" className="rounded-full border border-[#88b098] px-6 py-3 text-center font-semibold text-white transition hover:border-[#34d399] hover:text-[#34d399]">
                Upload portfolio
              </Link>
            </div>
            <p className="mt-5 text-sm text-[#88b098]">
              Read-only portfolio analysis. Clarzo never moves your money.
            </p>
          </div>
        </div>
      </section>

      <section className="border-b border-[#1a4a2e] bg-[#071a10] px-4 py-10 sm:px-6">
        <div className="mx-auto grid max-w-6xl gap-3 sm:grid-cols-3">
          {steps.map((step) => (
            <article key={step.label} className="rounded-lg border border-[#1a4a2e] bg-[#040f0a] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#60a5fa]">
                {step.label}
              </p>
              <h2 className="mt-3 text-xl font-semibold text-white">{step.title}</h2>
              <p className="mt-3 text-sm leading-6 text-[#a8cdb7]">{step.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#f5c842]">
              What Clarzo notices
            </p>
            <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
              The questions investors actually ask after opening their portfolio.
            </h2>
            <p className="mt-5 leading-7 text-[#a8cdb7]">
              Clarzo turns holdings into a short, specific snapshot so the next conversation
              starts with your real numbers instead of generic advice.
            </p>
          </div>

          <div className="rounded-lg border border-[#1a4a2e] bg-[#071a10] p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              {notices.map((notice, index) => (
                <div key={notice} className="rounded-lg bg-[#0c2418] p-4">
                  <p className="text-3xl font-bold text-[#34d399]">0{index + 1}</p>
                  <p className="mt-3 text-sm text-[#e4f0e8]">{notice}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-lg border border-[#1a4a2e] bg-[#040f0a] p-4">
              <p className="text-sm text-[#88b098]">Clarzo answer</p>
              <p className="mt-2 text-base leading-7 text-white">
                Your largest risk is concentration: 42% of current value sits in two holdings.
                One next step is to compare that against your goal timeline before adding more.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-[#1a4a2e] bg-[#071a10] px-4 py-12 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Try the money chat before signing up.</h2>
            <p className="mt-2 text-[#a8cdb7]">Three free questions. No portfolio required.</p>
          </div>
          <Link href="/ask" className="rounded-full bg-[#34d399] px-6 py-3 text-center font-semibold text-[#04110a] transition hover:bg-[#8ee8bf]">
            Ask Clarzo
          </Link>
        </div>
      </section>
    </main>
  )
}

function ProductBackdrop() {
  return (
    <div className="pointer-events-none absolute bottom-8 right-[-270px] -z-20 w-[860px] max-w-none rotate-[-2deg] rounded-lg border border-[#2c6544] bg-[#071a10] p-4 opacity-80 shadow-2xl shadow-black/50 sm:right-[-190px] lg:right-[-70px] lg:w-[780px]">
      <div className="mb-4 flex items-center justify-between border-b border-[#1a4a2e] pb-3">
        <div>
          <p className="text-sm text-[#88b098]">Portfolio snapshot</p>
          <p className="text-3xl font-bold text-white">₹18,42,500</p>
        </div>
        <div className="rounded-full bg-[#102e1e] px-4 py-2 text-sm text-[#34d399]">+12.4%</div>
      </div>
      <div className="grid gap-4 md:grid-cols-[1fr_0.85fr]">
        <div className="space-y-3">
          {[
            ['Financials', '34%'],
            ['Technology', '21%'],
            ['Consumer', '18%'],
            ['Healthcare', '11%'],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg bg-[#0c2418] p-3">
              <div className="mb-2 flex justify-between text-sm">
                <span className="text-[#c1d6c8]">{label}</span>
                <span className="text-[#f5c842]">{value}</span>
              </div>
              <div className="h-2 rounded-full bg-[#1a4a2e]">
                <div className="h-2 rounded-full bg-[#34d399]" style={{ width: value }} />
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-3">
          <div className="rounded-lg border border-[#1a4a2e] bg-[#040f0a] p-4">
            <p className="text-xs text-[#34d399]">Clarzo</p>
            <p className="mt-2 text-sm leading-6 text-[#e4f0e8]">
              Your portfolio is growth-heavy, but the top 3 holdings drive most of the result.
            </p>
          </div>
          <div className="rounded-lg border border-[#1a4a2e] bg-[#040f0a] p-4">
            <p className="text-xs text-[#60a5fa]">Goal check</p>
            <p className="mt-2 text-sm leading-6 text-[#e4f0e8]">
              For the 2030 house goal, you may need about ₹28k/month more.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
