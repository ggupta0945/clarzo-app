'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { captureEvent } from '@/lib/analytics/client'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

export default function UploadPage() {
  const router = useRouter()
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

      // Land on Ask Clarzo so the auto-greet kicks in immediately — that's
      // the wow moment. The dashboard is one click away in the nav.
      router.push('/dashboard/ask?welcome=true')
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
    <div className="px-4 py-6 sm:p-10 max-w-3xl mx-auto">
      <h1 className="text-3xl mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
        Upload your holdings
      </h1>
      <p className="text-[#88b098] mb-8">
        Drop a CSV or Excel file from your broker — Zerodha, Groww, ICICI Direct, anyone.
      </p>

      <div className="bg-[#071a10] border border-[#1a4a2e] rounded-2xl p-5 sm:p-8">
        <div className="mb-6">
          <label className="block text-sm text-[#88b098] mb-3">
            Upload file <span className="text-[#4a7a5a]">(CSV or XLSX, max 5MB)</span>
          </label>
          <input
            type="file"
            accept=".csv,.xlsx,.xls,.xlsm"
            onChange={handleFileChange}
            className="block w-full text-sm text-[#e4f0e8] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:bg-[#102e1e] file:text-[#34d399] hover:file:bg-[#0c2418] cursor-pointer"
          />
          {file && <p className="text-sm text-[#4a7a5a] mt-2">Selected: {file.name}</p>}
        </div>

        <button
          type="button"
          onClick={() => setShowPaste((v) => !v)}
          className="text-sm text-[#88b098] hover:text-[#34d399] mb-4"
        >
          {showPaste ? '− Hide manual paste' : '+ Or paste manually'}
        </button>

        {showPaste && (
          <div className="mb-6">
            <textarea
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder={`HDFC Top 100 - 120 units @ 650
Nippon Small Cap - 50 units @ 89
ADANI ENERGY 75 @ 975`}
              rows={6}
              className="w-full bg-[#040f0a] border border-[#1a4a2e] rounded-lg p-4 text-[#e4f0e8] font-mono text-sm placeholder-[#4a7a5a] focus:border-[#34d399] focus:outline-none resize-none"
            />
          </div>
        )}

        {error && <p className="text-[#ef4444] mb-4 text-sm">{error}</p>}

        <button
          onClick={handleUpload}
          disabled={loading || (!file && !pastedText.trim())}
          className="bg-[#059669] hover:bg-[#0F6E56] disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-full font-medium transition"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
              Saving...
            </span>
          ) : 'Upload'}
        </button>
      </div>

      <p className="text-xs text-[#4a7a5a] mt-6 text-center">
        Read-only. We never move your money. You can delete your data anytime.
      </p>
    </div>
  )
}
