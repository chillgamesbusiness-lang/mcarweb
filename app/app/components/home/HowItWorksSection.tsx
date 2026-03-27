export default function HowItWorksSection() {
  const steps = [
    {
      step: '1',
      title: 'Enter your reg',
      text: 'We pull your vehicle straight from DVLA — make, model, year, fuel, colour, tax status, full MOT history. All verified in seconds.',
      detail: 'DVLA + MOT API',
      icon: (
        <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
      ),
    },
    {
      step: '2',
      title: 'We crunch the data',
      text: 'Mileage vs MOT records. Condition weighting. Regional pricing. Market comparisons. Our engine runs 15+ checks to generate your range.',
      detail: '15+ data points',
      icon: (
        <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
        </svg>
      ),
    },
    {
      step: '3',
      title: 'See your true price',
      text: 'A grounded min–max range you can actually use. If it looks right, book an appointment. If not, walk away. No pressure, no commitment.',
      detail: 'Zero obligation',
      icon: (
        <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ]

  return (
    <section id="how" className="relative px-5 sm:px-8 lg:px-10 py-24 sm:py-32 overflow-hidden">
      {/* Modern gradient background */}
      <div className="absolute inset-0 gradient-dark" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-gold/[0.06] blur-[120px]" />

      <div className="mx-auto max-w-[1280px] relative">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-white/[0.06] border border-white/[0.08] rounded-full px-4 py-1.5 mb-6">
            <span className="w-2 h-2 rounded-full bg-gold animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-gold/80">
              The process
            </span>
          </div>
          <h2 className="text-[clamp(2rem,4vw,3.25rem)] font-extrabold tracking-[-0.02em] text-white leading-[1.08]">
            How the engine <span className="text-gold">actually works.</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {steps.map((item, i) => (
            <div
              key={item.step}
              className="relative group"
            >
              {/* Connector line — spans the gap between grid columns */}
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-[4.25rem] left-full w-6 z-10">
                  <div className="h-[2px] bg-gradient-to-r from-gold/40 to-gold/10" />
                </div>
              )}
              <div className="relative bg-white/[0.04] border border-white/[0.06] rounded-3xl p-8 sm:p-10 hover:bg-white/[0.07] hover:border-gold/20 transition-all duration-500 h-full">
                {/* Step number + icon */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-2xl gradient-gold flex items-center justify-center text-white shadow-lg shadow-gold/20 group-hover:shadow-xl group-hover:shadow-gold/30 transition-all duration-500">
                    {item.icon}
                  </div>
                  <span className="text-[64px] font-extrabold text-white/[0.04] leading-none select-none">
                    {item.step}
                  </span>
                </div>
                <h3 className="text-[18px] font-bold text-white mb-3">
                  {item.title}
                </h3>
                <p className="text-[14px] text-white/50 leading-relaxed">
                  {item.text}
                </p>
                <span className="inline-block mt-4 text-[11px] font-semibold tracking-widest uppercase text-gold/70 bg-gold/[0.08] rounded-full px-3 py-1">
                  {item.detail}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
