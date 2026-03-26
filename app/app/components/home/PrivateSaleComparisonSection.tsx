import SectionShell from '@/app/components/ui/SectionShell'

const privateItems = [
  'Time-wasters and no-shows',
  'Haggling and lowball offers',
  'Uncertainty at every stage',
  'Repeated listing effort',
  'Security concerns with strangers',
]

const ourItems = [
  'A structured, professional route',
  'Clear, data-backed valuation',
  'Quick and simple next steps',
  'Secure handling throughout',
  'A smoother, calmer experience',
]

export default function PrivateSaleComparisonSection() {
  return (
    <SectionShell>
      <div className="text-center mb-14">
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-charcoal">
          Why not sell privately?
        </h2>
        <p className="mt-3 text-warm-gray text-lg max-w-2xl mx-auto">
          Private selling can work, but it often means dealing with more than you bargained for
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {/* Private selling */}
        <div className="rounded-xl bg-surface-warm border border-warm-border p-8">
          <h3 className="text-lg font-semibold text-charcoal mb-5">
            Private selling often means
          </h3>
          <ul className="space-y-3.5">
            {privateItems.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-warm-gray">
                <svg
                  className="w-5 h-5 text-red-400/70 flex-shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Our process */}
        <div className="rounded-xl bg-gold-50 border border-gold/20 p-8">
          <h3 className="text-lg font-semibold text-charcoal mb-5">
            Our process gives you
          </h3>
          <ul className="space-y-3.5">
            {ourItems.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-charcoal-light">
                <svg
                  className="w-5 h-5 text-gold flex-shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </SectionShell>
  )
}
