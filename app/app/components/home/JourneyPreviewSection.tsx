import SectionShell from '@/app/components/ui/SectionShell'

const previews = [
  {
    step: 1,
    title: 'Registration Lookup',
    description: 'Enter your reg and we find your vehicle instantly.',
    preview: (
      <div className="rounded-lg bg-white/10 border border-white/10 p-4 mt-4">
        <div className="flex items-stretch rounded-md border-2 border-white/30 overflow-hidden">
          <div className="bg-[#003DA5] text-white w-8 flex items-center justify-center text-[8px] font-bold">
            GB
          </div>
          <div className="flex-1 bg-white/5 px-3 py-2.5 text-center text-sm font-bold text-white/60 tracking-widest">
            AB12 CDE
          </div>
        </div>
      </div>
    ),
  },
  {
    step: 2,
    title: 'Vehicle Confirmation',
    description: 'See your vehicle details pulled from DVLA records.',
    preview: (
      <div className="rounded-lg bg-white/10 border border-white/10 p-4 mt-4 text-xs space-y-1.5">
        <div className="flex justify-between text-white/40">
          <span>Make</span>
          <span className="text-white/80 font-medium">BMW</span>
        </div>
        <div className="flex justify-between text-white/40">
          <span>Model</span>
          <span className="text-white/80 font-medium">3 Series</span>
        </div>
        <div className="flex justify-between text-white/40">
          <span>Year</span>
          <span className="text-white/80 font-medium">2020</span>
        </div>
        <div className="flex justify-between text-white/40">
          <span>Fuel</span>
          <span className="text-white/80 font-medium">Petrol</span>
        </div>
      </div>
    ),
  },
  {
    step: 3,
    title: 'Mileage & Condition',
    description: 'Quick inputs about your vehicle state.',
    preview: (
      <div className="rounded-lg bg-white/10 border border-white/10 p-4 mt-4 space-y-3">
        <div>
          <div className="text-[10px] text-white/40 mb-1">Mileage</div>
          <div className="h-7 rounded bg-white/5 border border-white/10 flex items-center px-2 text-xs text-white/50">
            45,000 mi
          </div>
        </div>
        <div>
          <div className="text-[10px] text-white/40 mb-1">Condition</div>
          <div className="flex gap-1">
            {['Good', 'Fair'].map((c, i) => (
              <div
                key={c}
                className={`flex-1 h-7 rounded text-[10px] flex items-center justify-center ${
                  i === 0
                    ? 'bg-gold/20 text-gold border border-gold/30'
                    : 'bg-white/5 text-white/30 border border-white/10'
                }`}
              >
                {c}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
  },
  {
    step: 4,
    title: 'Valuation & Booking',
    description: 'See your valuation and book the next step.',
    preview: (
      <div className="rounded-lg bg-white/10 border border-white/10 p-4 mt-4 text-center">
        <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">
          Estimated Value
        </div>
        <div className="text-2xl font-bold text-white">£8,200</div>
        <div className="text-xs text-white/40 mt-0.5">£7,400 – £9,000</div>
        <div className="mt-3 h-7 rounded bg-gold/20 border border-gold/30 flex items-center justify-center text-[10px] text-gold font-medium">
          Book Appointment
        </div>
      </div>
    ),
  },
]

export default function JourneyPreviewSection() {
  return (
    <SectionShell className="bg-charcoal">
      <div className="text-center mb-14">
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
          See what to expect
        </h2>
        <p className="mt-3 text-white/50 text-lg">
          A clear process from start to finish
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {previews.map((p) => (
          <div
            key={p.step}
            className="rounded-xl bg-white/[0.04] border border-white/[0.08] p-6 hover:bg-white/[0.06] transition-colors duration-300"
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="w-7 h-7 rounded-full bg-gold/20 text-gold text-xs font-bold flex items-center justify-center">
                {p.step}
              </span>
              <h3 className="text-sm font-semibold text-white">{p.title}</h3>
            </div>
            <p className="text-xs text-white/40 leading-relaxed">
              {p.description}
            </p>
            {p.preview}
          </div>
        ))}
      </div>
    </SectionShell>
  )
}
