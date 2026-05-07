'use client'

import { useMemo, useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import type { NavPoint } from '@/lib/mutual-funds/types'

type Range = '1m' | '3m' | '6m' | '1y' | '3y' | '5y' | 'all'

type Props = {
  series: NavPoint[]    // ascending by date (full history or windowed by parent)
  initialRange?: Range
}

const RANGES: Array<{ key: Range; label: string }> = [
  { key: '1m', label: '1M' },
  { key: '3m', label: '3M' },
  { key: '6m', label: '6M' },
  { key: '1y', label: '1Y' },
  { key: '3y', label: '3Y' },
  { key: '5y', label: '5Y' },
  { key: 'all', label: 'All' },
]

function clip(series: NavPoint[], range: Range): NavPoint[] {
  if (range === 'all' || series.length === 0) return series
  const months = range === '1m' ? 1 : range === '3m' ? 3 : range === '6m' ? 6 : range === '1y' ? 12 : range === '3y' ? 36 : 60
  const cutoff = new Date()
  cutoff.setMonth(cutoff.getMonth() - months)
  const iso = cutoff.toISOString().slice(0, 10)
  return series.filter((p) => p.nav_date >= iso)
}

export function NavChart({ series, initialRange = '1y' }: Props) {
  const [range, setRange] = useState<Range>(initialRange)

  const data = useMemo(() => clip(series, range), [series, range])

  const stats = useMemo(() => {
    if (data.length < 2) return null
    const first = data[0].nav
    const last = data[data.length - 1].nav
    const change = last - first
    const pct = (change / first) * 100
    return { first, last, change, pct }
  }, [data])

  return (
    <div className="bg-surface border border-line rounded-xl p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
        <div>
          <h3 className="text-[10px] uppercase tracking-wider text-fg-muted font-medium">NAV history</h3>
          {stats && (
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-semibold text-fg tabular-nums">
                ₹{stats.last.toLocaleString('en-IN', { maximumFractionDigits: 4 })}
              </span>
              <span className={`text-xs font-medium tabular-nums ${stats.pct >= 0 ? 'text-success' : 'text-danger'}`}>
                {stats.pct >= 0 ? '+' : ''}
                {stats.pct.toFixed(2)}%
                <span className="text-fg-subtle"> · {RANGES.find((r) => r.key === range)?.label}</span>
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 rounded-full bg-canvas border border-line p-0.5">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`px-2.5 py-1 text-[11px] rounded-full transition ${
                range === r.key
                  ? 'bg-surface text-fg font-medium shadow-sm ring-1 ring-line'
                  : 'text-fg-muted hover:text-fg'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-64">
        {data.length < 2 ? (
          <div className="h-full flex items-center justify-center text-sm text-fg-muted">
            Not enough NAV history to chart this range.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="navfill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="nav_date"
                tick={{ fill: 'var(--fg-muted)', fontSize: 10 }}
                tickFormatter={(d: string) => {
                  const dt = new Date(d)
                  return dt.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
                }}
                minTickGap={30}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={['dataMin', 'dataMax']}
                tick={{ fill: 'var(--fg-muted)', fontSize: 10 }}
                tickFormatter={(v: number) => v.toFixed(0)}
                axisLine={false}
                tickLine={false}
                width={48}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--surface)',
                  border: '1px solid var(--line)',
                  borderRadius: 12,
                  color: 'var(--fg)',
                  fontSize: 12,
                }}
                labelFormatter={(d) => new Date(d as string).toLocaleDateString('en-IN', {
                  day: 'numeric', month: 'short', year: 'numeric',
                })}
                formatter={(v) => [`₹${Number(v).toFixed(4)}`, 'NAV']}
              />
              <Area
                type="monotone"
                dataKey="nav"
                stroke="var(--accent)"
                strokeWidth={2}
                fill="url(#navfill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
