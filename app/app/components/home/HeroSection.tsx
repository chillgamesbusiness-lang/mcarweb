'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'

export default function HeroSection() {
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
    <section className="relative pt-32 sm:pt-40 pb-20 sm:pb-28 overflow-hidden">
      {/* Background subtle texture */}
      <div className="absolute inset-0 bg-surface-warm" />
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />

      <div className="relative mx-auto max-w-[1280px] px-5 sm:px-8 lg:px-10">
        {/* Small label */}
        <div className="flex items-center gap-2 mb-6">
          <div className="h-px w-8 bg-gold" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-dark">
            Vehicle Valuations
          </span>
        </div>

        {/* Main headline — massive, editorial */}
        <h1 className="max-w-3xl">
          <span className="block text-[clamp(2.5rem,6vw,4.5rem)] font-bold leading-[1.05] tracking-tight text-charcoal">
            A simpler way to
          </span>
          <span className="block text-[clamp(2.5rem,6vw,4.5rem)] font-bold leading-[1.05] tracking-tight text-charcoal">
            sell your car.
          </span>
        </h1>

        <p className="mt-6 text-[17px] sm:text-lg text-warm-gray max-w-xl leading-relaxed">
          Enter your registration, confirm a few details, and get a clear
          valuation backed by real data. No accounts, no pressure, no mess.
        </p>

        {/* Reg input — inline, prominent */}
        <form onSubmit={handleSubmit} className="mt-10 max-w-md">
          <div className="flex items-stretch rounded-[10px] border-2 border-charcoal overflow-hidden shadow-lg shadow-charcoal/5">
            <div className="bg-[#003399] text-white w-12 flex flex-col items-center justify-center gap-0.5 flex-shrink-0 border-r border-charcoal/20">
              <span className="text-[10px] font-bold tracking-wider leading-none">GB</span>
            </div>
            <input
              type="text"
              value={reg}
              onChange={(e) => setReg(e.target.value.toUpperCase())}
              placeholder="YOUR REG"
              required
              minLength={2}
              className="flex-1 px-4 py-[18px] text-[22px] font-bold uppercase tracking-[0.18em] text-charcoal placeholder:text-charcoal/15 focus:outline-none bg-white"
              autoComplete="off"
              spellCheck={false}
            />
            <button
              type="submit"
              disabled={reg.trim().length < 2}
              className="bg-charcoal text-white px-5 sm:px-7 text-[13px] font-semibold tracking-wide flex-shrink-0 hover:bg-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Go
            </button>
          </div>
          <div className="mt-3 flex items-center gap-4 text-[12px] text-warm-gray">
            <span>Free &amp; instant</span>
            <span className="w-[3px] h-[3px] rounded-full bg-warm-border" />
            <span>No account needed</span>
            <span className="w-[3px] h-[3px] rounded-full bg-warm-border" />
            <span>DVLA verified</span>
          </div>
        </form>

        {/* Social proof — not a generic strip, more editorial */}
        <div className="mt-16 pt-10 border-t border-warm-border-light">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 sm:gap-12">
            <div>
              <div className="text-[28px] sm:text-[32px] font-bold text-charcoal tracking-tight">2 min</div>
              <div className="text-[12px] text-warm-gray mt-1">Average time to complete</div>
            </div>
            <div>
              <div className="text-[28px] sm:text-[32px] font-bold text-charcoal tracking-tight">24hr</div>
              <div className="text-[12px] text-warm-gray mt-1">Typical response time</div>
            </div>
            <div>
              <div className="text-[28px] sm:text-[32px] font-bold text-charcoal tracking-tight">Free</div>
              <div className="text-[12px] text-warm-gray mt-1">No hidden costs, ever</div>
            </div>
            <div>
              <div className="text-[28px] sm:text-[32px] font-bold text-charcoal tracking-tight">100%</div>
              <div className="text-[12px] text-warm-gray mt-1">No obligation</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
