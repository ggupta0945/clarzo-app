import Link from 'next/link'
import type { Insight } from '@/lib/insights'

const STYLES: Record<Insight['severity'], { border: string; badge: string; label: string }> = {
  warning: { border: '#7a4a1f', badge: '#f5c842', label: 'Heads up' },
  positive: { border: '#1a4a2e', badge: '#34d399', label: 'Win' },
  info: { border: '#1a4a2e', badge: '#60a5fa', label: 'FYI' },
}

export function InsightCard({ insight }: { insight: Insight }) {
  const s = STYLES[insight.severity]
  return (
    <div
      className="bg-[#071a10] rounded-2xl p-5 border"
      style={{ borderColor: s.border }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.badge }} />
        <span className="text-xs uppercase tracking-wider" style={{ color: s.badge }}>
          {s.label}
        </span>
      </div>
      <h4 className="text-base font-medium mb-1.5 text-[#e6f1ea]">{insight.title}</h4>
      <p className="text-sm text-[#88b098] leading-relaxed">{insight.description}</p>
      {insight.action && (
        <Link
          href={insight.action.href}
          className="inline-block mt-3 text-sm text-[#34d399] hover:underline"
        >
          {insight.action.label} →
        </Link>
      )}
    </div>
  )
}
