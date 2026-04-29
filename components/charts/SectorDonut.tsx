'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import type { Allocation, AllocationSlice } from '@/lib/allocation'

const COLORS = [
  '#34d399',
  '#6ee7b7',
  '#059669',
  '#0F6E56',
  '#f5c842',
  '#f59e0b',
  '#fb923c',
  '#60a5fa',
  '#a78bfa',
  '#ef4444',
]

const TOP_N = 8

type Props = {
  allocation: Allocation
  title?: string
}

export function SectorDonut({ allocation, title = 'Sector breakdown' }: Props) {
  const slices = allocation.slices
  const top = slices.slice(0, TOP_N)
  const rest = slices.slice(TOP_N)

  const chartData: AllocationSlice[] =
    rest.length > 0
      ? [
          ...top,
          {
            label: `Other (${rest.length})`,
            value: rest.reduce((s, a) => s + a.value, 0),
            pct: rest.reduce((s, a) => s + a.pct, 0),
            count: rest.reduce((s, a) => s + a.count, 0),
          },
        ]
      : top

  return (
    <div className="bg-[#071a10] border border-[#1a4a2e] rounded-2xl p-6">
      <h3 className="text-sm uppercase tracking-wider text-[#88b098] mb-4">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="label"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={95}
                paddingAngle={2}
                stroke="none"
              >
                {chartData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: '#0c2418',
                  border: '1px solid #1a4a2e',
                  borderRadius: 8,
                  color: '#e4f0e8',
                }}
                formatter={(value, name, item) => {
                  const pct = (item as { payload?: { pct?: number } })?.payload?.pct ?? 0
                  const v = typeof value === 'number' ? value : Number(value)
                  return [
                    `₹${v.toLocaleString('en-IN', { maximumFractionDigits: 0 })} (${pct.toFixed(1)}%)`,
                    String(name),
                  ]
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-2">
          {chartData.map((s, i) => (
            <div key={s.label} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-3 h-3 rounded-sm shrink-0"
                  style={{ background: COLORS[i % COLORS.length] }}
                />
                <span className="text-[#e4f0e8] truncate">{s.label}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-[#4a7a5a] text-xs">{s.count}</span>
                <span className="font-mono text-[#88b098] text-xs w-12 text-right">
                  {s.pct.toFixed(1)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
