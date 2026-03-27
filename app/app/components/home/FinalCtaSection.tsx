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
    <section className="bg-charcoal px-5 sm:px-8 lg:px-10 py-20 sm:py-28">
      <div className="mx-auto max-w-[1280px] grid lg:grid-cols-[1.2fr_1fr] gap-12 lg:gap-20 items-center">
        {/* Left — headline */}
        <div>
          <h2 className="text-[clamp(2rem,4.5vw,3.5rem)] font-bold tracking-tight text-white leading-[1.05] mb-5">
            Find out what your car is worth.
          </h2>
          <p className="text-white/40 text-[15px] leading-relaxed max-w-md">
            Free. Two minutes. No sign-up required. Enter your reg and see a
            valuation backed by real market data.
          </p>
        </div>

        {/* Right — form */}
        <form onSubmit={handleSubmit} className="max-w-sm lg:ml-auto w-full">
          <div className="flex items-stretch border-2 border-white/15 rounded-lg overflow-hidden mb-4 bg-white/[0.04]">
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
            className="w-full rounded-lg bg-gold px-6 py-4 text-[15px] font-semibold text-white hover:bg-gold-dark disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
          >
            Get your free valuation
          </button>
        </form>
      </div>
    </section>
  )
}
