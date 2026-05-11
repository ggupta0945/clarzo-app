'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { captureEvent } from '@/lib/analytics/client'

const MAX_FILE_SIZE = 5 * 1024 * 1024

// Inline "+" affordance for the chat inputs. Two modes:
//
// - `mode="upload"` (default, authenticated chats): click opens a hidden
//   file picker; selected file streams to /api/upload; on success we fire
//   the optional `onUploaded` callback (chat surfaces use this to
//   inject a notice + router.refresh()).
//
// - `mode="signup"` (public /ask): click routes to /login instead. Lets a
//   prospect convert from inside the chat without breaking the thread.

type Props = {
  mode?: 'upload' | 'signup'
  onUploaded?: (info: { inserted: number }) => void
  disabled?: boolean
  size?: 'sm' | 'md'
}

export function UploadButton({
  mode = 'upload',
  onUploaded,
  disabled,
  size = 'md',
}: Props) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const dim = size === 'sm' ? 'h-8 w-8' : 'h-10 w-10'
  const iconSize = size === 'sm' ? 16 : 18

  const buttonClass = `${dim} shrink-0 inline-flex items-center justify-center rounded-full bg-surface border border-line-strong text-fg-muted hover:border-accent hover:text-accent transition disabled:opacity-50 disabled:cursor-not-allowed`

  // Public-mode: render a Link so middle-click / cmd-click open in a new
  // tab the way the rest of the app's buttons-that-link do.
  if (mode === 'signup') {
    return (
      <Link
        href="/login"
        title="Sign up to upload your portfolio"
        aria-label="Sign up to upload portfolio"
        className={buttonClass}
        onClick={() => captureEvent('chat_upload_button_clicked', { mode: 'signup' })}
      >
        <PlusIcon size={iconSize} />
      </Link>
    )
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_FILE_SIZE) {
      setError('File is too large. Max 5MB.')
      e.target.value = ''
      return
    }
    setError(null)
    setUploading(true)
    captureEvent('chat_upload_button_clicked', { mode: 'upload', file_size: file.size })

    try {
      const fd = new FormData()
      fd.set('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setError(data.message ?? 'Upload failed.')
        captureEvent('chat_upload_failed', { error: data.error ?? 'unknown' })
        return
      }
      captureEvent('chat_upload_succeeded', { inserted: data.inserted })
      onUploaded?.({ inserted: data.inserted })
      // Refresh the route so server components pick up the new holdings
      // (chat-context.ts will then see them on the next message).
      router.refresh()
    } catch {
      setError('Network error. Try again.')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,.xls,.xlsm"
        onChange={handleFile}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || uploading}
        title={uploading ? 'Uploading…' : error ?? 'Upload portfolio (CSV / XLSX)'}
        aria-label="Upload portfolio"
        className={buttonClass}
      >
        {uploading ? <Spinner size={iconSize} /> : <PlusIcon size={iconSize} />}
      </button>
    </>
  )
}

function PlusIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

function Spinner({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className="animate-spin">
      <circle
        cx="12"
        cy="12"
        r="9"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeDasharray="14 28"
        strokeLinecap="round"
      />
    </svg>
  )
}
