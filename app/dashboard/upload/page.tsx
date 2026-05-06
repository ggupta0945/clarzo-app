'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { captureEvent } from '@/lib/analytics/client'

const MAX_FILE_SIZE = 5 * 1024 * 1024

type Tab = 'broker' | 'fd' | 'gold' | 'real_estate' | 'debt'

const TABS: { id: Tab; label: string; emoji: string }[] = [
  { id: 'broker', label: 'Stocks & MFs', emoji: '📈' },
  { id: 'fd', label: 'Fixed Deposits', emoji: '🏦' },
  { id: 'gold', label: 'Gold', emoji: '🥇' },
  { id: 'real_estate', label: 'Real Estate', emoji: '🏠' },
  { id: 'debt', label: 'Loans & Debt', emoji: '💳' },
]

export default function UploadPage() {
  const [tab, setTab] = useState<Tab>('broker')
  const [success, setSuccess] = useState<string | null>(null)
  const router = useRouter()

  function handleSuccess(msg: string) {
    setSuccess(msg)
    // Full reload so the server re-renders the dashboard with the new holdings.
    // router.push does client-side navigation and skips the server component re-fetch.
    setTimeout(() => window.location.assign('/dashboard'), 1500)
  }

  return (
    <div className="px-4 py-4 sm:p-8 max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold mb-1 text-fg">Add assets</h1>
      <p className="text-sm text-fg-muted mb-5">
        Build your complete financial picture — stocks, MFs, FDs, gold, property, and loans.
      </p>

      {/* Tab bar */}
      <div className="flex gap-1 overflow-x-auto mb-5 pb-0.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setSuccess(null) }}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition shrink-0 ${
              tab === t.id
                ? 'bg-accent text-white shadow-sm'
                : 'bg-surface border border-line text-fg-muted hover:text-fg'
            }`}
          >
            <span>{t.emoji}</span>
            {t.label}
          </button>
        ))}
      </div>

      {success && (
        <div className="mb-4 rounded-xl bg-success-soft border border-success/30 px-4 py-3 text-xs text-success">
          {success} Redirecting to dashboard…
        </div>
      )}

      <div className="bg-surface border border-line rounded-xl p-4 sm:p-6 shadow-sm">
        {tab === 'broker' && <BrokerUpload onSuccess={handleSuccess} />}
        {tab === 'fd' && <FdForm onSuccess={handleSuccess} />}
        {tab === 'gold' && <GoldForm onSuccess={handleSuccess} />}
        {tab === 'real_estate' && <RealEstateForm onSuccess={handleSuccess} />}
        {tab === 'debt' && <DebtForm onSuccess={handleSuccess} />}
      </div>

      <p className="text-[11px] text-fg-muted mt-4 text-center">
        Read-only. We never move your money. You can delete any entry anytime.
      </p>
    </div>
  )
}

// ─── Broker CSV Upload ───────────────────────────────────────────────────────

function BrokerUpload({ onSuccess }: { onSuccess: (msg: string) => void }) {
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
    if (file) formData.set('file', file)
    else if (pastedText.trim()) formData.set('pasted', pastedText)
    else { setError('Please choose a file or paste your holdings.'); setLoading(false); return }

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok || !data.success) {
        captureEvent('upload_failed', { source: file ? 'file' : 'manual_paste', error: data.error ?? 'unknown' })
        setError(data.message || 'Upload failed. Try again or paste manually.')
        setLoading(false)
        return
      }
      captureEvent('upload_succeeded', {
        source: file ? 'file' : 'manual_paste',
        file_extension: file ? file.name.split('.').pop()?.toLowerCase() : null,
        count: data.inserted, matched: data.matched, unmatched: data.unmatched,
      })
      onSuccess(`${data.inserted} holdings imported.`)
    } catch {
      setError('Network error. Try again.')
      setLoading(false)
    }
  }

  return (
    <div>
      <p className="text-xs text-fg-muted mb-4">
        Drop a CSV or Excel file from Zerodha, Groww, ICICI Direct, or any broker.
      </p>
      <div className="mb-5">
        <label className="block text-xs font-medium text-fg mb-2">
          Upload file <span className="text-fg-subtle font-normal">(CSV or XLSX, max 5MB)</span>
        </label>
        <input
          type="file" accept=".csv,.xlsx,.xls,.xlsm"
          onChange={handleFileChange}
          className="block w-full text-xs text-fg file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-medium file:bg-accent-soft file:text-accent hover:file:bg-line cursor-pointer"
        />
        {file && <p className="text-xs text-fg-muted mt-1.5">Selected: {file.name}</p>}
      </div>

      <button type="button" onClick={() => setShowPaste((v) => !v)} className="text-xs font-medium text-accent hover:underline mb-3">
        {showPaste ? '− Hide manual paste' : '+ Or paste manually'}
      </button>

      {showPaste && (
        <div className="mb-5">
          <textarea
            value={pastedText} onChange={(e) => setPastedText(e.target.value)}
            placeholder={`HDFC Top 100 - 120 units @ 650\nNippon Small Cap - 50 units @ 89`}
            rows={5}
            className="w-full bg-canvas border border-line-strong rounded-lg p-3 text-fg text-xs placeholder-fg-subtle focus:border-accent focus:outline-none resize-none"
          />
        </div>
      )}

      {error && <p className="text-danger mb-3 text-xs">{error}</p>}
      <button
        onClick={handleUpload}
        disabled={loading || (!file && !pastedText.trim())}
        className="bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2 rounded-lg text-sm font-medium transition shadow-sm"
      >
        {loading ? 'Saving…' : 'Upload'}
      </button>
    </div>
  )
}

// ─── Fixed Deposit Form ──────────────────────────────────────────────────────

function FdForm({ onSuccess }: { onSuccess: (msg: string) => void }) {
  const [form, setForm] = useState({ bank: '', principal: '', interest_rate: '', tenure_months: '', deposit_date: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })) }

  async function submit() {
    if (!form.bank || !form.principal) { setError('Bank name and principal amount are required.'); return }
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asset_type: 'fd', ...form, principal: Number(form.principal), interest_rate: Number(form.interest_rate), tenure_months: Number(form.tenure_months) }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      onSuccess('Fixed deposit added.')
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); setLoading(false) }
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-fg-muted">Add a bank FD or RD to track it alongside your investments.</p>
      <FormField label="Bank / Institution *"><input type="text" value={form.bank} onChange={(e) => set('bank', e.target.value)} placeholder="e.g., SBI, HDFC Bank" className={inputCls} /></FormField>
      <FormField label="Principal Amount (₹) *"><input type="number" value={form.principal} onChange={(e) => set('principal', e.target.value)} placeholder="e.g., 100000" className={inputCls} /></FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Interest Rate (% p.a.)"><input type="number" step="0.01" value={form.interest_rate} onChange={(e) => set('interest_rate', e.target.value)} placeholder="e.g., 7.1" className={inputCls} /></FormField>
        <FormField label="Tenure (months)"><input type="number" value={form.tenure_months} onChange={(e) => set('tenure_months', e.target.value)} placeholder="e.g., 12" className={inputCls} /></FormField>
      </div>
      <FormField label="Deposit Date"><input type="date" value={form.deposit_date} onChange={(e) => set('deposit_date', e.target.value)} className={inputCls} /></FormField>
      {error && <p className="text-danger text-xs">{error}</p>}
      <button onClick={submit} disabled={loading} className={btnCls}>{loading ? 'Saving…' : 'Add Fixed Deposit'}</button>
    </div>
  )
}

// ─── Gold Form ───────────────────────────────────────────────────────────────

function GoldForm({ onSuccess }: { onSuccess: (msg: string) => void }) {
  const [form, setForm] = useState({ gold_type: 'Physical', weight_grams: '', purchase_price_per_gram: '', current_price_per_gram: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })) }

  async function submit() {
    if (!form.weight_grams) { setError('Weight in grams is required.'); return }
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asset_type: 'gold', ...form, weight_grams: Number(form.weight_grams), purchase_price_per_gram: Number(form.purchase_price_per_gram), current_price_per_gram: Number(form.current_price_per_gram) }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      onSuccess('Gold holding added.')
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); setLoading(false) }
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-fg-muted">Track physical gold, Sovereign Gold Bonds (SGB), or Gold ETFs.</p>
      <FormField label="Gold Type">
        <select value={form.gold_type} onChange={(e) => set('gold_type', e.target.value)} className={inputCls}>
          <option>Physical</option><option>SGB</option><option>Gold ETF</option>
        </select>
      </FormField>
      <FormField label="Weight (grams) *"><input type="number" step="0.01" value={form.weight_grams} onChange={(e) => set('weight_grams', e.target.value)} placeholder="e.g., 10" className={inputCls} /></FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Purchase Price / gram (₹)"><input type="number" value={form.purchase_price_per_gram} onChange={(e) => set('purchase_price_per_gram', e.target.value)} placeholder="e.g., 5500" className={inputCls} /></FormField>
        <FormField label="Current Price / gram (₹)"><input type="number" value={form.current_price_per_gram} onChange={(e) => set('current_price_per_gram', e.target.value)} placeholder="e.g., 7200" className={inputCls} /></FormField>
      </div>
      <p className="text-[11px] text-fg-subtle">Current gold price: approx ₹7,200–7,500/gram (24K). Update when market moves significantly.</p>
      {error && <p className="text-danger text-xs">{error}</p>}
      <button onClick={submit} disabled={loading} className={btnCls}>{loading ? 'Saving…' : 'Add Gold'}</button>
    </div>
  )
}

// ─── Real Estate Form ────────────────────────────────────────────────────────

function RealEstateForm({ onSuccess }: { onSuccess: (msg: string) => void }) {
  const [form, setForm] = useState({ property_desc: '', city: '', purchase_price: '', current_market_value: '', emi_amount: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })) }

  async function submit() {
    if (!form.property_desc || !form.current_market_value) { setError('Property description and current market value are required.'); return }
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asset_type: 'real_estate', ...form, purchase_price: Number(form.purchase_price), current_market_value: Number(form.current_market_value), emi_amount: Number(form.emi_amount) }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      onSuccess('Property added.')
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); setLoading(false) }
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-fg-muted">Add residential, commercial, or plot holdings. Use your best estimate for current market value.</p>
      <FormField label="Property Description *"><input type="text" value={form.property_desc} onChange={(e) => set('property_desc', e.target.value)} placeholder="e.g., 2BHK flat, Powai" className={inputCls} /></FormField>
      <FormField label="City"><input type="text" value={form.city} onChange={(e) => set('city', e.target.value)} placeholder="e.g., Mumbai" className={inputCls} /></FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Purchase Price (₹)"><input type="number" value={form.purchase_price} onChange={(e) => set('purchase_price', e.target.value)} placeholder="e.g., 8000000" className={inputCls} /></FormField>
        <FormField label="Current Market Value (₹) *"><input type="number" value={form.current_market_value} onChange={(e) => set('current_market_value', e.target.value)} placeholder="e.g., 12000000" className={inputCls} /></FormField>
      </div>
      <FormField label="Monthly EMI (₹) — if applicable"><input type="number" value={form.emi_amount} onChange={(e) => set('emi_amount', e.target.value)} placeholder="e.g., 45000" className={inputCls} /></FormField>
      {error && <p className="text-danger text-xs">{error}</p>}
      <button onClick={submit} disabled={loading} className={btnCls}>{loading ? 'Saving…' : 'Add Property'}</button>
    </div>
  )
}

// ─── Debt / Loans Form ───────────────────────────────────────────────────────

function DebtForm({ onSuccess }: { onSuccess: (msg: string) => void }) {
  const [form, setForm] = useState({ loan_type: 'Home Loan', lender: '', outstanding_amount: '', emi_amount: '', interest_rate: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })) }

  async function submit() {
    if (!form.outstanding_amount) { setError('Outstanding amount is required.'); return }
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asset_type: 'debt', ...form, outstanding_amount: Number(form.outstanding_amount), emi_amount: Number(form.emi_amount), interest_rate: Number(form.interest_rate) }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      onSuccess('Loan added. Debt is shown as a liability in your net worth.')
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); setLoading(false) }
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-fg-muted">Loans reduce your net worth. Adding them gives you an accurate financial picture.</p>
      <FormField label="Loan Type">
        <select value={form.loan_type} onChange={(e) => set('loan_type', e.target.value)} className={inputCls}>
          <option>Home Loan</option><option>Car Loan</option><option>Personal Loan</option><option>Education Loan</option><option>Business Loan</option><option>Other</option>
        </select>
      </FormField>
      <FormField label="Lender / Bank"><input type="text" value={form.lender} onChange={(e) => set('lender', e.target.value)} placeholder="e.g., HDFC Bank" className={inputCls} /></FormField>
      <FormField label="Outstanding Amount (₹) *"><input type="number" value={form.outstanding_amount} onChange={(e) => set('outstanding_amount', e.target.value)} placeholder="e.g., 3500000" className={inputCls} /></FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Monthly EMI (₹)"><input type="number" value={form.emi_amount} onChange={(e) => set('emi_amount', e.target.value)} placeholder="e.g., 32000" className={inputCls} /></FormField>
        <FormField label="Interest Rate (% p.a.)"><input type="number" step="0.01" value={form.interest_rate} onChange={(e) => set('interest_rate', e.target.value)} placeholder="e.g., 8.5" className={inputCls} /></FormField>
      </div>
      {error && <p className="text-danger text-xs">{error}</p>}
      <button onClick={submit} disabled={loading} className={btnCls}>{loading ? 'Saving…' : 'Add Loan'}</button>
    </div>
  )
}

// ─── Shared helpers ──────────────────────────────────────────────────────────

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-fg mb-1.5">{label}</label>
      {children}
    </div>
  )
}

const inputCls = 'w-full bg-canvas border border-line-strong focus:border-accent rounded-lg px-3 py-2 text-sm text-fg placeholder-fg-subtle outline-none transition'
const btnCls = 'bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2 rounded-lg text-sm font-medium transition shadow-sm'
