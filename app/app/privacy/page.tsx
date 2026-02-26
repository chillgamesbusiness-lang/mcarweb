import Link from 'next/link'

export const metadata = {
  title: 'Privacy Policy | MCAR',
  description: 'How we handle your personal data.',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="mx-auto max-w-2xl bg-white rounded-lg border border-gray-200 p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Privacy Policy</h1>

        <p className="text-sm text-gray-400 mb-6">Last updated: February 2026</p>

        <div className="space-y-6 text-sm text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">1. Who We Are</h2>
            <p>
              MCAR (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) operates an online vehicle
              valuation and acquisition service. We are the data controller for
              the personal information described in this policy.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">2. What We Collect</h2>
            <p>When you use our valuation tool, we may collect:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Your name, email address, phone number, and postcode</li>
              <li>Your vehicle registration number</li>
              <li>Vehicle details obtained from DVLA and MOT databases</li>
              <li>Your declared mileage and vehicle condition</li>
              <li>IP address and browser information (for security and rate limiting)</li>
              <li>OTP verification timestamps (codes are hashed and not stored in readable form)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">3. How We Use Your Data</h2>
            <p>We use your data to:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Provide you with a vehicle valuation</li>
              <li>Contact you about your valuation and any appointment you book</li>
              <li>Verify your identity via SMS one-time passwords</li>
              <li>Prevent fraud and abuse of our service</li>
              <li>Improve our valuation accuracy over time (anonymised analytics)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">4. Legal Basis</h2>
            <p>
              We process your data based on your consent (given when you submit
              the contact form) and our legitimate interest in providing accurate
              vehicle valuations and preventing service abuse.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">5. Who We Share With</h2>
            <p>We may share data with:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>DVLA and MOT History API (vehicle data lookups)</li>
              <li>Twilio (SMS verification delivery)</li>
              <li>Our inspection team (to complete vehicle assessments)</li>
            </ul>
            <p className="mt-2">
              We do not sell your personal data to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">6. Data Retention</h2>
            <p>
              We retain lead data for up to 24 months for operational and
              calibration purposes. OTP session records are automatically purged
              after 24 hours. You can request deletion at any time.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">7. Your Rights</h2>
            <p>Under UK GDPR, you have the right to:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Object to or restrict processing</li>
              <li>Data portability</li>
              <li>Withdraw consent at any time</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">8. Contact Us</h2>
            <p>
              To exercise any of your rights or ask questions about this policy,
              please email us at{' '}
              <a href="mailto:privacy@mcar.co.uk" className="text-blue-600 hover:underline">
                privacy@mcar.co.uk
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">9. Changes</h2>
            <p>
              We may update this policy from time to time. We will post any
              changes on this page with an updated revision date.
            </p>
          </section>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <Link
            href="/offer"
            className="text-sm text-blue-600 hover:underline"
          >
            &larr; Back to valuation
          </Link>
        </div>
      </div>
    </div>
  )
}
