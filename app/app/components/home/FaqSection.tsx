const faqs = [
  {
    q: 'Is the valuation free?',
    a: 'Yes, completely free and with no obligation. You can get a valuation and decide in your own time — no pressure, no strings attached.',
  },
  {
    q: 'Am I under any obligation?',
    a: 'None at all. The valuation is for your information. You\u2019re free to walk away at any point if it\u2019s not right for you.',
  },
  {
    q: 'How long does the process take?',
    a: 'Getting your valuation takes under two minutes. If you choose to proceed, the appointment and next steps are straightforward and handled quickly.',
  },
  {
    q: 'What information do I need?',
    a: 'Just your vehicle registration to start. We\u2019ll pull the details from DVLA records. You\u2019ll also need your current mileage and a rough idea of condition.',
  },
  {
    q: 'How do appointments work?',
    a: 'Once you have your valuation, you can choose a time slot that works for you. Appointments are available in person or via video call.',
  },
  {
    q: 'Is my information secure?',
    a: 'Absolutely. Your data is encrypted and handled in line with UK data protection standards. We only use your details for the valuation and appointment process.',
  },
  {
    q: 'What affects the valuation?',
    a: 'The main factors are your vehicle\u2019s age, mileage, condition, MOT history, and current market data. We use real data to generate a grounded figure.',
  },
  {
    q: 'Which areas do you cover?',
    a: 'We currently operate across the UK with both in-person and video appointment options to make the process as convenient as possible.',
  },
]

export default function FaqSection() {
  return (
    <section id="faq" className="px-5 sm:px-8 lg:px-10 py-24 sm:py-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-surface-warm via-background to-surface-warm" />
      <div className="mx-auto max-w-[1280px] relative grid lg:grid-cols-[0.4fr_1fr] gap-12 lg:gap-20 items-start">
        {/* Left – sticky heading */}
        <div className="lg:sticky lg:top-28">
          <div className="inline-flex items-center gap-2 bg-gold/[0.08] border border-gold/15 rounded-full px-4 py-1.5 mb-6">
            <svg className="w-4 h-4 text-gold" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
            </svg>
            <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-gold-dark">
              FAQ
            </span>
          </div>
          <h2 className="text-[clamp(2rem,4vw,3.25rem)] font-extrabold tracking-[-0.02em] text-charcoal-deep leading-[1.08]">
            Questions we<br />get asked<br /><span className="gradient-gold-text">a lot.</span>
          </h2>
        </div>

        {/* Right – premium accordion */}
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <details
              key={faq.q}
              className="group card-premium overflow-hidden"
            >
              <summary className="px-6 py-5 cursor-pointer font-semibold text-[15px] text-charcoal-deep flex items-center justify-between gap-4 list-none [&::-webkit-details-marker]:hidden select-none hover:text-gold-dark transition-colors">
                <span className="flex items-center gap-3">
                  <span className="text-[11px] font-mono text-gold/40">{String(i + 1).padStart(2, '0')}</span>
                  {faq.q}
                </span>
                <div className="w-8 h-8 rounded-xl bg-surface-warm flex items-center justify-center shrink-0 group-hover:bg-gold/10 transition-all duration-300">
                  <svg className="w-4 h-4 text-warm-gray transition-transform duration-300 group-open:rotate-45" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                </div>
              </summary>
              <div className="px-6 pb-5 text-warm-gray text-[14px] leading-relaxed max-w-xl ml-8">
                {faq.a}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
