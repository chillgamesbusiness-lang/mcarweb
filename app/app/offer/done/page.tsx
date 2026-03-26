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
        <div className="bg-surface rounded-2xl shadow-lg border border-warm-border p-10">
          <div className="mb-6">
            <div className="mx-auto w-16 h-16 rounded-full bg-gold-light ring-2 ring-gold/30 flex items-center justify-center mb-5">
              <svg className="w-8 h-8 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-charcoal tracking-tight">Booking Confirmed</h1>
          </div>

          <p className="text-charcoal-light mb-2">
            Your appointment has been booked. We&apos;ll be in touch shortly to confirm the details.
          </p>
          <p className="text-sm text-warm-gray mb-8">
            Check your email for a confirmation with your appointment time and next steps.
          </p>

          <Link
            href="/offer"
            className="inline-block rounded-lg bg-charcoal px-6 py-3 text-sm font-semibold text-white hover:bg-foreground transition-all shadow-sm hover:shadow-md"
          >
            Value Another Vehicle
          </Link>
        </div>
      </div>
    </OfferShell>
  )
}
