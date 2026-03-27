export default function TrustLegitimacySection() {
  return (
    <section className="px-5 sm:px-8 lg:px-10 py-20 sm:py-28 bg-surface-warm">
      <div className="mx-auto max-w-[1280px] grid lg:grid-cols-[1fr_1.1fr] gap-16 lg:gap-24 items-start">
        {/* Left — headline + pull-quote */}
        <div className="lg:sticky lg:top-28">
          <div className="flex items-center gap-2 mb-5">
            <div className="h-px w-8 bg-gold/50" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold/70">
              Legitimacy
            </span>
          </div>
          <h2 className="text-[clamp(1.75rem,3.5vw,2.75rem)] font-bold tracking-tight text-charcoal leading-[1.1] mb-8">
            No gimmicks. No inflated numbers.
          </h2>
          <blockquote className="border-l-2 border-gold/40 pl-5 text-warm-gray leading-relaxed italic">
            &ldquo;We built this because we were tired of seeing sellers get
            messed around by vague online quotes and pressure tactics.&rdquo;
          </blockquote>
        </div>

        {/* Right — trust points */}
        <div className="space-y-0 divide-y divide-warm-border">
          {[
            {
              label: 'DVLA-verified data',
              text: 'Every vehicle is checked against official DVLA records. Make, model, year, fuel type, MOT history — pulled direct, not guessed.',
            },
            {
              label: 'Encrypted & responsible',
              text: 'Your personal information is handled in line with UK data protection standards. We don\u2019t sell it, share it, or use it for marketing.',
            },
            {
              label: 'Market-grounded valuations',
              text: 'Prices are backed by condition, mileage, MOT history, and real market data. Not inflated to bait you, not deflated to buy cheap.',
            },
            {
              label: 'No obligation at any point',
              text: 'Get your valuation, think about it, walk away. There\u2019s no sales call, no chasing, no countdown timer.',
            },
          ].map((item) => (
            <div key={item.label} className="py-6 first:pt-0 last:pb-0">
              <h3 className="text-[15px] font-semibold text-charcoal mb-2">
                {item.label}
              </h3>
              <p className="text-[14px] text-warm-gray leading-relaxed">
                {item.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
