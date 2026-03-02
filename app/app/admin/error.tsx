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
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Dashboard Error</h1>
        <p className="text-gray-500 mb-4 text-sm">
          Something went wrong loading this page. This is usually temporary — try refreshing.
        </p>
        {error.digest && (
          <p className="text-xs text-gray-400 mb-4 font-mono">Ref: {error.digest}</p>
        )}
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="rounded-md bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
          <a
            href="/admin"
            className="rounded-md border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Dashboard Home
          </a>
        </div>
      </div>
    </div>
  )
}
