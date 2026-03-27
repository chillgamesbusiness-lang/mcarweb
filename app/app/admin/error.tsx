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
      <div className="max-w-md animate-scale-in">
        <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mb-5">
          <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
        </div>
        <h1 className="text-3xl font-extrabold text-foreground leading-tight mb-3 tracking-[-0.02em]">Something broke.</h1>
        <p className="text-sm text-warm-gray leading-relaxed mb-6">
          This page failed to load. Usually temporary — retry or head back to the dashboard.
        </p>
        {error.digest && (
          <p className="text-[11px] text-warm-gray/40 font-mono mb-6">ref {error.digest}</p>
        )}
        <div className="flex items-center gap-4">
          <button
            onClick={reset}
            className="rounded-xl gradient-gold px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-gold/15 hover:shadow-lg hover:shadow-gold/25 transition-all"
          >
            Retry
          </button>
          <a
            href="/admin"
            className="text-sm font-semibold text-warm-gray hover:text-charcoal-deep transition-colors"
          >
            Dashboard →
          </a>
        </div>
      </div>
    </div>
  )
}
