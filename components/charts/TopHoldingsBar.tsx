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
    <div className="bg-[#071a10] border border-[#1a4a2e] rounded-2xl p-6">
      <h3 className="text-sm uppercase tracking-wider text-[#88b098] mb-4">Top holdings</h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="name"
              width={120}
              tick={{ fill: '#cfe2d6', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: 'rgba(52, 211, 153, 0.05)' }}
              contentStyle={{
                background: '#0c2418',
                border: '1px solid #1a4a2e',
                borderRadius: 8,
                color: '#e6f1ea',
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
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {data.map((d, i) => (
                <Cell key={i} fill={d.pnl_pct >= 0 ? '#34d399' : '#ef4444'} />
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
