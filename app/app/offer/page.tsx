'use client'

import { useState, type FormEvent, useEffect, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

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

    // Load Turnstile script if not already present
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
  const [reg, setReg] = useState('')
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Get Your Offer</h1>
          <p className="mt-2 text-gray-500">
            Enter your vehicle registration to get an instant valuation
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6 space-y-5">
          <div>
            <label htmlFor="reg" className="block text-sm font-medium text-gray-700 mb-1">
              Registration Number
            </label>
            <input
              id="reg"
              type="text"
              value={reg}
              onChange={(e) => setReg(e.target.value.toUpperCase())}
              placeholder="e.g. AB12 CDE"
              required
              className="w-full rounded-md border border-gray-300 px-4 py-3 text-lg font-mono tracking-wider text-center uppercase focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>

          <TurnstileWidget onToken={setTurnstileToken} />

          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || reg.trim().length < 2 || (hasTurnstile && !turnstileToken)}
            className="w-full rounded-md bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Looking up...' : 'Get Valuation'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function OfferPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>}>
      <OfferForm />
    </Suspense>
  )
}
