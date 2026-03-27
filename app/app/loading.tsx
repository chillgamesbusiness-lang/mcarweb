export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center animate-scale-in">
        <div className="mx-auto w-14 h-14 rounded-2xl gradient-gold flex items-center justify-center shadow-lg shadow-gold/25 animate-pulse-glow mb-4">
          <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-white border-r-transparent" />
        </div>
        <p className="text-sm text-warm-gray font-medium">Loading...</p>
      </div>
    </div>
  )
}
