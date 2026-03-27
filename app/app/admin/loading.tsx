export default function AdminLoading() {
  return (
    <div className="px-10 py-14">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl gradient-gold flex items-center justify-center animate-pulse-glow">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-r-transparent" />
        </div>
        <div className="h-1 w-20 rounded-full bg-gold/20 overflow-hidden">
          <div className="h-full w-1/2 gradient-gold rounded-full animate-[slide-in-right_1s_ease-in-out_infinite]" />
        </div>
      </div>
    </div>
  )
}
