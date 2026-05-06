'use client'

import { useEffect, useRef, useState } from 'react'

type Notification = {
  id: string
  type: string
  title: string
  body: string | null
  read: boolean
  created_at: string
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const unread = notifications.filter((n) => !n.read).length

  useEffect(() => {
    void load()
  }, [])

  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/notifications')
      const data = await res.json()
      setNotifications(data.notifications ?? [])
    } finally {
      setLoading(false)
    }
  }

  async function markAllRead() {
    await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  function toggle() {
    setOpen((v) => !v)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={toggle}
        aria-label="Notifications"
        className="relative h-9 w-9 rounded-full bg-surface border border-line flex items-center justify-center text-fg-muted hover:text-fg shadow-sm transition"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-accent text-[9px] font-bold text-white flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-surface border border-line rounded-xl shadow-xl overflow-hidden z-50">
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-line">
            <p className="text-xs font-semibold text-fg">Notifications</p>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-[11px] text-accent hover:underline">
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <p className="px-3 py-4 text-xs text-fg-muted text-center">Loading…</p>
            ) : notifications.length === 0 ? (
              <div className="px-3 py-6 text-center">
                <p className="text-2xl mb-1.5">🔔</p>
                <p className="text-xs text-fg-muted">No notifications yet.</p>
                <p className="text-[11px] text-fg-subtle mt-0.5">We&apos;ll alert you when something needs attention.</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`px-3 py-2.5 border-b border-line last:border-none transition ${n.read ? 'opacity-60' : 'bg-accent-soft/30'}`}
                >
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 flex-shrink-0 text-sm">{severityIcon(n.type)}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-fg leading-snug">{n.title}</p>
                      {n.body && <p className="text-[11px] text-fg-muted mt-0.5 leading-relaxed line-clamp-2">{n.body}</p>}
                      <p className="text-[10px] text-fg-subtle mt-1">{timeAgo(n.created_at)}</p>
                    </div>
                    {!n.read && <span className="flex-shrink-0 h-1.5 w-1.5 rounded-full bg-accent mt-1.5" />}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function severityIcon(type: string): string {
  if (type.includes('overlap') || type.includes('debt') || type.includes('small-cap') || type.includes('sector')) return '⚠️'
  if (type.includes('positive') || type.includes('performer')) return '🎉'
  return 'ℹ️'
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}
