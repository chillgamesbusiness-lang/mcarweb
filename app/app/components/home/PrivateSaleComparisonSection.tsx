export default function PrivateSaleComparisonSection() {
  return (
    <section className="px-5 sm:px-8 lg:px-10 py-20 sm:py-28">
      <div className="mx-auto max-w-[1280px]">
        <div className="flex items-center gap-2 mb-5">
          <div className="h-px w-8 bg-gold/50" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold/70">
            Comparison
          </span>
        </div>
        <h2 className="text-[clamp(1.75rem,3.5vw,2.75rem)] font-bold tracking-tight text-charcoal leading-[1.1] max-w-xl mb-16">
          Private selling sounds good until you actually do it.
        </h2>

        {/* Two-tone table */}
        <div className="overflow-hidden rounded-xl border border-warm-border">
          <table className="w-full text-left text-[14px]">
            <thead>
              <tr className="border-b border-warm-border">
                <th className="px-6 py-4 text-[11px] uppercase tracking-[0.15em] text-warm-gray font-semibold w-[40%]" />
                <th className="px-6 py-4 text-[11px] uppercase tracking-[0.15em] text-warm-gray font-semibold">
                  Private sale
                </th>
                <th className="px-6 py-4 text-[11px] uppercase tracking-[0.15em] text-gold font-semibold">
                  MCar
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-border">
              {[
                ['Time investment', 'Weeks of listings, viewings, chasing', '2 minutes online'],
                ['Pricing certainty', 'Guesswork and haggling', 'Data-backed valuation'],
                ['Security', 'Strangers at your door', 'Professional, structured'],
                ['Hassle', 'Photos, ads, tyre-kickers', 'We handle it'],
                ['Obligation', 'Sunk cost after effort', 'Walk away any time'],
              ].map(([label, priv, ours]) => (
                <tr key={label} className="hover:bg-surface-warm/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-charcoal">{label}</td>
                  <td className="px-6 py-4 text-warm-gray">{priv}</td>
                  <td className="px-6 py-4 text-charcoal font-medium">{ours}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
