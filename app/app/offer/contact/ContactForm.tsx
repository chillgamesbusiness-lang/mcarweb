'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense, useRef, useState } from 'react'
import Link from 'next/link'
import TurnstileWidget from '@/app/components/TurnstileWidget'

interface ContactFormProps {
  submitContact: (formData: FormData) => Promise<void>
}

function ContactFormInner({ submitContact }: ContactFormProps) {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  const formRef = useRef<HTMLFormElement>(null)
  const [phone, setPhone] = useState('')
  const [otpSessionId, setOtpSessionId] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [otpMessage, setOtpMessage] = useState('')
  const [otpError, setOtpError] = useState('')
  const [sendingOtp, setSendingOtp] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [turnstileResetSignal, setTurnstileResetSignal] = useState(0)
  const hasTurnstile = !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

  function resetTurnstile() {
    setTurnstileToken(null)
    setTurnstileResetSignal((value) => value + 1)
  }

  async function requestOtp() {
    setOtpError('')
    setOtpMessage('')
    setSendingOtp(true)
    try {
      const res = await fetch('/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, turnstileToken }),
      })
      const data = await res.json()
      if (!res.ok || !data.sessionId) {
        setOtpError(data.error ?? 'Could not send a verification code. Please check your number and try again.')
        return
      }
      setOtpSessionId(data.sessionId)
      setOtpMessage('Verification code sent. Enter the 6-digit code to continue.')
    } catch {
      setOtpError('Could not send a verification code. Please try again.')
    } finally {
      resetTurnstile()
      setSendingOtp(false)
    }
  }

  return (
    <form ref={formRef} action={submitContact} className="card-premium p-7 sm:p-8 space-y-4 animate-slide-up">
      {/* Reassurance banner */}
      <div className="flex items-center gap-3 rounded-xl border border-gold/20 bg-gold-50 px-4 py-3.5 mb-1 dark:bg-gold/10 dark:border-gold/25">
        <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center shrink-0 dark:bg-gold/20">
          <svg className="w-4 h-4 text-gold" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <p className="text-[13px] text-foreground font-medium">
          Your details are handled securely. We only use them for your valuation and appointment.
        </p>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200/50 p-4 text-sm text-red-700 flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
          {error}
        </div>
      )}

      <input type="hidden" name="otpSessionId" value={otpSessionId} />

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
          value={phone}
          onChange={(event) => {
            setPhone(event.target.value)
            setOtpSessionId('')
            setOtpCode('')
            setOtpMessage('')
            setOtpError('')
          }}
          className="w-full rounded-xl border border-warm-border px-4 py-3.5 text-sm text-foreground input-premium focus:outline-none bg-[var(--input-bg)]"
        />
      </div>

      <div className="rounded-xl border border-warm-border bg-[var(--surface-warm)] p-4 space-y-3">
        <TurnstileWidget
          onToken={setTurnstileToken}
          onExpire={() => setTurnstileToken(null)}
          resetSignal={turnstileResetSignal}
        />
        <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
          <div className="flex-1">
            <label htmlFor="otpCode" className="block text-sm font-semibold text-foreground mb-2">
              SMS Verification Code
            </label>
            <input
              id="otpCode"
              name="otpCode"
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              disabled={!otpSessionId}
              value={otpCode}
              onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              className="w-full rounded-xl border border-warm-border px-4 py-3.5 text-sm text-foreground input-premium focus:outline-none bg-[var(--input-bg)] disabled:opacity-70 disabled:cursor-not-allowed"
            />
          </div>
          <button
            type="button"
            onClick={requestOtp}
            disabled={sendingOtp || phone.replace(/\D/g, '').length < 10 || (hasTurnstile && !turnstileToken)}
            className="rounded-xl border border-warm-border px-4 py-3 text-sm font-bold text-foreground transition-all hover:border-gold disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {sendingOtp ? 'Sending...' : otpSessionId ? 'Resend Code' : 'Send Code'}
          </button>
        </div>
        {otpMessage && <p className="text-xs text-green-700">{otpMessage}</p>}
        {otpError && <p className="text-xs text-red-700">{otpError}</p>}
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
        disabled={!otpSessionId || otpCode.length !== 6}
        className="w-full rounded-2xl gradient-gold px-4 py-4 text-[15px] font-bold text-white transition-all duration-300 shadow-lg shadow-gold/20 hover:shadow-xl hover:shadow-gold/30 active:scale-[0.98] disabled:opacity-70 disabled:saturate-50 disabled:cursor-not-allowed"
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
