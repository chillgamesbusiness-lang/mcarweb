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
      <div className="w-full max-w-lg text-center">
        <div className="bg-surface rounded-2xl shadow-lg border border-warm-border p-10">
          <div className="mx-auto w-16 h-16 rounded-full bg-gold-light ring-2 ring-gold/30 flex items-center justify-center mb-5">
            <svg className="w-8 h-8 text-gold-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-charcoal mb-2 tracking-tight">Something went wrong</h1>
          <p className="text-warm-gray text-sm mb-2">
            We hit an unexpected problem. You can try again or start a fresh valuation.
          </p>
          {error.digest && (
            <p className="text-xs text-warm-gray/50 mb-4">Reference: {error.digest}</p>
          )}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={reset}
              className="rounded-lg bg-gold px-5 py-2.5 text-sm font-semibold text-white hover:bg-gold-dark transition-all shadow-md hover:shadow-lg"
            >
              Try Again
            </button>
            <Link
              href="/offer"
              className="rounded-lg bg-surface-warm border border-warm-border px-5 py-2.5 text-sm font-semibold text-charcoal hover:bg-warm-border-light transition-colors"
            >
              Start Over
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
