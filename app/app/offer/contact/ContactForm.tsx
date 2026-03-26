'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense, useRef } from 'react'
import Link from 'next/link'

interface ContactFormProps {
  submitContact: (formData: FormData) => Promise<void>
}

function ContactFormInner({ submitContact }: ContactFormProps) {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  const formRef = useRef<HTMLFormElement>(null)

  return (
    <form ref={formRef} action={submitContact} className="bg-surface rounded-2xl shadow-lg border border-warm-border p-7 space-y-4">
      {/* Reassurance banner */}
      <div className="flex items-center gap-2 bg-gold-50 rounded-lg px-4 py-3 mb-1">
        <svg className="w-4 h-4 text-gold flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <p className="text-xs text-charcoal-light">
          Your details are handled securely. We only use them for your valuation and appointment.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-gold-50 border border-gold/30 p-3 text-sm text-gold-dark">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-charcoal mb-1.5">
          Full Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          placeholder="John Smith"
          className="w-full rounded-lg border border-warm-border px-4 py-3 text-sm text-charcoal focus:border-gold focus:ring-2 focus:ring-gold/15 outline-none transition-shadow bg-surface"
        />
      </div>

      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-charcoal mb-1.5">
          Phone Number
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          required
          placeholder="07123 456789"
          className="w-full rounded-lg border border-warm-border px-4 py-3 text-sm text-charcoal focus:border-gold focus:ring-2 focus:ring-gold/15 outline-none transition-shadow bg-surface"
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-charcoal mb-1.5">
          Email Address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          placeholder="john@example.com"
          className="w-full rounded-lg border border-warm-border px-4 py-3 text-sm text-charcoal focus:border-gold focus:ring-2 focus:ring-gold/15 outline-none transition-shadow bg-surface"
        />
      </div>

      <div>
        <label htmlFor="postcode" className="block text-sm font-medium text-charcoal mb-1.5">
          Postcode
        </label>
        <input
          id="postcode"
          name="postcode"
          type="text"
          required
          placeholder="SW1A 1AA"
          className="w-full rounded-lg border border-warm-border px-4 py-3 text-sm text-charcoal focus:border-gold focus:ring-2 focus:ring-gold/15 outline-none transition-shadow bg-surface"
        />
      </div>

      <div className="flex items-start gap-2.5 pt-1">
        <input
          id="consent"
          name="consent"
          type="checkbox"
          required
          className="mt-1 rounded border-warm-border text-gold focus:ring-gold"
        />
        <label htmlFor="consent" className="text-xs text-warm-gray leading-snug">
          By submitting, you agree we may contact you about your vehicle.
          You can withdraw consent at any time. See our{' '}
          <Link href="/privacy" className="text-gold-dark hover:underline" target="_blank">
            Privacy Policy
          </Link>.
        </label>
      </div>

      <div className="flex items-start gap-2.5">
        <input
          id="consent_marketing"
          name="consent_marketing"
          type="checkbox"
          className="mt-1 rounded border-warm-border text-gold focus:ring-gold"
        />
        <label htmlFor="consent_marketing" className="text-xs text-warm-gray leading-snug">
          I&apos;d like to receive occasional offers, tips and market updates (optional).
        </label>
      </div>

      <button
        type="submit"
        className="w-full rounded-lg bg-gold px-4 py-3.5 text-sm font-semibold text-white hover:bg-gold-dark transition-all duration-200 shadow-md hover:shadow-lg"
      >
        Get My Valuation
      </button>
    </form>
  )
}

export default function ContactForm(props: ContactFormProps) {
  return (
    <Suspense>
      <ContactFormInner {...props} />
    </Suspense>
  )
}
