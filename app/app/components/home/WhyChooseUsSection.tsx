import SectionShell from '@/app/components/ui/SectionShell'

const cards = [
  {
    title: 'No Wasted Time',
    description:
      'Skip the endless messages, no-shows, and tyre-kickers. Our process is structured from the start.',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    title: 'Fair, Data-Backed Valuation',
    description:
      'Your valuation is based on real vehicle data, not guesswork. Clear, transparent, and grounded.',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
  },
  {
    title: 'Simple Appointments',
    description:
      'Choose a time that works and we handle the rest. No chasing, no uncertainty.',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
      </svg>
    ),
  },
  {
    title: 'Professional & Secure',
    description:
      'Your details are handled with care. A proper process from valuation to completion.',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
]

export default function WhyChooseUsSection() {
  return (
    <SectionShell>
      <div className="text-center mb-14">
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-charcoal">
          Why people choose this route
        </h2>
        <p className="mt-3 text-warm-gray text-lg max-w-2xl mx-auto">
          A more structured way to sell your vehicle
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card) => (
          <div
            key={card.title}
            className="bg-surface rounded-xl border border-warm-border p-7 hover:shadow-md hover:border-warm-border/60 transition-all duration-300"
          >
            <div className="w-12 h-12 rounded-lg bg-gold-light flex items-center justify-center text-gold-dark mb-5">
              {card.icon}
            </div>
            <h3 className="text-lg font-semibold text-charcoal mb-2">
              {card.title}
            </h3>
            <p className="text-sm text-warm-gray leading-relaxed">
              {card.description}
            </p>
          </div>
        ))}
      </div>
    </SectionShell>
  )
}
