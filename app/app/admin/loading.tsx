export default function AdminLoading() {
  return (
    <div className="p-8 flex items-center gap-3">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-charcoal border-r-transparent" />
      <span className="text-sm text-warm-gray">Loading...</span>
    </div>
  )
}
