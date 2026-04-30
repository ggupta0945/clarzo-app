'use client'

import { Fragment, useState, useMemo, useEffect, useRef } from 'react'
import { useChat } from '@ai-sdk/react'
import { TextStreamChatTransport, isTextUIPart, type UIMessage } from 'ai'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'

// ── types ──────────────────────────────────────────────────────────────────────
interface Holding {
  name: string; short: string; sector: string
  qty: number; avg: number; invested: number
  price: number; value: number; pnl: number; pct: number
}

interface ParsedPortfolio {
  userName: string
  clientCode: string
  portfolioDate: string
  invested: number
  current: number
  unrealised: number
  unrealisedPct: number
  fyRealised: number
  fyCharges: number
  fyNet: number
  hasPnL: boolean
  holdings: Holding[]
  realisedTrades: { name: string; value: number }[]
  charges: { name: string; value: number }[]
}

// ── sector mappings ────────────────────────────────────────────────────────────
const SECTOR_COLORS: Record<string, string> = {
  'Precious Metals': '#f5c842', 'Energy': '#34d399', 'Tech': '#a78bfa',
  'Defense': '#60a5fa', 'Banking': '#fb923c', 'Industrials': '#38bdf8',
  'Index ETF': '#4ade80', 'Healthcare': '#f472b6', 'Consumer': '#c084fc',
  'Real Estate': '#e879f9', 'Small Cap': '#94a3b8', 'Pharma': '#6ee7b7',
  'Telecom': '#fdba74', 'Food & Bev': '#fde68a', 'Mining': '#a8a29e',
}

const SECTOR_TO_GROUP: Record<string, string> = {
  'Precious Metals': 'Precious Metals', 'Energy': 'Energy & Power',
  'Tech': 'Tech & Fintech', 'Defense': 'Defense', 'Banking': 'Banking',
  'Industrials': 'Industrials', 'Index ETF': 'Index ETF', 'Healthcare': 'Healthcare',
  'Consumer': 'Paints & Consumer', 'Real Estate': 'Others', 'Small Cap': 'Others',
  'Pharma': 'Others', 'Telecom': 'Others', 'Food & Bev': 'Others',
  'Mining': 'Others',
}

const GROUP_COLORS: Record<string, string> = {
  'Precious Metals': '#f5c842', 'Energy & Power': '#34d399', 'Tech & Fintech': '#a78bfa',
  'Defense': '#60a5fa', 'Banking': '#fb923c', 'Industrials': '#38bdf8',
  'Index ETF': '#4ade80', 'Healthcare': '#f472b6', 'Paints & Consumer': '#c084fc',
  'Others': '#64748b',
}

// ordered by specificity — checked in sequence, first match wins
const STOCK_SECTOR_MAP: [string, string][] = [
  ['ADANI GREEN', 'Energy'], ['APEX FROZEN', 'Food & Bev'], ['ASIAN PAINTS', 'Consumer'],
  ['ASTER DM', 'Healthcare'], ['HINDUSTAN AERONAUTICS', 'Defense'], ['BHARAT ELECTRONICS', 'Defense'],
  ['BILLIONBRAINS', 'Tech'], ['BLUE STAR', 'Industrials'], ['CUMMINS', 'Industrials'],
  ['DLF', 'Real Estate'], ['GROWWAMC', 'Precious Metals'], ['GROWWGOLD', 'Precious Metals'],
  ['HATHWAY', 'Telecom'], ['INDUS TOWERS', 'Telecom'], ['HDFC BANK', 'Banking'],
  ['INDIAN OIL', 'Energy'], ['KOTAK', 'Banking'], ['MEESHO', 'Tech'],
  ['NIP IND ETF', 'Index ETF'], ['NETFSILVER', 'Precious Metals'], ['NIPPONAMC', 'Precious Metals'],
  ['NIFTY', 'Index ETF'], ['OIL AND NATURAL GAS', 'Energy'], ['ONGC', 'Energy'],
  ['ORIENT ELECTRIC', 'Consumer'], ['RELIANCE POWER', 'Energy'], ['STRLNG', 'Energy'],
  ['STERLING', 'Energy'], ['TATAAML', 'Precious Metals'], ['TATSILV', 'Precious Metals'],
  ['TATAGOLD', 'Precious Metals'], ['TREJHARA', 'Small Cap'], ['VIYASH', 'Pharma'],
  ['GODREJ', 'Consumer'], ['NMDC', 'Mining'],
]

// ── helpers ────────────────────────────────────────────────────────────────────
function getSector(name: string): string {
  const upper = name.toUpperCase()
  for (const [key, sector] of STOCK_SECTOR_MAP) {
    if (upper.includes(key)) return sector
  }
  return 'Other'
}

function getShortName(name: string): string {
  if (name.length <= 18) return name
  const words = name.trim().split(/\s+/)
  let result = ''
  for (const word of words) {
    const next = result ? `${result} ${word}` : word
    if (next.length > 15) break
    result = next
  }
  return result || name.slice(0, 15)
}

function fmt(n: number, dec = 0) { return Math.abs(n).toLocaleString('en-IN', { maximumFractionDigits: dec }) }

function buildSectorData(holdings: Holding[]) {
  const g: Record<string, number> = {}
  for (const h of holdings) {
    const k = SECTOR_TO_GROUP[h.sector] || 'Others'
    g[k] = (g[k] || 0) + h.value
  }
  return Object.entries(g)
    .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
    .sort((a, b) => b.value - a.value)
}

// ── XLSX parsing ───────────────────────────────────────────────────────────────
type RawRow = (string | number | undefined)[]

async function parseHoldingsFile(file: File): Promise<Omit<ParsedPortfolio, 'fyRealised' | 'fyCharges' | 'fyNet' | 'hasPnL' | 'realisedTrades' | 'charges'>> {
  const XLSX = await import('xlsx')
  const buffer = await file.arrayBuffer()
  const wb = XLSX.read(buffer, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as RawRow[]

  const userName = String(rows[0]?.[1] ?? '')
  const clientCode = String(rows[1]?.[1] ?? '')
  const dateMatch = String(rows[3]?.[0] ?? '').match(/as on (.+)/i)
  const portfolioDate = dateMatch?.[1]?.trim() ?? ''
  const invested = Number(rows[6]?.[1] ?? 0)
  const current = Number(rows[7]?.[1] ?? 0)
  const unrealised = Number(rows[8]?.[1] ?? 0)
  const unrealisedPct = invested > 0 ? (unrealised / invested) * 100 : 0

  const headerIdx = rows.findIndex(r => String(r[0] ?? '').toLowerCase().includes('stock name'))
  const holdings: Holding[] = []
  if (headerIdx >= 0) {
    for (let i = headerIdx + 1; i < rows.length; i++) {
      const r = rows[i]
      if (!r[0]) break
      const name = String(r[0])
      const qty = Number(r[2] ?? 0)
      const avg = Number(r[3] ?? 0)
      const inv = Number(r[4] ?? 0)
      const price = Number(r[5] ?? 0)
      const value = Number(r[6] ?? 0)
      const pnl = Number(r[7] ?? 0)
      const pct = inv > 0 ? (pnl / inv) * 100 : 0
      holdings.push({ name, short: getShortName(name), sector: getSector(name), qty, avg, invested: inv, price, value, pnl, pct })
    }
  }

  return { userName, clientCode, portfolioDate, invested, current, unrealised, unrealisedPct, holdings }
}

async function parsePnLFile(file: File): Promise<Pick<ParsedPortfolio, 'fyRealised' | 'fyCharges' | 'fyNet' | 'realisedTrades' | 'charges'>> {
  const XLSX = await import('xlsx')
  const buffer = await file.arrayBuffer()
  const wb = XLSX.read(buffer, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as RawRow[]

  const realisedRow = rows.findIndex(r => String(r[0] ?? '').toLowerCase() === 'realised p&l')
  const fyRealised = realisedRow >= 0 ? Number(rows[realisedRow]?.[1] ?? 0) : 0

  const chargesStart = rows.findIndex(r => String(r[0] ?? '').toLowerCase() === 'charges')
  const totalRow = rows.findIndex((r, i) => i > chargesStart && String(r[0] ?? '').toLowerCase() === 'total')
  const fyCharges = totalRow >= 0 ? Number(rows[totalRow]?.[1] ?? 0) : 0
  const fyNet = fyRealised - fyCharges

  const charges: { name: string; value: number }[] = []
  if (chargesStart >= 0 && totalRow > chargesStart) {
    for (let i = chargesStart + 1; i < totalRow; i++) {
      const r = rows[i]
      const label = String(r[0] ?? '').trim()
      const val = Number(r[1] ?? 0)
      if (label && val !== 0) charges.push({ name: label, value: val })
    }
  }

  const realisedSectionIdx = rows.findIndex(r => String(r[0] ?? '').toLowerCase().includes('realised trades'))
  const headerIdx = realisedSectionIdx >= 0
    ? rows.findIndex((r, i) => i > realisedSectionIdx && String(r[0] ?? '').toLowerCase().includes('stock name'))
    : -1

  const realisedTrades: { name: string; value: number }[] = []
  if (headerIdx >= 0) {
    const byStock = new Map<string, number>()
    for (let i = headerIdx + 1; i < rows.length; i++) {
      const r = rows[i]
      if (!r[0]) break
      const name = String(r[0])
      const pnl = Number(r[9] ?? 0)
      byStock.set(name, (byStock.get(name) ?? 0) + pnl)
    }
    for (const [name, value] of byStock) {
      realisedTrades.push({ name: getShortName(name), value: Math.round(value * 100) / 100 })
    }
  }

  return { fyRealised, fyCharges, fyNet, charges, realisedTrades }
}

// ── upload view ────────────────────────────────────────────────────────────────
function FileDropZone({ onChange, file }: { onChange: (f: File) => void; file: File | null }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) onChange(f)
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition ${
        dragging ? 'border-[#34d399] bg-[#0c2418]' : 'border-[#1a4a2e] bg-[#071a10] hover:border-[#34d399] hover:bg-[#0c2418]'
      }`}
    >
      <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden"
        onChange={(e) => e.target.files?.[0] && onChange(e.target.files[0])} />
      {file ? (
        <div className="flex items-center justify-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          <p className="text-sm text-[#34d399] truncate max-w-xs">{file.name}</p>
        </div>
      ) : (
        <>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4a7a5a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <p className="text-[#88b098] text-sm">Drop file here or click to browse</p>
          <p className="text-[#4a7a5a] text-xs mt-1">.xlsx files from Groww, Zerodha, or any NSE/BSE broker</p>
        </>
      )}
    </div>
  )
}

function UploadView({ onParsed }: { onParsed: (data: ParsedPortfolio) => void }) {
  const [holdingsFile, setHoldingsFile] = useState<File | null>(null)
  const [pnlFile, setPnlFile] = useState<File | null>(null)
  const [parsing, setParsing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleParse() {
    if (!holdingsFile) return
    setParsing(true)
    setError(null)
    try {
      const holdingsData = await parseHoldingsFile(holdingsFile)
      let pnlData: Pick<ParsedPortfolio, 'fyRealised' | 'fyCharges' | 'fyNet' | 'realisedTrades' | 'charges'> = {
        fyRealised: 0, fyCharges: 0, fyNet: 0, charges: [], realisedTrades: []
      }
      if (pnlFile) {
        pnlData = await parsePnLFile(pnlFile)
      }
      onParsed({ ...holdingsData, ...pnlData, hasPnL: !!pnlFile })
    } catch (e) {
      console.error(e)
      setError('Could not parse the file. Make sure you uploaded the correct holdings statement XLSX from your broker.')
    } finally {
      setParsing(false)
    }
  }

  return (
    <div className="px-4 py-10 sm:p-10 max-w-xl mx-auto">
      <div className="mb-10">
        <h1 className="text-3xl text-[#e4f0e8] mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
          My Stocks
        </h1>
        <p className="text-[#88b098] text-sm">
          Upload your portfolio files to see a live breakdown of your holdings.
        </p>
      </div>

      <div className="space-y-4 mb-8">
        <div>
          <p className="text-sm text-[#88b098] mb-2">
            Holdings Statement <span className="text-[#ef4444] text-xs">required</span>
          </p>
          <FileDropZone file={holdingsFile} onChange={setHoldingsFile} />
        </div>

        <div>
          <p className="text-sm text-[#88b098] mb-2">
            P&amp;L Report <span className="text-[#4a7a5a] text-xs">optional — adds FY realised trades &amp; charges</span>
          </p>
          <FileDropZone file={pnlFile} onChange={setPnlFile} />
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-[#3a1010] border border-[#7a2020] rounded-xl px-4 py-3 text-sm text-[#ef4444]">
          {error}
        </div>
      )}

      <button
        onClick={handleParse}
        disabled={!holdingsFile || parsing}
        className="w-full bg-[#059669] hover:bg-[#0F6E56] text-white py-3.5 rounded-xl font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {parsing ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Parsing...
          </span>
        ) : 'View Dashboard →'}
      </button>

      <p className="text-center text-xs text-[#4a7a5a] mt-4">
        Files are parsed entirely in your browser — nothing is uploaded to our servers.
      </p>
    </div>
  )
}

// ── small reusable pieces ──────────────────────────────────────────────────────
function StatCard({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: 'green' | 'red' }) {
  return (
    <div className="bg-[#071a10] border border-[#1a4a2e] rounded-2xl p-5 flex flex-col gap-1">
      <p className="text-xs uppercase tracking-widest text-[#4a7a5a]">{label}</p>
      <p className="text-2xl sm:text-3xl" style={{ fontFamily: 'Playfair Display, serif', color: highlight === 'green' ? '#34d399' : highlight === 'red' ? '#ef4444' : '#e4f0e8' }}>{value}</p>
      {sub && <p className="text-xs text-[#88b098]">{sub}</p>}
    </div>
  )
}

function SectorBadge({ sector }: { sector: string }) {
  const c = SECTOR_COLORS[sector] || '#88b098'
  return <span className="text-xs px-2 py-0.5 rounded-full whitespace-nowrap" style={{ background: `${c}18`, color: c, border: `1px solid ${c}30` }}>{sector}</span>
}

// ── stock detail panel (expanded row) ─────────────────────────────────────────
function StockDetail({ h, onAskClarzo, totalValue }: { h: Holding; onAskClarzo: () => void; totalValue: number }) {
  const weight = totalValue > 0 ? (h.value / totalValue) * 100 : 0
  const maxPrice = Math.max(h.avg, h.price) * 1.08
  const avgW = Math.min((h.avg / maxPrice) * 100, 100)
  const curW = Math.min((h.price / maxPrice) * 100, 100)
  const isGain = h.pnl >= 0
  const priceDiff = h.avg > 0 ? ((h.price - h.avg) / h.avg) * 100 : 0

  return (
    <tr className="bg-[#050e08]">
      <td colSpan={7} className="px-6 pb-5 pt-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-xs uppercase tracking-widest text-[#4a7a5a] mb-3">Price Journey</p>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#88b098]">Avg Buy</span>
                  <span className="font-mono text-[#88b098]">₹{fmt(h.avg, 2)}</span>
                </div>
                <div className="h-2 bg-[#0c2418] rounded-full overflow-hidden">
                  <div className="h-full bg-[#4a7a5a] rounded-full transition-all" style={{ width: `${avgW}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span style={{ color: isGain ? '#34d399' : '#ef4444' }}>Current (CMP)</span>
                  <span className="font-mono" style={{ color: isGain ? '#34d399' : '#ef4444' }}>₹{fmt(h.price, 2)}</span>
                </div>
                <div className="h-2 bg-[#0c2418] rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${curW}%`, background: isGain ? '#34d399' : '#ef4444' }} />
                </div>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-[#4a7a5a]">Price movement from cost</span>
                <span className="text-xs font-mono font-semibold" style={{ color: isGain ? '#34d399' : '#ef4444' }}>
                  {priceDiff >= 0 ? '+' : ''}{priceDiff.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs uppercase tracking-widest text-[#4a7a5a] mb-3">Position Details</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
              {[
                { label: 'Qty held', val: String(h.qty) },
                { label: 'Portfolio weight', val: `${weight.toFixed(1)}%` },
                { label: 'Invested', val: `₹${fmt(h.invested)}` },
                { label: 'Current value', val: `₹${fmt(h.value)}` },
                { label: 'Break-even', val: `₹${fmt(h.avg, 2)}` },
                { label: 'Unrealised P&L', val: `${isGain ? '+' : '−'}₹${fmt(Math.abs(h.pnl))}` },
              ].map(({ label, val }) => (
                <div key={label}>
                  <p className="text-xs text-[#4a7a5a]">{label}</p>
                  <p className="text-sm text-[#e4f0e8] font-mono mt-0.5">{val}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-[#4a7a5a] mb-3">Portfolio Share</p>
              <div className="flex items-end gap-3">
                <p className="text-4xl font-light" style={{ fontFamily: 'Playfair Display, serif', color: isGain ? '#34d399' : '#ef4444' }}>
                  {weight.toFixed(1)}%
                </p>
                <p className="text-xs text-[#4a7a5a] pb-1.5">of total<br />portfolio</p>
              </div>
              <div className="mt-2 h-1.5 bg-[#0c2418] rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${Math.min(weight * 2.5, 100)}%`, background: isGain ? '#34d399' : '#ef4444' }} />
              </div>
              <p className="text-xs text-[#4a7a5a] mt-1.5">₹{fmt(h.value)} of ₹{fmt(totalValue)} total</p>
            </div>
            <button
              onClick={onAskClarzo}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#059669] hover:bg-[#0F6E56] text-white text-sm font-medium transition w-full justify-center"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              Ask Clarzo about this stock
            </button>
          </div>
        </div>
      </td>
    </tr>
  )
}

// ── stock chat panel ───────────────────────────────────────────────────────────
const SUGGESTIONS = ['Should I buy more?', 'What are the risks?', 'Set a stop-loss level', "What's my break-even?"]

function StockChatPanel({ h, onClose, totalValue }: { h: Holding; onClose: () => void; totalValue: number }) {
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const contextSent = useRef(false)
  const color = SECTOR_COLORS[h.sector] || '#88b098'
  const weight = totalValue > 0 ? (h.value / totalValue * 100).toFixed(1) : '0.0'

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

  // Strip context prefix when displaying the first user message
  function displayText(m: UIMessage) {
    const text = m.parts.filter(isTextUIPart).map(p => p.text).join('')
    if (m.role === 'user' && text.startsWith(CONTEXT_PREFIX)) return text.slice(CONTEXT_PREFIX.length)
    return text
  }

  const hasMessages = messages.some(m => {
    const t = m.parts.filter(isTextUIPart).map(p => p.text).join('')
    return t.length > 0
  })

  return (
    <div className="flex flex-col h-full bg-[#040f0a]">
        <div className="px-5 py-4 border-b border-[#1a4a2e] flex-shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1"><SectorBadge sector={h.sector} /></div>
              <h3 className="text-lg text-[#e4f0e8]" style={{ fontFamily: 'Playfair Display, serif' }}>{h.short}</h3>
              <p className="text-xs text-[#4a7a5a] mt-0.5">{h.name}</p>
            </div>
            <button onClick={onClose} className="lg:hidden p-1.5 text-[#88b098] hover:text-[#34d399] transition shrink-0 mt-0.5">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3">
            {[
              { label: 'CMP', val: `₹${fmt(h.price, 2)}` },
              { label: 'P&L', val: `${h.pnl >= 0 ? '+' : '−'}₹${fmt(Math.abs(h.pnl))}`, color: h.pnl >= 0 ? '#34d399' : '#ef4444' },
              { label: 'Return', val: `${h.pct >= 0 ? '+' : ''}${h.pct.toFixed(1)}%`, color: h.pnl >= 0 ? '#34d399' : '#ef4444' },
            ].map(s => (
              <div key={s.label} className="bg-[#071a10] border border-[#1a4a2e] rounded-lg px-3 py-1.5 text-center">
                <p className="text-xs text-[#4a7a5a]">{s.label}</p>
                <p className="text-xs font-mono mt-0.5" style={{ color: s.color || '#e4f0e8' }}>{s.val}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
          {/* empty state — show suggestions before any message is sent */}
          {!hasMessages && !isLoading && (
            <div className="flex flex-col gap-3 pt-2">
              <p className="text-xs text-[#4a7a5a] text-center">Ask anything about this position</p>
              <div className="grid grid-cols-1 gap-2">
                {SUGGESTIONS.map(q => (
                  <button key={q} onClick={() => send(q)}
                    className="text-left px-3 py-2.5 rounded-xl bg-[#071a10] border border-[#1a4a2e] text-[#88b098] text-xs hover:border-[#34d399] hover:text-[#e4f0e8] transition">
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
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  m.role === 'user' ? 'bg-[#059669] text-white' : 'bg-[#071a10] border border-[#1a4a2e] text-[#e4f0e8]'
                }`}>
                  {m.role === 'assistant' && <p className="text-xs mb-1" style={{ color }}>Clarzo</p>}
                  <p className="whitespace-pre-wrap">{text}</p>
                </div>
              </div>
            )
          })}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-[#071a10] border border-[#1a4a2e] rounded-2xl px-3.5 py-2.5">
                <p className="text-xs mb-1.5" style={{ color }}>Clarzo</p>
                <div className="flex space-x-1">
                  {[0, 150, 300].map(d => (
                    <span key={d} className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: color, animationDelay: `${d}ms` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* follow-up suggestions after first response */}
        {hasMessages && !isLoading && messages[messages.length - 1]?.role === 'assistant' && (
          <div className="px-4 pb-2 flex gap-2 flex-wrap flex-shrink-0">
            {SUGGESTIONS.slice(0, 3).map(q => (
              <button key={q} onClick={() => send(q)}
                className="text-xs px-3 py-1.5 rounded-full bg-[#071a10] border border-[#1a4a2e] text-[#88b098] hover:border-[#34d399] hover:text-[#e4f0e8] transition">
                {q}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-4 border-t border-[#1a4a2e] flex gap-2 flex-shrink-0">
          <input value={input} onChange={e => setInput(e.target.value)}
            placeholder={`Ask about ${h.short}…`} disabled={isLoading}
            className="flex-1 bg-[#071a10] border border-[#1a4a2e] rounded-xl px-3 py-2 text-sm text-[#e4f0e8] placeholder-[#4a7a5a] focus:outline-none focus:border-[#34d399] transition" />
          <button type="submit" disabled={isLoading || !input?.trim()}
            className="bg-[#059669] hover:bg-[#0F6E56] text-white px-4 py-2 rounded-xl text-sm disabled:opacity-50 disabled:cursor-not-allowed transition">
            Send
          </button>
        </form>
    </div>
  )
}

// ── main page ──────────────────────────────────────────────────────────────────
export default function StocksPage() {
  const [portfolio, setPortfolio] = useState<ParsedPortfolio | null>(null)
  const [sortBy, setSortBy] = useState<'value' | 'pct' | 'pnl'>('value')
  const [showAll, setShowAll] = useState(false)
  const [expandedStock, setExpandedStock] = useState<string | null>(null)
  const [chatStock, setChatStock] = useState<Holding | null>(null)

  const holdings = portfolio?.holdings ?? []
  const sorted = useMemo(() => {
    return [...holdings].sort((a, b) =>
      sortBy === 'value' ? b.value - a.value : sortBy === 'pct' ? b.pct - a.pct : b.pnl - a.pnl
    )
  }, [sortBy, holdings])

  if (!portfolio) {
    return <UploadView onParsed={(data) => {
      setPortfolio(data)
      setExpandedStock(null)
      const first = [...data.holdings].sort((a, b) => b.value - a.value)[0] ?? null
      setChatStock(first)
    }} />
  }

  const { current: CURRENT, invested: INVESTED, unrealised: UNREALISED,
    unrealisedPct: UNREALISED_PCT, fyRealised: FY_REALISED, fyCharges: FY_CHARGES,
    fyNet: FY_NET, realisedTrades: REALISED_TRADES, charges: CHARGES,
    userName, clientCode, portfolioDate: PORTFOLIO_DATE, hasPnL } = portfolio

  const SECTOR_DATA = buildSectorData(holdings)

  const displayed = showAll ? sorted : sorted.slice(0, 12)
  const gainers = [...holdings].sort((a, b) => b.pct - a.pct).slice(0, 5)
  const losers  = [...holdings].sort((a, b) => a.pct - b.pct).slice(0, 5)
  const maxGainerPct = gainers[0]?.pct ?? 1

  return (
    <div className="flex h-[calc(100vh-3.5rem)] lg:h-screen">
      {/* scrollable main content */}
      <div className="flex-1 overflow-y-auto min-w-0">
      <div className="px-4 py-6 sm:p-8 max-w-7xl mx-auto">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          {(userName || clientCode) && (
            <p className="text-xs text-[#4a7a5a] uppercase tracking-widest mb-1">
              {[userName, clientCode].filter(Boolean).join(' · ')}
            </p>
          )}
          <h1 className="text-3xl text-[#e4f0e8]" style={{ fontFamily: 'Playfair Display, serif' }}>Stock Portfolio</h1>
          <p className="text-[#88b098] text-sm mt-1">
            {PORTFOLIO_DATE ? `As of ${PORTFOLIO_DATE} · ` : ''}{holdings.length} holdings
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {hasPnL && <span className="text-xs px-3 py-1.5 rounded-full bg-[#071a10] border border-[#1a4a2e] text-[#34d399]">FY 2025–26</span>}
          <button
            onClick={() => setPortfolio(null)}
            className="text-xs px-3 py-1.5 rounded-full bg-[#071a10] border border-[#1a4a2e] text-[#88b098] hover:border-[#34d399] hover:text-[#e4f0e8] transition"
          >
            Re-upload
          </button>
        </div>
      </div>

      {/* stat cards */}
      <div className={`grid gap-4 mb-8 ${hasPnL ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 sm:grid-cols-3'}`}>
        <StatCard label="Current Value" value={`₹${fmt(CURRENT)}`} />
        <StatCard label="Total Invested" value={`₹${fmt(INVESTED)}`} />
        <StatCard
          label="Unrealised P&L"
          value={`${UNREALISED >= 0 ? '+' : '−'}₹${fmt(Math.abs(UNREALISED))}`}
          sub={`${UNREALISED_PCT >= 0 ? '+' : ''}${UNREALISED_PCT.toFixed(2)}% on cost`}
          highlight={UNREALISED >= 0 ? 'green' : 'red'}
        />
        {hasPnL && (
          <StatCard
            label="FY Realised P&L"
            value={`${FY_REALISED >= 0 ? '+' : '−'}₹${fmt(Math.abs(FY_REALISED))}`}
            sub={`Net after charges: ${FY_NET >= 0 ? '+' : '−'}₹${fmt(Math.abs(FY_NET))}`}
            highlight={FY_REALISED >= 0 ? 'green' : 'red'}
          />
        )}
      </div>

      {/* sector donut + top movers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="bg-[#071a10] border border-[#1a4a2e] rounded-2xl p-6">
          <h2 className="text-xs uppercase tracking-widest text-[#4a7a5a] mb-4">Sector Allocation</h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={SECTOR_DATA} cx="42%" cy="50%" innerRadius={65} outerRadius={105} paddingAngle={2} dataKey="value" stroke="none">
                {SECTOR_DATA.map(e => <Cell key={e.name} fill={GROUP_COLORS[e.name] ?? '#64748b'} />)}
              </Pie>
              <Tooltip formatter={(v) => [`₹${fmt(Number(v))} (${CURRENT > 0 ? ((Number(v) / CURRENT) * 100).toFixed(1) : '0.0'}%)`, '']}
                contentStyle={{ background: '#071a10', border: '1px solid #1a4a2e', borderRadius: 8, color: '#e4f0e8', fontSize: 12 }} />
              <Legend layout="vertical" align="right" verticalAlign="middle" iconSize={8}
                formatter={v => <span style={{ color: '#88b098', fontSize: 11 }}>{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-[#071a10] border border-[#1a4a2e] rounded-2xl p-6">
          <h2 className="text-xs uppercase tracking-widest text-[#4a7a5a] mb-5">Top Movers</h2>
          <div className="grid grid-cols-2 gap-6">
            {[
              { label: 'Top Gainers', color: '#34d399', items: gainers, maxPct: Math.max(maxGainerPct, 1) },
              { label: 'Top Losers',  color: '#ef4444', items: losers,  maxPct: Math.max(Math.abs(losers[0]?.pct ?? 1), 1) },
            ].map(col => (
              <div key={col.label}>
                <p className="text-xs mb-3 font-medium" style={{ color: col.color }}>{col.label}</p>
                <div className="space-y-3">
                  {col.items.map(h => (
                    <div key={h.name}>
                      <div className="flex items-center justify-between mb-1">
                        <button
                          onClick={() => { setExpandedStock(h.name); document.querySelector(`[data-row="${h.name}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }) }}
                          className="text-xs text-[#e4f0e8] truncate max-w-[110px] hover:text-[#34d399] transition text-left"
                        >{h.short}</button>
                        <span className="text-xs font-mono shrink-0" style={{ color: col.color }}>{h.pct >= 0 ? '+' : ''}{h.pct.toFixed(1)}%</span>
                      </div>
                      <div className="h-1 bg-[#0c2418] rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${Math.min((Math.abs(h.pct) / col.maxPct) * 100, 100)}%`, background: col.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FY realised + charges — only if PnL file was uploaded */}
      {hasPnL && REALISED_TRADES.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <div className="lg:col-span-2 bg-[#071a10] border border-[#1a4a2e] rounded-2xl p-6">
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-xs uppercase tracking-widest text-[#4a7a5a]">FY Realised Trades</h2>
              <div className="text-right shrink-0">
                <p className="text-xs text-[#4a7a5a]">Gross</p>
                <p className="text-xl" style={{ fontFamily: 'Playfair Display, serif', color: FY_REALISED >= 0 ? '#34d399' : '#ef4444' }}>
                  {FY_REALISED >= 0 ? '+' : '−'}₹{fmt(Math.abs(FY_REALISED))}
                </p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={REALISED_TRADES} margin={{ top: 4, right: 4, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a4a2e" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#4a7a5a', fontSize: 9 }} axisLine={false} tickLine={false} angle={-30} textAnchor="end" height={50} />
                <YAxis tick={{ fill: '#4a7a5a', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(Number(v) / 1000).toFixed(1)}k`} />
                <Tooltip
                  formatter={(v) => { const n = Number(v); return [`${n >= 0 ? '+' : '−'}₹${fmt(Math.abs(n))}`, 'Realised P&L'] as [string, string] }}
                  contentStyle={{ background: '#071a10', border: '1px solid #1a4a2e', borderRadius: 8, color: '#e4f0e8', fontSize: 12 }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {REALISED_TRADES.map((t, i) => <Cell key={i} fill={t.value >= 0 ? '#34d399' : '#ef4444'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {CHARGES.length > 0 && (
            <div className="bg-[#071a10] border border-[#1a4a2e] rounded-2xl p-6">
              <div className="flex items-start justify-between mb-5">
                <h2 className="text-xs uppercase tracking-widest text-[#4a7a5a]">FY Charges</h2>
                <p className="text-sm text-[#ef4444] font-mono shrink-0">−₹{fmt(FY_CHARGES, 2)}</p>
              </div>
              <div className="space-y-3">
                {CHARGES.map(c => (
                  <div key={c.name}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[#88b098]">{c.name}</span>
                      <span className="text-[#e4f0e8] font-mono">₹{fmt(c.value, 2)}</span>
                    </div>
                    <div className="h-1 bg-[#0c2418] rounded-full overflow-hidden">
                      <div className="h-full rounded-full opacity-70" style={{ width: `${FY_CHARGES > 0 ? (c.value / FY_CHARGES) * 100 : 0}%`, background: '#ef4444' }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5 pt-4 border-t border-[#1a4a2e] flex justify-between text-sm">
                <span className="text-[#88b098]">Net Realised P&L</span>
                <span className="font-mono" style={{ color: FY_NET >= 0 ? '#34d399' : '#ef4444' }}>
                  {FY_NET >= 0 ? '+' : '−'}₹{fmt(Math.abs(FY_NET))}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* holdings table */}
      <div className="bg-[#071a10] border border-[#1a4a2e] rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#1a4a2e] flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-medium text-[#e4f0e8]">Holdings <span className="text-sm font-normal text-[#88b098]">({holdings.length} stocks)</span></h2>
            <p className="text-xs text-[#4a7a5a] mt-0.5">Click any row to expand details · Ask Clarzo for stock-specific analysis</p>
          </div>
          <div className="flex gap-2">
            {(['value', 'pct', 'pnl'] as const).map(s => (
              <button key={s} onClick={() => setSortBy(s)}
                className={`text-xs px-3 py-1.5 rounded-full border transition ${sortBy === s ? 'bg-[#059669] border-[#059669] text-white' : 'border-[#1a4a2e] text-[#88b098] hover:border-[#34d399]'}`}>
                {s === 'value' ? 'By Value' : s === 'pct' ? 'By Return %' : 'By P&L ₹'}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#040f0a]">
              <tr>
                <th className="text-left text-xs uppercase tracking-wider text-[#4a7a5a] px-6 py-3 font-medium">Stock</th>
                <th className="text-left text-xs uppercase tracking-wider text-[#4a7a5a] px-4 py-3 font-medium hidden sm:table-cell">Sector</th>
                <th className="text-right text-xs uppercase tracking-wider text-[#4a7a5a] px-4 py-3 font-medium">Qty</th>
                <th className="text-right text-xs uppercase tracking-wider text-[#4a7a5a] px-4 py-3 font-medium hidden md:table-cell">Avg / CMP</th>
                <th className="text-right text-xs uppercase tracking-wider text-[#4a7a5a] px-4 py-3 font-medium">Value</th>
                <th className="text-right text-xs uppercase tracking-wider text-[#4a7a5a] px-4 py-3 font-medium hidden sm:table-cell">P&L</th>
                <th className="text-right text-xs uppercase tracking-wider text-[#4a7a5a] px-6 py-3 font-medium">Return</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map(h => {
                const expanded = expandedStock === h.name
                return (
                  <Fragment key={h.name}>
                    <tr
                      data-row={h.name}
                      onClick={() => setExpandedStock(prev => prev === h.name ? null : h.name)}
                      className={`border-b border-[#1a4a2e] cursor-pointer transition ${expanded ? 'bg-[#071a10]' : 'hover:bg-[#0c2418]'}`}
                    >
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-2">
                          <svg className={`w-3 h-3 text-[#4a7a5a] shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                          <div>
                            <p className="text-sm text-[#e4f0e8] font-medium">{h.short}</p>
                            <p className="text-xs text-[#4a7a5a] mt-0.5 hidden sm:block">{h.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 hidden sm:table-cell"><SectorBadge sector={h.sector} /></td>
                      <td className="px-4 py-3.5 text-right text-sm font-mono text-[#88b098]">{h.qty}</td>
                      <td className="px-4 py-3.5 text-right hidden md:table-cell">
                        <p className="text-xs text-[#4a7a5a] font-mono">₹{fmt(h.avg, 2)}</p>
                        <p className="text-xs text-[#e4f0e8] font-mono">₹{fmt(h.price, 2)}</p>
                      </td>
                      <td className="px-4 py-3.5 text-right text-sm font-mono text-[#e4f0e8]">₹{fmt(h.value)}</td>
                      <td className={`px-4 py-3.5 text-right text-sm font-mono hidden sm:table-cell ${h.pnl >= 0 ? 'text-[#34d399]' : 'text-[#ef4444]'}`}>
                        {h.pnl >= 0 ? '+' : '−'}₹{fmt(Math.abs(h.pnl))}
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-12 h-1.5 bg-[#0c2418] rounded-full overflow-hidden hidden sm:block">
                            <div className="h-full rounded-full" style={{ width: `${Math.min((Math.abs(h.pct) / Math.max(maxGainerPct, 1)) * 100, 100)}%`, background: h.pct >= 0 ? '#34d399' : '#ef4444' }} />
                          </div>
                          <span className={`text-sm font-mono text-right w-16 shrink-0 ${h.pct >= 0 ? 'text-[#34d399]' : 'text-[#ef4444]'}`}>
                            {h.pct >= 0 ? '+' : ''}{h.pct.toFixed(1)}%
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

        {!showAll && holdings.length > 12 && (
          <div className="px-6 py-4 border-t border-[#1a4a2e] text-center">
            <button onClick={() => setShowAll(true)} className="text-sm text-[#34d399] hover:underline">
              Show remaining {holdings.length - 12} holdings ↓
            </button>
          </div>
        )}
      </div>

      </div>{/* end max-w container */}
      </div>{/* end scrollable left */}

      {/* Chat panel — side column on desktop, overlay on mobile */}
      {chatStock && (
        <>
          {/* mobile backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={() => setChatStock(null)}
          />
          {/* panel */}
          <div className="fixed right-0 top-14 bottom-0 z-50 lg:static lg:z-auto w-full sm:w-[400px] lg:w-[400px] flex-shrink-0 border-l border-[#1a4a2e]">
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
