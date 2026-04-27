const ITEMS = [
  'DVLA Records',
  'MOT History',
  'Live Market Data',
  'Mileage Verification',
  'Regional Pricing',
  'Condition Scoring',
  'Resale Evidence',
  'Tax & Keeper Status',
]

export default function DataMarquee() {
  return (
    <div className="relative py-5 overflow-hidden">
      <div className="marquee-track flex items-center">
        {[...ITEMS, ...ITEMS].map((item, i) => (
          <span
            key={i}
            className="flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-[0.15em] text-warm-gray/60 whitespace-nowrap mx-6 dark:text-white/20"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-gold/40" />
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}
