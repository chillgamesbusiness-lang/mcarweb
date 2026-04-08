import ScrollReveal from './ScrollReveal'

export default function WhyChooseUsSection() {
  return (
    <section className="px-5 sm:px-8 lg:px-10 py-24 sm:py-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-surface-warm via-background to-surface-warm" />
      <div className="mx-auto max-w-[1280px] relative">
        <ScrollReveal>
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-gold/[0.08] border border-gold/15 rounded-full px-4 py-1.5 mb-6">
              <svg className="w-4 h-4 text-gold" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
              <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-gold-dark">Why this works</span>
            </div>
            <h2 className="text-[clamp(2rem,4vw,3.25rem)] font-extrabold tracking-[-0.02em] text-charcoal-deep leading-[1.08]">
              This isn&apos;t a quote generator.
              <br />
              It&apos;s a <span className="gradient-gold-text">pricing system.</span>
            </h2>
            <p className="mt-5 text-warm-gray text-[16px] leading-relaxed max-w-xl mx-auto">
              We built the same valuation engine a dealer uses internally — then made it public.
            </p>
          </div>
        </ScrollReveal>

        {/* Bento grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 1: Tall left card */}
          <ScrollReveal className="md:row-span-2" delay={0.05}>
            <div className="card-premium p-8 h-full flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-2xl gradient-gold flex items-center justify-center mb-6 group-hover:shadow-lg group-hover:shadow-gold/20 transition-all duration-500">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="text-[20px] font-bold text-charcoal-deep mb-3 leading-snug">
                  You see the number before anyone makes an offer.
                </h3>
                <p className="text-[15px] text-warm-gray leading-relaxed">
                  Most buyers anchor you with their price first — then you&apos;re stuck negotiating from their number. We flip that. You walk in knowing exactly what the market says.
                </p>
              </div>
              <div className="mt-8 flex items-center gap-3 text-[12px] font-semibold text-gold-dark">
                <span className="w-8 h-[2px] bg-gold/30 rounded-full" />
                Leverage, not guesswork
              </div>
            </div>
          </ScrollReveal>

          {/* 2: 6+ data sources */}
          <ScrollReveal delay={0.15}>
            <div className="card-premium p-7 group h-full">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-gold/[0.08] flex items-center justify-center text-gold shrink-0 group-hover:bg-gold group-hover:text-white transition-all duration-500">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-[16px] font-bold text-charcoal-deep mb-1.5">6+ verified data sources</h3>
                  <p className="text-[14px] text-warm-gray leading-relaxed">
                    DVLA. MOT history. Mileage checks. Regional pricing. Resale evidence. Nothing is guessed.
                  </p>
                </div>
              </div>
            </div>
          </ScrollReveal>

          {/* 3: No listing */}
          <ScrollReveal delay={0.25}>
            <div className="card-premium p-7 group h-full">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-gold/[0.08] flex items-center justify-center text-gold shrink-0 group-hover:bg-gold group-hover:text-white transition-all duration-500">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-[16px] font-bold text-charcoal-deep mb-1.5">No listing. No haggling.</h3>
                  <p className="text-[14px] text-warm-gray leading-relaxed">
                    No photos, tyre-kickers, or lowball texts at 11pm. Get your valuation, book an appointment, done.
                  </p>
                </div>
              </div>
            </div>
          </ScrollReveal>

          {/* 4: Wide — zero obligation */}
          <ScrollReveal className="md:col-span-2" delay={0.2}>
            <div className="card-premium p-7 group h-full">
              <div className="flex items-start gap-5">
                <div className="w-11 h-11 rounded-xl bg-gold/[0.08] flex items-center justify-center text-gold shrink-0 group-hover:bg-gold group-hover:text-white transition-all duration-500">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-[16px] font-bold text-charcoal-deep mb-1.5">Walk away at any point. Seriously.</h3>
                  <p className="text-[14px] text-warm-gray leading-relaxed max-w-lg">
                    No account. No credit card. No chasing calls. Get your figure, think about it, come back next week or never. Zero obligation at every step.
                  </p>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>

        {/* Trust badges (absorbed from TrustLegitimacy) */}
        <ScrollReveal delay={0.3}>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-[12px] text-warm-gray/70">
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4 text-gold/60" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
              Encrypted &amp; UK GDPR compliant
            </span>
            <span className="text-warm-border">·</span>
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4 text-gold/60" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
              No third-party data sharing
            </span>
            <span className="text-warm-border">·</span>
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4 text-gold/60" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
              No spam, no calls, no pressure
            </span>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
