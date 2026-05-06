import Link from 'next/link'
import type { PortfolioSummary } from '@/lib/portfolio'
import type { AssetClassSlice } from '@/lib/asset-class'

// CashPanel-style hero: oversized title, two segment "pill cards" with
// gradient fills sized to weight, and a decorative half-arc + Total value
// readout on the right. Lives at the top of /dashboard, replacing the older
// greeting + 3-up summary block.

type Props = {
  firstName: string
  summary: PortfolioSummary
  assetSlices: AssetClassSlice[]
  topSectors: Array<{ label: string; pct: number }>
}

const SEGMENT_THEMES = [
  { label: 'Stock Portfolio', from: 'rgba(248, 113, 113, 0.85)', to: 'rgba(251, 146, 60, 0.85)' },
  { label: 'Mutual Funds', from: 'rgba(96, 165, 250, 0.85)', to: 'rgba(167, 139, 250, 0.85)' },
  { label: 'Gold', from: 'rgba(251, 191, 36, 0.9)', to: 'rgba(251, 146, 60, 0.85)' },
  { label: 'Other', from: 'rgba(148, 163, 184, 0.7)', to: 'rgba(100, 116, 139, 0.6)' },
] as const

function fmtInr(n: number): string {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(2)}cr`
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(2)}L`
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

function buildSegments(slices: AssetClassSlice[]) {
  let stocks = 0
  let mutualFunds = 0
  let gold = 0
  let other = 0
  for (const s of slices) {
    if (s.label === 'Equity') stocks += s.value
    else if (s.label === 'Equity MF' || s.label === 'Hybrid' || s.label === 'International')
      mutualFunds += s.value
    else if (s.label === 'Gold') gold += s.value
    else other += s.value
  }
  return [
    { label: 'Stock Portfolio', value: stocks },
    { label: 'Mutual Funds', value: mutualFunds },
    { label: 'Gold', value: gold },
    { label: 'Other', value: other },
  ].filter((s) => s.value > 0)
}

export function PortfolioHero({ firstName, summary, assetSlices, topSectors }: Props) {
  const segments = buildSegments(assetSlices)
  const total = summary.netWorth
  const isUp = summary.pnl >= 0

  return (
    <section className="relative overflow-hidden rounded-3xl mb-5 px-5 py-5 sm:px-7 sm:py-6 lg:px-9 lg:py-7 bg-gradient-to-br from-accent-soft via-canvas to-accent-soft border border-line">
      {/* Top row: sector tickers + re-upload pill */}
      <div className="flex flex-wrap items-center justify-end gap-2 mb-5">
        {topSectors.slice(0, 3).map((s) => (
          <div
            key={s.label}
            className="flex items-center gap-2 rounded-full bg-surface/80 backdrop-blur border border-line px-2.5 py-1 shadow-sm"
          >
            <span className="text-[11px] text-fg-muted">{s.label}</span>
            <span className="text-[10px] font-semibold text-accent rounded-full bg-accent-soft px-1.5 py-px">
              {s.pct.toFixed(0)}%
            </span>
          </div>
        ))}
        <Link
          href="/dashboard/upload"
          aria-label="Re-upload portfolio"
          className="flex items-center gap-1.5 rounded-full bg-surface/80 backdrop-blur border border-line text-fg-muted hover:text-accent hover:border-accent px-2.5 py-1 shadow-sm transition"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <span className="text-[11px] font-medium">Re-upload</span>
        </Link>
      </div>

      {/* 2-column grid: left = title+pills, right = dome fills the half */}
      <div className="grid lg:grid-cols-2 gap-6 items-center">
        {/* Left */}
        <div>
          <h1 className="text-5xl sm:text-6xl font-semibold tracking-tight text-fg leading-[1.05] mb-3">
            My Portfolio
          </h1>
          <p className="text-sm text-fg-muted mb-5">
            Hi {firstName} — here&apos;s how your money is split today.
          </p>

          <div className="flex flex-col gap-2.5">
            {segments.length === 0 ? (
              <p className="text-sm text-fg-muted">No segments yet.</p>
            ) : (
              segments.map((s, i) => {
                const theme = SEGMENT_THEMES[i % SEGMENT_THEMES.length]
                const pct = total > 0 ? (s.value / total) * 100 : 0
                const fillWidth = Math.max(35, Math.min(75, pct))
                const waveSeed = i * 7 + 11
                return (
                  <div
                    key={s.label}
                    className="relative flex items-center h-12 w-full max-w-[340px] rounded-full bg-surface border border-line shadow-sm overflow-hidden pl-5 pr-4"
                  >
                    <span className="relative z-10 text-[13px] text-fg-muted mr-2 whitespace-nowrap">
                      {s.label}
                    </span>
                    <span className="relative z-10 text-sm font-semibold text-fg whitespace-nowrap">
                      / {fmtInr(s.value)}
                    </span>
                    <span
                      aria-hidden
                      className="absolute right-0 top-0 bottom-0 rounded-r-full overflow-hidden"
                      style={{
                        width: `${fillWidth}%`,
                        background: `linear-gradient(90deg, transparent 0%, ${theme.from} 25%, ${theme.to} 100%)`,
                      }}
                    >
                      <svg
                        viewBox="0 0 200 40"
                        preserveAspectRatio="none"
                        className="absolute inset-0 w-full h-full"
                      >
                        {[8, 14, 20, 26, 32].map((y) => (
                          <path
                            key={y}
                            d={`M -10 ${y} Q ${10 + waveSeed} ${y - 3}, ${50 + waveSeed} ${y} T ${110 + waveSeed} ${y} T ${170 + waveSeed} ${y} T 230 ${y}`}
                            stroke="rgba(255, 255, 255, 0.45)"
                            strokeWidth="1.1"
                            strokeLinecap="round"
                            fill="none"
                          />
                        ))}
                      </svg>
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Right: dome fills the half. Full circle is drawn but only a
            less-than-semi-circle arc is visible — radius 167 with center
            below the chord. Sagitta = 120, well under the radius. */}
        <div className="relative w-full aspect-[320/180] max-h-[280px] mx-auto">
          <svg
            aria-hidden
            viewBox="0 0 320 180"
            preserveAspectRatio="xMidYMid meet"
            className="absolute inset-0 w-full h-full pointer-events-none"
          >
            <defs>
              <linearGradient id="arc-stroke" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="currentColor" stopOpacity="0.1" className="text-accent" />
                <stop offset="50%" stopColor="currentColor" stopOpacity="0.7" className="text-accent" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="0.1" className="text-accent" />
              </linearGradient>
              <linearGradient id="arc-dome" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="currentColor" stopOpacity="0.36" className="text-accent" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="0" className="text-accent" />
              </linearGradient>
            </defs>

            {/* Static dome — radius 167, center (160, 227). Apex at y=60,
                chord at y=180 (viewBox bottom). Sagitta=120 < radius=167
                so the visible curve is clearly less than a semi-circle. */}
            <path d="M 0 180 A 167 167 0 0 1 320 180 Z" fill="url(#arc-dome)" />

            {/* Rotating group: full circle stroke + 5 dots. */}
            <g>
              <animateTransform
                attributeName="transform"
                attributeType="XML"
                type="rotate"
                from="0 160 227"
                to="360 160 227"
                dur="20s"
                repeatCount="indefinite"
              />
              <circle cx="160" cy="227" r="167" fill="none" stroke="url(#arc-stroke)" strokeWidth="1.5" />
              {[-90, -18, 54, 126, 198].map((deg, i) => {
                const rad = (deg * Math.PI) / 180
                const cx = 160 + 167 * Math.cos(rad)
                const cy = 227 + 167 * Math.sin(rad)
                return <circle key={i} cx={cx} cy={cy} r="4" className="fill-accent" />
              })}
            </g>
          </svg>

          {/* Stats inside the dome: Total at top, Invested + Returns below */}
          <div className="absolute inset-x-0 bottom-2 flex flex-col items-center text-center px-3">
            <p className="text-[10px] text-fg-muted">Total portfolio value</p>
            <p className="text-2xl sm:text-3xl font-bold tracking-tight text-fg leading-none mt-0.5">
              ₹{total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </p>
            <div className="mt-2 flex items-stretch divide-x divide-line">
              <div className="px-3 first:pl-0">
                <p className="text-[9px] uppercase tracking-wider text-fg-muted font-medium">Invested</p>
                <p className="text-[11px] font-semibold text-fg leading-tight">
                  ₹{summary.invested.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </p>
              </div>
              <div className="px-3 last:pr-0">
                <p className="text-[9px] uppercase tracking-wider text-fg-muted font-medium">Returns</p>
                <p
                  className="text-[11px] font-semibold leading-tight"
                  style={{ color: isUp ? 'var(--success)' : 'var(--danger)' }}
                >
                  {isUp ? '+' : ''}₹{Math.abs(summary.pnl).toLocaleString('en-IN', { maximumFractionDigits: 0 })}{' '}
                  <span className="text-[10px]">({isUp ? '+' : ''}{summary.pnlPct.toFixed(1)}%)</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
