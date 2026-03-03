import Link from 'next/link'

/**
 * Offer-flow 404: shown when a user hits a non-existent step URL
 * (e.g. pasting a stale /offer/book link without a valid token).
 */
export default function OfferNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-white px-4">
      <div className="w-full max-w-md text-center">
        <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-100 p-8">
          <div className="mx-auto w-16 h-16 rounded-full bg-amber-50 ring-2 ring-amber-200 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2 tracking-tight">Session not found</h1>
          <p className="text-gray-500 text-sm mb-6">
            This link may have expired or the page you&apos;re looking for doesn&apos;t exist.
            Start a fresh valuation to continue.
          </p>
          <Link
            href="/offer"
            className="inline-block rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-all shadow-sm hover:shadow-md"
          >
            Start a New Valuation
          </Link>
        </div>
      </div>
    </div>
  )
}
