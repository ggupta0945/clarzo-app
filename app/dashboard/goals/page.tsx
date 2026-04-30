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
    <div className="px-4 py-6 sm:p-10 max-w-4xl mx-auto">
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl text-[#e4f0e8]">
            Goals
          </h1>
          <p className="text-[#88b098] text-sm mt-1">What are you saving for?</p>
        </div>
        {goals.length > 0 && (
          <button
            onClick={() => openAdd()}
            className="bg-[#059669] hover:bg-[#0F6E56] text-white px-4 sm:px-5 py-2 rounded-full text-sm font-medium shrink-0 transition"
          >
            + Add goal
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-[#88b098] text-sm">Loading…</div>
      ) : goals.length === 0 ? (
        <EmptyState onPick={(t) => openAdd(t)} />
      ) : (
        <div className="space-y-3">
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
    <div className="bg-[#071a10] border border-[#1a4a2e] rounded-2xl p-6 sm:p-10">
      <div className="text-center mb-8">
        <div className="text-5xl mb-4">🎯</div>
        <h2
          className="text-2xl text-[#e4f0e8] mb-2"
        >
          What are you saving for?
        </h2>
        <p className="text-[#88b098] text-sm">Pick one to start, or add your own.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {PRESET_GOALS.map((p) => (
          <button
            key={p.title}
            onClick={() => onPick(p.title)}
            className="bg-[#0c2418] hover:bg-[#102e1e] border border-[#1a4a2e] hover:border-[#34d399] rounded-xl p-4 text-center transition"
          >
            <div className="text-2xl mb-2">{p.icon}</div>
            <div className="text-sm text-[#e4f0e8]">{p.title}</div>
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
    <div className="bg-[#071a10] border border-[#1a4a2e] rounded-2xl p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="min-w-0">
          <h3 className="text-lg text-[#e4f0e8] font-medium truncate">{goal.title}</h3>
          <p className="text-sm text-[#88b098] mt-1">
            ₹{goal.target_amount.toLocaleString('en-IN')} by {goal.target_year}{' '}
            <span className="text-[#4a7a5a]">
              ({yearsLeft} year{yearsLeft === 1 ? '' : 's'} away)
            </span>
          </p>
        </div>
        <button
          onClick={onDelete}
          className="text-[#88b098] hover:text-[#ef4444] text-xs shrink-0 transition"
        >
          Remove
        </button>
      </div>

      <Link href={askHref} className="text-sm text-[#34d399] hover:underline">
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
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-[#071a10] border border-[#1a4a2e] rounded-2xl p-6 max-w-md w-full">
        <h2
          className="text-xl text-[#e4f0e8] mb-4"
        >
          New goal
        </h2>

        <div className="space-y-4">
          <Field label="What's the goal?">
            <input
              type="text"
              placeholder="e.g., Buy a house"
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              className="w-full bg-[#040f0a] border border-[#1a4a2e] focus:border-[#34d399] rounded-lg px-4 py-2 text-[#e4f0e8] placeholder-[#4a7a5a] outline-none transition"
            />
          </Field>

          <Field label="Target amount (₹)">
            <input
              type="number"
              placeholder="e.g., 5000000"
              value={draft.target_amount}
              onChange={(e) => setDraft({ ...draft, target_amount: e.target.value })}
              className="w-full bg-[#040f0a] border border-[#1a4a2e] focus:border-[#34d399] rounded-lg px-4 py-2 text-[#e4f0e8] placeholder-[#4a7a5a] outline-none transition"
            />
          </Field>

          <Field label="By which year?">
            <input
              type="number"
              placeholder="e.g., 2030"
              value={draft.target_year}
              onChange={(e) => setDraft({ ...draft, target_year: e.target.value })}
              className="w-full bg-[#040f0a] border border-[#1a4a2e] focus:border-[#34d399] rounded-lg px-4 py-2 text-[#e4f0e8] placeholder-[#4a7a5a] outline-none transition"
            />
          </Field>
        </div>

        {error && <p className="text-sm text-[#f5c842] mt-3">Could not save: {error}</p>}

        <div className="flex gap-3 mt-6">
          <button
            onClick={onSave}
            disabled={saving}
            className="flex-1 bg-[#059669] hover:bg-[#0F6E56] disabled:opacity-50 text-white py-3 rounded-full font-medium transition"
          >
            {saving ? 'Saving…' : 'Save goal'}
          </button>
          <button
            onClick={onCancel}
            disabled={saving}
            className="px-6 border border-[#1a4a2e] hover:bg-[#0c2418] rounded-full text-[#88b098] disabled:opacity-50 transition"
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
      <label className="block text-sm text-[#88b098] mb-2">{label}</label>
      {children}
    </div>
  )
}
