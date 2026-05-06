import type { ReactNode } from 'react'

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas text-fg flex flex-col items-center justify-center px-4 py-12">
      <div className="mb-8 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-accent-hover text-accent-fg text-sm font-bold shadow-sm">
          C
        </span>
        <span className="text-lg font-semibold text-fg tracking-tight">Clarzo</span>
      </div>
      {children}
    </div>
  )
}
