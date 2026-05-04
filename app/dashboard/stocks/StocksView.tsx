'use client'

import { Fragment, useState, useMemo, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useChat } from '@ai-sdk/react'
import { TextStreamChatTransport, isTextUIPart, type UIMessage } from 'ai'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { StockSparkline } from '@/components/charts/StockSparkline'
import type { EnrichedHolding, PortfolioSummary } from '@/lib/portfolio'

// ── view-model — flatten EnrichedHolding into the shape this page renders ──
type Holding = {
  name: string
  short: string
  sector: string
  qty: number
  avg: number
  invested: number
  price: number
  value: number
  pnl: number
  pct: number
}

// Canonical sectors. Inputs from Yahoo (`Financial Services`, `Technology`...)
// and from the hand-curated seed (`Banking`, `Tech`, `Pharma`...) all map to
// one of these so two stocks in the same sector merge into one slice.
const CANONICAL_SECTORS = [
  'Financial Services',
  'Technology',
  'Energy',
  'Healthcare',
  'Consumer Defensive',
  'Consumer Cyclical',
  'Industrials',
  'Communication Services',
  'Basic Materials',
  'Utilities',
  'Real Estate',
  'Other',
] as const

type CanonicalSector = (typeof CANONICAL_SECTORS)[number]

const SECTOR_COLORS: Record<CanonicalSector, string> = {
  'Financial Services': '#fb923c', // orange
  Technology: '#6172f3', // indigo-blue
  Energy: '#444ce7', // deep indigo
  Healthcare: '#f472b6', // pink
  'Consumer Defensive': '#a78bfa', // violet
  'Consumer Cyclical': '#c084fc', // lavender
  Industrials: '#38bdf8', // sky
  'Communication Services': '#fdba74', // peach
  'Basic Materials': '#84cc16', // lime
  Utilities: '#0ea5e9', // cyan
  'Real Estate': '#e879f9', // magenta
  Other: '#9ca3af', // grey
}

const SECTOR_ALIASES: Record<string, CanonicalSector> = {
  // Finance
  banking: 'Financial Services',
  bank: 'Financial Services',
  finance: 'Financial Services',
  financial: 'Financial Services',
  insurance: 'Financial Services',
  nbfc: 'Financial Services',
  // Tech
  tech: 'Technology',
  it: 'Technology',
  software: 'Technology',
  fintech: 'Technology',
  // Energy
  oil: 'Energy',
  gas: 'Energy',
  power: 'Energy',
  'oil & gas': 'Energy',
  'oil and gas': 'Energy',
  // Health
  pharma: 'Healthcare',
  pharmaceutical: 'Healthcare',
  pharmaceuticals: 'Healthcare',
  health: 'Healthcare',
  // Consumer
  consumer: 'Consumer Defensive',
  fmcg: 'Consumer Defensive',
  'food & bev': 'Consumer Defensive',
  food: 'Consumer Defensive',
  retail: 'Consumer Cyclical',
  auto: 'Consumer Cyclical',
  automobile: 'Consumer Cyclical',
  automotive: 'Consumer Cyclical',
  // Industrials / Defense
  industrials: 'Industrials',
  industrial: 'Industrials',
  defense: 'Industrials',
  capital: 'Industrials',
  construction: 'Industrials',
  // Communication
  telecom: 'Communication Services',
  telecommunication: 'Communication Services',
  media: 'Communication Services',
  // Materials
  metals: 'Basic Materials',
  'metals & mining': 'Basic Materials',
  mining: 'Basic Materials',
  cement: 'Basic Materials',
  chemicals: 'Basic Materials',
  'precious metals': 'Basic Materials',
  // Utilities
  utility: 'Utilities',
  utilities: 'Utilities',
  // Real estate
  realty: 'Real Estate',
  'real estate': 'Real Estate',
  // Index / ETF — rarely a real sector signal
  'index etf': 'Other',
  'small cap': 'Other',
  unclassified: 'Other',
}

function normalizeSector(input: string | null | undefined): CanonicalSector {
  if (!input) return 'Other'
  const raw = input.trim()
  if (!raw) return 'Other'

  // Direct canonical match (case-sensitive).
  if ((CANONICAL_SECTORS as readonly string[]).includes(raw)) return raw as CanonicalSector

  // Case-insensitive alias / canonical lookup.
  const lower = raw.toLowerCase()
  if (SECTOR_ALIASES[lower]) return SECTOR_ALIASES[lower]
  for (const c of CANONICAL_SECTORS) {
    if (c.toLowerCase() === lower) return c
  }

  // Substring fallback — Yahoo / seed strings sometimes embed canonical names.
  for (const [alias, canon] of Object.entries(SECTOR_ALIASES)) {
    if (lower.includes(alias)) return canon
  }
  for (const c of CANONICAL_SECTORS) {
    if (lower.includes(c.toLowerCase())) return c
  }
  return 'Other'
}

function colorFor(sector: string): string {
  const c = (CANONICAL_SECTORS as readonly string[]).includes(sector)
    ? (sector as CanonicalSector)
    : normalizeSector(sector)
  return SECTOR_COLORS[c]
}

function getShortName(name: string): string {
  if (name.length <= 18) return name
  const words = name.trim().split(/\s+/)
  let result = ''
  for (const w of words) {
    const next = result ? `${result} ${w}` : w
    if (next.length > 15) break
    result = next
  }
  return result || name.slice(0, 15)
}

function fmt(n: number, dec = 0) {
  return Math.abs(n).toLocaleString('en-IN', { maximumFractionDigits: dec })
}

// Group sectors by value, then collapse anything past `topN` (or below 3% of
// the portfolio) into a single "Other" slice so the donut legend never
// overflows the card.
const SECTOR_TOP_N = 5
const SECTOR_MIN_PCT = 3

function buildSectorData(holdings: Holding[]) {
  const g: Record<string, number> = {}
  let total = 0
  for (const h of holdings) {
    const key = normalizeSector(h.sector)
    g[key] = (g[key] || 0) + h.value
    total += h.value
  }
  const sorted = Object.entries(g)
    .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
    .sort((a, b) => b.value - a.value)

  if (total === 0) return sorted

  const top: typeof sorted = []
  let otherValue = 0
  for (const slice of sorted) {
    const pct = (slice.value / total) * 100
    if (slice.name === 'Other') {
      otherValue += slice.value
      continue
    }
    if (top.length < SECTOR_TOP_N && pct >= SECTOR_MIN_PCT) {
      top.push(slice)
    } else {
      otherValue += slice.value
    }
  }
  if (otherValue > 0) {
    top.push({ name: 'Other', value: Math.round(otherValue * 100) / 100 })
  }
  return top
}

// ── small reusable pieces ──────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  highlight,
}: {
  label: string
  value: string
  sub?: string
  highlight?: 'green' | 'red'
}) {
  const color = highlight === 'green' ? 'var(--success)' : highlight === 'red' ? 'var(--danger)' : 'var(--fg)'
  return (
    <div className="bg-surface border border-line rounded-xl p-3.5 flex flex-col gap-0.5 shadow-sm">
      <p className="text-[10px] uppercase tracking-wider text-fg-muted font-medium">{label}</p>
      <p className="text-lg sm:text-xl font-bold tracking-tight" style={{ color }}>{value}</p>
      {sub && <p className="text-[11px] text-fg-muted">{sub}</p>}
    </div>
  )
}

function SectorBadge({ sector }: { sector: string }) {
  const canonical = normalizeSector(sector)
  const c = SECTOR_COLORS[canonical]
  return (
    <span
      className="text-[10px] px-1.5 py-px rounded-full whitespace-nowrap font-medium"
      style={{ background: `${c}1a`, color: c, border: `1px solid ${c}33` }}
    >
      {canonical}
    </span>
  )
}

// ── stock detail panel (expanded row) ──────────────────────────────────────

function StockDetail({
  h,
  onAskClarzo,
  totalValue,
}: {
  h: Holding
  onAskClarzo: () => void
  totalValue: number
}) {
  const weight = totalValue > 0 ? (h.value / totalValue) * 100 : 0
  const maxPrice = Math.max(h.avg, h.price) * 1.08
  const avgW = Math.min((h.avg / maxPrice) * 100, 100)
  const curW = Math.min((h.price / maxPrice) * 100, 100)
  const isGain = h.pnl >= 0
  const priceDiff = h.avg > 0 ? ((h.price - h.avg) / h.avg) * 100 : 0
  const trendColor = isGain ? 'var(--success)' : 'var(--danger)'

  return (
    <tr className="bg-canvas">
      <td colSpan={8} className="px-4 pb-3.5 pt-2">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-fg-muted font-medium mb-2">
              Price journey
            </p>
            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-[11px] mb-0.5">
                  <span className="text-fg-muted">Avg buy</span>
                  <span className="text-fg">₹{fmt(h.avg, 2)}</span>
                </div>
                <div className="h-1.5 bg-line rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-line-strong" style={{ width: `${avgW}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[11px] mb-0.5">
                  <span style={{ color: trendColor }}>Current (CMP)</span>
                  <span style={{ color: trendColor }}>₹{fmt(h.price, 2)}</span>
                </div>
                <div className="h-1.5 bg-line rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${curW}%`, background: trendColor }}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between pt-0.5">
                <span className="text-[11px] text-fg-muted">Price movement from cost</span>
                <span className="text-[11px] font-semibold" style={{ color: trendColor }}>
                  {priceDiff >= 0 ? '+' : ''}
                  {priceDiff.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-wider text-fg-muted font-medium mb-2">
              Position details
            </p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
              {[
                { label: 'Qty held', val: String(h.qty) },
                { label: 'Portfolio weight', val: `${weight.toFixed(1)}%` },
                { label: 'Invested', val: `₹${fmt(h.invested)}` },
                { label: 'Current value', val: `₹${fmt(h.value)}` },
                { label: 'Break-even', val: `₹${fmt(h.avg, 2)}` },
                {
                  label: 'Unrealised P&L',
                  val: `${isGain ? '+' : '−'}₹${fmt(Math.abs(h.pnl))}`,
                },
              ].map(({ label, val }) => (
                <div key={label}>
                  <p className="text-[10px] text-fg-muted">{label}</p>
                  <p className="text-xs text-fg font-medium mt-0.5">{val}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-fg-muted font-medium mb-2">
                Portfolio share
              </p>
              <div className="flex items-end gap-2">
                <p className="text-2xl font-bold tracking-tight" style={{ color: trendColor }}>
                  {weight.toFixed(1)}%
                </p>
                <p className="text-[10px] text-fg-muted pb-1">
                  of total<br />portfolio
                </p>
              </div>
              <div className="mt-1.5 h-1 bg-line rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.min(weight * 2.5, 100)}%`, background: trendColor }}
                />
              </div>
              <p className="text-[10px] text-fg-muted mt-1">
                ₹{fmt(h.value)} of ₹{fmt(totalValue)} total
              </p>
            </div>
            <button
              onClick={onAskClarzo}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-[11px] font-medium transition w-full justify-center shadow-sm"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              Ask Clarzo about this stock
            </button>
          </div>
        </div>
      </td>
    </tr>
  )
}

// ── stock chat panel ───────────────────────────────────────────────────────

const SUGGESTIONS = [
  'Should I buy more?',
  'What are the risks?',
  'Set a stop-loss level',
  "What's my break-even?",
]

function StockChatPanel({
  h,
  onClose,
  totalValue,
}: {
  h: Holding
  onClose: () => void
  totalValue: number
}) {
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const contextSent = useRef(false)
  const color = colorFor(h.sector)
  const weight = totalValue > 0 ? ((h.value / totalValue) * 100).toFixed(1) : '0.0'

  const CONTEXT_PREFIX = `[stock-ctx] ${h.name} | qty:${h.qty} | avg:₹${h.avg.toFixed(2)} | cmp:₹${h.price.toFixed(2)} | invested:₹${fmt(h.invested)} | value:₹${fmt(h.value)} | pnl:${h.pnl >= 0 ? '+' : '−'}₹${fmt(Math.abs(h.pnl))} (${h.pct.toFixed(1)}%) | weight:${weight}% of portfolio || `

  const { messages, sendMessage, status } = useChat({
    transport: new TextStreamChatTransport({ api: '/api/ask' }),
  })
  const isLoading = status === 'submitted' || status === 'streaming'

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function send(userText: string) {
    if (isLoading) return
    if (!contextSent.current) {
      contextSent.current = true
      sendMessage({ text: `${CONTEXT_PREFIX}${userText}` })
    } else {
      sendMessage({ text: userText })
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim()) return
    send(input)
    setInput('')
  }

  function displayText(m: UIMessage) {
    const text = m.parts.filter(isTextUIPart).map((p) => p.text).join('')
    if (m.role === 'user' && text.startsWith(CONTEXT_PREFIX))
      return text.slice(CONTEXT_PREFIX.length)
    return text
  }

  const hasMessages = messages.some((m) => {
    const t = m.parts.filter(isTextUIPart).map((p) => p.text).join('')
    return t.length > 0
  })

  return (
    <div className="flex flex-col h-full bg-surface">
      <div className="px-3 py-2.5 border-b border-line flex-shrink-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <SectorBadge sector={h.sector} />
            </div>
            <h3 className="text-[13px] font-semibold text-fg">{h.short}</h3>
            <p className="text-[10px] text-fg-muted mt-0.5">{h.name}</p>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1 text-fg-muted hover:text-accent transition shrink-0"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="grid grid-cols-3 gap-1.5 mt-2">
          {[
            { label: 'CMP', val: `₹${fmt(h.price, 2)}` },
            {
              label: 'P&L',
              val: `${h.pnl >= 0 ? '+' : '−'}₹${fmt(Math.abs(h.pnl))}`,
              color: h.pnl >= 0 ? 'var(--success)' : 'var(--danger)',
            },
            {
              label: 'Return',
              val: `${h.pct >= 0 ? '+' : ''}${h.pct.toFixed(1)}%`,
              color: h.pnl >= 0 ? 'var(--success)' : 'var(--danger)',
            },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-canvas border border-line rounded-md px-2 py-1 text-center"
            >
              <p className="text-[9px] text-fg-muted uppercase tracking-wider">{s.label}</p>
              <p
                className="text-[11px] font-semibold mt-px"
                style={{ color: s.color || 'var(--fg)' }}
              >
                {s.val}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
        {!hasMessages && !isLoading && (
          <div className="flex flex-col gap-2 pt-1">
            <p className="text-[11px] text-fg-muted text-center">
              Ask anything about this position
            </p>
            <div className="grid grid-cols-1 gap-1.5">
              {SUGGESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="text-left px-2 py-1 rounded-md bg-canvas border border-line text-fg text-[9px] leading-tight hover:border-accent hover:bg-accent-soft transition"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => {
          const text = displayText(m)
          if (!text) return null
          return (
            <div
              key={m.id}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[88%] rounded-xl px-2.5 py-1.5 text-xs leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-accent text-white'
                    : 'bg-canvas border border-line text-fg'
                }`}
              >
                {m.role === 'assistant' && (
                  <p className="text-[10px] mb-0.5 font-medium" style={{ color }}>
                    Clarzo
                  </p>
                )}
                <p className="whitespace-pre-wrap">{text}</p>
              </div>
            </div>
          )
        })}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-canvas border border-line rounded-xl px-2.5 py-1.5">
              <p className="text-[10px] mb-1 font-medium" style={{ color }}>
                Clarzo
              </p>
              <div className="flex space-x-1">
                {[0, 150, 300].map((d) => (
                  <span
                    key={d}
                    className="w-1 h-1 rounded-full animate-bounce"
                    style={{ background: color, animationDelay: `${d}ms` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {hasMessages &&
        !isLoading &&
        messages[messages.length - 1]?.role === 'assistant' && (
          <div className="px-3 pb-1.5 flex gap-1.5 flex-wrap flex-shrink-0">
            {SUGGESTIONS.slice(0, 3).map((q) => (
              <button
                key={q}
                onClick={() => send(q)}
                className="text-[9px] px-1.5 py-0.5 rounded-full bg-canvas border border-line text-fg hover:border-accent hover:bg-accent-soft transition"
              >
                {q}
              </button>
            ))}
          </div>
        )}

      <form
        onSubmit={handleSubmit}
        className="p-3 border-t border-line flex gap-1.5 flex-shrink-0"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Ask about ${h.short}…`}
          disabled={isLoading}
          className="flex-1 bg-surface border border-line-strong rounded-lg px-2.5 py-1.5 text-xs text-fg placeholder-fg-subtle focus:outline-none focus:border-accent transition"
        />
        <button
          type="submit"
          disabled={isLoading || !input?.trim()}
          className="bg-accent hover:bg-accent-hover text-white px-3 py-1.5 rounded-lg text-xs disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
        >
          Send
        </button>
      </form>
    </div>
  )
}

// ── main view ──────────────────────────────────────────────────────────────

type Props = {
  holdings: EnrichedHolding[]
  summary: PortfolioSummary
  profileName: string | null
}

export function StocksView({ holdings, summary, profileName }: Props) {
  // Map server-side EnrichedHolding into the local Holding view-model.
  const localHoldings: Holding[] = useMemo(
    () =>
      holdings.map((h) => {
        const price = h.current_nav ?? h.avg_cost ?? 0
        return {
          name: h.scheme_name,
          short: getShortName(h.scheme_name),
          sector: h.sector ?? 'Other',
          qty: h.units,
          avg: h.avg_cost ?? 0,
          invested: h.invested,
          price,
          value: h.current_value,
          pnl: h.pnl,
          pct: h.pnl_pct,
        }
      }),
    [holdings],
  )

  const [sortBy, setSortBy] = useState<'value' | 'pct' | 'pnl'>('value')
  const [showAll, setShowAll] = useState(false)
  const [expandedStock, setExpandedStock] = useState<string | null>(null)
  // Default the chat panel to the largest holding so users see the auto-greet
  // immediately. Lazy initial state runs once at mount; subsequent prop
  // changes don't reset the user's selection.
  const [chatStock, setChatStock] = useState<Holding | null>(
    () => [...localHoldings].sort((a, b) => b.value - a.value)[0] ?? null,
  )

  const sorted = useMemo(() => {
    return [...localHoldings].sort((a, b) =>
      sortBy === 'value' ? b.value - a.value : sortBy === 'pct' ? b.pct - a.pct : b.pnl - a.pnl,
    )
  }, [sortBy, localHoldings])

  const CURRENT = summary.netWorth
  const INVESTED = summary.invested
  const UNREALISED = summary.pnl
  const UNREALISED_PCT = summary.pnlPct

  const SECTOR_DATA = buildSectorData(localHoldings)
  const displayed = showAll ? sorted : sorted.slice(0, 12)
  const gainers = [...localHoldings].sort((a, b) => b.pct - a.pct).slice(0, 5)
  const losers = [...localHoldings].sort((a, b) => a.pct - b.pct).slice(0, 5)
  const maxGainerPct = gainers[0]?.pct ?? 1

  return (
    <div className="flex h-[calc(100vh-3.5rem)] md:h-screen">
      <div className="flex-1 overflow-y-auto min-w-0">
        <div className="px-4 py-4 sm:p-6 max-w-7xl mx-auto">
          <div className="mb-5 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              {profileName && (
                <p className="text-[10px] text-fg-muted uppercase tracking-wider font-medium mb-0.5">
                  {profileName}
                </p>
              )}
              <h1 className="text-xl font-semibold text-fg">Stock portfolio</h1>
              <p className="text-fg-muted text-xs mt-0.5">
                {localHoldings.length} holdings · live prices via Yahoo Finance
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Link
                href="/dashboard/upload"
                className="text-xs px-3 py-1.5 rounded-full bg-surface border border-line-strong text-accent hover:bg-accent-soft transition font-medium"
              >
                Re-upload
              </Link>
            </div>
          </div>

          {/* stat cards */}
          <div className="grid gap-3 mb-5 grid-cols-1 sm:grid-cols-3">
            <StatCard label="Current Value" value={`₹${fmt(CURRENT)}`} />
            <StatCard label="Total Invested" value={`₹${fmt(INVESTED)}`} />
            <StatCard
              label="Unrealised P&L"
              value={`${UNREALISED >= 0 ? '+' : '−'}₹${fmt(Math.abs(UNREALISED))}`}
              sub={`${UNREALISED_PCT >= 0 ? '+' : ''}${UNREALISED_PCT.toFixed(2)}% on cost`}
              highlight={UNREALISED >= 0 ? 'green' : 'red'}
            />
          </div>

          {/* sector donut + top movers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
            <div className="bg-surface border border-line rounded-xl p-4 shadow-sm">
              <h2 className="text-[10px] uppercase tracking-wider text-fg-muted font-medium mb-2">
                Sector allocation
              </h2>
              <ResponsiveContainer width="100%" height={190}>
                <PieChart>
                  <Pie
                    data={SECTOR_DATA}
                    cx="42%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={78}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {SECTOR_DATA.map((e) => (
                      <Cell key={e.name} fill={colorFor(e.name)} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v) => [
                      `₹${fmt(Number(v))} (${
                        CURRENT > 0 ? ((Number(v) / CURRENT) * 100).toFixed(1) : '0.0'
                      }%)`,
                      '',
                    ]}
                    contentStyle={{
                      background: '#ffffff',
                      border: '1px solid #c7d7fe',
                      borderRadius: 12,
                      color: 'var(--fg)',
                      fontSize: 12,
                      boxShadow: '0 4px 12px rgba(31, 35, 91, 0.08)',
                    }}
                  />
                  <Legend
                    layout="vertical"
                    align="right"
                    verticalAlign="middle"
                    iconSize={8}
                    formatter={(v) => (
                      <span style={{ color: 'var(--fg)', fontSize: 11 }}>{v}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-surface border border-line rounded-xl p-4 shadow-sm">
              <h2 className="text-[10px] uppercase tracking-wider text-fg-muted font-medium mb-3">
                Top movers
              </h2>
              <div className="grid grid-cols-2 gap-4">
                {[
                  {
                    label: 'Top gainers',
                    color: 'var(--success)',
                    items: gainers,
                    maxPct: Math.max(maxGainerPct, 1),
                  },
                  {
                    label: 'Top losers',
                    color: 'var(--danger)',
                    items: losers,
                    maxPct: Math.max(Math.abs(losers[0]?.pct ?? 1), 1),
                  },
                ].map((col) => (
                  <div key={col.label}>
                    <p className="text-[11px] mb-2 font-semibold" style={{ color: col.color }}>
                      {col.label}
                    </p>
                    <div className="space-y-2">
                      {col.items.map((h) => (
                        <div key={h.name}>
                          <div className="flex items-center justify-between mb-0.5">
                            <button
                              onClick={() => {
                                setExpandedStock(h.name)
                                document
                                  .querySelector(`[data-row="${CSS.escape(h.name)}"]`)
                                  ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                              }}
                              className="text-[11px] text-fg font-medium truncate max-w-[110px] hover:text-accent transition text-left"
                            >
                              {h.short}
                            </button>
                            <span
                              className="text-[11px] font-semibold shrink-0"
                              style={{ color: col.color }}
                            >
                              {h.pct >= 0 ? '+' : ''}
                              {h.pct.toFixed(1)}%
                            </span>
                          </div>
                          <div className="h-1 bg-line rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.min(
                                  (Math.abs(h.pct) / col.maxPct) * 100,
                                  100,
                                )}%`,
                                background: col.color,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* holdings table */}
          <div className="bg-surface border border-line rounded-xl overflow-hidden shadow-sm">
            <div className="px-4 py-2.5 border-b border-line flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-sm font-semibold text-fg">
                  Holdings{' '}
                  <span className="text-xs font-normal text-fg-muted">
                    ({localHoldings.length} stocks)
                  </span>
                </h2>
                <p className="text-[11px] text-fg-muted mt-0.5">
                  Click any row to expand · 1D chart from Yahoo Finance
                </p>
              </div>
              <div className="flex gap-1.5">
                {(['value', 'pct', 'pnl'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSortBy(s)}
                    className={`text-[11px] px-2.5 py-1 rounded-full border transition font-medium ${
                      sortBy === s
                        ? 'bg-accent border-accent text-white'
                        : 'bg-surface border-line-strong text-fg-muted hover:border-accent hover:text-accent'
                    }`}
                  >
                    {s === 'value' ? 'By Value' : s === 'pct' ? 'By Return %' : 'By P&L ₹'}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-canvas">
                  <tr>
                    <th className="text-left text-[10px] uppercase tracking-wider text-fg-muted px-4 py-2 font-medium">
                      Stock
                    </th>
                    <th className="text-left text-[10px] uppercase tracking-wider text-fg-muted px-3 py-2 font-medium hidden md:table-cell">
                      1D
                    </th>
                    <th className="text-left text-[10px] uppercase tracking-wider text-fg-muted px-3 py-2 font-medium hidden sm:table-cell">
                      Sector
                    </th>
                    <th className="text-right text-[10px] uppercase tracking-wider text-fg-muted px-3 py-2 font-medium">
                      Qty
                    </th>
                    <th className="text-right text-[10px] uppercase tracking-wider text-fg-muted px-3 py-2 font-medium hidden md:table-cell">
                      Avg / CMP
                    </th>
                    <th className="text-right text-[10px] uppercase tracking-wider text-fg-muted px-3 py-2 font-medium">
                      Value
                    </th>
                    <th className="text-right text-[10px] uppercase tracking-wider text-fg-muted px-3 py-2 font-medium hidden sm:table-cell">
                      P&L
                    </th>
                    <th className="text-right text-[10px] uppercase tracking-wider text-fg-muted px-4 py-2 font-medium">
                      Return
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {displayed.map((h) => {
                    const expanded = expandedStock === h.name
                    const pnlColor = h.pnl >= 0 ? 'var(--success)' : 'var(--danger)'
                    return (
                      <Fragment key={h.name}>
                        <tr
                          data-row={h.name}
                          onClick={() =>
                            setExpandedStock((prev) => (prev === h.name ? null : h.name))
                          }
                          className={`border-b border-line cursor-pointer transition ${
                            expanded ? 'bg-canvas' : 'hover:bg-canvas'
                          }`}
                        >
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <svg
                                className={`w-3 h-3 text-fg-subtle shrink-0 transition-transform ${
                                  expanded ? 'rotate-90' : ''
                                }`}
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                              >
                                <polyline points="9 18 15 12 9 6" />
                              </svg>
                              <div>
                                <p className="text-xs text-fg font-medium">{h.short}</p>
                                <p className="text-[11px] text-fg-muted mt-0.5 hidden sm:block">
                                  {h.name}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 hidden md:table-cell">
                            <StockSparkline name={h.name} width={64} height={22} />
                          </td>
                          <td className="px-3 py-2.5 hidden sm:table-cell">
                            <SectorBadge sector={h.sector} />
                          </td>
                          <td className="px-3 py-2.5 text-right text-xs text-fg-muted">
                            {h.qty}
                          </td>
                          <td className="px-3 py-2.5 text-right hidden md:table-cell">
                            <p className="text-[11px] text-fg-muted">₹{fmt(h.avg, 2)}</p>
                            <p className="text-[11px] text-fg font-medium">
                              ₹{fmt(h.price, 2)}
                            </p>
                          </td>
                          <td className="px-3 py-2.5 text-right text-xs text-fg font-medium">
                            ₹{fmt(h.value)}
                          </td>
                          <td
                            className="px-3 py-2.5 text-right text-xs font-medium hidden sm:table-cell"
                            style={{ color: pnlColor }}
                          >
                            {h.pnl >= 0 ? '+' : '−'}₹{fmt(Math.abs(h.pnl))}
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center justify-end gap-1.5">
                              <div className="w-10 h-1 bg-line rounded-full overflow-hidden hidden sm:block">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${Math.min(
                                      (Math.abs(h.pct) / Math.max(maxGainerPct, 1)) * 100,
                                      100,
                                    )}%`,
                                    background: pnlColor,
                                  }}
                                />
                              </div>
                              <span
                                className="text-xs font-semibold text-right w-14 shrink-0"
                                style={{ color: pnlColor }}
                              >
                                {h.pct >= 0 ? '+' : ''}
                                {h.pct.toFixed(1)}%
                              </span>
                            </div>
                          </td>
                        </tr>
                        {expanded && (
                          <StockDetail
                            key={`detail-${h.name}`}
                            h={h}
                            totalValue={CURRENT}
                            onAskClarzo={() => setChatStock(h)}
                          />
                        )}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {!showAll && localHoldings.length > 12 && (
              <div className="px-4 py-2.5 border-t border-line text-center">
                <button
                  onClick={() => setShowAll(true)}
                  className="text-xs font-medium text-accent hover:underline"
                >
                  Show remaining {localHoldings.length - 12} holdings ↓
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chat panel — inline sidebar on md+, slide-in overlay on phones */}
      {chatStock && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm md:hidden"
            onClick={() => setChatStock(null)}
          />
          <div className="fixed right-0 top-14 bottom-0 z-50 md:static md:z-auto w-[85vw] max-w-[320px] md:w-[280px] lg:w-[300px] flex-shrink-0 border-l border-line">
            <StockChatPanel
              key={chatStock.name}
              h={chatStock}
              totalValue={CURRENT}
              onClose={() => setChatStock(null)}
            />
          </div>
        </>
      )}
    </div>
  )
}

