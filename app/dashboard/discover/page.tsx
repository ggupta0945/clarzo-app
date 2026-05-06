'use client'

import { useMemo, useState } from 'react'
import { sectors, type Company, type Sector } from './data'

// Three views in one page: sectors grid → companies in a sector → company
// detail. Lives under the dashboard layout, so the sidebar / Ask Clarzo bar
// are inherited. No own header or auth-gated CTAs — users are always signed
// in when they land here.

type ChatMessage = { role: 'user' | 'ai'; text: string }

const COMPANY_AVATAR_COLORS = ['var(--accent)', '#6172f3', '#fb923c', '#a78bfa', '#0ea5e9']

export default function DiscoverPage() {
  const [filter, setFilter] = useState('')
  const [sectorId, setSectorId] = useState<string | null>(null)
  const [companyIdx, setCompanyIdx] = useState<number | null>(null)

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
    <div className="px-6 py-4 sm:px-10 sm:py-6 lg:px-14 lg:py-8 pb-28">
      {/* Page header */}
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-fg">
          Discover where to invest
        </h1>
        <p className="text-xs text-fg-muted mt-0.5">
          Sector-by-sector research with pros, cons, and ClarzoGPT.
        </p>
      </div>

      <div className="mb-4 inline-flex items-center gap-1.5 rounded-md bg-warning-soft border border-warning/40 px-2 py-1 text-[11px] text-warning">
        <span>⚠️</span>
        For educational purposes only. Not investment advice.
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle text-sm">
          🔍
        </span>
        <input
          type="text"
          value={sector || company ? '' : filter}
          onChange={(e) => setFilter(e.target.value)}
          disabled={!!sector || !!company}
          placeholder="Search sectors or companies..."
          className="w-full bg-surface border border-line-strong rounded-xl py-2 pl-9 pr-3 text-sm text-fg placeholder:text-fg-subtle focus:border-accent focus:outline-none disabled:opacity-60 shadow-sm"
        />
      </div>

      {/* Breadcrumb */}
      <div className="flex flex-wrap items-center gap-2 mb-4 text-xs">
        <button
          onClick={showSectors}
          className="font-medium text-accent hover:underline"
        >
          All Sectors
        </button>
        {sector && (
          <>
            <span className="text-fg-subtle">›</span>
            {company ? (
              <button
                onClick={() => setCompanyIdx(null)}
                className="font-medium text-accent hover:underline"
              >
                {sector.name}
              </button>
            ) : (
              <span className="text-fg font-medium">{sector.name}</span>
            )}
          </>
        )}
        {company && (
          <>
            <span className="text-fg-subtle">›</span>
            <span className="text-fg font-medium">{company.name}</span>
          </>
        )}
      </div>

      {!sector && <SectorsGrid filter={filter} onSelect={showCompanies} />}
      {sector && !company && <CompaniesView sector={sector} onSelect={showDetail} />}
      {sector && company && <CompanyDetail company={company} />}
    </div>
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
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {filtered.map((s) => (
        <button
          key={s.id}
          onClick={() => onSelect(s.id)}
          className="group relative overflow-hidden rounded-xl bg-surface border border-line p-4 text-left transition hover:border-accent hover:shadow-md shadow-sm"
        >
          <div className="mb-2 flex items-start justify-between">
            <div className="flex items-center gap-1.5 text-[10px] text-fg-muted">
              <span>👁 {s.views} views</span>
              {s.trending && (
                <span className="rounded-md bg-accent-soft px-1.5 py-px text-[9px] font-bold uppercase tracking-wider text-accent">
                  🔥 Trending
                </span>
              )}
            </div>
            <span className="text-xl opacity-70">{s.emoji}</span>
          </div>
          <p className="mb-1 text-sm font-semibold text-fg">{s.name}</p>
          <p className="mb-3 line-clamp-3 text-xs text-fg-muted leading-relaxed">{s.desc}</p>
          <div className="flex justify-between text-[11px] text-fg-muted">
            <span>🏢 {s.companies} companies</span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
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
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-fg">
            {sector.emoji} {sector.name}
          </h2>
          <p className="mt-0.5 text-xs text-fg-muted">{sector.desc}</p>
        </div>
        <div className="flex gap-2">
          <div className="rounded-lg bg-surface border border-line px-3 py-1.5 text-center shadow-sm">
            <p className="text-base font-bold text-fg">{sector.companies}</p>
            <p className="text-[9px] uppercase tracking-wider text-fg-muted">Companies</p>
          </div>
          <div className="rounded-lg bg-surface border border-line px-3 py-1.5 text-center shadow-sm">
            <p className="text-base font-bold text-fg">{sector.views}</p>
            <p className="text-[9px] uppercase tracking-wider text-fg-muted">Views</p>
          </div>
        </div>
      </div>

      <div className="mb-4 rounded-xl bg-surface border border-line p-4 shadow-sm">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-accent">
          Sector overview
        </p>
        <p className="mb-3 text-xs leading-relaxed text-fg">{sector.overview}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-success">
              ✦ Tailwinds
            </h3>
            <ul className="space-y-1.5">
              {sector.pros.map((p) => (
                <li
                  key={p}
                  className="flex items-start gap-1.5 text-xs leading-relaxed text-fg"
                >
                  <span className="font-bold text-success">↑</span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-danger">
              ✦ Headwinds
            </h3>
            <ul className="space-y-1.5">
              {sector.cons.map((c) => (
                <li
                  key={c}
                  className="flex items-start gap-1.5 text-xs leading-relaxed text-fg"
                >
                  <span className="font-bold text-danger">↓</span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {sector.cos.length === 0 ? (
        <div className="rounded-xl bg-surface border border-line py-8 text-center text-xs text-fg-muted shadow-sm">
          Company data for this sector is coming soon. We&apos;re adding BSE-listed companies
          every week.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {sector.cos.map((c, i) => (
            <button
              key={c.name}
              onClick={() => onSelect(i)}
              className="grid items-center gap-3 rounded-xl bg-surface border border-line p-3 text-left transition hover:border-accent hover:shadow-md shadow-sm sm:grid-cols-[2fr_1fr_1fr_1fr_auto]"
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-[10px] font-bold text-white"
                  style={{
                    background: COMPANY_AVATAR_COLORS[i % COMPANY_AVATAR_COLORS.length],
                  }}
                >
                  {c.name.substring(0, 2)}
                </div>
                <div>
                  <p className="text-xs font-semibold text-fg">{c.name}</p>
                  <p className="text-[10px] text-fg-muted">{c.bse}</p>
                </div>
              </div>
              <p className="text-right text-xs font-semibold text-fg">{c.price}</p>
              <p
                className="text-right text-xs font-semibold"
                style={{ color: c.up ? 'var(--success)' : 'var(--danger)' }}
              >
                {c.change}
              </p>
              <p className="hidden text-right text-xs text-fg-muted sm:block">{c.mcap}</p>
              <span className="hidden text-fg-subtle sm:inline">→</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function CompanyDetail({ company }: { company: Company }) {
  const [chat, setChat] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [showSugs, setShowSugs] = useState(true)
  const [thinking, setThinking] = useState(false)

  async function ask(question: string) {
    if (!question.trim() || thinking) return
    setChat((prev) => [...prev, { role: 'user', text: question }])
    setShowSugs(false)
    setDraft('')
    setThinking(true)
    try {
      const res = await fetch('/api/company-ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, company }),
      })
      const data = await res.json()
      const reply = data.text ?? 'Sorry, I could not generate a response. Please try again.'
      setChat((prev) => [...prev, { role: 'ai', text: reply }])
    } catch {
      setChat((prev) => [...prev, { role: 'ai', text: 'Network error. Please try again.' }])
    } finally {
      setThinking(false)
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <div
          className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl text-base font-bold text-white"
          style={{ background: 'linear-gradient(135deg, #444ce7, #6172f3)' }}
        >
          {company.name.substring(0, 2)}
        </div>
        <div>
          <h2 className="text-base font-semibold text-fg">{company.full}</h2>
          <p className="text-[11px] text-fg-muted">
            {company.bse} · {company.facts.Sector}
          </p>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        <Metric label="Price" value={company.price} />
        <Metric
          label="Today"
          value={company.change}
          color={company.up ? 'var(--success)' : 'var(--danger)'}
        />
        <Metric label="Market Cap" value={company.mcap} />
        <Metric label="P/E Ratio" value={company.pe} />
        <Metric label="ROE" value={company.roe} />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl bg-surface border border-line p-4 shadow-sm">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-accent">
            About
          </p>
          <p className="mb-3 text-xs leading-relaxed text-fg">{company.about}</p>
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

        <div className="rounded-xl bg-surface border border-line p-4 shadow-sm">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-accent">
            Pros &amp; Cons
          </p>
          <div className="mb-4">
            <h4 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-success">
              ✦ Strengths
            </h4>
            <ul className="space-y-1">
              {company.pros.map((p) => (
                <li
                  key={p}
                  className="flex items-start gap-1.5 rounded-lg bg-success-soft px-2.5 py-1.5 text-xs leading-relaxed text-fg"
                >
                  <span className="mt-0.5 flex-shrink-0 text-success">↑</span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-danger">
              ✦ Risks
            </h4>
            <ul className="space-y-1">
              {company.cons.map((p) => (
                <li
                  key={p}
                  className="flex items-start gap-1.5 rounded-lg bg-danger-soft px-2.5 py-1.5 text-xs leading-relaxed text-fg"
                >
                  <span className="mt-0.5 flex-shrink-0 text-danger">↓</span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="rounded-xl bg-surface border border-line p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2.5">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg text-sm"
                style={{ background: 'linear-gradient(135deg, #444ce7, #6172f3)' }}
              >
                🤖
              </div>
              <div>
                <p className="text-xs font-semibold text-fg">ClarzoGPT — {company.name}</p>
                <p className="text-[10px] text-fg-muted">
                  Ask anything about {company.full}. Answers based on quarterly reports, annual
                  filings, and public data.
                </p>
              </div>
            </div>

            {showSugs && (
              <div className="mb-3 flex flex-wrap gap-1.5">
                {company.gptSugs.map((q) => (
                  <button
                    key={q}
                    onClick={() => ask(q)}
                    className="rounded-md bg-canvas border border-line px-2.5 py-1 text-[11px] text-fg transition hover:border-accent hover:bg-accent-soft"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {(chat.length > 0 || thinking) && (
              <div className="mb-3 flex max-h-72 flex-col gap-2 overflow-y-auto pr-1">
                {chat.map((m, i) => (
                  <div
                    key={i}
                    className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                      m.role === 'user'
                        ? 'self-end rounded-br-sm bg-accent text-white'
                        : 'self-start rounded-bl-sm bg-canvas border border-line text-fg'
                    }`}
                  >
                    {m.role === 'ai' && (
                      <p className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-accent">
                        ClarzoGPT · {company.name}
                      </p>
                    )}
                    {m.text.split('\n').map((line, j) => (
                      <p key={j}>{line || ' '}</p>
                    ))}
                  </div>
                ))}
                {thinking && (
                  <div className="self-start max-w-[85%] rounded-xl rounded-bl-sm bg-canvas border border-line px-3 py-2 text-xs text-fg-muted">
                    <p className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-accent">ClarzoGPT · {company.name}</p>
                    <span className="inline-flex gap-1">
                      <span className="animate-bounce">·</span>
                      <span className="animate-bounce [animation-delay:0.15s]">·</span>
                      <span className="animate-bounce [animation-delay:0.3s]">·</span>
                    </span>
                  </div>
                )}
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
                disabled={thinking}
                placeholder={thinking ? 'Thinking…' : `Ask about ${company.name}...`}
                className="flex-1 rounded-lg bg-surface border border-line-strong px-3 py-2 text-xs text-fg placeholder:text-fg-subtle focus:border-accent focus:outline-none disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={thinking || !draft.trim()}
                className="rounded-lg bg-accent hover:bg-accent-hover disabled:opacity-50 px-3.5 py-2 text-xs font-semibold text-white transition shadow-sm"
              >
                Ask →
              </button>
            </form>

            <p className="mt-2 text-center text-[10px] text-fg-subtle">
              ⚠️ ClarzoGPT provides information based on publicly available data. This is not
              investment advice. Always verify with official filings.
            </p>
          </div>
        </div>
      </div>
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
    <div className="rounded-lg bg-surface border border-line p-2.5 text-center shadow-sm">
      <p className="text-sm font-bold text-fg" style={color ? { color } : undefined}>
        {value}
      </p>
      <p className="text-[9px] uppercase tracking-wider text-fg-muted">{label}</p>
    </div>
  )
}

function KeyFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-accent-soft py-1.5 text-xs last:border-none">
      <span className="text-fg-muted">{label}</span>
      <span className="font-medium text-fg">{value}</span>
    </div>
  )
}
