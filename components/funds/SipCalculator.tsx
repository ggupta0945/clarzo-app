'use client'

// Inline SIP & lumpsum calculator on the fund detail page. Uses the fund's
// own historical CAGR (3Y default) as the projected return — caveats noted
// in copy below.

import { useMemo, useState } from 'react'
import { sipProjection, lumpsumProjection } from '@/lib/mutual-funds/returns'
import { fmtRupee } from '@/lib/mutual-funds/format'

type Props = {
  defaultReturn: number  // % annual
}

type Mode = 'sip' | 'lumpsum'

export function SipCalculator({ defaultReturn }: Props) {
  const [mode, setMode] = useState<Mode>('sip')
  const [amount, setAmount] = useState(10_000)
  const [years, setYears] = useState(10)
  const [rate, setRate] = useState(Math.max(6, Math.min(25, Math.round(defaultReturn * 10) / 10 || 12)))

  const projection = useMemo(() => {
    if (mode === 'sip') return sipProjection(amount, years, rate)
    return lumpsumProjection(amount, years, rate)
  }, [mode, amount, years, rate])

  return (
    <div className="bg-surface border border-line rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-fg">Project your investment</h3>
        <div className="flex items-center gap-1 rounded-full bg-canvas border border-line p-0.5">
          {(['sip', 'lumpsum'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-2.5 py-1 text-[11px] rounded-full transition capitalize ${
                m === mode
                  ? 'bg-surface text-fg font-medium shadow-sm ring-1 ring-line'
                  : 'text-fg-muted hover:text-fg'
              }`}
            >
              {m === 'sip' ? 'SIP' : 'Lumpsum'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <Field
          label={mode === 'sip' ? 'Monthly amount' : 'Lumpsum amount'}
          value={amount}
          onChange={setAmount}
          min={500}
          max={1_00_00_000}
          step={500}
          format={(v) => fmtRupee(v)}
        />
        <Field
          label="Period (years)"
          value={years}
          onChange={setYears}
          min={1}
          max={40}
          step={1}
          format={(v) => `${v} yrs`}
        />
        <Field
          label="Expected return"
          value={rate}
          onChange={setRate}
          min={1}
          max={30}
          step={0.5}
          format={(v) => `${v.toFixed(1)}%`}
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Stat label="Invested" value={fmtRupee(projection.invested)} />
        <Stat label="Future value" value={fmtRupee(projection.future_value)} accent />
        <Stat label="Gain" value={fmtRupee(projection.gain)} tone="success" />
      </div>

      <p className="text-[10px] text-fg-subtle mt-3 leading-relaxed">
        Projection assumes a constant {rate.toFixed(1)}% annual return. Default seeded from this fund&apos;s 3Y CAGR. Real-world outcomes will fluctuate; this is not advice.
      </p>
    </div>
  )
}

function Field({
  label, value, onChange, min, max, step, format,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step: number
  format: (v: number) => string
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] uppercase tracking-wider text-fg-muted font-medium">{label}</span>
        <span className="text-xs font-medium text-fg tabular-nums">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--accent)] cursor-pointer"
      />
    </div>
  )
}

function Stat({ label, value, accent, tone }: { label: string; value: string; accent?: boolean; tone?: 'success' }) {
  const cls = accent ? 'text-accent' : tone === 'success' ? 'text-success' : 'text-fg'
  return (
    <div className="bg-canvas rounded-lg border border-line px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-wider text-fg-muted font-medium">{label}</div>
      <div className={`text-base font-semibold tabular-nums mt-0.5 ${cls}`}>{value}</div>
    </div>
  )
}
