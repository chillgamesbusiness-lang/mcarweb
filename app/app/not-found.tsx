import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center max-w-md">
        <h1 className="text-6xl font-bold text-warm-border mb-2">404</h1>
        <h2 className="text-xl font-bold text-charcoal mb-2">Page not found</h2>
        <p className="text-warm-gray mb-6 text-sm">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/"
          className="rounded-lg bg-gold px-6 py-3 text-sm font-semibold text-white hover:bg-gold-dark transition-colors inline-block shadow-md"
        >
          Go Home
        </Link>
      </div>
    </div>
  )
}
