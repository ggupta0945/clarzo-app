'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { sectors, gptResponses, type Company, type Sector } from './data'

// Three views in one page: sectors grid → companies in a sector → company
// detail. We keep them all in local state and let React handle the swap so
// there's no router round-trip — feels instant once the data is loaded.

type ChatMessage = { role: 'user' | 'ai'; text: string }

const COMPANY_AVATAR_COLORS = ['#059669', '#60a5fa', '#f5c842', '#a78bfa', '#f59e0b']

export default function DiscoverPage() {
  const [filter, setFilter] = useState('')
  const [sectorId, setSectorId] = useState<string | null>(null)
  const [companyIdx, setCompanyIdx] = useState<number | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    supabase.auth.getSession().then(({ data }) => {
      setIsLoggedIn(!!data.session)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setIsLoggedIn(!!session)
    })
    return () => subscription.unsubscribe()
  }, [])

  const sector: Sector | null = useMemo(
    () => (sectorId ? sectors.find((s) => s.id === sectorId) ?? null : null),
    [sectorId],
  )
  const company: Company | null =
    sector && companyIdx !== null ? sector.cos[companyIdx] ?? null : null

  function showSectors() {
    setSectorId(null)
    setCompanyIdx(null)
    setFilter('')
  }
  function showCompanies(id: string) {
    setSectorId(id)
    setCompanyIdx(null)
  }
  function showDetail(idx: number) {
    setCompanyIdx(idx)
  }

  return (
    <main className="min-h-screen bg-[#040f0a] text-[#e4f0e8]">
      <header className="sticky top-0 z-30 border-b border-[#1a4a2e] bg-[#040f0a]/95 px-4 py-4 backdrop-blur sm:px-6">
        <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Link href="/" className="text-2xl font-bold text-[#34d399]">
            Clarzo
          </Link>
          <div className="flex items-center gap-3 text-sm">
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className="rounded-full bg-[#059669] px-5 py-2 font-medium text-white transition hover:bg-[#0f6e56]"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/ask"
                  className="hidden text-[#a8cdb7] transition hover:text-[#e4f0e8] sm:inline"
                >
                  Ask free
                </Link>
                <Link
                  href="/login"
                  className="rounded-full bg-[#059669] px-5 py-2 font-medium text-white transition hover:bg-[#0f6e56]"
                >
                  Sign in
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>

      <section className="px-4 pt-12 pb-6 text-center sm:px-6">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-3xl text-white sm:text-5xl">
            Discover Where to <em className="not-italic text-[#34d399]">Invest</em>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[#a8cdb7]">
            Explore sectors, research companies, and make informed decisions. We show you the
            facts, the pros, and the cons — you decide what&apos;s right for you.
          </p>
          <div className="mt-5 inline-flex items-center gap-2 rounded-lg border border-[#1a4a2e] bg-[#071a10] px-4 py-2 text-xs text-[#88b098]">
            <span className="text-[#f5c842]">⚠️</span>
            For educational purposes only. Not investment advice. Always do your own research.
          </div>
          <div className="relative mx-auto mt-6 max-w-xl">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#88b098]">
              🔍
            </span>
            <input
              type="text"
              value={sector || company ? '' : filter}
              onChange={(e) => setFilter(e.target.value)}
              disabled={!!sector || !!company}
              placeholder="Search sectors or companies..."
              className="w-full rounded-xl border border-[#1a4a2e] bg-[#071a10] py-3 pl-11 pr-4 text-sm text-[#e4f0e8] placeholder:text-[#88b098] focus:border-[#34d399] focus:outline-none disabled:opacity-60"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-wrap items-center gap-2 py-5 text-xs text-[#88b098]">
          <button
            onClick={showSectors}
            className="text-[#34d399] transition hover:opacity-80"
          >
            All Sectors
          </button>
          {sector && (
            <>
              <span className="opacity-40">›</span>
              {company ? (
                <button
                  onClick={() => setCompanyIdx(null)}
                  className="text-[#34d399] transition hover:opacity-80"
                >
                  {sector.name}
                </button>
              ) : (
                <span>{sector.name}</span>
              )}
            </>
          )}
          {company && (
            <>
              <span className="opacity-40">›</span>
              <span>{company.name}</span>
            </>
          )}
        </div>

        {!sector && <SectorsGrid filter={filter} onSelect={showCompanies} />}
        {sector && !company && (
          <CompaniesView sector={sector} onSelect={showDetail} />
        )}
        {sector && company && <CompanyDetail company={company} sector={sector} />}
      </section>
    </main>
  )
}

function SectorsGrid({
  filter,
  onSelect,
}: {
  filter: string
  onSelect: (id: string) => void
}) {
  const filtered = sectors.filter((s) =>
    s.name.toLowerCase().includes(filter.toLowerCase()),
  )

  return (
    <div className="grid grid-cols-1 gap-4 pb-20 sm:grid-cols-2 lg:grid-cols-3">
      {filtered.map((s) => (
        <button
          key={s.id}
          onClick={() => onSelect(s.id)}
          className="group relative overflow-hidden rounded-2xl border border-[#1a4a2e] bg-[#071a10] p-6 text-left transition hover:-translate-y-1 hover:border-[#34d399]"
        >
          <div className="mb-3 flex items-start justify-between">
            <div className="flex items-center gap-2 text-xs text-[#88b098]">
              <span>👁 {s.views} views</span>
              {s.trending && (
                <span className="rounded-md bg-[#34d399]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#34d399]">
                  🔥 Trending
                </span>
              )}
            </div>
            <span className="text-2xl opacity-50">{s.emoji}</span>
          </div>
          <p className="mb-2 text-lg text-white">{s.name}</p>
          <p className="mb-4 line-clamp-3 text-sm text-[#88b098]">{s.desc}</p>
          <div className="flex justify-between text-xs text-[#88b098]">
            <span>🏢 {s.companies} companies</span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-[#34d399]" />
              Updated {s.updated}
            </span>
          </div>
        </button>
      ))}
    </div>
  )
}

function CompaniesView({
  sector,
  onSelect,
}: {
  sector: Sector
  onSelect: (idx: number) => void
}) {
  return (
    <div className="pb-20">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 pt-2">
        <div>
          <h2 className="text-2xl text-white">
            {sector.emoji} {sector.name}
          </h2>
          <p className="mt-1 text-sm text-[#88b098]">{sector.desc}</p>
        </div>
        <div className="flex gap-3">
          <div className="rounded-xl border border-[#1a4a2e] bg-[#071a10] px-4 py-3 text-center">
            <p className="text-lg font-bold text-white">{sector.companies}</p>
            <p className="text-[10px] uppercase tracking-wider text-[#88b098]">Companies</p>
          </div>
          <div className="rounded-xl border border-[#1a4a2e] bg-[#071a10] px-4 py-3 text-center">
            <p className="text-lg font-bold text-white">{sector.views}</p>
            <p className="text-[10px] uppercase tracking-wider text-[#88b098]">Views</p>
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-[#1a4a2e] bg-[#071a10] p-6">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#34d399]">
          Sector Overview
        </p>
        <p className="mb-4 text-sm leading-7 text-[#88b098]">{sector.overview}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#34d399]">
              ✦ Tailwinds
            </h3>
            <ul className="space-y-2">
              {sector.pros.map((p) => (
                <li
                  key={p}
                  className="flex items-start gap-2 text-sm leading-relaxed text-[#88b098]"
                >
                  <span className="font-bold text-[#34d399]">↑</span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#ef4444]">
              ✦ Headwinds
            </h3>
            <ul className="space-y-2">
              {sector.cons.map((c) => (
                <li
                  key={c}
                  className="flex items-start gap-2 text-sm leading-relaxed text-[#88b098]"
                >
                  <span className="font-bold text-[#ef4444]">↓</span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {sector.cos.length === 0 ? (
        <div className="rounded-2xl border border-[#1a4a2e] bg-[#071a10] py-10 text-center text-sm text-[#88b098]">
          Company data for this sector is coming soon. We&apos;re adding BSE-listed companies
          every week.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {sector.cos.map((c, i) => (
            <button
              key={c.name}
              onClick={() => onSelect(i)}
              className="grid items-center gap-4 rounded-xl border border-[#1a4a2e] bg-[#071a10] p-4 text-left transition hover:translate-x-1 hover:border-[#34d399] sm:grid-cols-[2fr_1fr_1fr_1fr_auto]"
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-xs font-bold text-[#040f0a]"
                  style={{
                    background: COMPANY_AVATAR_COLORS[i % COMPANY_AVATAR_COLORS.length],
                  }}
                >
                  {c.name.substring(0, 2)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{c.name}</p>
                  <p className="text-xs text-[#88b098]">{c.bse}</p>
                </div>
              </div>
              <p className="text-right text-sm font-semibold sm:text-base">{c.price}</p>
              <p
                className={`text-right text-sm font-semibold ${
                  c.up ? 'text-[#34d399]' : 'text-[#ef4444]'
                }`}
              >
                {c.change}
              </p>
              <p className="hidden text-right text-sm text-[#88b098] sm:block">{c.mcap}</p>
              <span className="hidden text-[#88b098] sm:inline">→</span>
            </button>
          ))}
        </div>
      )}

      {!isLoggedIn && (
        <CtaBanner
          title="Researching investments? See how they fit your portfolio."
          body="Connect your existing portfolio and Clarzo will show you how any new investment impacts your allocation, risk, and goals."
        />
      )}
    </div>
  )
}

function CompanyDetail({ company, sector }: { company: Company; sector: Sector }) {
  const [chat, setChat] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [showSugs, setShowSugs] = useState(true)

  function ask(question: string) {
    if (!question.trim()) return
    const reply =
      gptResponses[question] ??
      `Based on available filings and public data for ${company.name}:\n\nThis is a great question. In a live version, CompanyGPT would analyze ${company.full}'s quarterly reports, annual filings, investor presentations, and screener data to give you a detailed, sourced answer.\n\n📄 Source: ${company.full} public filings, Screener.in`

    setChat((prev) => [...prev, { role: 'user', text: question }])
    setShowSugs(false)
    setDraft('')
    // Slight delay so the user message renders first — same feel as the
    // marketing-site mock.
    setTimeout(() => {
      setChat((prev) => [...prev, { role: 'ai', text: reply }])
    }, 600)
  }

  return (
    <div className="pb-20">
      <div className="mb-5 flex items-center gap-4 pt-2">
        <div
          className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl text-lg font-bold text-[#040f0a]"
          style={{
            background: 'linear-gradient(135deg, #059669, #34d399)',
          }}
        >
          {company.name.substring(0, 2)}
        </div>
        <div>
          <h2 className="text-2xl text-white">{company.full}</h2>
          <p className="text-sm text-[#88b098]">
            {company.bse} · {company.facts.Sector}
          </p>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Metric label="Price" value={company.price} />
        <Metric
          label="Today"
          value={company.change}
          color={company.up ? '#34d399' : '#ef4444'}
        />
        <Metric label="Market Cap" value={company.mcap} />
        <Metric label="P/E Ratio" value={company.pe} />
        <Metric label="ROE" value={company.roe} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#1a4a2e] bg-[#071a10] p-6">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-[#34d399]">
            About
          </p>
          <p className="mb-4 text-sm leading-7 text-[#88b098]">{company.about}</p>
          <div className="flex flex-col">
            {Object.entries(company.facts).map(([k, v]) => (
              <KeyFact key={k} label={k} value={v} />
            ))}
            <KeyFact label="P/E Ratio" value={company.pe} />
            <KeyFact label="ROE" value={company.roe} />
            <KeyFact label="Dividend Yield" value={company.div} />
            <KeyFact label="Revenue" value={company.rev} />
          </div>
        </div>

        <div className="rounded-2xl border border-[#1a4a2e] bg-[#071a10] p-6">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-[#34d399]">
            Pros &amp; Cons
          </p>
          <div className="mb-5">
            <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#34d399]">
              ✦ Strengths
            </h4>
            <ul className="space-y-2">
              {company.pros.map((p) => (
                <li
                  key={p}
                  className="flex items-start gap-2 rounded-lg bg-[#0c2418] px-3 py-2 text-sm leading-relaxed text-[#88b098]"
                >
                  <span className="mt-0.5 flex-shrink-0 text-[#34d399]">↑</span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#ef4444]">
              ✦ Risks
            </h4>
            <ul className="space-y-2">
              {company.cons.map((p) => (
                <li
                  key={p}
                  className="flex items-start gap-2 rounded-lg bg-[#0c2418] px-3 py-2 text-sm leading-relaxed text-[#88b098]"
                >
                  <span className="mt-0.5 flex-shrink-0 text-[#ef4444]">↓</span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-[#1a4a2e] bg-[#071a10] p-6">
            <div className="mb-4 flex items-center gap-3">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-lg text-base"
                style={{ background: 'linear-gradient(135deg, #059669, #34d399)' }}
              >
                🤖
              </div>
              <div>
                <p className="text-sm font-semibold">CompanyGPT — {company.name}</p>
                <p className="text-xs text-[#88b098]">
                  Ask anything about {company.full}. Answers based on quarterly reports, annual
                  filings, and public data.
                </p>
              </div>
            </div>

            {showSugs && (
              <div className="mb-4 flex flex-wrap gap-2">
                {company.gptSugs.map((q) => (
                  <button
                    key={q}
                    onClick={() => ask(q)}
                    className="rounded-lg border border-[#1a4a2e] bg-[#0c2418] px-3 py-2 text-xs text-[#88b098] transition hover:border-[#34d399] hover:text-[#34d399]"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {chat.length > 0 && (
              <div className="mb-4 flex max-h-96 flex-col gap-3 overflow-y-auto pr-1">
                {chat.map((m, i) => (
                  <div
                    key={i}
                    className={`max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                      m.role === 'user'
                        ? 'self-end rounded-br-sm bg-[#059669] text-white'
                        : 'self-start rounded-bl-sm border border-[#1a4a2e] bg-[#0c2418] text-[#88b098]'
                    }`}
                  >
                    {m.role === 'ai' && (
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#34d399]">
                        CompanyGPT · {company.name}
                      </p>
                    )}
                    {m.text.split('\n').map((line, j) => (
                      <p key={j}>{line || ' '}</p>
                    ))}
                  </div>
                ))}
              </div>
            )}

            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                ask(draft)
              }}
            >
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={`Ask about ${company.name}...`}
                className="flex-1 rounded-xl border border-[#1a4a2e] bg-[#040f0a] px-4 py-3 text-sm text-[#e4f0e8] placeholder:text-[#88b098] focus:border-[#34d399] focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-xl bg-[#059669] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0f6e56]"
              >
                Ask →
              </button>
            </form>

            <p className="mt-3 text-center text-[10px] text-[#88b098] opacity-70">
              ⚠️ CompanyGPT provides information based on publicly available data. This is not
              investment advice. Always verify with official filings.
            </p>
          </div>
        </div>
      </div>

      {!isLoggedIn && (
        <CtaBanner
          title="Like what you see? Check how it fits your portfolio."
          body={`Already invested in ${sector.name.toLowerCase()}? Clarzo shows your current exposure and suggests optimal allocation.`}
        />
      )}
    </div>
  )
}

function Metric({
  label,
  value,
  color,
}: {
  label: string
  value: string
  color?: string
}) {
  return (
    <div className="rounded-xl border border-[#1a4a2e] bg-[#071a10] p-4 text-center">
      <p className="text-base font-bold" style={color ? { color } : undefined}>
        {value}
      </p>
      <p className="text-[10px] uppercase tracking-wider text-[#88b098]">{label}</p>
    </div>
  )
}

function KeyFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-white/5 py-2 text-sm last:border-none">
      <span className="text-[#88b098]">{label}</span>
      <span className="font-semibold text-white">{value}</span>
    </div>
  )
}

function CtaBanner({ title, body }: { title: string; body: string }) {
  return (
    <div className="my-10 rounded-2xl border border-[#1a4a2e] bg-gradient-to-br from-[#071a10] to-[#0c2418] p-8 text-center">
      <h3 className="mb-2 text-xl text-white">{title}</h3>
      <p className="mx-auto mb-5 max-w-xl text-sm text-[#88b098]">{body}</p>
      <Link
        href="/login"
        className="inline-flex items-center gap-2 rounded-full bg-[#059669] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#0f6e56]"
      >
        Connect Portfolio — Free →
      </Link>
    </div>
  )
}
