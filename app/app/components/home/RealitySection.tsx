export default function RealitySection() {
  return (
    <section className="px-5 sm:px-8 lg:px-10 py-20 sm:py-28 relative overflow-hidden">
      <div className="absolute inset-0 gradient-mesh opacity-60" />
      <div className="mx-auto max-w-[1280px] relative">
        <div className="max-w-3xl mx-auto text-center">
          {/* The hook */}
          <div className="inline-flex items-center gap-2 bg-red-500/[0.08] border border-red-400/15 rounded-full px-4 py-1.5 mb-8">
            <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-red-600 dark:text-red-400">
              The reality of selling a car
            </span>
          </div>

          <h2 className="text-[clamp(1.8rem,4vw,3rem)] font-extrabold tracking-[-0.02em] text-charcoal-deep leading-[1.12] mb-6">
            Most people lose <span className="gradient-gold-text">£500–£2,000</span> selling their car.
          </h2>

          <div className="space-y-4 text-[17px] sm:text-[19px] text-warm-gray leading-relaxed max-w-2xl mx-auto">
            <p>
              Not because of the market.
            </p>
            <p>
              Not because of the car.
            </p>
            <p className="text-charcoal-deep font-semibold">
              Because they didn&apos;t know the real value before someone made them an offer.
            </p>
          </div>

          {/* Data pipeline — what makes this a system */}
          <div className="mt-14 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
            <div className="card-premium p-5 text-left">
              <div className="w-9 h-9 rounded-xl bg-accent-blue/10 flex items-center justify-center mb-3">
                <svg className="w-4.5 h-4.5 text-accent-blue" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
                </svg>
              </div>
              <p className="text-[13px] font-bold text-charcoal-deep mb-1">DVLA + MOT records</p>
              <p className="text-[12px] text-warm-gray leading-snug">Official vehicle history pulled in real time</p>
            </div>

            <div className="card-premium p-5 text-left">
              <div className="w-9 h-9 rounded-xl bg-accent-emerald/10 flex items-center justify-center mb-3">
                <svg className="w-4.5 h-4.5 text-accent-emerald" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
              </div>
              <p className="text-[13px] font-bold text-charcoal-deep mb-1">Real market listings</p>
              <p className="text-[12px] text-warm-gray leading-snug">Compared against actual sold vehicles</p>
            </div>

            <div className="card-premium p-5 text-left">
              <div className="w-9 h-9 rounded-xl bg-gold/10 flex items-center justify-center mb-3">
                <svg className="w-4.5 h-4.5 text-gold" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              </div>
              <p className="text-[13px] font-bold text-charcoal-deep mb-1">Condition + mileage adjusted</p>
              <p className="text-[12px] text-warm-gray leading-snug">Not a generic estimate — specific to your car</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
