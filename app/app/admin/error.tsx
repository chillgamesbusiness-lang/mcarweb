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
      <div className="max-w-md">
        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-warm-gray mb-3">Error</p>
        <h1 className="text-3xl font-extrabold text-charcoal leading-tight mb-3">Something broke.</h1>
        <p className="text-sm text-warm-gray leading-relaxed mb-6">
          This page failed to load. Usually temporary — retry or head back to the dashboard.
        </p>
        {error.digest && (
          <p className="text-[11px] text-warm-gray/50 font-mono mb-6">ref {error.digest}</p>
        )}
        <div className="flex items-center gap-6">
          <button
            onClick={reset}
            className="text-sm font-semibold text-gold hover:text-gold-dark transition-colors"
          >
            Retry &rarr;
          </button>
          <a
            href="/admin"
            className="text-sm font-semibold text-charcoal-light hover:text-charcoal transition-colors"
          >
            Dashboard
          </a>
        </div>
      </div>
    </div>
  )
}
