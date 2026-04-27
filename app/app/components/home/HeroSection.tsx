'use client'

import { useState, useEffect, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'

/* ── Animated data-pull feed shown on desktop ───────────────────────── */

const FEED = [
  { text: 'DVLA vehicle record pulled', delay: 800 },
  { text: 'MOT history: 6 tests found', delay: 1500 },
  { text: 'Mileage verified against MOT', delay: 2100 },
  { text: '23 comparable listings analysed', delay: 2700 },
  { text: 'Regional pricing calibrated', delay: 3300 },
]

function LiveDemo() {
  const [step, setStep] = useState(0)
  const [showValue, setShowValue] = useState(false)

  useEffect(() => {
    const timers = FEED.map((_, i) =>
      setTimeout(() => setStep(i + 1), FEED[i].delay),
    )
    timers.push(setTimeout(() => setShowValue(true), 4000))
    return () => timers.forEach(clearTimeout)
  }, [])

  return (
    <div className="relative hidden lg:block">
      {/* Outer glow */}
      <div className="absolute -inset-8 rounded-[2.5rem] bg-gold/[0.04] blur-3xl pointer-events-none" />

      <div className="relative rounded-3xl border border-warm-border bg-white p-7 shadow-2xl shadow-black/10 dark:border-white/[0.10] dark:bg-white/[0.04] dark:shadow-black/25">
        {/* Card header */}
        <div className="mb-5 flex items-center justify-between border-b border-warm-border-light pb-4 dark:border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="flex items-center rounded-lg border border-warm-border-light bg-surface-warm px-3 py-1.5 font-mono text-[13px] font-bold tracking-wider text-foreground dark:border-transparent dark:bg-white/[0.08] dark:text-white/90">
              <span className="text-gold text-[10px] mr-1.5 font-extrabold">GB</span>
              BD18 XYZ
            </div>
            <div>
              <p className="text-[14px] font-bold text-foreground dark:text-white">BMW 3 Series</p>
              <p className="text-[11px] text-warm-gray dark:text-white/30">2018 · 320d · Diesel · 45,200 mi</p>
            </div>
          </div>
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-warm-border dark:bg-white/10" />
            <div className="w-2.5 h-2.5 rounded-full bg-warm-border dark:bg-white/10" />
            <div className="w-2.5 h-2.5 rounded-full bg-gold/60" />
          </div>
        </div>

        {/* Data feed lines */}
        <div className="space-y-2.5 mb-6">
          {FEED.map((line, i) => (
            <div
              key={line.text}
              className="flex items-center gap-2.5 text-[12px]"
              style={{
                opacity: i < step ? 1 : 0.12,
                transform: i < step ? 'translateX(0)' : 'translateX(8px)',
                transition: 'all 0.5s cubic-bezier(0.16,1,0.3,1)',
              }}
            >
              <svg
                className={`w-3.5 h-3.5 shrink-0 transition-colors duration-300 ${
                  i < step ? 'text-gold' : 'text-warm-border dark:text-white/10'
                }`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="font-mono text-warm-gray dark:text-white/50">{line.text}</span>
            </div>
          ))}
        </div>

        {/* Valuation result */}
        <div
          className="rounded-2xl border border-gold/25 bg-gold/[0.08] p-5 text-center dark:border-gold/20 dark:bg-gold/[0.06]"
          style={{
            opacity: showValue ? 1 : 0,
            transform: showValue ? 'scale(1)' : 'scale(0.96)',
            transition: 'all 0.8s cubic-bezier(0.16,1,0.3,1)',
          }}
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold/70 mb-1.5">
            Estimated market value
          </p>
          <p className="text-[34px] font-extrabold text-foreground tracking-tight leading-none dark:text-white">
            £12,400
          </p>
          <p className="mt-2 font-mono text-[12px] text-warm-gray dark:text-white/30">
            Range: £11,800 — £13,200
          </p>
        </div>
      </div>
    </div>
  )
}

/* ── Hero ────────────────────────────────────────────────────────────── */

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
    <section className="relative pt-20 sm:pt-32 lg:pt-36 pb-14 sm:pb-24 lg:pb-28 overflow-hidden">
      <div className="absolute inset-0 hero-dot-grid opacity-[0.15]" />
      <div className="absolute top-0 inset-x-0 h-[600px] bg-gradient-to-b from-gold/[0.05] to-transparent" />

      <div className="relative mx-auto max-w-[1280px] px-5 sm:px-8 lg:px-10">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-8 sm:gap-10 lg:gap-16 items-center">
          {/* ── Left column ─────────────────────────────────────────── */}
          <div>
            {/* Warning badge */}
            <div className="flex items-center gap-3 mb-5 sm:mb-8 animate-fade-in-up">
              <div className="flex items-center gap-2.5 border-l-2 border-gold pl-3">
                <span className="text-[12px] font-semibold text-gold tracking-wide">
                  Most sellers lose £500–£2,000 selling their car
                </span>
              </div>
            </div>

            {/* Headline */}
            <h1 className="animate-fade-in-up stagger-1">
              <span className="block text-[clamp(1.75rem,8vw,5rem)] font-extrabold leading-[1.05] tracking-[-0.03em] text-foreground dark:text-white">
                The number dealers
              </span>
              <span className="block text-[clamp(1.75rem,8vw,5rem)] font-extrabold leading-[1.05] tracking-[-0.03em] gradient-gold-text">
                don&apos;t want you to see.
              </span>
            </h1>

            <p className="mt-5 text-[15px] sm:text-[17px] lg:text-[19px] text-warm-gray max-w-lg leading-[1.7] animate-fade-in-up stagger-2 dark:text-white/55">
              We pull DVLA records, MOT history, and real market data to show
              what your car is{' '}
              <strong className="text-foreground font-semibold dark:text-white">
                actually worth
              </strong>{' '}
              — before anyone lowballs you.
            </p>

            {/* Reg input */}
            <form
              onSubmit={handleSubmit}
              className="mt-7 sm:mt-9 w-full max-w-md animate-fade-in-up stagger-3"
            >
              <div className="flex items-stretch rounded-2xl border-2 border-warm-border overflow-hidden shadow-xl shadow-black/10 hover:shadow-2xl hover:shadow-black/15 transition-all duration-500 group dark:border-white/[0.15] dark:shadow-black/30 dark:hover:shadow-black/40">
                <div className="bg-[#003399] text-white w-14 flex flex-col items-center justify-center gap-1 flex-shrink-0 border-r border-charcoal/20">
                  <svg viewBox="0 0 30 20" className="w-5 h-3.5" fill="none">
                    <circle cx="15" cy="10" r="4" stroke="white" strokeWidth="0.8" fill="none" />
                    {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle) => (
                      <circle key={angle} cx={15 + 4 * Math.cos((angle * Math.PI) / 180)} cy={10 + 4 * Math.sin((angle * Math.PI) / 180)} r="0.3" fill="#FFD700" />
                    ))}
                  </svg>
                  <span className="text-[9px] font-bold tracking-wider leading-none">GB</span>
                </div>
                <input
                  type="text"
                  value={reg}
                  onChange={(e) => setReg(e.target.value.toUpperCase())}
                  placeholder="YOUR REG"
                  required
                  minLength={2}
                  aria-label="Vehicle registration"
                  className="min-w-0 flex-1 px-3 sm:px-5 py-4 sm:py-5 text-[18px] sm:text-[22px] font-bold uppercase tracking-[0.15em] sm:tracking-[0.2em] text-charcoal-deep placeholder:text-charcoal/45 focus:outline-none bg-white"
                  autoComplete="off"
                  spellCheck={false}
                />
                <button
                  type="submit"
                  disabled={reg.trim().length < 2}
                  className="gradient-gold text-white px-5 sm:px-8 text-[14px] sm:text-[15px] font-bold tracking-wide shrink-0 whitespace-nowrap disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300 hover:brightness-110 active:scale-[0.98] shadow-inner shadow-black/10"
                >
                  Go
                </button>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-warm-gray dark:text-white/40">
                {['Free & instant', 'No sign-up', 'DVLA verified'].map((label) => (
                  <span key={label} className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-gold" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {label}
                  </span>
                ))}
              </div>
            </form>

            {/* Stats strip */}
            <div className="mt-8 sm:mt-12 grid grid-cols-3 animate-fade-in-up stagger-4">
              {[
                { value: '6', label: 'Data sources' },
                { value: '15+', label: 'Valuation checks' },
                { value: '<2min', label: 'To get results' },
              ].map((stat, i) => (
                <div
                  key={stat.label}
                  className={`${i > 0 ? 'border-l border-warm-border pl-4 sm:pl-8 lg:pl-10 dark:border-white/[0.08]' : ''}`}
                >
                  <p className="text-[22px] sm:text-[28px] font-extrabold text-foreground tracking-tight dark:text-white">
                    {stat.value}
                  </p>
                  <p className="text-[10px] sm:text-[11px] text-warm-gray uppercase tracking-wider font-medium mt-0.5 dark:text-white/40">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>

            {/* Mobile-only compact demo */}
            <div className="mt-10 lg:hidden animate-fade-in-up stagger-4">
              <div className="card-premium p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex items-center bg-charcoal-deep text-white font-mono text-[11px] font-bold px-2.5 py-1 rounded-md">
                    <span className="text-[8px] text-gold mr-1">GB</span>BD18 XYZ
                  </span>
                  <span className="text-[13px] font-semibold text-foreground dark:text-white">BMW 3 Series</span>
                  <span className="text-[11px] text-warm-gray dark:text-white/40">2018</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gold mb-0.5">Market value</p>
                    <p className="text-[22px] font-extrabold text-foreground dark:text-white">£12,400</p>
                  </div>
                  <div className="w-px h-10 bg-warm-border dark:bg-white/[0.08]" />
                  <div className="flex-1 text-right">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-warm-gray mb-0.5 dark:text-white/35">Dealer offer</p>
                    <p className="text-[22px] font-extrabold text-warm-gray/70 line-through dark:text-white/30">£9,500</p>
                  </div>
                </div>
                <p className="mt-3 text-[12px] text-gold font-semibold">
                  You&apos;d save £2,900 knowing this first
                </p>
              </div>
            </div>
          </div>

          {/* ── Right column — live demo ────────────────────────────── */}
          <LiveDemo />
        </div>
      </div>
    </section>
  )
}
