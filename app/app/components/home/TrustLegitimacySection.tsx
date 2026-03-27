export default function TrustLegitimacySection() {
  const trustPoints = [
    {
      label: 'DVLA-verified data',
      text: 'Every vehicle is checked against official DVLA records. Make, model, year, fuel type, MOT history — pulled direct, not guessed.',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
      ),
    },
    {
      label: 'Encrypted & responsible',
      text: 'Your personal information is handled in line with UK data protection standards. We don\u2019t sell it, share it, or use it for marketing.',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
      ),
    },
    {
      label: 'Market-grounded valuations',
      text: 'Prices are backed by condition, mileage, MOT history, and real market data. Not inflated to bait you, not deflated to buy cheap.',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
        </svg>
      ),
    },
    {
      label: 'No obligation at any point',
      text: 'Get your valuation, think about it, walk away. There\u2019s no sales call, no chasing, no countdown timer.',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
        </svg>
      ),
    },
  ]

  return (
    <section className="px-5 sm:px-8 lg:px-10 py-24 sm:py-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-surface-warm via-background to-surface-warm" />
      <div className="mx-auto max-w-[1280px] relative grid lg:grid-cols-[1fr_1.1fr] gap-16 lg:gap-24 items-start">
        {/* Left — headline + pull-quote */}
        <div className="lg:sticky lg:top-28">
          <div className="inline-flex items-center gap-2 bg-gold/[0.08] border border-gold/15 rounded-full px-4 py-1.5 mb-6">
            <svg className="w-4 h-4 text-gold" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-gold-dark">
              Legitimacy
            </span>
          </div>
          <h2 className="text-[clamp(2rem,4vw,3.25rem)] font-extrabold tracking-[-0.02em] text-charcoal-deep leading-[1.08] mb-8">
            No gimmicks.<br />No inflated<br /><span className="gradient-gold-text">numbers.</span>
          </h2>
          <div className="card-premium p-6 bg-gold-50/50">
            <blockquote className="border-l-3 border-gold pl-5 text-warm-gray leading-relaxed italic text-[15px]">
              &ldquo;We built this because we were tired of seeing sellers get
              messed around by vague online quotes and pressure tactics.&rdquo;
            </blockquote>
          </div>
        </div>

        {/* Right — trust point cards */}
        <div className="space-y-4">
          {trustPoints.map((item, i) => (
            <div key={item.label} className="card-premium p-6 group" style={{ animationDelay: `${i * 0.1}s` }}>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-gold/[0.08] flex items-center justify-center text-gold shrink-0 group-hover:bg-gold group-hover:text-white transition-all duration-500">
                  {item.icon}
                </div>
                <div>
                  <h3 className="text-[16px] font-bold text-charcoal-deep mb-2">
                    {item.label}
                  </h3>
                  <p className="text-[14px] text-warm-gray leading-relaxed">
                    {item.text}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
