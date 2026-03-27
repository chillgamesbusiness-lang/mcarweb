import Link from 'next/link'

export default function SiteHeader() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-background/80 border-b border-warm-border-light">
      <div className="mx-auto max-w-[1280px] px-5 sm:px-8 lg:px-10">
        <div className="flex items-center justify-between h-16 sm:h-[72px]">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-[6px] bg-charcoal flex items-center justify-center">
              <span className="text-[13px] font-extrabold text-white tracking-tight">M</span>
            </div>
            <span className="text-[15px] font-semibold tracking-tight text-charcoal">MCar</span>
          </Link>
          <nav className="flex items-center gap-8">
            <Link href="#how" className="hidden md:block text-[13px] text-warm-gray hover:text-charcoal transition-colors">
              How it works
            </Link>
            <Link href="#faq" className="hidden md:block text-[13px] text-warm-gray hover:text-charcoal transition-colors">
              FAQs
            </Link>
            <Link
              href="/offer"
              className="rounded-[8px] bg-charcoal text-white text-[13px] font-medium px-4 py-2 hover:bg-foreground transition-colors"
            >
              Get a valuation
            </Link>
          </nav>
        </div>
      </div>
    </header>
  )
}
