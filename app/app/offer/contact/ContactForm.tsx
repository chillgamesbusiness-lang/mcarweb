'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense, useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface ContactFormProps {
  submitContact: (formData: FormData) => Promise<void>
}

function ContactFormInner({ submitContact }: ContactFormProps) {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  const [otpStep, setOtpStep] = useState(false)
  const [otpSessionId, setOtpSessionId] = useState<string | null>(null)
  const [otpVerified, setOtpVerified] = useState(false)
  const [otpError, setOtpError] = useState<string | null>(null)
  const [otpSending, setOtpSending] = useState(false)
  const [otpVerifying, setOtpVerifying] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const [checkingPhone, setCheckingPhone] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const lastCheckedPhone = useRef<string>('')

  // Check if phone was previously verified (or is whitelisted)
  const checkPreviousVerification = useCallback(async (phone: string) => {
    const digits = phone.replace(/\D/g, '')
    if (digits.length < 10 || digits.length > 11) return
    if (lastCheckedPhone.current === digits) return
    lastCheckedPhone.current = digits

    setCheckingPhone(true)
    try {
      const res = await fetch('/api/otp/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      })
      const data = await res.json()
      if (data.verified && data.sessionId) {
        setOtpSessionId(data.sessionId)
        setOtpVerified(true)
        setOtpStep(false)
      }
    } catch {
      // Silent — user can still verify manually
    } finally {
      setCheckingPhone(false)
    }
  }, [])

  // On mount, check localStorage for a previously verified phone
  useEffect(() => {
    const savedPhone = localStorage.getItem('mcar_verified_phone')
    if (savedPhone) {
      const phoneInput = document.getElementById('phone') as HTMLInputElement | null
      if (phoneInput && !phoneInput.value) {
        phoneInput.value = savedPhone
      }
      checkPreviousVerification(savedPhone)
    }
  }, [checkPreviousVerification])

  // Countdown timer for resend cooldown
  function startCooldown() {
    setCooldown(60)
    const iv = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) { clearInterval(iv); return 0 }
        return prev - 1
      })
    }, 1000)
  }

  async function handleSendOtp() {
    if (!formRef.current) return
    const fd = new FormData(formRef.current)
    const phone = (fd.get('phone') as string)?.trim()

    if (!phone || phone.length < 10) {
      setOtpError('Please enter a valid UK mobile number first.')
      return
    }

    setOtpSending(true)
    setOtpError(null)

    try {
      const res = await fetch('/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      })
      const data = await res.json()

      if (data.sessionId) {
        setOtpSessionId(data.sessionId)
        setOtpStep(true)
        startCooldown()
      } else if (data.error) {
        setOtpError(data.error)
      } else {
        // Generic response — still show OTP step in case silent rejection
        setOtpStep(true)
        setOtpError('If this is a valid UK mobile, you should receive a code shortly.')
      }
    } catch {
      setOtpError('Failed to send verification code. Please try again.')
    } finally {
      setOtpSending(false)
    }
  }

  async function handleVerifyOtp() {
    if (!otpSessionId || !otpCode.trim()) {
      setOtpError('Please enter the 4-digit code.')
      return
    }

    setOtpVerifying(true)
    setOtpError(null)

    try {
      const res = await fetch('/api/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: otpSessionId, code: otpCode.trim() }),
      })
      const data = await res.json()

      if (data.verified) {
        setOtpVerified(true)
        // Save verified phone to localStorage for future visits
        if (formRef.current) {
          const fd = new FormData(formRef.current)
          const phone = (fd.get('phone') as string)?.trim()
          if (phone) localStorage.setItem('mcar_verified_phone', phone)
        }
      } else {
        setOtpError(data.error || 'Incorrect code. Please try again.')
      }
    } catch {
      setOtpError('Verification failed. Please try again.')
    } finally {
      setOtpVerifying(false)
    }
  }

  return (
    <form ref={formRef} action={submitContact} className="bg-white rounded-xl shadow-sm ring-1 ring-gray-100 p-6 space-y-4">
      {error && (
        <div className="rounded-lg bg-amber-50 ring-1 ring-amber-200 p-3 text-sm text-amber-700">
          {error}
        </div>
      )}

      {/* Hidden fields for OTP session data */}
      {otpSessionId && <input type="hidden" name="otp_session_id" value={otpSessionId} />}
      <input type="hidden" name="otp_verified" value={otpVerified ? 'true' : 'false'} />
      {/* Mirror phone value as hidden field — disabled inputs are excluded from FormData */}
      <input type="hidden" name="phone_verified" id="phone_verified" value="" />

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
        <div className="flex gap-2">
          <input
            id="phone"
            name="phone"
            type="tel"
            required={!otpVerified}
            placeholder="07123 456789"
            readOnly={otpVerified}
            onBlur={(e) => {
              if (!otpVerified) checkPreviousVerification(e.target.value)
            }}
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none read-only:bg-gray-100 read-only:text-gray-500"
          />
          {!otpVerified && !checkingPhone && (
            <button
              type="button"
              onClick={handleSendOtp}
              disabled={otpSending || cooldown > 0}
              className="rounded-md bg-gray-700 px-3 py-2 text-sm font-medium text-white hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {otpSending ? 'Sending...' : cooldown > 0 ? `Resend (${cooldown}s)` : otpStep ? 'Resend Code' : 'Verify Phone'}
            </button>
          )}
          {checkingPhone && (
            <span className="flex items-center text-gray-400 text-sm px-3">
              Checking…
            </span>
          )}
          {otpVerified && (
            <span className="flex items-center text-green-600 text-sm font-medium px-3">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              Verified
            </span>
          )}
        </div>
      </div>

      {/* OTP input step */}
      {otpStep && !otpVerified && (
        <div className="rounded-md bg-blue-50 border border-blue-200 p-4 space-y-3">
          <p className="text-sm text-blue-700">
            Enter the 4-digit code sent to your phone.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
              placeholder="0000"
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-center tracking-widest font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
            <button
              type="button"
              onClick={handleVerifyOtp}
              disabled={otpVerifying || otpCode.length !== 4}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {otpVerifying ? 'Checking...' : 'Verify'}
            </button>
          </div>
        </div>
      )}

      {otpError && (
        <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-700">
          {otpError}
        </div>
      )}

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
        disabled={!otpVerified}
        className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {otpVerified ? 'Get My Offer' : 'Verify your phone to continue'}
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
