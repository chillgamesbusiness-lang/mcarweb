import Link from 'next/link'

export default function SiteFooter() {
  return (
    <footer className="bg-foreground text-white/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
          <div className="text-center sm:text-left">
            <p className="font-bold text-white text-lg tracking-tight">MCar</p>
            <p className="text-sm mt-1">A simpler way to sell your car.</p>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <Link
              href="/privacy"
              className="hover:text-white/80 transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              href="/offer"
              className="hover:text-white/80 transition-colors"
            >
              Get a Valuation
            </Link>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-white/10 text-center text-xs">
          &copy; {new Date().getFullYear()} MCar. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
