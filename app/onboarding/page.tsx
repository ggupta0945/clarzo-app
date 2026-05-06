'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Answers = {
  age: string
  dependents: string
  income: string
  existing_debt: string
  insurance: string
  horizon: string
  drop_reaction: string
  goals: string[]
}

const TOTAL_STEPS = 4

const AGE_OPTIONS = ['18–25', '26–35', '36–45', '46–55', '55+']
const DEPENDENT_OPTIONS = ['None', '1–2', '3–4', '5+']
const INCOME_OPTIONS = ['Below ₹5L', '₹5–10L', '₹10–20L', '₹20–50L', 'Above ₹50L']
const DEBT_OPTIONS = ['No loans', 'Home loan', 'Personal / car loan', 'Multiple loans']
const INSURANCE_OPTIONS = ['Yes, fully covered', 'Partially covered', 'No insurance']
const HORIZON_OPTIONS = ['Less than 1 year', '1–3 years', '3–5 years', '5–10 years', '10+ years']
const REACTION_OPTIONS = [
  { value: 'sell', label: 'Sell and protect what I have' },
  { value: 'wait', label: 'Wait and watch' },
  { value: 'buy', label: 'Buy more — great opportunity' },
]
const GOAL_OPTIONS = [
  { value: 'retirement', label: '🏖️ Retirement' },
  { value: 'house', label: '🏠 Buy a house' },
  { value: 'education', label: '🎓 Kids\' education' },
  { value: 'wealth', label: '📈 Grow wealth' },
  { value: 'emergency', label: '🛡️ Emergency fund' },
  { value: 'travel', label: '✈️ Travel' },
  { value: 'wedding', label: '💍 Wedding' },
  { value: 'business', label: '🏢 Business' },
]

function computeRiskScore(a: Answers): 'conservative' | 'moderate' | 'aggressive' {
  let score = 0

  // Age: younger = more risk capacity
  const ageMap: Record<string, number> = { '18–25': 3, '26–35': 2, '36–45': 1, '46–55': 0, '55+': -1 }
  score += ageMap[a.age] ?? 1

  // Investment horizon: longer = more risk capacity
  const horizonMap: Record<string, number> = {
    'Less than 1 year': -2, '1–3 years': 0, '3–5 years': 1, '5–10 years': 2, '10+ years': 3,
  }
  score += horizonMap[a.horizon] ?? 0

  // Reaction to a 20% drop
  if (a.drop_reaction === 'buy') score += 2
  else if (a.drop_reaction === 'sell') score -= 2

  // Dependents
  const depMap: Record<string, number> = { 'None': 1, '1–2': 0, '3–4': -1, '5+': -2 }
  score += depMap[a.dependents] ?? 0

  // Existing debt
  const debtMap: Record<string, number> = {
    'No loans': 1, 'Home loan': 0, 'Personal / car loan': -1, 'Multiple loans': -2,
  }
  score += debtMap[a.existing_debt] ?? 0

  // Insurance
  if (a.insurance === 'Yes, fully covered') score += 1
  else if (a.insurance === 'No insurance') score -= 1

  if (score >= 6) return 'aggressive'
  if (score >= 2) return 'moderate'
  return 'conservative'
}

const RISK_LABELS = {
  conservative: { label: 'Conservative', color: 'text-warning', desc: 'Capital protection first. FDs, debt funds, and large-cap equity suit you best.' },
  moderate: { label: 'Balanced', color: 'text-accent', desc: 'A mix of growth and stability. A 60/40 equity-debt split is a good starting point.' },
  aggressive: { label: 'Aggressive', color: 'text-success', desc: 'High growth potential. Mid/small-cap equity and diversified MFs work well for you.' },
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [answers, setAnswers] = useState<Answers>({
    age: '', dependents: '', income: '', existing_debt: '',
    insurance: '', horizon: '', drop_reaction: '', goals: [],
  })

  function set<K extends keyof Answers>(key: K, value: Answers[K]) {
    setAnswers((prev) => ({ ...prev, [key]: value }))
  }

  function toggleGoal(g: string) {
    set('goals', answers.goals.includes(g)
      ? answers.goals.filter((x) => x !== g)
      : [...answers.goals, g])
  }

  const canNext: Record<number, boolean> = {
    1: !!answers.age && !!answers.dependents,
    2: !!answers.income && !!answers.existing_debt && !!answers.insurance,
    3: !!answers.horizon && !!answers.drop_reaction,
    4: answers.goals.length > 0,
  }

  async function finish() {
    setSaving(true)
    const risk_score = computeRiskScore(answers)
    try {
      await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...answers, risk_score }),
      })
      router.push('/dashboard/upload')
    } catch {
      setSaving(false)
    }
  }

  const riskScore = step === 4 && canNext[4] ? computeRiskScore(answers) : null
  const riskMeta = riskScore ? RISK_LABELS[riskScore] : null

  return (
    <div className="w-full max-w-lg">
      {/* Progress */}
      <div className="flex items-center gap-2 mb-8">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${i < step ? 'bg-accent' : 'bg-line'}`}
          />
        ))}
      </div>

      <div className="bg-surface border border-line rounded-2xl p-6 sm:p-8 shadow-md">
        {step === 1 && (
          <StepWrapper
            title="Let's get to know you"
            subtitle="We'll use this to personalise your portfolio insights."
          >
            <OptionGroup label="What's your age range?" options={AGE_OPTIONS} value={answers.age} onChange={(v) => set('age', v)} />
            <OptionGroup label="How many financial dependents do you have?" options={DEPENDENT_OPTIONS} value={answers.dependents} onChange={(v) => set('dependents', v)} />
          </StepWrapper>
        )}

        {step === 2 && (
          <StepWrapper title="Your financial situation" subtitle="Helps us understand your risk capacity.">
            <OptionGroup label="Annual income range" options={INCOME_OPTIONS} value={answers.income} onChange={(v) => set('income', v)} />
            <OptionGroup label="Do you have any outstanding loans?" options={DEBT_OPTIONS} value={answers.existing_debt} onChange={(v) => set('existing_debt', v)} />
            <OptionGroup label="Are you adequately insured?" options={INSURANCE_OPTIONS} value={answers.insurance} onChange={(v) => set('insurance', v)} />
          </StepWrapper>
        )}

        {step === 3 && (
          <StepWrapper title="Your investment mindset" subtitle="Tells us how to calibrate your risk profile.">
            <OptionGroup label="How long can you stay invested without needing the money?" options={HORIZON_OPTIONS} value={answers.horizon} onChange={(v) => set('horizon', v)} />
            <div>
              <p className="text-xs font-medium text-fg mb-2">If your portfolio drops 20% tomorrow, what do you do?</p>
              <div className="flex flex-col gap-2">
                {REACTION_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    onClick={() => set('drop_reaction', o.value)}
                    className={`text-left px-4 py-3 rounded-xl border text-sm transition ${
                      answers.drop_reaction === o.value
                        ? 'bg-accent-soft border-accent text-accent font-medium'
                        : 'bg-canvas border-line text-fg hover:border-accent-soft'
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          </StepWrapper>
        )}

        {step === 4 && (
          <StepWrapper title="What are you saving for?" subtitle="Pick everything that applies — we'll align your portfolio accordingly.">
            <div className="grid grid-cols-2 gap-2">
              {GOAL_OPTIONS.map((g) => (
                <button
                  key={g.value}
                  onClick={() => toggleGoal(g.value)}
                  className={`px-3 py-2.5 rounded-xl border text-sm transition text-left ${
                    answers.goals.includes(g.value)
                      ? 'bg-accent-soft border-accent text-accent font-medium'
                      : 'bg-canvas border-line text-fg hover:border-accent-soft'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>

            {riskMeta && (
              <div className="mt-5 rounded-xl bg-canvas border border-line p-4">
                <p className="text-[10px] uppercase tracking-wider text-fg-muted mb-1">Your risk profile</p>
                <p className={`text-lg font-semibold ${riskMeta.color}`}>{riskMeta.label} Investor</p>
                <p className="text-xs text-fg-muted mt-1 leading-relaxed">{riskMeta.desc}</p>
              </div>
            )}
          </StepWrapper>
        )}

        <div className="flex gap-2 mt-6">
          {step > 1 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="px-5 py-2.5 border border-line rounded-xl text-sm text-fg-muted hover:text-fg hover:border-line-strong transition"
            >
              Back
            </button>
          )}
          {step < TOTAL_STEPS ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canNext[step]}
              className="flex-1 bg-accent hover:bg-accent-hover disabled:opacity-40 text-white py-2.5 rounded-xl text-sm font-medium transition shadow-sm"
            >
              Continue →
            </button>
          ) : (
            <button
              onClick={finish}
              disabled={!canNext[4] || saving}
              className="flex-1 bg-accent hover:bg-accent-hover disabled:opacity-40 text-white py-2.5 rounded-xl text-sm font-medium transition shadow-sm"
            >
              {saving ? 'Saving…' : 'Done — let\'s upload your portfolio →'}
            </button>
          )}
        </div>
      </div>

      <p className="text-center text-[11px] text-fg-subtle mt-4">
        You can update this anytime from your account settings.
      </p>
    </div>
  )
}

function StepWrapper({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-fg">{title}</h1>
        <p className="text-xs text-fg-muted mt-0.5">{subtitle}</p>
      </div>
      {children}
    </div>
  )
}

function OptionGroup({ label, options, value, onChange }: {
  label: string; options: string[]; value: string; onChange: (v: string) => void
}) {
  return (
    <div>
      <p className="text-xs font-medium text-fg mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o}
            onClick={() => onChange(o)}
            className={`px-3 py-1.5 rounded-lg border text-xs transition ${
              value === o
                ? 'bg-accent-soft border-accent text-accent font-medium'
                : 'bg-canvas border-line text-fg hover:border-accent-soft'
            }`}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  )
}
