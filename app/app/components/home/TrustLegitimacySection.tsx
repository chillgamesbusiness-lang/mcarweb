import SectionShell from '@/app/components/ui/SectionShell'

const trustCards = [
  {
    title: 'DVLA Verified',
    description: 'Vehicle details are checked against official DVLA records for accuracy.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    title: 'Secure Handling',
    description: 'Your personal information is encrypted and handled responsibly at every step.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
  },
  {
    title: 'Structured Process',
    description: 'A clear appointment system so you always know what happens next.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
      </svg>
    ),
  },
  {
    title: 'Realistic Valuations',
    description: 'Based on real vehicle data, condition, and market factors — not inflated promises.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
      </svg>
    ),
  },
]

export default function TrustLegitimacySection() {
  return (
    <SectionShell>
      <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
        {/* Left — Trust copy */}
        <div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-charcoal mb-4">
            Built for trust,{' '}
            <span className="text-gold">not just speed</span>
          </h2>
          <p className="text-warm-gray leading-relaxed text-lg mb-6">
            We handle your vehicle sale with the security and professionalism
            you&apos;d expect from a proper business. Every step is designed to
            give you confidence in the process.
          </p>
          <p className="text-warm-gray leading-relaxed">
            No gimmicks, no pressure. Just a straightforward route from
            valuation to appointment, handled securely from start to finish.
          </p>
        </div>

        {/* Right — Trust cards */}
        <div className="grid grid-cols-2 gap-4">
          {trustCards.map((card) => (
            <div
              key={card.title}
              className="bg-surface rounded-xl border border-warm-border p-5 hover:border-gold/30 transition-colors duration-300"
            >
              <div className="w-10 h-10 rounded-lg bg-gold-light flex items-center justify-center text-gold-dark mb-3">
                {card.icon}
              </div>
              <h4 className="text-sm font-semibold text-charcoal mb-1">
                {card.title}
              </h4>
              <p className="text-xs text-warm-gray leading-relaxed">
                {card.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </SectionShell>
  )
}
