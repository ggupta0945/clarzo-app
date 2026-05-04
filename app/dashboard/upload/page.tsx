'use client'

import { useState } from 'react'
import { captureEvent } from '@/lib/analytics/client'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [pastedText, setPastedText] = useState('')
  const [showPaste, setShowPaste] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] || null
    if (selected && selected.size > MAX_FILE_SIZE) {
      setError('File is too large. Please upload a file under 5MB.')
      setFile(null)
      e.target.value = ''
      return
    }
    setError(null)
    setFile(selected)
  }

  async function handleUpload() {
    setLoading(true)
    setError(null)

    const formData = new FormData()
    if (file) {
      formData.set('file', file)
    } else if (pastedText.trim()) {
      formData.set('pasted', pastedText)
    } else {
      setError('Please choose a file or paste your holdings.')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()

      if (!res.ok || !data.success) {
        captureEvent('upload_failed', {
          source: file ? 'file' : 'manual_paste',
          error: data.error ?? 'unknown',
        })
        setError(data.message || 'Upload failed. Try again or paste manually.')
        setLoading(false)
        return
      }

      captureEvent('upload_succeeded', {
        source: file ? 'file' : 'manual_paste',
        file_extension: file ? file.name.split('.').pop()?.toLowerCase() : null,
        count: data.inserted,
        matched: data.matched,
        unmatched: data.unmatched,
      })

      // After upload, the holdings cookie is set on the response — every
      // dashboard page now has data, so we go straight to the dashboard.
      // Force a full reload (not router.push) so the layout re-runs and
      // picks up the fresh server-rendered state.
      window.location.assign('/dashboard')
    } catch {
      captureEvent('upload_failed', {
        source: file ? 'file' : 'manual_paste',
        error: 'network',
      })
      setError('Network error. Try again.')
      setLoading(false)
    }
  }

  return (
    <div className="px-4 py-4 sm:p-8 max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold mb-1 text-fg">
        Upload your holdings
      </h1>
      <p className="text-sm text-fg-muted mb-3">
        Drop a CSV or Excel file from your broker — Zerodha, Groww, ICICI Direct, anyone.
      </p>
      <p className="text-[11px] text-fg-subtle mb-5">
        We need this once to populate your dashboard, stocks, goals, and rebalance suggestions. Re-upload anytime to refresh.
      </p>

      <div className="bg-surface border border-line rounded-xl p-4 sm:p-6 shadow-sm">
        <div className="mb-5">
          <label className="block text-xs font-medium text-fg mb-2">
            Upload file <span className="text-fg-subtle font-normal">(CSV or XLSX, max 5MB)</span>
          </label>
          <input
            type="file"
            accept=".csv,.xlsx,.xls,.xlsm"
            onChange={handleFileChange}
            className="block w-full text-xs text-fg file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-medium file:bg-accent-soft file:text-accent hover:file:bg-line cursor-pointer"
          />
          {file && <p className="text-xs text-fg-muted mt-1.5">Selected: {file.name}</p>}
        </div>

        <button
          type="button"
          onClick={() => setShowPaste((v) => !v)}
          className="text-xs font-medium text-accent hover:underline mb-3"
        >
          {showPaste ? '− Hide manual paste' : '+ Or paste manually'}
        </button>

        {showPaste && (
          <div className="mb-5">
            <textarea
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder={`HDFC Top 100 - 120 units @ 650
Nippon Small Cap - 50 units @ 89
ADANI ENERGY 75 @ 975`}
              rows={5}
              className="w-full bg-canvas border border-line-strong rounded-lg p-3 text-fg text-xs placeholder-fg-subtle focus:border-accent focus:bg-surface focus:outline-none resize-none"
            />
          </div>
        )}

        {error && <p className="text-danger mb-3 text-xs">{error}</p>}

        <button
          onClick={handleUpload}
          disabled={loading || (!file && !pastedText.trim())}
          className="bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2 rounded-lg text-sm font-medium transition shadow-sm"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
              Saving...
            </span>
          ) : 'Upload'}
        </button>
      </div>

      <p className="text-[11px] text-fg-muted mt-4 text-center">
        Read-only. We never move your money. You can delete your data anytime.
      </p>
    </div>
  )
}
