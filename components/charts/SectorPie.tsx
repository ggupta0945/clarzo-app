'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import type { Allocation } from '@/lib/allocation'

// Brand-consistent palette: emerald accent + complementary tones that read on
// the dark green dashboard background. Cycles for >8 sectors.
const COLORS = [
  '#34d399',
  '#60a5fa',
  '#fbbf24',
  '#a78bfa',
  '#fb7185',
  '#22d3ee',
  '#f97316',
  '#84cc16',
]

type Props = {
  allocation: Allocation
  title?: string
}

export function SectorPie({ allocation, title = 'Sector breakdown' }: Props) {
  const data = allocation.slices.map((s) => ({ name: s.label, value: s.value, pct: s.pct }))

  return (
    <div className="bg-[#071a10] border border-[#1a4a2e] rounded-2xl p-6">
      <h3 className="text-sm uppercase tracking-wider text-[#88b098] mb-4">{title}</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={90}
              paddingAngle={2}
              stroke="none"
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: '#0c2418',
                border: '1px solid #1a4a2e',
                borderRadius: 8,
                color: '#e6f1ea',
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
      <div className="mt-4 space-y-1.5">
        {allocation.slices.slice(0, 6).map((s, i) => (
          <div key={s.label} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: COLORS[i % COLORS.length] }}
              />
              <span className="truncate text-[#cfe2d6]">{s.label}</span>
            </div>
            <span className="text-[#88b098] font-mono shrink-0 ml-2">{s.pct.toFixed(1)}%</span>
          </div>
        ))}
        {allocation.slices.length > 6 && (
          <div className="text-xs text-[#88b098] pt-1">+{allocation.slices.length - 6} more</div>
        )}
      </div>
    </div>
  )
}
