'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import type { Allocation, AllocationSlice } from '@/lib/allocation'

const COLORS = [
  'var(--accent)',
  '#6172f3',
  '#8098f9',
  '#a4bcfd',
  'var(--success)',
  '#f5c842',
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
    <div className="bg-surface border border-line rounded-xl p-4 shadow-sm">
      <h3 className="text-[10px] uppercase tracking-wider text-fg-muted font-medium mb-2">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="label"
                cx="50%"
                cy="50%"
                innerRadius={42}
                outerRadius={72}
                paddingAngle={2}
                stroke="none"
              >
                {chartData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: '#ffffff',
                  border: '1px solid #c7d7fe',
                  borderRadius: 12,
                  color: 'var(--fg)',
                  boxShadow: '0 4px 12px rgba(31, 35, 91, 0.08)',
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
        <div className="space-y-1.5">
          {chartData.map((s, i) => (
            <div key={s.label} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-sm shrink-0"
                  style={{ background: COLORS[i % COLORS.length] }}
                />
                <span className="text-fg truncate">{s.label}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-fg-subtle text-[11px]">{s.count}</span>
                <span className="text-fg-muted text-[11px] w-10 text-right font-medium">
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
