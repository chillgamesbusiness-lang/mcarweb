import Link from 'next/link'
import TrackEvent from '@/app/components/TrackEvent'
import OfferShell from '../OfferShell'

export const metadata = {
  title: 'Booking Confirmed',
  description: 'Your vehicle inspection appointment has been confirmed.',
  robots: { index: false, follow: false },
}

export default function OfferDonePage() {
  return (
    <OfferShell>
      {/* Fire once on page mount — booking funnel complete */}
      <TrackEvent event="booking_confirmed" />
      <div className="text-center">
        <div className="card-premium p-10 sm:p-12 animate-scale-in">
          <div className="mb-8">
            <div className="mx-auto w-20 h-20 rounded-2xl gradient-gold flex items-center justify-center mb-6 shadow-lg shadow-gold/25 animate-pulse-glow">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-extrabold text-foreground tracking-[-0.02em]">Booking Confirmed</h1>
          </div>

          <p className="text-foreground/70 mb-2 text-[15px]">
            Your appointment has been booked. We&apos;ll be in touch shortly to confirm the details.
          </p>
          <p className="text-sm text-warm-gray mb-10">
            Check your email for a confirmation with your appointment time and next steps.
          </p>

          <Link
            href="/offer"
            className="inline-block rounded-2xl gradient-gold px-8 py-4 text-[15px] font-bold text-white transition-all duration-300 shadow-lg shadow-gold/20 hover:shadow-xl hover:shadow-gold/30 active:scale-[0.98]"
          >
            Value Another Vehicle
          </Link>
        </div>
      </div>
    </OfferShell>
  )
}
