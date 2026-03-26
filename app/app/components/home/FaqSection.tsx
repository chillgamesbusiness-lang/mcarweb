import SectionShell from '@/app/components/ui/SectionShell'

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
    <SectionShell className="bg-surface-warm">
      <div className="text-center mb-14">
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-charcoal">
          Frequently asked questions
        </h2>
        <p className="mt-3 text-warm-gray text-lg">
          Everything you need to know before getting started
        </p>
      </div>

      <div className="max-w-3xl mx-auto space-y-3">
        {faqs.map((faq) => (
          <details
            key={faq.q}
            className="group bg-surface rounded-xl border border-warm-border overflow-hidden"
          >
            <summary className="px-6 py-5 cursor-pointer font-medium text-charcoal flex items-center justify-between gap-4 list-none [&::-webkit-details-marker]:hidden">
              <span>{faq.q}</span>
              <svg
                className="w-5 h-5 text-warm-gray flex-shrink-0 transition-transform duration-200 group-open:rotate-180"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </summary>
            <div className="px-6 pb-5 text-warm-gray text-sm leading-relaxed border-t border-warm-border-light pt-4">
              {faq.a}
            </div>
          </details>
        ))}
      </div>
    </SectionShell>
  )
}
