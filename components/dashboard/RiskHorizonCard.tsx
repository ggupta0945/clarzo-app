import type { RiskAssessment, RiskBand, HorizonBand } from '@/lib/risk-horizon'

const RISK_COLOR: Record<RiskBand, { bar: string; bg: string; text: string }> = {
  Low: { bar: '#0ea5e9', bg: '#e0f2fe', text: '#0369a1' },
  Moderate: { bar: 'var(--success)', bg: 'var(--success-soft)', text: 'var(--success)' },
  High: { bar: '#f59e0b', bg: 'var(--warning-soft)', text: 'var(--warning)' },
  Aggressive: { bar: 'var(--danger)', bg: 'var(--danger-soft)', text: 'var(--danger)' },
}

const HORIZON_COLOR: Record<HorizonBand, { bar: string; bg: string; text: string }> = {
  'Short term': { bar: '#f59e0b', bg: 'var(--warning-soft)', text: 'var(--warning)' },
  'Medium term': { bar: '#6172f3', bg: 'var(--accent-soft)', text: 'var(--accent)' },
  'Long term': { bar: 'var(--accent)', bg: 'var(--accent-soft)', text: 'var(--accent)' },
}

export function RiskHorizonCard({ assessment }: { assessment: RiskAssessment }) {
  const r = RISK_COLOR[assessment.riskBand]
  const h = HORIZON_COLOR[assessment.horizonBand]
  // Horizon fill: cap at 15y for the bar, so a 10y horizon shows ~67%.
  const horizonPct = Math.min(100, (assessment.horizonYears / 15) * 100)

  return (
    <div className="bg-surface border border-line rounded-xl p-3.5 shadow-sm">
      <h3 className="text-[10px] uppercase tracking-wider text-fg-muted font-medium mb-2.5">
        Risk &amp; horizon
      </h3>

      {/* Risk row */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] text-fg-muted">Risk level</span>
          <span
            className="text-[9px] uppercase tracking-wider font-semibold rounded px-1.5 py-px"
            style={{ background: r.bg, color: r.text }}
          >
            {assessment.riskBand}
          </span>
        </div>
        <div className="relative h-1.5 bg-accent-soft rounded-full overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{ width: `${assessment.riskScore}%`, background: r.bar }}
          />
        </div>
        <div className="flex justify-between mt-0.5">
          <span className="text-[9px] text-fg-subtle">Low</span>
          <span className="text-[9px] text-fg-subtle">Aggressive</span>
        </div>
      </div>

      {/* Horizon row */}
      <div className="mb-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] text-fg-muted">Time horizon</span>
          <span
            className="text-[9px] uppercase tracking-wider font-semibold rounded px-1.5 py-px"
            style={{ background: h.bg, color: h.text }}
          >
            {assessment.horizonBand}
          </span>
        </div>
        <div className="relative h-1.5 bg-accent-soft rounded-full overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{ width: `${horizonPct}%`, background: h.bar }}
          />
        </div>
        <p className="text-[10px] text-fg-muted mt-0.5">
          ~{assessment.horizonYears.toFixed(1)} yrs avg from your goals
        </p>
      </div>

      {assessment.notes.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-1.5 border-t border-line">
          {assessment.notes.slice(0, 3).map((n) => (
            <span
              key={n}
              className="text-[9px] px-1.5 py-px rounded bg-canvas text-fg-muted"
            >
              {n}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
