'use client'

import { useState, type FormEvent, useEffect, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import OfferShell from './OfferShell'

/**
 * Turnstile widget component.
 * When NEXT_PUBLIC_TURNSTILE_SITE_KEY is not set, renders nothing (dev passthrough).
 */
function TurnstileWidget({ onToken }: { onToken: (token: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

  const renderWidget = useCallback(() => {
    if (!containerRef.current || !siteKey) return
    if (widgetIdRef.current !== null) return

    const w = window as unknown as {
      turnstile?: {
        render: (el: HTMLElement, opts: Record<string, unknown>) => string
      }
    }
    if (w.turnstile) {
      widgetIdRef.current = w.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: onToken,
        'refresh-expired': 'auto',
      })
    }
  }, [siteKey, onToken])

  useEffect(() => {
    if (!siteKey) return

    const existingScript = document.querySelector('script[src*="turnstile"]')
    if (existingScript) {
      renderWidget()
      return
    }

    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.async = true
    script.onload = () => renderWidget()
    document.head.appendChild(script)
  }, [siteKey, renderWidget])

  if (!siteKey) return null

  return <div ref={containerRef} className="flex justify-center" />
}

function OfferForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [reg, setReg] = useState(searchParams.get('reg')?.toUpperCase() || '')
  const [loading, setLoading] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(
    searchParams.get('error') || null
  )

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/vehicle/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reg, turnstileToken }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Lookup failed')
        return
      }

      router.push(`/offer/details?token=${encodeURIComponent(data.token)}`)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const hasTurnstile = !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

  return (
    <OfferShell>
      <div className="text-center mb-8 animate-fade-in-up">
        <h1 className="text-[32px] font-extrabold text-charcoal-deep tracking-[-0.02em]">
          Get Your Valuation
        </h1>
        <p className="mt-3 text-warm-gray text-[15px] leading-relaxed">
          Enter your registration below for a free, no-obligation valuation
        </p>
      </div>

      {/* Loading state — premium shimmer */}
      {loading ? (
        <div className="card-premium p-8 text-center animate-scale-in">
          <div className="w-16 h-16 rounded-2xl gradient-gold mx-auto flex items-center justify-center mb-5 shadow-lg shadow-gold/20 animate-pulse-glow">
            <svg
              className="w-7 h-7 text-white animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
          <p className="text-charcoal-deep font-bold text-lg mb-2">
            Checking vehicle details&hellip;
          </p>
          <p className="text-warm-gray text-sm">This usually takes a few seconds</p>
          <div className="mt-5 h-2 bg-warm-border-light rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-gold/60 via-gold to-gold/60 rounded-full"
              style={{
                backgroundSize: '200% 100%',
                animation: 'shimmer 2s infinite linear',
              }}
            />
          </div>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="card-premium p-7 sm:p-8 space-y-5 animate-slide-up"
        >
          <div>
            <label
              htmlFor="reg"
              className="block text-sm font-medium text-charcoal mb-2"
            >
              Registration Number
            </label>
            {/* UK Number Plate Input */}
            <div className="flex items-stretch border-2 border-charcoal rounded-lg overflow-hidden">
              <div className="bg-[#003DA5] text-white w-11 flex flex-col items-center justify-center gap-0.5 flex-shrink-0">
                <svg viewBox="0 0 24 16" className="w-5 h-3.5" fill="none">
                  <circle cx="12" cy="8" r="5" stroke="white" strokeWidth="1" />
                  <path
                    d="M7 8 Q12 4 17 8 Q12 12 7 8Z"
                    fill="#FFD700"
                    opacity="0.8"
                  />
                </svg>
                <span className="text-[9px] font-bold tracking-wide leading-none">
                  GB
                </span>
              </div>
              <input
                id="reg"
                type="text"
                value={reg}
                onChange={(e) => setReg(e.target.value.toUpperCase())}
                placeholder="Enter reg"
                required
                className="flex-1 px-4 py-5 text-2xl font-bold uppercase tracking-[0.15em] text-center text-charcoal-deep placeholder:text-warm-border focus:outline-none bg-gold-50/30"
                autoComplete="off"
                spellCheck={false}
              />
            </div>
          </div>

          <TurnstileWidget onToken={setTurnstileToken} />

          {error && (
            <div className="rounded-lg bg-gold-50 ring-1 ring-gold/30 p-3 text-sm text-gold-dark">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || reg.trim().length < 2 || (hasTurnstile && !turnstileToken)}
            className="w-full rounded-2xl gradient-gold px-4 py-4 text-base font-bold text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300 shadow-lg shadow-gold/20 hover:shadow-xl hover:shadow-gold/30 active:scale-[0.98]"
          >
            Get Valuation
          </button>

          <p className="text-xs text-warm-gray text-center">
            Takes less than 2 minutes&ensp;·&ensp;No sign-up required
          </p>
        </form>
      )}
    </OfferShell>
  )
}

export default function OfferPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background text-warm-gray">
          Loading&hellip;
        </div>
      }
    >
      <OfferForm />
    </Suspense>
  )
}
