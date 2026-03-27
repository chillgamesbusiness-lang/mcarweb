import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center max-w-md animate-scale-in">
        <h1 className="text-8xl font-extrabold gradient-gold-text mb-3 tracking-tight">404</h1>
        <h2 className="text-xl font-extrabold text-charcoal-deep mb-2 tracking-[-0.02em]">Page not found</h2>
        <p className="text-warm-gray mb-8 text-sm leading-relaxed">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/"
          className="rounded-2xl gradient-gold px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-gold/20 hover:shadow-xl hover:shadow-gold/30 transition-all duration-300 active:scale-[0.98] inline-block"
        >
          Go Home
        </Link>
      </div>
    </div>
  )
}
