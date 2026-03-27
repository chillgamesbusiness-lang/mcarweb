export default function HowItWorksSection() {
  const steps = [
    {
      step: '1',
      title: 'Enter your reg',
      text: 'Type in your registration. We pull your vehicle details straight from DVLA — make, model, year, fuel, MOT history.',
      icon: (
        <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
      ),
    },
    {
      step: '2',
      title: 'Confirm a few details',
      text: 'Check the vehicle info looks right. Add your current mileage and condition. Then your contact details.',
      icon: (
        <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
        </svg>
      ),
    },
    {
      step: '3',
      title: 'Get your valuation',
      text: 'See a clear valuation range based on real data. If you want to proceed, book an appointment right there.',
      icon: (
        <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
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
            Three steps. <span className="text-gold">That&apos;s it.</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {steps.map((item, i) => (
            <div
              key={item.step}
              className="relative group"
            >
              {/* Connector line */}
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-12 left-[calc(100%_-_12px)] w-[calc(100%_-_56px)] z-10">
                  <div className="h-[2px] bg-gradient-to-r from-gold/30 to-gold/10" />
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
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
