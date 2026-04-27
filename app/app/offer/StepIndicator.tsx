'use client'

/**
 * 3-step progress indicator for the offer funnel.
 * Steps: Vehicle → Your Details → Booking
 * Premium design with gradient accents & animations.
 */

const STEPS = [
  { label: 'Vehicle', step: 1 },
  { label: 'Your Details', step: 2 },
  { label: 'Booking', step: 3 },
] as const

export default function StepIndicator({ current }: { current: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center justify-center mb-8 sm:mb-10 px-2">
      {STEPS.map((s, i) => {
        const isActive = s.step === current
        const isDone = s.step < current

        return (
          <div key={s.step} className="flex items-center">
            {/* Step circle */}
            <div className="flex flex-col items-center">
              <div
                className={`
                  w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl flex items-center justify-center text-xs font-bold
                  transition-all duration-500
                  ${isDone
                    ? 'gradient-gold text-white shadow-lg shadow-gold/20'
                    : isActive
                    ? 'gradient-gold text-white shadow-xl shadow-gold/30 ring-4 ring-gold/15 scale-110'
                    : 'bg-[var(--card-bg)] text-warm-gray border border-[var(--card-border)] shadow-sm'
                  }
                `}
              >
                {isDone ? (
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  s.step
                )}
              </div>
              <span
                className={`mt-1.5 sm:mt-2 text-[9px] sm:text-[10px] font-bold tracking-wide uppercase ${
                  isActive ? 'text-gold-dark' : isDone ? 'text-gold' : 'text-warm-gray/70'
                }`}
              >
                {s.label}
              </span>
            </div>

            {/* Connector line with animated fill */}
            {i < STEPS.length - 1 && (
              <div className="w-8 sm:w-14 md:w-20 h-[3px] mx-1.5 sm:mx-3 mt-[-14px] rounded-full overflow-hidden bg-[var(--card-border)]">
                <div
                  className={`h-full rounded-full transition-[width] duration-700 ease-out ${
                    s.step < current
                      ? 'w-full gradient-gold'
                      : 'w-0'
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
