export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-gold border-r-transparent" />
        <p className="mt-3 text-sm text-warm-gray">Loading...</p>
      </div>
    </div>
  )
}
