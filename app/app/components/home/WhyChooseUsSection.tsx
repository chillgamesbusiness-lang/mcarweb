export default function WhyChooseUsSection() {
  return (
    <section className="px-5 sm:px-8 lg:px-10 py-20 sm:py-28">
      <div className="mx-auto max-w-[1280px]">
        <div className="grid lg:grid-cols-[1fr_1.3fr] gap-16 lg:gap-24 items-start">
          {/* Left — editorial headline */}
          <div className="lg:sticky lg:top-28">
            <div className="flex items-center gap-2 mb-5">
              <div className="h-px w-8 bg-gold" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-dark">
                Why this route
              </span>
            </div>
            <h2 className="text-[clamp(1.75rem,3.5vw,2.75rem)] font-bold tracking-tight text-charcoal leading-[1.1]">
              Selling privately
              <br />
              is a headache you
              <br />
              don&apos;t need.
            </h2>
            <p className="mt-5 text-warm-gray leading-relaxed max-w-sm">
              We built this because the alternatives are painful. Here&apos;s
              what changes.
            </p>
          </div>

          {/* Right — stacked items, NOT cards */}
          <div className="space-y-0 divide-y divide-warm-border-light">
            {[
              {
                num: '01',
                title: 'No more time-wasters',
                text: 'No strangers at your door. No flaky buyers. No endless messages that go nowhere. You deal with one professional process.',
              },
              {
                num: '02',
                title: 'A valuation you can trust',
                text: 'Your figure comes from real vehicle data — DVLA records, MOT history, mileage, condition. Not a number pulled from thin air.',
              },
              {
                num: '03',
                title: 'One clear next step',
                text: 'Valuation, then appointment. That\u2019s it. No listing, no haggling, no wondering what happens next.',
              },
              {
                num: '04',
                title: 'Handled properly',
                text: 'Your details are encrypted. Your time is respected. The process works like it should — clean, professional, straightforward.',
              },
            ].map((item) => (
              <div key={item.num} className="py-8 first:pt-0 last:pb-0">
                <div className="flex items-start gap-5">
                  <span className="text-[13px] font-mono font-bold text-gold-dark/40 mt-1 select-none">
                    {item.num}
                  </span>
                  <div>
                    <h3 className="text-[17px] font-semibold text-charcoal mb-2">
                      {item.title}
                    </h3>
                    <p className="text-[15px] text-warm-gray leading-relaxed max-w-md">
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
