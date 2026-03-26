'use client'

/**
 * 3-step progress indicator for the offer funnel.
 * Steps: Vehicle → Your Details → Valuation
 * Premium design with gold accent.
 */

const STEPS = [
  { label: 'Vehicle', step: 1 },
  { label: 'Your Details', step: 2 },
  { label: 'Valuation', step: 3 },
] as const

export default function StepIndicator({ current }: { current: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center justify-center mb-10">
      {STEPS.map((s, i) => {
        const isActive = s.step === current
        const isDone = s.step < current

        return (
          <div key={s.step} className="flex items-center">
            {/* Step circle */}
            <div className="flex flex-col items-center">
              <div
                className={`
                  w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold
                  transition-all duration-300
                  ${isDone
                    ? 'bg-gold text-white shadow-sm'
                    : isActive
                    ? 'bg-gold text-white shadow-md ring-4 ring-gold-light'
                    : 'bg-surface-warm text-warm-gray border border-warm-border'
                  }
                `}
              >
                {isDone ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  s.step
                )}
              </div>
              <span
                className={`mt-1.5 text-[10px] font-medium tracking-wide uppercase ${
                  isActive ? 'text-gold-dark' : isDone ? 'text-gold' : 'text-warm-gray/50'
                }`}
              >
                {s.label}
              </span>
            </div>

            {/* Connector line */}
            {i < STEPS.length - 1 && (
              <div
                className={`w-12 sm:w-16 h-0.5 mx-2 mt-[-14px] rounded-full transition-colors duration-300 ${
                  s.step < current ? 'bg-gold/40' : 'bg-warm-border'
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
