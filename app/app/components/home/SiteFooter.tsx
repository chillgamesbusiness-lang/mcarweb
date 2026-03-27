import Link from 'next/link'

export default function SiteFooter() {
  return (
    <footer className="bg-[#1a1a1a] px-5 sm:px-8 lg:px-10 py-10">
      <div className="mx-auto max-w-[1280px] flex flex-col sm:flex-row items-center justify-between gap-4 text-[13px] text-white/30">
        <span className="font-semibold text-white/60 tracking-tight">MCar</span>
        <div className="flex items-center gap-6">
          <Link href="/privacy" className="hover:text-white/50 transition-colors">
            Privacy
          </Link>
          <span className="text-white/10">|</span>
          <Link href="/offer" className="hover:text-white/50 transition-colors">
            Valuations
          </Link>
        </div>
        <span>&copy; {new Date().getFullYear()}</span>
      </div>
    </footer>
  )
}
