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
    <section className="relative px-5 sm:px-8 lg:px-10 py-24 sm:py-32 overflow-hidden">
      <div className="absolute inset-0 bg-[#111111]" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-gold/[0.08] blur-[120px] animate-float" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-gold/[0.05] blur-[100px] animate-float" style={{ animationDelay: '3s' }} />

      <div className="mx-auto max-w-[1280px] relative grid lg:grid-cols-[1.2fr_1fr] gap-12 lg:gap-20 items-center">
        {/* Left — headline */}
        <div>
          <div className="inline-flex items-center gap-2 bg-white/[0.06] border border-white/[0.08] rounded-full px-4 py-1.5 mb-8">
            <span className="w-2 h-2 rounded-full bg-gold animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-gold/80">
              Takes under 2 minutes
            </span>
          </div>
          <h2 className="text-[clamp(2.2rem,5vw,4rem)] font-extrabold tracking-[-0.02em] text-white leading-[1.05] mb-6">
            Don&apos;t sell your car<br />without seeing <span className="gradient-gold-text">this number.</span>
          </h2>
          <p className="text-white/40 text-[16px] leading-relaxed max-w-md">
            Enter your reg. We pull DVLA records, MOT history, and market data — and show you what buyers are actually paying for cars like yours.
          </p>
        </div>

        {/* Right — premium form */}
        <form onSubmit={handleSubmit} className="max-w-sm lg:ml-auto w-full">
          <div className="bg-white/[0.06] border border-white/[0.08] rounded-3xl p-6 backdrop-blur-sm">
            <div className="flex items-stretch border-2 border-white/15 rounded-2xl overflow-hidden mb-5">
              <div className="bg-[#003DA5]/80 text-white w-12 flex flex-col items-center justify-center gap-1 flex-shrink-0">
                <svg viewBox="0 0 30 20" className="w-5 h-3.5" fill="none">
                  <circle cx="15" cy="10" r="4" stroke="white" strokeWidth="0.8" fill="none" />
                  {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle) => (
                    <circle key={angle} cx={15 + 4 * Math.cos((angle * Math.PI) / 180)} cy={10 + 4 * Math.sin((angle * Math.PI) / 180)} r="0.3" fill="#FFD700" />
                  ))}
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
                className="flex-1 px-4 py-5 text-xl font-bold uppercase tracking-[0.15em] text-center text-white placeholder:text-white/20 focus:outline-none bg-transparent"
                autoComplete="off"
                spellCheck={false}
              />
            </div>

            <button
              type="submit"
              disabled={reg.trim().length < 2}
              className="w-full rounded-2xl gradient-gold px-6 py-4 text-[15px] font-bold text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300 hover:shadow-lg hover:shadow-gold/30 active:scale-[0.98]"
            >
              Check your car’s real value
            </button>

            <p className="text-xs text-white/30 text-center mt-4 flex items-center justify-center gap-3">
              <span className="flex items-center gap-1">
                <svg className="w-3 h-3 text-gold/60" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                DVLA verified
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-3 h-3 text-gold/60" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                Zero obligation
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-3 h-3 text-gold/60" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                No sign-up
              </span>
            </p>
          </div>
        </form>
      </div>
    </section>
  )
}
