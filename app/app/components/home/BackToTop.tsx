'use client'

import { useEffect, useState } from 'react'

export default function BackToTop() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 600)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <button
      aria-label="Back to top"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className={`fixed bottom-20 right-4 sm:bottom-[5.25rem] sm:right-5 z-[70] w-11 h-11 rounded-full bg-[var(--card-bg)] border border-[var(--card-border)] backdrop-blur-md flex items-center justify-center text-warm-gray hover:text-foreground hover:border-gold/40 transition-all duration-300 dark:bg-white/[0.08] dark:border-white/[0.1] dark:text-white/60 dark:hover:text-white dark:hover:bg-white/[0.14] ${
        show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
      }`}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
      </svg>
    </button>
  )
}
