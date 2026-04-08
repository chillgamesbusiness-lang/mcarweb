import ScrollReveal from './ScrollReveal'

const faqs = [
  {
    q: 'Is this actually free? What\u2019s the catch?',
    a: 'No catch. The valuation is free because we make money when you sell your car through us — not before. If you never sell, we never earn. That\u2019s the alignment.',
  },
  {
    q: 'Will I get lowballed?',
    a: 'The whole point of this system is to prevent that. We show you a data-backed range using DVLA records, MOT history, and live market listings. You see the number before anyone makes you an offer — so you\u2019ll know if it\u2019s fair.',
  },
  {
    q: 'How is this different from webuyanycar or AutoTrader?',
    a: 'Most online valuations inflate numbers to get you through the door, then drop the price on the day. We give you a realistic range up front — grounded in the same data dealers use internally. No bait-and-switch.',
  },
  {
    q: 'What data do you actually use?',
    a: 'DVLA vehicle records, full MOT history (including advisories), current mileage, vehicle condition, regional market data, and comparable sold listings. Six verified sources, not one algorithm.',
  },
  {
    q: 'Will you call me or spam me?',
    a: 'No. We don\u2019t call. We don\u2019t pass your number to third parties. We send one OTP to verify your phone and that\u2019s it. If you book an appointment, we\u2019ll send a confirmation. Nothing else.',
  },
  {
    q: 'What if I don\u2019t like the valuation?',
    a: 'Close the tab. Seriously. There\u2019s no obligation, no follow-up, no "but wait" email. The point is you now know what your car is worth. That\u2019s valuable whether you sell with us or not.',
  },
  {
    q: 'How accurate is the valuation?',
    a: 'It\u2019s a range, not a single number — because honest valuations are ranges. The final figure depends on in-person condition, but the range is tight and data-backed. We don\u2019t pad it to make you feel good.',
  },
  {
    q: 'How long does it take?',
    a: 'Under two minutes to get your valuation. Enter your reg, confirm a couple of details, done. If you want to proceed, you can book an appointment in the same session.',
  },
]

export default function FaqSection() {
  return (
    <section id="faq" className="px-5 sm:px-8 lg:px-10 py-24 sm:py-32 relative overflow-hidden">
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] rounded-full bg-gold/[0.04] blur-[140px]" />
      <div className="mx-auto max-w-[1280px] relative grid lg:grid-cols-[0.4fr_1fr] gap-8 sm:gap-12 lg:gap-20 items-start">
        {/* Left – sticky heading */}
        <ScrollReveal>
        <div className="lg:sticky lg:top-28">
          <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-gold/60 block mb-2">
            FAQ
          </span>
          <h2 className="text-[clamp(2rem,5vw,3.25rem)] font-extrabold tracking-[-0.02em] text-white leading-[1.08]">
            The questions<br />you&apos;re actually<br /><span className="gradient-gold-text">thinking.</span>
          </h2>
        </div>
        </ScrollReveal>

        {/* Right – accordion */}
        <ScrollReveal delay={0.1}>
        <div className="space-y-2">
          {faqs.map((faq, i) => (
            <details
              key={faq.q}
              className="group bg-white/[0.03] border border-white/[0.06] rounded-2xl overflow-hidden hover:border-gold/15 transition-colors duration-300"
            >
              <summary className="px-4 sm:px-6 py-4 sm:py-5 cursor-pointer font-semibold text-[14px] sm:text-[15px] text-white/70 flex items-center justify-between gap-3 list-none [&::-webkit-details-marker]:hidden select-none hover:text-white transition-colors">
                <span className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <span className="text-[11px] font-mono text-gold/30 shrink-0">{String(i + 1).padStart(2, '0')}</span>
                  <span className="min-w-0">{faq.q}</span>
                </span>
                <div className="w-8 h-8 rounded-xl bg-white/[0.06] flex items-center justify-center shrink-0 group-hover:bg-gold/10 transition-all duration-300">
                  <svg className="w-4 h-4 text-white/30 transition-transform duration-300 group-open:rotate-45" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                </div>
              </summary>
              <div className="px-4 sm:px-6 pb-4 sm:pb-5 text-white/40 text-[13px] sm:text-[14px] leading-relaxed sm:ml-8">
                {faq.a}
              </div>
            </details>
          ))}
        </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
