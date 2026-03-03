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
        <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-100 p-8">
          <div className="mb-6">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-50 ring-2 ring-green-200 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Booking Confirmed!</h1>
          </div>

          <p className="text-gray-600 mb-2">
            Your appointment has been booked. We&apos;ll be in touch shortly to confirm the details.
          </p>
          <p className="text-sm text-gray-400 mb-8">
            Check your email for a confirmation with your appointment time and next steps.
          </p>

          <Link
            href="/offer"
            className="inline-block rounded-lg bg-gray-800 px-6 py-2.5 text-sm font-semibold text-white hover:bg-gray-700 transition-all shadow-sm hover:shadow-md"
          >
            Value Another Vehicle
          </Link>
        </div>
      </div>
    </OfferShell>
  )
}
