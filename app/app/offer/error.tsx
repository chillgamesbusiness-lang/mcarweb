'use client'

import Link from 'next/link'

/**
 * Offer-flow error boundary: shown when an unexpected server error occurs
 * in any step of the /offer/... route segment.
 */
export default function OfferError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-lg text-center animate-scale-in">
        <div className="card-premium p-10 sm:p-12">
          <div className="mx-auto w-20 h-20 rounded-2xl bg-red-50 flex items-center justify-center mb-6">
            <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-extrabold text-charcoal-deep mb-2 tracking-[-0.02em]">Something went wrong</h1>
          <p className="text-warm-gray text-sm mb-2 leading-relaxed">
            We hit an unexpected problem. You can try again or start a fresh valuation.
          </p>
          {error.digest && (
            <p className="text-xs text-warm-gray/40 mb-5 font-mono">Ref: {error.digest}</p>
          )}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={reset}
              className="rounded-2xl gradient-gold px-6 py-3 text-sm font-bold text-white shadow-lg shadow-gold/20 hover:shadow-xl hover:shadow-gold/30 transition-all duration-300 active:scale-[0.98]"
            >
              Try Again
            </button>
            <Link
              href="/offer"
              className="rounded-2xl border border-warm-border px-6 py-3 text-sm font-semibold text-charcoal-deep hover:bg-surface transition-all"
            >
              Start Over
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
