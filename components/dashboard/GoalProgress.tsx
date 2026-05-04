import Link from 'next/link'
import type { Goal } from '@/lib/goals'
import { projectGoal } from '@/lib/goal-projection'

const STATUS_COLOR = {
  on_track: { bg: 'var(--accent-soft)', text: 'var(--accent)', label: 'On track' },
  ahead: { bg: 'var(--success-soft)', text: 'var(--success)', label: 'Ahead' },
  behind: { bg: 'var(--danger-soft)', text: 'var(--danger)', label: 'Behind' },
} as const

function fmtInr(n: number): string {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(1)}cr`
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(1)}L`
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

export function GoalProgress({
  goals,
  currentValue,
}: {
  goals: Goal[]
  currentValue: number
}) {
  if (goals.length === 0) {
    return (
      <div className="bg-surface border border-line rounded-xl p-3.5 shadow-sm">
        <h3 className="text-[10px] uppercase tracking-wider text-fg-muted font-medium mb-2">
          Goals
        </h3>
        <p className="text-xs text-fg-muted mb-2">No goals set yet.</p>
        <Link
          href="/dashboard/goals"
          className="text-xs font-medium text-accent hover:underline"
        >
          Set your first goal →
        </Link>
      </div>
    )
  }

  const top = goals.slice(0, 3)

  return (
    <div className="bg-surface border border-line rounded-xl p-3.5 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[10px] uppercase tracking-wider text-fg-muted font-medium">
          Goal progress
        </h3>
        <Link
          href="/dashboard/goals"
          className="text-[10px] font-medium text-accent hover:underline"
        >
          View all
        </Link>
      </div>

      <div className="space-y-2.5">
        {top.map((g) => {
          const projection = projectGoal(currentValue, g.target_amount, g.target_year)
          const pct = Math.min(100, (projection.futureValue / g.target_amount) * 100)
          const status = STATUS_COLOR[projection.status]
          return (
            <div key={g.id}>
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className="text-xs font-medium text-fg truncate">{g.title}</p>
                <span
                  className="text-[9px] uppercase tracking-wider font-semibold rounded px-1.5 py-px shrink-0"
                  style={{ background: status.bg, color: status.text }}
                >
                  {status.label}
                </span>
              </div>
              <div className="h-1.5 bg-accent-soft rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${pct}%`, background: status.text }}
                />
              </div>
              <div className="flex items-center justify-between mt-0.5">
                <p className="text-[10px] text-fg-muted">
                  Target {fmtInr(g.target_amount)} · {g.target_year}
                </p>
                <p className="text-[10px] text-fg-muted">{pct.toFixed(0)}%</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
