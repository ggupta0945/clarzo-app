'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type ParsedHolding = {
  isin: string | null
  scheme_name: string
  units: number
  avg_cost: number | null
  asset_type: string
  source: string
}

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

export default function UploadPage() {
  const router = useRouter()
  const [source, setSource] = useState<'zerodha' | 'groww' | 'manual'>('zerodha')
  const [file, setFile] = useState<File | null>(null)
  const [pastedText, setPastedText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<ParsedHolding[] | null>(null)

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

  async function handleParse() {
    setLoading(true)
    setError(null)

    const formData = new FormData()
    formData.set('source', source)
    if (source === 'manual') {
      formData.set('pasted', pastedText)
    } else {
      if (!file) {
        setError('Please select a file')
        setLoading(false)
        return
      }
      formData.set('file', file)
    }

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()

      if (!res.ok || !data.success) {
        setError(data.message || 'Failed to parse. Try manual paste.')
        setLoading(false)
        return
      }

      setPreview(data.holdings)
    } catch {
      setError('Network error. Try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleConfirm() {
    if (!preview) return
    setLoading(true)

    try {
      const res = await fetch('/api/upload/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ holdings: preview }),
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to save')
        setLoading(false)
        return
      }

      router.push('/dashboard')
    } catch {
      setError('Network error. Try again.')
      setLoading(false)
    }
  }

  function removeRow(idx: number) {
    if (!preview) return
    setPreview(preview.filter((_, i) => i !== idx))
  }

  function resetAll() {
    setPreview(null)
    setFile(null)
    setPastedText('')
    setError(null)
  }

  // EMPTY PARSE RESULT
  if (preview && preview.length === 0) {
    return (
      <div className="p-10 max-w-3xl mx-auto">
        <div className="bg-[#071a10] border border-[#1a4a2e] rounded-2xl p-10 text-center">
          <div className="text-5xl mb-4">🔍</div>
          <h2 className="text-2xl mb-3" style={{ fontFamily: 'Playfair Display, serif' }}>
            No holdings found
          </h2>
          <p className="text-[#88b098] mb-6 max-w-md mx-auto">
            We couldn&apos;t find any holdings in that file. It may be in an unsupported format or the wrong CSV type.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => { resetAll(); setSource('manual') }}
              className="bg-[#059669] hover:bg-[#0F6E56] text-white px-6 py-3 rounded-full font-medium transition"
            >
              Try pasting manually
            </button>
            <button
              onClick={resetAll}
              className="border border-[#1a4a2e] hover:bg-[#0c2418] text-[#e4f0e8] px-6 py-3 rounded-full transition"
            >
              Upload a different file
            </button>
          </div>
        </div>
      </div>
    )
  }

  // PREVIEW STATE
  if (preview) {
    const missingIsin = preview.filter((h) => !h.isin).length

    return (
      <div className="p-10 max-w-5xl mx-auto">
        <h1 className="text-3xl mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
          Review and confirm
        </h1>
        <p className="text-[#88b098] mb-4">
          Found {preview.length} holdings. Remove any you don&apos;t want, then confirm.
        </p>

        {missingIsin > 0 && (
          <div className="flex items-start gap-3 bg-[#1a1a0a] border border-[#f5c842]/30 rounded-xl px-5 py-4 mb-6">
            <span className="text-[#f5c842] mt-0.5">⚠</span>
            <p className="text-sm text-[#f5c842]">
              {missingIsin} holding{missingIsin > 1 ? 's' : ''} couldn&apos;t be matched to a live NAV — their current value will use your average cost instead. You can still save them.
            </p>
          </div>
        )}

        <div className="bg-[#071a10] border border-[#1a4a2e] rounded-2xl overflow-hidden mb-6">
          <table className="w-full">
            <thead className="bg-[#0c2418] border-b border-[#1a4a2e]">
              <tr>
                <th className="text-left text-xs uppercase tracking-wider text-[#88b098] px-6 py-3 font-medium">Scheme</th>
                <th className="text-right text-xs uppercase tracking-wider text-[#88b098] px-6 py-3 font-medium">Units</th>
                <th className="text-right text-xs uppercase tracking-wider text-[#88b098] px-6 py-3 font-medium">Avg Cost</th>
                <th className="text-center text-xs uppercase tracking-wider text-[#88b098] px-6 py-3 font-medium">NAV</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {preview.map((h, i) => (
                <tr key={i} className="border-b border-[#1a4a2e] last:border-0 hover:bg-[#0c2418]">
                  <td className="px-6 py-4 text-sm">{h.scheme_name}</td>
                  <td className="px-6 py-4 text-sm text-right font-mono">{h.units.toFixed(2)}</td>
                  <td className="px-6 py-4 text-sm text-right font-mono">
                    {h.avg_cost ? `₹${h.avg_cost.toFixed(2)}` : '—'}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {h.isin ? (
                      <span className="text-xs text-[#34d399]">matched</span>
                    ) : (
                      <span className="text-xs text-[#f5c842]">no match</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => removeRow(i)}
                      className="text-[#88b098] hover:text-[#ef4444] text-sm"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {error && <p className="text-[#ef4444] mb-4">{error}</p>}

        <div className="flex gap-3">
          <button
            onClick={handleConfirm}
            disabled={loading || preview.length === 0}
            className="bg-[#059669] hover:bg-[#0F6E56] disabled:opacity-50 text-white px-6 py-3 rounded-full font-medium transition"
          >
            {loading ? 'Saving...' : `Save ${preview.length} holdings`}
          </button>
          <button
            onClick={resetAll}
            className="border border-[#1a4a2e] hover:bg-[#0c2418] text-[#e4f0e8] px-6 py-3 rounded-full transition"
          >
            Start over
          </button>
        </div>
      </div>
    )
  }

  // INPUT STATE
  return (
    <div className="p-10 max-w-3xl mx-auto">
      <h1 className="text-3xl mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
        Upload your portfolio
      </h1>
      <p className="text-[#88b098] mb-8">
        Drop a CSV from Zerodha or Groww — or paste your holdings manually.
      </p>

      <div className="bg-[#071a10] border border-[#1a4a2e] rounded-2xl p-8">
        <div className="mb-6">
          <label className="block text-sm text-[#88b098] mb-3">Where&apos;s your portfolio from?</label>
          <div className="flex gap-3 flex-wrap">
            {(['zerodha', 'groww', 'manual'] as const).map((s) => (
              <button
                key={s}
                onClick={() => { setSource(s); setError(null); setFile(null) }}
                className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                  source === s
                    ? 'bg-[#34d399] text-[#040f0a]'
                    : 'bg-[#0c2418] text-[#88b098] hover:bg-[#102e1e]'
                }`}
              >
                {s === 'zerodha' && 'Zerodha'}
                {s === 'groww' && 'Groww'}
                {s === 'manual' && 'Paste manually'}
              </button>
            ))}
          </div>
        </div>

        {source !== 'manual' && (
          <div className="mb-6">
            <label className="block text-sm text-[#88b098] mb-3">
              Upload CSV file <span className="text-[#4a7a5a]">(max 5MB)</span>
            </label>
            <input
              type="file"
              accept=".csv,.xlsx"
              onChange={handleFileChange}
              className="block w-full text-sm text-[#e4f0e8] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:bg-[#102e1e] file:text-[#34d399] hover:file:bg-[#0c2418] cursor-pointer"
            />
            {file && <p className="text-sm text-[#4a7a5a] mt-2">Selected: {file.name}</p>}
          </div>
        )}

        {source === 'manual' && (
          <div className="mb-6">
            <label className="block text-sm text-[#88b098] mb-3">
              Paste your holdings (one per line)
            </label>
            <textarea
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder={`HDFC Top 100 - 120 units @ ₹650\nNippon Small Cap - 50 units @ ₹89\nQuant Active - 200 units @ ₹450`}
              rows={8}
              className="w-full bg-[#040f0a] border border-[#1a4a2e] rounded-lg p-4 text-[#e4f0e8] font-mono text-sm placeholder-[#4a7a5a] focus:border-[#34d399] focus:outline-none resize-none"
            />
            <p className="text-xs text-[#4a7a5a] mt-2">
              {pastedText.split('\n').filter(Boolean).length} line{pastedText.split('\n').filter(Boolean).length !== 1 ? 's' : ''} entered
            </p>
          </div>
        )}

        {error && <p className="text-[#ef4444] mb-4 text-sm">{error}</p>}

        <button
          onClick={handleParse}
          disabled={loading || (source === 'manual' ? !pastedText.trim() : !file)}
          className="bg-[#059669] hover:bg-[#0F6E56] disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-full font-medium transition"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
              Parsing...
            </span>
          ) : 'Continue →'}
        </button>
      </div>

      <p className="text-xs text-[#4a7a5a] mt-6 text-center">
        Read-only. We never move your money. You can delete your data anytime.
      </p>
    </div>
  )
}
