'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'

export default function FinalCtaSection() {
  const router = useRouter()
  const [reg, setReg] = useState('')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = reg.trim().toUpperCase()
    if (trimmed.length >= 2) {
      router.push(`/offer?reg=${encodeURIComponent(trimmed)}`)
    }
  }

  return (
    <section className="bg-charcoal px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-4">
          Ready to get started?
        </h2>
        <p className="text-white/50 text-lg mb-10">
          Enter your registration for a free, no-obligation valuation.
          A simpler way to begin selling your car.
        </p>

        <form
          onSubmit={handleSubmit}
          className="max-w-md mx-auto"
        >
          <div className="flex items-stretch border-2 border-white/20 rounded-lg overflow-hidden mb-4 bg-white/5">
            <div className="bg-[#003DA5] text-white w-11 flex flex-col items-center justify-center gap-0.5 flex-shrink-0">
              <svg viewBox="0 0 24 16" className="w-5 h-3.5" fill="none">
                <circle cx="12" cy="8" r="5" stroke="white" strokeWidth="1" />
                <path d="M7 8 Q12 4 17 8 Q12 12 7 8Z" fill="#FFD700" opacity="0.8" />
              </svg>
              <span className="text-[9px] font-bold tracking-wide leading-none">
                GB
              </span>
            </div>
            <input
              type="text"
              value={reg}
              onChange={(e) => setReg(e.target.value.toUpperCase())}
              placeholder="Enter reg"
              required
              minLength={2}
              className="flex-1 px-4 py-4 text-xl font-bold uppercase tracking-[0.15em] text-center text-white placeholder:text-white/20 focus:outline-none bg-transparent"
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          <button
            type="submit"
            disabled={reg.trim().length < 2}
            className="w-full rounded-lg bg-gold px-6 py-4 text-base font-semibold text-white hover:bg-gold-dark disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            Get Your Free Valuation
          </button>
        </form>

        <p className="mt-5 text-xs text-white/30">
          Get started in under 2 minutes&ensp;·&ensp;No sign-up required
        </p>
      </div>
    </section>
  )
}
