export default function PrivateSaleComparisonSection() {
  const rows = [
    ['Time investment', 'Weeks of listings, viewings, chasing', '2 minutes online'],
    ['Pricing certainty', 'Guesswork and haggling', 'Data-backed valuation'],
    ['Security', 'Strangers at your door', 'Professional, structured'],
    ['Hassle', 'Photos, ads, tyre-kickers', 'We handle it'],
    ['Obligation', 'Sunk cost after effort', 'Walk away any time'],
  ]

  return (
    <section className="px-5 sm:px-8 lg:px-10 py-24 sm:py-32 relative overflow-hidden">
      <div className="absolute inset-0 gradient-mesh opacity-40" />
      <div className="mx-auto max-w-[1280px] relative">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 bg-gold/[0.08] border border-gold/15 rounded-full px-4 py-1.5 mb-6">
            <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-gold-dark">
              Comparison
            </span>
          </div>
          <h2 className="text-[clamp(2rem,4vw,3.25rem)] font-extrabold tracking-[-0.02em] text-charcoal-deep leading-[1.08] max-w-2xl mx-auto">
            Private selling sounds good<br />
            <span className="gradient-gold-text">until you actually do it.</span>
          </h2>
        </div>

        {/* Premium comparison table */}
        <div className="card-premium overflow-hidden">
          <table className="w-full text-left text-[14px]">
            <thead>
              <tr className="border-b border-warm-border/60">
                <th className="px-6 lg:px-8 py-5 text-[11px] uppercase tracking-[0.15em] text-warm-gray font-bold w-[35%]" />
                <th className="px-6 lg:px-8 py-5 text-[11px] uppercase tracking-[0.15em] text-warm-gray font-bold">
                  Private sale
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
      </div>
    </section>
  )
}
