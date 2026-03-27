export default function HowItWorksSection() {
  return (
    <section id="how" className="bg-charcoal px-5 sm:px-8 lg:px-10 py-20 sm:py-28">
      <div className="mx-auto max-w-[1280px]">
        <div className="flex items-center gap-2 mb-5">
          <div className="h-px w-8 bg-gold/60" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold/70">
            The process
          </span>
        </div>
        <h2 className="text-[clamp(1.75rem,3.5vw,2.75rem)] font-bold tracking-tight text-white leading-[1.1] mb-16">
          Three steps. That&apos;s it.
        </h2>

        <div className="grid md:grid-cols-3 gap-px bg-white/[0.06] rounded-xl overflow-hidden">
          {[
            {
              step: '1',
              title: 'Enter your reg',
              text: 'Type in your registration. We pull your vehicle details straight from DVLA — make, model, year, fuel, MOT history.',
            },
            {
              step: '2',
              title: 'Confirm a few details',
              text: 'Check the vehicle info looks right. Add your current mileage and condition. Then your contact details.',
            },
            {
              step: '3',
              title: 'Get your valuation',
              text: 'See a clear valuation range based on real data. If you want to proceed, book an appointment right there.',
            },
          ].map((item) => (
            <div
              key={item.step}
              className="bg-charcoal p-8 sm:p-10"
            >
              <span className="text-[48px] sm:text-[56px] font-bold text-white/[0.06] leading-none block mb-4 select-none">
                {item.step}
              </span>
              <h3 className="text-[17px] font-semibold text-white mb-3">
                {item.title}
              </h3>
              <p className="text-[14px] text-white/45 leading-relaxed">
                {item.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
