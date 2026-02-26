import Link from 'next/link'

export default function OfferDonePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md text-center">
        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <div className="mb-6">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Booking Confirmed!</h1>
          </div>

          <p className="text-gray-600 mb-2">
            Your appointment has been booked. We will be in touch shortly to confirm the details.
          </p>
          <p className="text-sm text-gray-400 mb-8">
            Check your email for a confirmation with your appointment time and next steps.
          </p>

          <Link
            href="/offer"
            className="inline-block rounded-md bg-gray-800 px-6 py-2.5 text-sm font-semibold text-white hover:bg-gray-700 transition-colors"
          >
            Value Another Vehicle
          </Link>
        </div>
      </div>
    </div>
  )
}
