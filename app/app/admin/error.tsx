'use client'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex-1 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-bold text-charcoal mb-2">Dashboard Error</h1>
        <p className="text-warm-gray mb-4 text-sm">
          Something went wrong loading this page. This is usually temporary — try refreshing.
        </p>
        {error.digest && (
          <p className="text-xs text-warm-gray/60 mb-4 font-mono">Ref: {error.digest}</p>
        )}
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="rounded-md bg-charcoal px-5 py-2.5 text-sm font-semibold text-white hover:bg-charcoal-light transition-colors"
          >
            Retry
          </button>
          <a
            href="/admin"
            className="rounded-md border border-warm-border px-5 py-2.5 text-sm font-semibold text-charcoal-light hover:bg-surface-warm transition-colors"
          >
            Dashboard Home
          </a>
        </div>
      </div>
    </div>
  )
}
