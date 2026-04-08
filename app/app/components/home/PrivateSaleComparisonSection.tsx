import ScrollReveal from './ScrollReveal'

export default function PrivateSaleComparisonSection() {
  const rows = [
    ['Time', 'Weeks of listings, viewings, no-shows', '2 minutes. One form.'],
    ['Pricing', 'Guesswork — you Google it and guess', 'DVLA + MOT + market data. Verified range.'],
    ['Security', 'Strangers at your door with cash', 'Appointment at a secured location'],
    ['Haggling', '"Will you take £500 less?" 15 times', 'One offer. Take it or leave it.'],
    ['Cost', '£0 up front, £500+ in lost value', '£0. Always.'],
  ]

  return (
    <section className="px-5 sm:px-8 lg:px-10 py-24 sm:py-32 relative overflow-hidden">
      <div className="absolute inset-0 gradient-mesh opacity-40" />
      <div className="mx-auto max-w-[1280px] relative">
        <ScrollReveal>
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 bg-red-500/[0.08] border border-red-500/15 rounded-full px-4 py-1.5 mb-6">
            <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-red-400">
              The real cost
            </span>
          </div>
          <h2 className="text-[clamp(2rem,4vw,3.25rem)] font-extrabold tracking-[-0.02em] text-charcoal-deep leading-[1.08] max-w-3xl mx-auto">
            Selling privately costs you time.<br />
            Selling to a dealer costs you <span className="gradient-gold-text">money.</span>
          </h2>
          <p className="mt-4 text-warm-gray text-[15px] max-w-xl mx-auto leading-relaxed">
            We built a third option. Know the real value first — then decide how you sell.
          </p>
        </div>
        </ScrollReveal>

        {/* Premium comparison table */}
        <ScrollReveal delay={0.1}>
        <div className="card-premium overflow-hidden">
          <table className="w-full text-left text-[14px]">
            <thead>
              <tr className="border-b border-warm-border/60">
                <th className="px-6 lg:px-8 py-5 text-[11px] uppercase tracking-[0.15em] text-warm-gray font-bold w-[25%]" />
                <th className="px-6 lg:px-8 py-5 text-[11px] uppercase tracking-[0.15em] text-warm-gray font-bold">
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    Private sale
                  </span>
                </th>
                <th className="px-6 lg:px-8 py-5 relative">
                  <div className="absolute inset-0 bg-gold/[0.04]" />
                  <span className="relative text-[11px] uppercase tracking-[0.15em] font-bold gradient-gold-text">
                    MCar
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([label, priv, ours], i) => (
                <tr key={label} className={`group transition-colors ${i < rows.length - 1 ? 'border-b border-warm-border/40' : ''}`}>
                  <td className="px-6 lg:px-8 py-5 font-semibold text-charcoal-deep group-hover:text-gold-dark transition-colors">{label}</td>
                  <td className="px-6 lg:px-8 py-5 text-warm-gray">{priv}</td>
                  <td className="px-6 lg:px-8 py-5 relative">
                    <div className="absolute inset-0 bg-gold/[0.04] group-hover:bg-gold/[0.07] transition-colors" />
                    <span className="relative text-charcoal-deep font-semibold flex items-center gap-2">
                      <svg className="w-4 h-4 text-accent-emerald shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {ours}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
