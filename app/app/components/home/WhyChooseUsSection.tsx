export default function WhyChooseUsSection() {
  const items = [
    {
      num: '01',
      title: 'We show you the number before anyone else does',
      text: 'Most buyers make you an offer first — then you\'re stuck negotiating from their anchor. We flip that. You see the real market value upfront, so you walk into any deal with leverage.',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      num: '02',
      title: 'Every figure backed by 6+ data sources',
      text: 'DVLA registration data. Full MOT history. Mileage verification. Condition scoring. Regional market adjustment. Resale evidence from actual listings. Nothing is guessed.',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
        </svg>
      ),
    },
    {
      num: '03',
      title: 'No listing. No haggling. No strangers at your door.',
      text: 'Private selling means weeks of photos, ads, tyre-kickers, and lowball texts at 11pm. We cut all of that. You get a valuation, book an appointment, done.',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
      ),
    },
    {
      num: '04',
      title: 'Walk away at any point. Seriously.',
      text: 'No account. No credit card. No chasing phone calls. Get your figure, think about it, come back next week or never. Zero obligation at every step.',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
        </svg>
      ),
    },
  ]

  return (
    <section className="px-5 sm:px-8 lg:px-10 py-24 sm:py-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-surface-warm via-background to-surface-warm" />
      <div className="mx-auto max-w-[1280px] relative">
        <div className="grid lg:grid-cols-[1fr_1.3fr] gap-16 lg:gap-24 items-start">
          {/* Left — editorial headline */}
          <div className="lg:sticky lg:top-28">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl gradient-gold flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                </svg>
              </div>
              <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-gold-dark">
                Why this works
              </span>
            </div>
            <h2 className="text-[clamp(2rem,4vw,3.25rem)] font-extrabold tracking-[-0.02em] text-charcoal-deep leading-[1.08]">
              This isn&apos;t a quote
              <br />
              generator. It&apos;s a
              <br />
              <span className="gradient-gold-text">pricing system.</span>
            </h2>
            <p className="mt-6 text-warm-gray leading-relaxed max-w-sm text-[16px]">
              We built the same valuation engine a dealer would use internally — then made it public. Now you have the same information they do.
            </p>
          </div>

          {/* Right — premium stacked items */}
          <div className="space-y-4">
            {items.map((item, i) => (
              <div
                key={item.num}
                className="card-premium p-6 sm:p-8 group"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="flex items-start gap-5">
                  <div className="w-12 h-12 rounded-2xl bg-gold/[0.08] flex items-center justify-center text-gold shrink-0 group-hover:bg-gold group-hover:text-white transition-all duration-500">
                    {item.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-[11px] font-mono font-bold text-gold/30 select-none">
                        {item.num}
                      </span>
                      <h3 className="text-[17px] font-bold text-charcoal-deep">
                        {item.title}
                      </h3>
                    </div>
                    <p className="text-[15px] text-warm-gray leading-relaxed">
                      {item.text}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
