'use client'

import { useEffect, useState } from 'react'

type Member = { id: string; user_id: string; name: string; relationship: string; is_owner: boolean; created_at: string }
type Invite = { id: string; invitee_email: string; relationship: string; status: string; created_at: string }
type MemberSummary = { user_id: string; name: string; isSelf: boolean; summary: { netWorth: number; invested: number; pnl: number; pnlPct: number; count: number } }

const RELATIONSHIP_OPTIONS = ['Spouse', 'Parent', 'Child', 'Sibling', 'Other']

function fmt(n: number) { return Math.abs(n).toLocaleString('en-IN', { maximumFractionDigits: 0 }) }

export default function FamilyPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [portfolios, setPortfolios] = useState<MemberSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [form, setForm] = useState({ email: '', relationship: 'Spouse' })
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => { void loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [m, i, p] = await Promise.all([
      fetch('/api/family/members').then((r) => r.json()),
      fetch('/api/family/invite').then((r) => r.json()),
      fetch('/api/family/holdings').then((r) => r.json()),
    ])
    setMembers(m.members ?? [])
    setInvites(i.invites ?? [])
    setPortfolios(p.members ?? [])
    setLoading(false)
  }

  async function sendInvite() {
    if (!form.email) { setError('Email is required.'); return }
    setSending(true); setError(null)
    const res = await fetch('/api/family/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Failed to send invite.'); setSending(false); return }
    setSuccess(`Invite sent to ${form.email}`)
    setShowInvite(false)
    setForm({ email: '', relationship: 'Spouse' })
    setSending(false)
    await loadAll()
  }

  async function removeMember(id: string) {
    if (!confirm('Remove this family member?')) return
    await fetch('/api/family/members', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    await loadAll()
  }

  async function cancelInvite(id: string) {
    await fetch('/api/family/invite', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    await loadAll()
  }

  const totalNetWorth = portfolios.reduce((s, p) => s + p.summary.netWorth, 0)
  const totalInvested = portfolios.reduce((s, p) => s + p.summary.invested, 0)
  const totalPnl = portfolios.reduce((s, p) => s + p.summary.pnl, 0)

  return (
    <div className="px-4 py-4 sm:p-8 max-w-4xl mx-auto">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="text-xl font-semibold text-fg">Family Portfolio</h1>
          <p className="text-xs text-fg-muted mt-0.5">
            View your combined financial picture with family members.
          </p>
        </div>
        <button
          onClick={() => { setShowInvite(true); setError(null); setSuccess(null) }}
          className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg text-sm font-medium shrink-0 transition shadow-sm"
        >
          + Invite member
        </button>
      </div>

      {success && (
        <div className="mb-4 rounded-xl bg-success-soft border border-success/30 px-4 py-2.5 text-xs text-success">
          {success}
        </div>
      )}

      {/* Aggregate stats */}
      {portfolios.length > 1 && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: 'Combined Net Worth', value: `₹${fmt(totalNetWorth)}` },
            { label: 'Total Invested', value: `₹${fmt(totalInvested)}` },
            { label: 'Combined P&L', value: `${totalPnl >= 0 ? '+' : '−'}₹${fmt(Math.abs(totalPnl))}`, color: totalPnl >= 0 ? 'text-success' : 'text-danger' },
          ].map((s) => (
            <div key={s.label} className="bg-surface border border-line rounded-xl p-4 shadow-sm">
              <p className="text-[10px] uppercase tracking-wider text-fg-muted">{s.label}</p>
              <p className={`text-lg font-semibold mt-1 ${s.color ?? 'text-fg'}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <p className="text-xs text-fg-muted">Loading…</p>
      ) : portfolios.length === 0 ? (
        <EmptyState onInvite={() => setShowInvite(true)} />
      ) : (
        <div className="space-y-3 mb-6">
          {portfolios.map((p) => {
            const member = members.find((m) => m.user_id === p.user_id)
            return (
              <div key={p.user_id} className="bg-surface border border-line rounded-xl p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent font-semibold text-sm">
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-fg">
                        {p.name} {p.isSelf && <span className="text-[11px] text-fg-muted font-normal">(you)</span>}
                      </p>
                      {member && <p className="text-[11px] text-fg-muted">{member.relationship}</p>}
                    </div>
                  </div>
                  {!p.isSelf && member && (
                    <button onClick={() => removeMember(member.id)} className="text-[11px] text-fg-muted hover:text-danger transition">
                      Remove
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-3 mt-3">
                  <Stat label="Net Worth" value={`₹${fmt(p.summary.netWorth)}`} />
                  <Stat label="Invested" value={`₹${fmt(p.summary.invested)}`} />
                  <Stat
                    label="P&L"
                    value={`${p.summary.pnl >= 0 ? '+' : '−'}₹${fmt(Math.abs(p.summary.pnl))}`}
                    color={p.summary.pnl >= 0 ? 'text-success' : 'text-danger'}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pending invites */}
      {invites.filter((i) => i.status === 'pending').length > 0 && (
        <div>
          <h2 className="text-xs font-medium text-fg-muted uppercase tracking-wider mb-2">Pending invites</h2>
          <div className="space-y-2">
            {invites.filter((i) => i.status === 'pending').map((inv) => (
              <div key={inv.id} className="flex items-center justify-between bg-surface border border-line rounded-xl px-4 py-3 shadow-sm">
                <div>
                  <p className="text-xs font-medium text-fg">{inv.invitee_email}</p>
                  <p className="text-[11px] text-fg-muted mt-0.5">{inv.relationship} · Awaiting acceptance</p>
                </div>
                <button onClick={() => cancelInvite(inv.id)} className="text-[11px] text-fg-muted hover:text-danger transition">
                  Cancel
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite modal */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-surface border border-line rounded-2xl p-6 max-w-md w-full shadow-xl">
            <h2 className="text-base font-semibold text-fg mb-4">Invite a family member</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-fg mb-1.5">Their email address</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="e.g., spouse@gmail.com"
                  className="w-full bg-canvas border border-line-strong focus:border-accent rounded-lg px-3 py-2 text-sm text-fg placeholder-fg-subtle outline-none transition"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-fg mb-1.5">Relationship</label>
                <select
                  value={form.relationship}
                  onChange={(e) => setForm((f) => ({ ...f, relationship: e.target.value }))}
                  className="w-full bg-canvas border border-line-strong focus:border-accent rounded-lg px-3 py-2 text-sm text-fg outline-none transition"
                >
                  {RELATIONSHIP_OPTIONS.map((o) => <option key={o}>{o}</option>)}
                </select>
              </div>
            </div>
            {error && <p className="text-xs text-danger mt-3">{error}</p>}
            <p className="text-[11px] text-fg-subtle mt-3 leading-relaxed">
              They&apos;ll receive an email with a link to accept. Both portfolios remain private — only combined totals are shared.
            </p>
            <div className="flex gap-2 mt-5">
              <button onClick={sendInvite} disabled={sending} className="flex-1 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-medium transition shadow-sm">
                {sending ? 'Sending…' : 'Send invite'}
              </button>
              <button onClick={() => setShowInvite(false)} className="px-4 border border-line-strong hover:bg-canvas rounded-xl text-sm text-fg-muted transition">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-fg-muted">{label}</p>
      <p className={`text-sm font-semibold mt-0.5 ${color ?? 'text-fg'}`}>{value}</p>
    </div>
  )
}

function EmptyState({ onInvite }: { onInvite: () => void }) {
  return (
    <div className="bg-surface border border-line rounded-xl p-8 text-center shadow-sm">
      <div className="text-4xl mb-3">👨‍👩‍👧‍👦</div>
      <h2 className="text-base font-semibold text-fg mb-1">Bring your family on board</h2>
      <p className="text-xs text-fg-muted mb-5 max-w-sm mx-auto leading-relaxed">
        Invite your spouse, parents, or children to link portfolios. See your combined net worth, total investments, and shared financial health — all in one place.
      </p>
      <button onClick={onInvite} className="bg-accent hover:bg-accent-hover text-white px-5 py-2.5 rounded-lg text-sm font-medium transition shadow-sm">
        Invite a family member →
      </button>
    </div>
  )
}
