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
    <form ref={formRef} action={submitContact} className="card-premium p-7 sm:p-8 space-y-4 animate-slide-up">
      {/* Reassurance banner */}
      <div className="flex items-center gap-3 bg-gradient-to-r from-gold-50 to-gold-light/30 rounded-xl px-4 py-3.5 mb-1 border border-gold/10">
        <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center shrink-0">
          <svg className="w-4 h-4 text-gold" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <p className="text-[13px] text-foreground/70 font-medium">
          Your details are handled securely. We only use them for your valuation and appointment.
        </p>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200/50 p-4 text-sm text-red-700 flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
          {error}
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-semibold text-foreground mb-2">
          Full Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          placeholder="John Smith"
          className="w-full rounded-xl border border-warm-border px-4 py-3.5 text-sm text-foreground input-premium focus:outline-none bg-[var(--input-bg)]"
        />
      </div>

      <div>
        <label htmlFor="phone" className="block text-sm font-semibold text-foreground mb-2">
          Phone Number
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          required
          placeholder="07123 456789"
          className="w-full rounded-xl border border-warm-border px-4 py-3.5 text-sm text-foreground input-premium focus:outline-none bg-[var(--input-bg)]"
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-semibold text-foreground mb-2">
          Email Address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          placeholder="john@example.com"
          className="w-full rounded-xl border border-warm-border px-4 py-3.5 text-sm text-foreground input-premium focus:outline-none bg-[var(--input-bg)]"
        />
      </div>

      <div>
        <label htmlFor="postcode" className="block text-sm font-semibold text-foreground mb-2">
          Postcode
        </label>
        <input
          id="postcode"
          name="postcode"
          type="text"
          required
          placeholder="SW1A 1AA"
          className="w-full rounded-xl border border-warm-border px-4 py-3.5 text-sm text-foreground input-premium focus:outline-none bg-[var(--input-bg)]"
        />
      </div>

      <div className="flex items-start gap-3 pt-2">
        <input
          id="consent"
          name="consent"
          type="checkbox"
          required
          className="mt-1 w-4 h-4 rounded-md border-warm-border text-gold focus:ring-gold"
        />
        <label htmlFor="consent" className="text-xs text-warm-gray leading-snug">
          By submitting, you agree we may contact you about your vehicle.
          You can withdraw consent at any time. See our{' '}
          <Link href="/privacy" className="text-gold-dark hover:underline font-medium" target="_blank">
            Privacy Policy
          </Link>.
        </label>
      </div>

      <div className="flex items-start gap-3">
        <input
          id="consent_marketing"
          name="consent_marketing"
          type="checkbox"
          className="mt-1 w-4 h-4 rounded-md border-warm-border text-gold focus:ring-gold"
        />
        <label htmlFor="consent_marketing" className="text-xs text-warm-gray leading-snug">
          I&apos;d like to receive occasional offers, tips and market updates (optional).
        </label>
      </div>

      <button
        type="submit"
        className="w-full rounded-2xl gradient-gold px-4 py-4 text-[15px] font-bold text-white transition-all duration-300 shadow-lg shadow-gold/20 hover:shadow-xl hover:shadow-gold/30 active:scale-[0.98]"
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
