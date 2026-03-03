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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-white px-4">
      <div className="w-full max-w-md text-center">
        <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-100 p-8">
          <div className="mx-auto w-16 h-16 rounded-full bg-amber-50 ring-2 ring-amber-200 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2 tracking-tight">Something went wrong</h1>
          <p className="text-gray-500 text-sm mb-2">
            We hit an unexpected problem. You can try again or start a fresh valuation.
          </p>
          {error.digest && (
            <p className="text-xs text-gray-300 mb-4">Reference: {error.digest}</p>
          )}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={reset}
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-all shadow-sm hover:shadow-md"
            >
              Try Again
            </button>
            <Link
              href="/offer"
              className="rounded-lg bg-gray-50 ring-1 ring-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Start Over
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
