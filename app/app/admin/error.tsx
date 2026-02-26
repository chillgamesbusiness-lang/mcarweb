'use client'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="p-8">
      <div className="max-w-md">
        <h1 className="text-xl font-bold text-gray-900 mb-2">Error</h1>
        <p className="text-gray-500 mb-4 text-sm">
          Something went wrong loading this page.
        </p>
        {error.digest && (
          <p className="text-xs text-gray-400 mb-4">Reference: {error.digest}</p>
        )}
        <button
          onClick={reset}
          className="rounded-md bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
        >
          Retry
        </button>
      </div>
    </div>
  )
}
