import ScrollReveal from './ScrollReveal'

export default function PrivateSaleComparisonSection() {
  const rows = [
    { label: 'Time', them: 'Weeks of listings, viewings, no-shows', us: '2 minutes. One form.' },
    { label: 'Pricing', them: 'Guesswork — you Google it and guess', us: 'DVLA + MOT + market data. Verified range.' },
    { label: 'Security', them: 'Strangers at your door with cash', us: 'Appointment at a secured location' },
    { label: 'Haggling', them: '"Will you take £500 less?" 15 times', us: 'One offer. Take it or leave it.' },
    { label: 'Cost', them: '£0 up front, £500+ in lost value', us: '£0. Always.' },
  ]

  return (
    <section className="px-5 sm:px-8 lg:px-10 py-24 sm:py-32 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-gold/[0.05] blur-[130px]" />
      <div className="mx-auto max-w-[1280px] relative">
        <ScrollReveal>
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2.5 border-l-2 border-gold pl-3 mb-6 mx-auto">
              <span className="text-[12px] font-semibold text-gold tracking-wide">
                The real cost of selling
              </span>
            </div>
            <h2 className="text-[clamp(2rem,4vw,3.25rem)] font-extrabold tracking-[-0.02em] text-white leading-[1.08] max-w-3xl mx-auto">
              Selling privately costs you time.<br />
              Selling to a dealer costs you <span className="gradient-gold-text">money.</span>
            </h2>
            <p className="mt-4 text-white/40 text-[15px] max-w-xl mx-auto leading-relaxed">
              We built a third option. Know the real value first — then decide how you sell.
            </p>
          </div>
        </ScrollReveal>

        {/* Side-by-side comparison cards */}
        <ScrollReveal delay={0.1}>
          <div className="grid md:grid-cols-2 gap-5 max-w-4xl mx-auto">
            {/* Private sale column */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-0 overflow-hidden opacity-50">
              <div className="px-6 py-4 border-b border-white/[0.06]">
                <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/30">Private sale</span>
              </div>
              {rows.map((row, i) => (
                <div key={row.label} className={`px-6 py-4 ${i < rows.length - 1 ? 'border-b border-white/[0.04]' : ''}`}>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-white/20 mb-1">{row.label}</p>
                  <p className="text-[14px] text-white/35 leading-snug">{row.them}</p>
                </div>
              ))}
            </div>

            {/* MCar column */}
            <div className="bg-white/[0.04] border border-gold/20 rounded-2xl p-0 overflow-hidden shadow-lg shadow-gold/[0.06]">
              <div className="px-6 py-4 border-b border-gold/10 bg-gold/[0.06]">
                <span className="text-[11px] font-bold uppercase tracking-[0.15em] gradient-gold-text">MCar</span>
              </div>
              {rows.map((row, i) => (
                <div key={row.label} className={`px-6 py-4 ${i < rows.length - 1 ? 'border-b border-white/[0.06]' : ''}`}>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-gold/40 mb-1">{row.label}</p>
                  <p className="text-[14px] text-white font-semibold leading-snug flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 text-gold shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {row.us}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
