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
    <form ref={formRef} action={submitContact} className="bg-white rounded-xl shadow-sm ring-1 ring-gray-100 p-6 space-y-4">
      {error && (
        <div className="rounded-lg bg-amber-50 ring-1 ring-amber-200 p-3 text-sm text-amber-700">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          Full Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          placeholder="John Smith"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
        />
      </div>

      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
          Phone Number
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          required
          placeholder="07123 456789"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          Email Address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          placeholder="john@example.com"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
        />
      </div>

      <div>
        <label htmlFor="postcode" className="block text-sm font-medium text-gray-700 mb-1">
          Postcode
        </label>
        <input
          id="postcode"
          name="postcode"
          type="text"
          required
          placeholder="SW1A 1AA"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
        />
      </div>

      <div className="flex items-start gap-2">
        <input
          id="consent"
          name="consent"
          type="checkbox"
          required
          className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <label htmlFor="consent" className="text-xs text-gray-500 leading-snug">
          By submitting, you agree we may contact you about your vehicle.
          You can withdraw consent at any time. See our{' '}
          <Link href="/privacy" className="text-blue-600 hover:underline" target="_blank">
            Privacy Policy
          </Link>.
        </label>
      </div>

      <div className="flex items-start gap-2">
        <input
          id="consent_marketing"
          name="consent_marketing"
          type="checkbox"
          className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <label htmlFor="consent_marketing" className="text-xs text-gray-500 leading-snug">
          I&apos;d like to receive occasional offers, tips and market updates (optional).
        </label>
      </div>

      <button
        type="submit"
        className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-all shadow-sm hover:shadow-md"
      >
        Get My Offer
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
