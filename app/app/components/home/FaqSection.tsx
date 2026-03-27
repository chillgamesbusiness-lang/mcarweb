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
    <section id="faq" className="px-5 sm:px-8 lg:px-10 py-20 sm:py-28 bg-surface-warm">
      <div className="mx-auto max-w-[1280px] grid lg:grid-cols-[0.4fr_1fr] gap-12 lg:gap-20 items-start">
        {/* Left – sticky heading */}
        <div className="lg:sticky lg:top-28">
          <div className="flex items-center gap-2 mb-5">
            <div className="h-px w-8 bg-gold/50" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold/70">
              FAQ
            </span>
          </div>
          <h2 className="text-[clamp(1.75rem,3.5vw,2.75rem)] font-bold tracking-tight text-charcoal leading-[1.1]">
            Questions we get asked a lot.
          </h2>
        </div>

        {/* Right – accordion */}
        <div className="divide-y divide-warm-border">
          {faqs.map((faq) => (
            <details
              key={faq.q}
              className="group"
            >
              <summary className="py-5 cursor-pointer font-medium text-[15px] text-charcoal flex items-center justify-between gap-4 list-none [&::-webkit-details-marker]:hidden select-none">
                <span>{faq.q}</span>
                <span className="text-warm-gray text-lg leading-none transition-transform duration-200 group-open:rotate-45 flex-shrink-0">
                  +
                </span>
              </summary>
              <div className="pb-5 text-warm-gray text-[14px] leading-relaxed max-w-xl">
                {faq.a}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
