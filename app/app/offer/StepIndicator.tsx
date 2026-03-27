'use client'

/**
 * 3-step progress indicator for the offer funnel.
 * Steps: Vehicle → Your Details → Valuation
 * Premium design with gradient accents & animations.
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
                  w-11 h-11 rounded-2xl flex items-center justify-center text-xs font-bold
                  transition-all duration-500
                  ${isDone
                    ? 'gradient-gold text-white shadow-lg shadow-gold/20'
                    : isActive
                    ? 'gradient-gold text-white shadow-xl shadow-gold/30 ring-4 ring-gold/15 scale-110'
                    : 'bg-white text-warm-gray border border-warm-border shadow-sm'
                  }
                `}
              >
                {isDone ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  s.step
                )}
              </div>
              <span
                className={`mt-2 text-[10px] font-bold tracking-wide uppercase ${
                  isActive ? 'text-gold-dark' : isDone ? 'text-gold' : 'text-warm-gray/40'
                }`}
              >
                {s.label}
              </span>
            </div>

            {/* Connector line with gradient */}
            {i < STEPS.length - 1 && (
              <div className="w-12 sm:w-20 h-[3px] mx-3 mt-[-14px] rounded-full overflow-hidden bg-warm-border/50">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    s.step < current
                      ? 'w-full gradient-gold'
                      : 'w-0 bg-transparent'
                  }`}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
