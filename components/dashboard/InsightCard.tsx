import Link from 'next/link'
import type { Insight } from '@/lib/insights'

const STYLES: Record<
  Insight['severity'],
  { border: string; bg: string; badge: string; label: string }
> = {
  warning: { border: 'var(--warning)', bg: 'var(--warning-soft)', badge: 'var(--warning)', label: 'Heads up' },
  positive: { border: 'var(--success)', bg: 'var(--success-soft)', badge: 'var(--success)', label: 'Win' },
  info: { border: 'var(--line-strong)', bg: 'var(--accent-soft)', badge: 'var(--accent)', label: 'FYI' },
}

export function InsightCard({ insight }: { insight: Insight }) {
  const s = STYLES[insight.severity]
  return (
    <div
      className="bg-surface rounded-xl p-3.5 border shadow-sm"
      style={{ borderColor: s.border }}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span
          className="inline-flex items-center gap-1 text-[9px] uppercase tracking-wider font-semibold rounded px-1.5 py-px"
          style={{ background: s.bg, color: s.badge }}
        >
          <span className="w-1 h-1 rounded-full" style={{ backgroundColor: s.badge }} />
          {s.label}
        </span>
      </div>
      <h4 className="text-sm font-semibold mb-1 text-fg">{insight.title}</h4>
      <p className="text-xs text-fg-muted leading-relaxed">{insight.description}</p>
      {insight.action && (
        <Link
          href={insight.action.href}
          className="inline-block mt-2 text-xs font-medium text-accent hover:underline"
        >
          {insight.action.label} →
        </Link>
      )}
    </div>
  )
}
