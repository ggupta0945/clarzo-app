'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { captureEvent } from '@/lib/analytics/client'

type Goal = {
  id: string
  title: string
  target_amount: number
  target_year: number
}

const PRESET_GOALS = [
  { title: 'Buy a house', icon: '🏠' },
  { title: "Kids' education", icon: '🎓' },
  { title: 'Retirement', icon: '🏖️' },
  { title: 'Buy a car', icon: '🚗' },
  { title: 'Wedding', icon: '💍' },
  { title: 'Travel fund', icon: '✈️' },
]

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [draft, setDraft] = useState({ title: '', target_amount: '', target_year: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void loadGoals()
  }, [])

  async function loadGoals() {
    setLoading(true)
    try {
      const res = await fetch('/api/goals')
      const data = await res.json()
      setGoals(data.goals ?? [])
    } catch {
      // Stay quiet; empty state covers the failure case visually.
    } finally {
      setLoading(false)
    }
  }

  function openAdd(presetTitle = '') {
    setDraft({ title: presetTitle, target_amount: '', target_year: '' })
    setError(null)
    setShowAdd(true)
  }

  async function saveGoal() {
    if (!draft.title.trim() || !draft.target_amount || !draft.target_year) {
      setError('Fill in all three fields.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: draft.title.trim(),
          target_amount: Number(draft.target_amount),
          target_year: Number(draft.target_year),
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error ?? 'save_failed')
      }
      captureEvent('goal_created', {
        preset: PRESET_GOALS.some((goal) => goal.title === draft.title.trim()),
      })
      setShowAdd(false)
      await loadGoals()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'save_failed')
    } finally {
      setSaving(false)
    }
  }

  async function deleteGoal(id: string) {
    if (!confirm('Remove this goal?')) return
    await fetch(`/api/goals?id=${id}`, { method: 'DELETE' })
    await loadGoals()
  }

  return (
    <div className="px-4 py-4 sm:p-8 max-w-4xl mx-auto">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="text-xl font-semibold text-fg">Goals</h1>
          <p className="text-fg-muted text-xs mt-0.5">What are you saving for?</p>
        </div>
        {goals.length > 0 && (
          <button
            onClick={() => openAdd()}
            className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg text-sm font-medium shrink-0 transition shadow-sm"
          >
            + Add goal
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-fg-muted text-xs">Loading…</div>
      ) : goals.length === 0 ? (
        <EmptyState onPick={(t) => openAdd(t)} />
      ) : (
        <div className="space-y-2.5">
          {goals.map((g) => (
            <GoalCard key={g.id} goal={g} onDelete={() => deleteGoal(g.id)} />
          ))}
        </div>
      )}

      {showAdd && (
        <AddGoalModal
          draft={draft}
          setDraft={setDraft}
          onCancel={() => setShowAdd(false)}
          onSave={saveGoal}
          saving={saving}
          error={error}
        />
      )}
    </div>
  )
}

function EmptyState({ onPick }: { onPick: (title: string) => void }) {
  return (
    <div className="bg-surface border border-line rounded-xl p-5 sm:p-8 shadow-sm">
      <div className="text-center mb-6">
        <div className="text-4xl mb-3">🎯</div>
        <h2 className="text-lg font-semibold text-fg mb-1">
          What are you saving for?
        </h2>
        <p className="text-fg-muted text-xs">Pick one to start, or add your own.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {PRESET_GOALS.map((p) => (
          <button
            key={p.title}
            onClick={() => onPick(p.title)}
            className="bg-canvas hover:bg-accent-soft border border-line hover:border-accent rounded-xl p-3 text-center transition"
          >
            <div className="text-2xl mb-1.5">{p.icon}</div>
            <div className="text-xs font-medium text-fg">{p.title}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

function GoalCard({ goal, onDelete }: { goal: Goal; onDelete: () => void }) {
  const yearsLeft = Math.max(0, goal.target_year - new Date().getFullYear())
  const askHref = `/dashboard/ask?q=${encodeURIComponent(
    `Am I on track for my ${goal.title} goal? I want ₹${goal.target_amount} by ${goal.target_year}.`,
  )}`

  return (
    <div className="bg-surface border border-line rounded-xl p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <h3 className="text-sm text-fg font-semibold truncate">{goal.title}</h3>
          <p className="text-xs text-fg-muted mt-0.5">
            ₹{goal.target_amount.toLocaleString('en-IN')} by {goal.target_year}{' '}
            <span className="text-fg-subtle">
              ({yearsLeft} year{yearsLeft === 1 ? '' : 's'} away)
            </span>
          </p>
        </div>
        <button
          onClick={onDelete}
          className="text-fg-muted hover:text-danger text-[11px] font-medium shrink-0 transition"
        >
          Remove
        </button>
      </div>

      <Link href={askHref} className="text-xs font-medium text-accent hover:underline">
        Ask Clarzo about this goal →
      </Link>
    </div>
  )
}

function AddGoalModal({
  draft,
  setDraft,
  onCancel,
  onSave,
  saving,
  error,
}: {
  draft: { title: string; target_amount: string; target_year: string }
  setDraft: (d: { title: string; target_amount: string; target_year: string }) => void
  onCancel: () => void
  onSave: () => void
  saving: boolean
  error: string | null
}) {
  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-surface border border-line rounded-2xl p-5 max-w-md w-full shadow-xl">
        <h2 className="text-lg font-semibold text-fg mb-4">New goal</h2>

        <div className="space-y-3">
          <Field label="What's the goal?">
            <input
              type="text"
              placeholder="e.g., Buy a house"
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              className="w-full bg-surface border border-line-strong focus:border-accent rounded-lg px-3 py-2 text-sm text-fg placeholder-fg-subtle outline-none transition"
            />
          </Field>

          <Field label="Target amount (₹)">
            <input
              type="number"
              placeholder="e.g., 5000000"
              value={draft.target_amount}
              onChange={(e) => setDraft({ ...draft, target_amount: e.target.value })}
              className="w-full bg-surface border border-line-strong focus:border-accent rounded-lg px-3 py-2 text-sm text-fg placeholder-fg-subtle outline-none transition"
            />
          </Field>

          <Field label="By which year?">
            <input
              type="number"
              placeholder="e.g., 2030"
              value={draft.target_year}
              onChange={(e) => setDraft({ ...draft, target_year: e.target.value })}
              className="w-full bg-surface border border-line-strong focus:border-accent rounded-lg px-3 py-2 text-sm text-fg placeholder-fg-subtle outline-none transition"
            />
          </Field>
        </div>

        {error && <p className="text-xs text-danger mt-3">Could not save: {error}</p>}

        <div className="flex gap-2 mt-5">
          <button
            onClick={onSave}
            disabled={saving}
            className="flex-1 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-medium transition shadow-sm"
          >
            {saving ? 'Saving…' : 'Save goal'}
          </button>
          <button
            onClick={onCancel}
            disabled={saving}
            className="px-5 border border-line-strong hover:bg-canvas rounded-lg text-sm text-fg-muted disabled:opacity-50 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-fg mb-1.5">{label}</label>
      {children}
    </div>
  )
}
