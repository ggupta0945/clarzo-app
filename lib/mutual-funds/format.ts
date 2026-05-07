// Tiny shared formatters used across the MF segment. Keeps the visual
// language consistent (₹ with Indian grouping, 1 decimal returns, etc.)
// and avoids each component re-rolling its own.

export function fmtPct(n: number | null | undefined, decimals = 1): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  const sign = n > 0 ? '+' : ''
  return `${sign}${n.toFixed(decimals)}%`
}

export function fmtPctPlain(n: number | null | undefined, decimals = 1): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  return `${n.toFixed(decimals)}%`
}

export function fmtNav(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 4 })}`
}

export function fmtCrore(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(2)} L Cr`
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })} Cr`
}

export function fmtRupee(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

export function returnTone(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return 'text-fg-muted'
  if (n > 0) return 'text-success'
  if (n < 0) return 'text-danger'
  return 'text-fg-muted'
}

export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  const now = Date.now()
  const seconds = Math.max(1, Math.floor((now - then) / 1000))
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `${weeks}w ago`
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}
