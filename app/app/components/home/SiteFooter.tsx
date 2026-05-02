import Link from 'next/link'

const footerLinks = [
  { href: '/offer', label: 'Start valuation' },
  { href: '/#how', label: 'How it works' },
  { href: '/#faq', label: 'FAQs' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/login', label: 'Staff' },
]

export default function SiteFooter() {
  return (
    <footer className="relative overflow-hidden border-t border-warm-border-light px-5 py-12 dark:border-white/[0.06] sm:px-8 lg:px-10">
      <div className="absolute inset-0 bg-surface-warm dark:bg-[#0A0A0A]" />
      <div className="mx-auto max-w-[1280px] relative">
        <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col items-center gap-3 text-center md:items-start md:text-left">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg gradient-gold flex items-center justify-center">
                <span className="text-[12px] font-extrabold text-white">M</span>
              </div>
              <span className="text-[15px] font-bold tracking-tight text-foreground dark:text-white/70">MCar</span>
            </div>
            <p className="max-w-sm text-[13px] leading-relaxed text-warm-gray dark:text-white/30">
              Vehicle valuations backed by DVLA, MOT, and market evidence.
            </p>
          </div>

          <nav aria-label="Footer" className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[13px] md:justify-end">
            {footerLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-warm-gray transition-colors duration-300 hover:text-gold dark:text-white/30 dark:hover:text-gold"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex flex-col items-center gap-1 text-[13px] text-warm-gray dark:text-white/20 md:items-end">
            <span>&copy; {new Date().getFullYear()} MCar</span>
            <a href="mailto:privacy@mcar.co.uk" className="transition-colors duration-300 hover:text-gold dark:hover:text-gold">
              privacy@mcar.co.uk
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
