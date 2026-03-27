import Link from 'next/link'

/**
 * Offer-flow 404: shown when a user hits a non-existent step URL
 * (e.g. pasting a stale /offer/book link without a valid token).
 */
export default function OfferNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-lg text-center animate-scale-in">
        <div className="card-premium p-10 sm:p-12">
          <div className="mx-auto w-20 h-20 rounded-2xl bg-gold-50 flex items-center justify-center mb-6">
            <svg className="w-10 h-10 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-extrabold text-charcoal-deep mb-2 tracking-[-0.02em]">Session not found</h1>
          <p className="text-warm-gray text-sm mb-8 leading-relaxed">
            This link may have expired or the page you&apos;re looking for doesn&apos;t exist.
            Start a fresh valuation to continue.
          </p>
          <Link
            href="/offer"
            className="inline-block rounded-2xl gradient-gold px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-gold/20 hover:shadow-xl hover:shadow-gold/30 transition-all duration-300 active:scale-[0.98]"
          >
            Start a New Valuation
          </Link>
        </div>
      </div>
    </div>
  )
}
