'use client'

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts'
import type { EnrichedHolding } from '@/lib/portfolio'

type Props = {
  holdings: EnrichedHolding[]
}

export function TopHoldingsBar({ holdings }: Props) {
  const data = holdings.slice(0, 8).map((h) => ({
    name: shorten(h.scheme_name),
    fullName: h.scheme_name,
    value: h.current_value,
    pnl_pct: h.pnl_pct,
  }))

  return (
    <div className="bg-surface border border-line rounded-xl p-4 shadow-sm">
      <h3 className="text-[10px] uppercase tracking-wider text-fg-muted font-medium mb-2">Top holdings</h3>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="name"
              width={110}
              tick={{ fill: 'var(--fg)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: 'rgba(68, 76, 231, 0.06)' }}
              contentStyle={{
                background: '#ffffff',
                border: '1px solid #c7d7fe',
                borderRadius: 12,
                color: 'var(--fg)',
                boxShadow: '0 4px 12px rgba(31, 35, 91, 0.08)',
              }}
              formatter={(value) => {
                const v = typeof value === 'number' ? value : Number(value)
                return [
                  `₹${v.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
                  'Current value',
                ]
              }}
              labelFormatter={(_, payload) => {
                const p = payload?.[0]?.payload as { fullName?: string } | undefined
                return p?.fullName ?? ''
              }}
            />
            <Bar dataKey="value" radius={[0, 6, 6, 0]}>
              {data.map((d, i) => (
                <Cell key={i} fill={d.pnl_pct >= 0 ? 'var(--success)' : 'var(--danger)'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function shorten(name: string): string {
  if (name.length <= 22) return name
  return name.slice(0, 20) + '…'
}
