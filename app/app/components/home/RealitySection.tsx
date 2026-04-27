import ScrollReveal from './ScrollReveal'

export default function RealitySection() {
  return (
    <section className="px-5 sm:px-8 lg:px-10 py-20 sm:py-28 relative overflow-hidden">
      <div className="mx-auto max-w-[1280px] relative">
        <div className="grid lg:grid-cols-[1fr_1fr] gap-8 sm:gap-12 lg:gap-20 items-center">
          {/* Left — editorial statement */}
          <ScrollReveal>
            <div className="border-l-2 border-gold pl-6 sm:pl-8 mb-6">
              <span className="text-[12px] font-semibold text-gold tracking-wide">
                The reality of selling a car
              </span>
            </div>
            <h2 className="text-[clamp(1.8rem,4vw,3rem)] font-extrabold tracking-[-0.02em] text-foreground leading-[1.12] mb-8 dark:text-white">
              Most people lose <span className="gradient-gold-text">£500–£2,000</span> selling their car.
            </h2>
            <div className="space-y-4 text-[17px] sm:text-[19px] text-warm-gray leading-relaxed dark:text-white/50">
              <p>Not because of the market.</p>
              <p>Not because of the car.</p>
              <p className="text-foreground font-semibold dark:text-white">
                Because they didn&apos;t know the real value before someone made them an offer.
              </p>
            </div>
          </ScrollReveal>

          {/* Right — data pipeline as a vertical "receipt" strip */}
          <ScrollReveal delay={0.15}>
            <div className="card-premium p-0 overflow-hidden">
              <div className="px-6 py-4 border-b border-warm-border-light dark:border-white/[0.06]">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold">What we check</span>
              </div>
              {[
                { label: 'DVLA + MOT records', desc: 'Official vehicle history pulled in real time' },
                { label: 'Real market listings', desc: 'Compared against sold vehicles near you' },
                { label: 'Condition + mileage', desc: 'Specific to your car, not a generic estimate' },
              ].map((item, i) => (
                <div key={item.label} className={`px-6 py-5 flex items-start gap-4 ${i < 2 ? 'border-b border-warm-border-light dark:border-white/[0.06]' : ''}`}>
                  <span className="text-[11px] font-mono text-gold/40 mt-0.5 select-none">{String(i + 1).padStart(2, '0')}</span>
                  <div>
                    <p className="text-[14px] font-bold text-foreground mb-0.5 dark:text-white">{item.label}</p>
                    <p className="text-[13px] text-warm-gray leading-snug dark:text-white/50">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  )
}
