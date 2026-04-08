import Link from 'next/link'

export default function SiteFooter() {
  return (
    <footer className="relative px-5 sm:px-8 lg:px-10 py-12 overflow-hidden">
      <div className="absolute inset-0 bg-[#0A0A0A]" />
      <div className="mx-auto max-w-[1280px] relative">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg gradient-gold flex items-center justify-center">
              <span className="text-[12px] font-extrabold text-white">M</span>
            </div>
            <span className="text-[15px] font-bold text-white/70 tracking-tight">MCar</span>
          </div>
          <div className="flex items-center gap-6 text-[13px]">
            <Link href="/privacy" className="text-white/30 hover:text-gold transition-colors duration-300">
              Privacy
            </Link>
            <span className="text-white/10">|</span>
            <Link href="/offer" className="text-white/30 hover:text-gold transition-colors duration-300">
              Valuations
            </Link>
          </div>
          <span className="text-[13px] text-white/20">&copy; {new Date().getFullYear()} MCar</span>
        </div>
      </div>
    </footer>
  )
}
