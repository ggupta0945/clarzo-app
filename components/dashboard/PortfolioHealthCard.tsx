import type { HealthScore } from '@/lib/portfolio-health'

const BAND_COLOR: Record<HealthScore['band'], { bg: string; text: string; ring: string }> = {
  Excellent: { bg: 'var(--success-soft)', text: 'var(--success)', ring: 'var(--success)' },
  Good: { bg: 'var(--accent-soft)', text: 'var(--accent)', ring: '#6172f3' },
  Fair: { bg: 'var(--warning-soft)', text: 'var(--warning)', ring: '#f59e0b' },
  'Needs work': { bg: 'var(--danger-soft)', text: 'var(--danger)', ring: '#f87171' },
}

export function PortfolioHealthCard({ health }: { health: HealthScore }) {
  const c = BAND_COLOR[health.band]
  // Stroke-dasharray ring: circumference = 2πr, here r=22 → ~138.23
  const r = 22
  const circumference = 2 * Math.PI * r
  const offset = circumference - (health.score / 100) * circumference

  return (
    <div className="bg-surface border border-line rounded-xl p-3.5 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[10px] uppercase tracking-wider text-fg-muted font-medium">
          Portfolio health
        </h3>
        <span
          className="text-[9px] uppercase tracking-wider font-semibold rounded px-1.5 py-px"
          style={{ background: c.bg, color: c.text }}
        >
          {health.band}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          <svg width="56" height="56" viewBox="0 0 56 56">
            <circle cx="28" cy="28" r={r} stroke="#e0eaff" strokeWidth="4" fill="none" />
            <circle
              cx="28"
              cy="28"
              r={r}
              stroke={c.ring}
              strokeWidth="4"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              transform="rotate(-90 28 28)"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-base font-bold text-fg">{health.score}</span>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-fg font-medium leading-snug">{health.headline}</p>
          {health.factors.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {health.factors.slice(0, 3).map((f) => (
                <span
                  key={f.label}
                  className="text-[9px] px-1.5 py-px rounded font-medium"
                  style={{
                    background: f.positive ? 'var(--success-soft)' : 'var(--danger-soft)',
                    color: f.positive ? 'var(--success)' : 'var(--danger)',
                  }}
                >
                  {f.positive ? '+' : ''}
                  {f.delta} {f.label}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
