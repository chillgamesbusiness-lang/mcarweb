'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-bold text-charcoal mb-2">Something went wrong</h1>
        <p className="text-warm-gray mb-6 text-sm">
          An unexpected error occurred. Please try again or contact support if the problem persists.
        </p>
        {error.digest && (
          <p className="text-xs text-warm-gray/50 mb-4">Reference: {error.digest}</p>
        )}
        <button
          onClick={reset}
          className="rounded-lg bg-gold px-6 py-3 text-sm font-semibold text-white hover:bg-gold-dark transition-colors shadow-md"
        >
          Try Again
        </button>
      </div>
    </div>
  )
}
