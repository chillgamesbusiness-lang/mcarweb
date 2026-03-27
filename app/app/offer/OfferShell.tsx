/**
 * Shared wrapper for the public offer funnel.
 * Provides: premium background, brand header, trust signals, consistent spacing.
 */
export default function OfferShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Gradient mesh background */}
      <div className="absolute inset-0 gradient-hero" />
      <div className="absolute top-20 right-[10%] w-[400px] h-[400px] rounded-full bg-gold/[0.04] blur-[100px]" />
      <div className="absolute bottom-20 left-[5%] w-[300px] h-[300px] rounded-full bg-gold/[0.03] blur-[80px]" />

      <div className="relative px-4 py-8 sm:py-12">
        <div className="w-full max-w-lg mx-auto">
          {/* Brand header */}
          <div className="text-center mb-8">
            <a href="/" className="inline-flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl gradient-gold flex items-center justify-center shadow-md group-hover:shadow-lg transition-all duration-300 group-hover:scale-105">
                <span className="text-[14px] font-extrabold text-white tracking-tight">M</span>
              </div>
              <span className="text-[16px] font-bold text-charcoal-deep tracking-tight group-hover:text-gold-dark transition-colors">MCar</span>
            </a>
          </div>

          {children}

          {/* Trust badges — premium pills */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            {[
              {
                label: 'DVLA Verified',
                icon: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />,
              },
              {
                label: 'Secure & Encrypted',
                icon: <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />,
              },
              {
                label: 'No Obligation',
                icon: <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />,
              },
            ].map((badge) => (
              <span key={badge.label} className="inline-flex items-center gap-1.5 bg-white/60 backdrop-blur-sm border border-warm-border/50 rounded-full px-3 py-1.5 text-[10px] font-semibold text-warm-gray uppercase tracking-wider">
                <svg className="w-3.5 h-3.5 text-gold" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  {badge.icon}
                </svg>
                {badge.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
