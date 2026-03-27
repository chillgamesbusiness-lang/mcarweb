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
    <section className="relative pt-28 sm:pt-36 pb-24 sm:pb-32 overflow-hidden">
      {/* Animated gradient mesh background */}
      <div className="absolute inset-0 gradient-hero" />
      <div className="absolute top-20 right-[10%] w-[500px] h-[500px] rounded-full bg-gold/[0.04] blur-[100px] animate-float" />
      <div className="absolute bottom-0 left-[5%] w-[400px] h-[400px] rounded-full bg-gold/[0.03] blur-[80px] animate-float" style={{ animationDelay: '3s' }} />
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background to-transparent" />

      <div className="relative mx-auto max-w-[1280px] px-5 sm:px-8 lg:px-10">
        {/* Animated label */}
        <div className="flex items-center gap-3 mb-8 animate-fade-in-up">
          <div className="flex items-center gap-2 bg-gold/[0.08] border border-gold/15 rounded-full px-4 py-1.5">
            <span className="w-2 h-2 rounded-full gradient-gold animate-pulse-glow" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-gold-dark">
              Free Vehicle Valuations
            </span>
          </div>
        </div>

        {/* Main headline — massive, with gradient text */}
        <h1 className="max-w-4xl animate-fade-in-up stagger-1">
          <span className="block text-[clamp(2.8rem,7vw,5.5rem)] font-extrabold leading-[1.02] tracking-[-0.02em] text-charcoal-deep">
            A simpler way to
          </span>
          <span className="block text-[clamp(2.8rem,7vw,5.5rem)] font-extrabold leading-[1.02] tracking-[-0.02em] gradient-gold-text">
            sell your car.
          </span>
        </h1>

        <p className="mt-7 text-[18px] sm:text-[20px] text-warm-gray max-w-xl leading-[1.7] animate-fade-in-up stagger-2">
          Enter your registration, confirm a few details, and get a clear
          valuation backed by real data. No accounts, no pressure, no mess.
        </p>

        {/* Premium reg input */}
        <form onSubmit={handleSubmit} className="mt-10 max-w-md animate-fade-in-up stagger-3">
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
              Go
            </button>
          </div>
          <div className="mt-4 flex items-center gap-4 text-[12px] text-warm-gray/80">
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-accent-emerald" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
              Free &amp; instant
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-accent-emerald" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
              No account needed
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-accent-emerald" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
              DVLA verified
            </span>
          </div>
        </form>

        {/* Social proof — premium stat cards */}
        <div className="mt-20 pt-10 animate-fade-in-up stagger-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-5">
            {[
              { value: '2 min', label: 'Average time to complete', icon: '⚡' },
              { value: '24hr', label: 'Typical response time', icon: '🕐' },
              { value: 'Free', label: 'No hidden costs, ever', icon: '✓' },
              { value: '100%', label: 'No obligation', icon: '🛡️' },
            ].map((stat, i) => (
              <div
                key={stat.label}
                className="card-premium p-5 sm:p-6 text-center group cursor-default"
                style={{ animationDelay: `${0.5 + i * 0.1}s` }}
              >
                <div className="text-2xl mb-2">{stat.icon}</div>
                <div className="text-[26px] sm:text-[30px] font-extrabold text-charcoal-deep tracking-tight">{stat.value}</div>
                <div className="text-[11px] text-warm-gray mt-1.5 leading-snug">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
