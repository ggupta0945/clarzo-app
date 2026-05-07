// Surfaces detected change events for a scheme — fund manager change,
// category reclassification, name change, AMC change. Empty state is
// reassuring (no news = no churn).

import type { MfAlert } from '@/lib/mutual-funds/types'
import { relativeTime } from '@/lib/mutual-funds/format'

type Props = {
  alerts: MfAlert[]
}

const TYPE_META: Record<MfAlert['alert_type'], { label: string; tone: string }> = {
  manager_change: { label: 'Fund manager change', tone: 'text-amber-600 bg-amber-50 border-amber-200' },
  category_change: { label: 'SEBI category reclassified', tone: 'text-purple-600 bg-purple-50 border-purple-200' },
  name_change: { label: 'Scheme renamed', tone: 'text-blue-600 bg-blue-50 border-blue-200' },
  objective_change: { label: 'Investment objective updated', tone: 'text-purple-600 bg-purple-50 border-purple-200' },
  asset_mix_shift: { label: 'Asset allocation shifted', tone: 'text-amber-600 bg-amber-50 border-amber-200' },
  amc_change: { label: 'AMC change', tone: 'text-red-600 bg-red-50 border-red-200' },
}

export function SchemeAlertsList({ alerts }: Props) {
  return (
    <div className="bg-surface border border-line rounded-xl shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-line flex items-center justify-between">
        <h3 className="text-sm font-semibold text-fg">Change history</h3>
        <span className="text-[10px] text-fg-subtle">tracked nightly</span>
      </div>
      {alerts.length === 0 ? (
        <div className="px-4 py-6 text-sm text-fg-muted">
          No changes detected. We&apos;ll flag it here when the fund manager, category, name, or asset mix shifts.
        </div>
      ) : (
        <ul className="divide-y divide-[var(--line)]">
          {alerts.map((a) => {
            const meta = TYPE_META[a.alert_type]
            return (
              <li key={a.id} className="px-4 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] uppercase tracking-wider font-medium border rounded-full px-2 py-0.5 ${meta.tone}`}>
                    {meta.label}
                  </span>
                  <span className="text-[10px] text-fg-subtle">{relativeTime(a.detected_at)}</span>
                </div>
                {a.message && <p className="text-sm text-fg leading-snug">{a.message}</p>}
                {(a.prev_value || a.new_value) && (
                  <div className="text-[11px] text-fg-muted mt-1 leading-relaxed">
                    {a.prev_value && <span>From: <span className="text-fg">{a.prev_value}</span></span>}
                    {a.prev_value && a.new_value && <span> → </span>}
                    {a.new_value && <span>To: <span className="text-fg">{a.new_value}</span></span>}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
