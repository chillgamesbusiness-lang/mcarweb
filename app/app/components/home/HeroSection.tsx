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
    <section className="relative min-h-[92vh] flex items-center overflow-hidden">
      {/* Layered gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-surface-warm to-background" />
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 70% 20%, rgba(196,150,60,0.06) 0%, transparent 60%)',
        }}
      />
      {/* Faint geometric grid */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            'linear-gradient(90deg, #C4963C 1px, transparent 1px), linear-gradient(180deg, #C4963C 1px, transparent 1px)',
          backgroundSize: '80px 80px',
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-28 pb-16 w-full">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-20 items-center">
          {/* Left — Copy */}
          <div className="text-center lg:text-left">
            <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] xl:text-6xl font-bold tracking-tight text-charcoal leading-[1.08] animate-fade-in-up">
              Sell Your Car
              <span className="block text-gold mt-1">Without the Hassle</span>
            </h1>
            <p
              className="mt-6 text-lg text-warm-gray max-w-lg mx-auto lg:mx-0 leading-relaxed animate-fade-in-up"
              style={{ animationDelay: '0.1s' }}
            >
              Enter your registration to get started. We verify your vehicle
              details, generate a valuation, and make it easy to book the next
              step.
            </p>

            {/* Trust bullets — desktop */}
            <div
              className="hidden lg:flex flex-wrap gap-x-6 gap-y-3 mt-8 text-sm text-charcoal-light animate-fade-in-up"
              style={{ animationDelay: '0.2s' }}
            >
              {[
                'DVLA-verified vehicle lookup',
                'No obligation valuation',
                'Secure details handling',
              ].map((item) => (
                <span key={item} className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-gold-light flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-3 h-3 text-gold-dark"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={3}
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </span>
                  {item}
                </span>
              ))}
            </div>
          </div>

          {/* Right — Reg Input Card */}
          <div
            className="animate-fade-in-up"
            style={{ animationDelay: '0.15s' }}
          >
            <div className="bg-surface rounded-2xl shadow-xl shadow-black/[0.04] border border-warm-border p-8 sm:p-10">
              <h2 className="text-xl font-semibold text-charcoal mb-1">
                Start your valuation
              </h2>
              <p className="text-sm text-warm-gray mb-6">
                Enter your registration to begin
              </p>

              <form onSubmit={handleSubmit}>
                {/* UK Number Plate Input */}
                <div className="flex items-stretch border-2 border-charcoal rounded-lg overflow-hidden mb-5">
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
                    className="flex-1 px-4 py-4 text-2xl font-bold uppercase tracking-[0.15em] text-center text-charcoal placeholder:text-warm-border focus:outline-none bg-gold-50/30"
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>

                <button
                  type="submit"
                  disabled={reg.trim().length < 2}
                  className="w-full rounded-lg bg-gold px-6 py-4 text-base font-semibold text-white hover:bg-gold-dark disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  Get Your Free Valuation
                </button>
              </form>

              <p className="mt-4 text-xs text-warm-gray text-center">
                Takes less than 2 minutes&ensp;·&ensp;No sign-up required
              </p>
            </div>
          </div>

          {/* Trust bullets — mobile only */}
          <div className="lg:hidden flex flex-wrap justify-center gap-x-5 gap-y-3 text-sm text-charcoal-light animate-fade-in-up">
            {[
              'DVLA-verified lookup',
              'No obligation',
              'Secure handling',
            ].map((item) => (
              <span key={item} className="flex items-center gap-1.5">
                <svg
                  className="w-4 h-4 text-gold"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
