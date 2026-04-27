import ScrollReveal from './ScrollReveal'

export default function HowItWorksSection() {
  const steps = [
    {
      num: '01',
      title: 'Enter your reg',
      text: 'We pull your vehicle straight from DVLA — make, model, year, fuel, colour, tax status, full MOT history. All verified in seconds.',
      tag: 'DVLA + MOT API',
    },
    {
      num: '02',
      title: 'We crunch the data',
      text: 'Mileage vs MOT records. Condition weighting. Regional pricing. Market comparisons. Our engine runs 15+ checks to generate your range.',
      tag: '15+ data points',
    },
    {
      num: '03',
      title: 'See your true price',
      text: 'A grounded min–max range you can actually use. If it looks right, book an appointment. If not, walk away. No pressure, no commitment.',
      tag: 'Zero obligation',
    },
  ]

  return (
    <section id="how" className="relative px-5 sm:px-8 lg:px-10 py-24 sm:py-32">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-gold/[0.06] blur-[120px]" />

      <div className="mx-auto max-w-3xl relative">
        <ScrollReveal>
          <div className="mb-16">
            <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-gold/60 block mb-4">
              The process
            </span>
            <h2 className="text-[clamp(2rem,4vw,3.25rem)] font-extrabold tracking-[-0.02em] text-foreground leading-[1.08] dark:text-white">
              How the engine <span className="text-gold">actually works.</span>
            </h2>
          </div>
        </ScrollReveal>

        <div className="flex flex-col gap-0">
          {steps.map((item, i) => (
            <ScrollReveal key={item.num} delay={i * 0.08}>
              <div className={`flex items-start gap-5 sm:gap-7 py-7 sm:py-8 ${i < steps.length - 1 ? 'border-b border-warm-border-light dark:border-white/[0.06]' : ''}`}>
                {/* Step number */}
                <span className="font-mono text-[28px] sm:text-[44px] font-black text-gold/[0.15] leading-none select-none shrink-0 w-[38px] sm:w-[52px] text-center">
                  {item.num}
                </span>

                {/* Content */}
                <div className="min-w-0 flex-1 pt-0.5">
                  <h3 className="text-[17px] font-bold text-foreground mb-2 tracking-[-0.01em] dark:text-white">
                    {item.title}
                  </h3>
                  <p className="text-[14px] text-warm-gray leading-relaxed mb-3 dark:text-white/45">
                    {item.text}
                  </p>
                  <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-gold/50">
                    {item.tag}
                  </span>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}
