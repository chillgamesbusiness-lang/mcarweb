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

      <div className="relative bg-[#0f0f14] dark:bg-white/[0.04] rounded-3xl p-7 border border-white/[0.06] dark:border-white/[0.10] shadow-2xl shadow-black/25">
        {/* Card header */}
        <div className="flex items-center justify-between mb-5 pb-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-white/[0.08] font-mono text-[13px] font-bold px-3 py-1.5 rounded-lg text-white/90 tracking-wider">
              <span className="text-gold text-[10px] mr-1.5 font-extrabold">GB</span>
              BD18 XYZ
            </div>
            <div>
              <p className="text-[14px] font-bold text-white">BMW 3 Series</p>
              <p className="text-[11px] text-white/30">2018 · 320d · Diesel · 45,200 mi</p>
            </div>
          </div>
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
            <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
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
                  i < step ? 'text-gold' : 'text-white/10'
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
              <span className="text-white/50 font-mono">{line.text}</span>
            </div>
          ))}
        </div>

        {/* Valuation result */}
        <div
          className="rounded-2xl border border-gold/20 bg-gold/[0.06] p-5 text-center"
          style={{
            opacity: showValue ? 1 : 0,
            transform: showValue ? 'scale(1)' : 'scale(0.96)',
            transition: 'all 0.8s cubic-bezier(0.16,1,0.3,1)',
          }}
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold/70 mb-1.5">
            Estimated market value
          </p>
          <p className="text-[34px] font-extrabold text-white tracking-tight leading-none">
            £12,400
          </p>
          <p className="text-[12px] text-white/30 mt-2 font-mono">
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
    <section className="relative pt-28 sm:pt-36 pb-20 sm:pb-28 overflow-hidden">
      {/* Background: dot grid + warm gradient */}
      <div className="absolute inset-0 hero-dot-grid" />
      <div className="absolute inset-0 bg-gradient-to-b from-surface-warm/80 to-background" />
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />

      <div className="relative mx-auto max-w-[1280px] px-5 sm:px-8 lg:px-10">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-12 lg:gap-16 items-center">
          {/* ── Left column ─────────────────────────────────────────── */}
          <div>
            {/* Warning badge */}
            <div className="flex items-center gap-3 mb-8 animate-fade-in-up">
              <div className="flex items-center gap-2.5 border-l-2 border-gold pl-3">
                <span className="text-[12px] font-semibold text-gold-dark tracking-wide">
                  Most sellers lose £500–£2,000 selling their car
                </span>
              </div>
            </div>

            {/* Headline */}
            <h1 className="animate-fade-in-up stagger-1">
              <span className="block text-[clamp(2.6rem,6.5vw,5rem)] font-extrabold leading-[1.02] tracking-[-0.03em] text-charcoal-deep">
                The number dealers
              </span>
              <span className="block text-[clamp(2.6rem,6.5vw,5rem)] font-extrabold leading-[1.02] tracking-[-0.03em] gradient-gold-text">
                don&apos;t want you to see.
              </span>
            </h1>

            <p className="mt-6 text-[17px] sm:text-[19px] text-warm-gray max-w-lg leading-[1.7] animate-fade-in-up stagger-2">
              We pull DVLA records, MOT history, and real market data to show
              what your car is{' '}
              <strong className="text-foreground font-semibold">
                actually worth
              </strong>{' '}
              — before anyone lowballs you.
            </p>

            {/* Reg input */}
            <form
              onSubmit={handleSubmit}
              className="mt-9 max-w-md animate-fade-in-up stagger-3"
            >
              <div className="flex items-stretch rounded-2xl border-2 border-charcoal-deep overflow-hidden shadow-xl shadow-charcoal/10 hover:shadow-2xl hover:shadow-charcoal/15 transition-all duration-500 group">
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
                  className="flex-1 px-5 py-5 text-[24px] font-bold uppercase tracking-[0.2em] text-charcoal-deep placeholder:text-charcoal/10 focus:outline-none bg-white"
                  autoComplete="off"
                  spellCheck={false}
                />
                <button
                  type="submit"
                  disabled={reg.trim().length < 2}
                  className="gradient-gold text-white px-7 sm:px-8 text-[14px] font-bold tracking-wide flex-shrink-0 disabled:opacity-20 disabled:cursor-not-allowed transition-all duration-300 hover:opacity-90 active:scale-[0.98]"
                >
                  Check
                </button>
              </div>
              <div className="mt-4 flex items-center gap-4 text-[12px] text-warm-gray/80">
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
            <div className="mt-12 flex items-center gap-6 sm:gap-10 animate-fade-in-up stagger-4">
              {[
                { value: '6', label: 'Data sources' },
                { value: '15+', label: 'Valuation checks' },
                { value: '<2min', label: 'To get results' },
              ].map((stat, i) => (
                <div
                  key={stat.label}
                  className={i > 0 ? 'border-l border-warm-border pl-6 sm:pl-10' : ''}
                >
                  <p className="text-[24px] sm:text-[28px] font-extrabold text-charcoal-deep tracking-tight">
                    {stat.value}
                  </p>
                  <p className="text-[11px] text-warm-gray uppercase tracking-wider font-medium mt-0.5">
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
                  <span className="text-[13px] font-semibold text-charcoal-deep">BMW 3 Series</span>
                  <span className="text-[11px] text-warm-gray">2018</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gold mb-0.5">Market value</p>
                    <p className="text-[22px] font-extrabold text-charcoal-deep">£12,400</p>
                  </div>
                  <div className="w-px h-10 bg-warm-border" />
                  <div className="flex-1 text-right">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-warm-gray mb-0.5">Dealer offer</p>
                    <p className="text-[22px] font-extrabold text-warm-gray/60 line-through">£9,500</p>
                  </div>
                </div>
                <p className="mt-3 text-[12px] text-gold-dark font-semibold">
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
