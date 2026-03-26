import Link from 'next/link'

export default function SiteHeader() {
  return (
    <header className="absolute top-0 left-0 right-0 z-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <Link href="/" className="text-xl font-bold tracking-tight text-charcoal">
            MCar
          </Link>
          <Link
            href="/offer"
            className="hidden sm:inline-flex items-center rounded-lg bg-charcoal px-5 py-2.5 text-sm font-semibold text-white hover:bg-foreground transition-colors"
          >
            Get Your Valuation
          </Link>
        </div>
      </div>
    </header>
  )
}
