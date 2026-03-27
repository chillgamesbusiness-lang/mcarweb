'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function SiteHeader() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'glass border-b border-warm-border/50 shadow-sm'
          : 'bg-transparent'
      }`}
    >
      <div className="mx-auto max-w-[1280px] px-5 sm:px-8 lg:px-10">
        <div className="flex items-center justify-between h-16 sm:h-[72px]">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl gradient-gold flex items-center justify-center shadow-md group-hover:shadow-lg transition-all duration-300 group-hover:scale-105">
              <span className="text-[14px] font-extrabold text-white tracking-tight">M</span>
            </div>
            <span className="text-[16px] font-bold tracking-tight text-charcoal">MCar</span>
          </Link>
          <nav className="flex items-center gap-8">
            <Link href="#how" className="hidden md:block text-[13px] font-medium text-warm-gray hover:text-charcoal transition-all duration-300 relative after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-[2px] after:bg-gold after:transition-all after:duration-300 hover:after:w-full">
              How it works
            </Link>
            <Link href="#faq" className="hidden md:block text-[13px] font-medium text-warm-gray hover:text-charcoal transition-all duration-300 relative after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-[2px] after:bg-gold after:transition-all after:duration-300 hover:after:w-full">
              FAQs
            </Link>
            <Link
              href="/offer"
              className="rounded-xl gradient-gold text-white text-[13px] font-semibold px-5 py-2.5 hover:shadow-lg hover:shadow-gold/20 hover:scale-[1.02] transition-all duration-300 active:scale-[0.98]"
            >
              Get a valuation
            </Link>
          </nav>
        </div>
      </div>
    </header>
  )
}
