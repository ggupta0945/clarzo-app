'use client'

import { useState } from 'react'
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'
import type { NiftyData, NiftyRange } from '@/lib/nifty-data'

const RANGES: Array<{ label: string; value: NiftyRange }> = [
  { label: '1M', value: '1mo' },
  { label: '3M', value: '3mo' },
  { label: '6M', value: '6mo' },
  { label: '1Y', value: '1y' },
]

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

function fmtMonth(unix: number): string {
  const d = new Date(unix * 1000)
  return MONTHS[d.getMonth()]
}

function fmtDate(unix: number): string {
  const d = new Date(unix * 1000)
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

function fmtPrice(n: number): string {
  return n.toLocaleString('en-IN', { maximumFractionDigits: 2 })
}

export function NiftyChart({ initialData }: { initialData: NiftyData | null }) {
  const [data, setData] = useState<NiftyData | null>(initialData)
  const [range, setRange] = useState<NiftyRange>(initialData?.range ?? '6mo')
  const [loading, setLoading] = useState(false)

  function changeRange(next: NiftyRange) {
    if (next === range) return
    setRange(next)
    setLoading(true)
    fetch(`/api/nifty-chart?range=${next}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) setData(d)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  if (!data || data.points.length === 0) {
    return (
      <div className="bg-surface border border-line rounded-2xl p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-fg">Nifty 50</h3>
        <p className="text-xs text-fg-muted mt-2">Could not load Nifty data.</p>
      </div>
    )
  }

  const isUp = data.change >= 0
  const stroke = isUp ? 'var(--success)' : 'var(--danger)'

  return (
    <div className="bg-surface border border-line rounded-2xl p-4 shadow-sm flex flex-col h-full">
      {/* Header: title + current value + change */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-accent-soft text-accent shrink-0">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 3v18h18" />
                <path d="M7 14l4-4 3 3 5-6" />
              </svg>
            </span>
            <h3 className="text-sm font-semibold text-fg">Nifty 50</h3>
            <span className="text-[9px] uppercase tracking-wider text-fg-subtle font-medium bg-canvas border border-line rounded px-1.5 py-px">
              ^NSEI
            </span>
          </div>
          <p className="text-[10px] text-fg-muted mt-0.5">
            India&apos;s benchmark · {data.points.length}d
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-lg font-bold tracking-tight text-fg leading-tight">
            {fmtPrice(data.current ?? 0)}
          </p>
          <p className="text-[11px] font-semibold mt-0.5" style={{ color: stroke }}>
            {isUp ? '+' : ''}
            {fmtPrice(data.change)} ({isUp ? '+' : ''}
            {data.changePct.toFixed(2)}%)
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-[200px] -mx-1 relative">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-surface/60 rounded">
            <div className="flex space-x-1">
              {[0, 150, 300].map((d) => (
                <span
                  key={d}
                  className="w-1.5 h-1.5 rounded-full animate-bounce bg-accent"
                  style={{ animationDelay: `${d}ms` }}
                />
              ))}
            </div>
          </div>
        )}
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data.points}
            margin={{ top: 6, right: 8, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="nifty-area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={stroke} stopOpacity={0.28} />
                <stop offset="100%" stopColor={stroke} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="t"
              tickFormatter={fmtMonth}
              tick={{ fill: 'var(--fg-muted)', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              minTickGap={40}
              interval="preserveStartEnd"
            />
            <YAxis
              orientation="right"
              domain={['dataMin - 100', 'dataMax + 100']}
              tick={{ fill: 'var(--fg-muted)', fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) =>
                Number(v).toLocaleString('en-IN', { maximumFractionDigits: 0 })
              }
              width={48}
            />
            <Tooltip
              cursor={{ stroke: 'var(--line-strong)', strokeWidth: 1, strokeDasharray: '3 3' }}
              content={<ChartTooltip />}
            />
            <Area
              type="monotone"
              dataKey="close"
              stroke={stroke}
              strokeWidth={2}
              fill="url(#nifty-area)"
              dot={false}
              activeDot={{ r: 4, fill: stroke, stroke: 'var(--surface)', strokeWidth: 2 }}
              animationDuration={400}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Range pills */}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-1 rounded-full bg-canvas border border-line p-0.5">
          {RANGES.map((r) => {
            const active = r.value === range
            return (
              <button
                key={r.value}
                onClick={() => changeRange(r.value)}
                disabled={loading}
                className={`text-[11px] font-medium px-3 py-1 rounded-full transition disabled:opacity-50 ${
                  active
                    ? 'bg-surface text-fg shadow-sm ring-1 ring-line'
                    : 'text-fg-muted hover:text-fg'
                }`}
              >
                {r.label}
              </button>
            )
          })}
        </div>
        <p className="text-[10px] text-fg-subtle">via Yahoo Finance</p>
      </div>
    </div>
  )
}

type TooltipPayload = {
  value?: number | string
  payload?: { t?: number; close?: number }
}

function ChartTooltip(props: {
  active?: boolean
  payload?: TooltipPayload[]
  label?: number | string
}) {
  const { active, payload, label } = props
  if (!active || !payload || payload.length === 0) return null
  const point = payload[0]
  const close =
    typeof point.value === 'number' ? point.value : Number(point.value ?? 0)
  return (
    <div className="bg-surface border border-line rounded-lg px-2.5 py-1.5 shadow-lg text-xs">
      <p className="text-[10px] text-fg-muted">{fmtDate(Number(label))}</p>
      <p className="text-fg font-semibold mt-0.5">
        {close.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
      </p>
    </div>
  )
}
