'use client'

import { useCallback, useEffect, useRef } from 'react'

interface TurnstileWidgetProps {
  onToken: (token: string) => void
  onExpire?: () => void
  resetSignal?: number
  className?: string
  size?: 'normal' | 'compact' | 'flexible'
}

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string
  reset?: (widgetId?: string) => void
  remove?: (widgetId: string) => void
}

function getTurnstile(): TurnstileApi | undefined {
  return (window as unknown as { turnstile?: TurnstileApi }).turnstile
}

export default function TurnstileWidget({
  onToken,
  onExpire,
  resetSignal,
  className = 'flex w-full min-w-0 justify-center overflow-hidden',
  size = 'flexible',
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const lastTokenRef = useRef<string | null>(null)
  const onTokenRef = useRef(onToken)
  const onExpireRef = useRef(onExpire)
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

  useEffect(() => {
    onTokenRef.current = onToken
  }, [onToken])

  useEffect(() => {
    onExpireRef.current = onExpire
  }, [onExpire])

  const publishToken = useCallback((token: string) => {
    if (!token || token === lastTokenRef.current) return
    lastTokenRef.current = token
    onTokenRef.current(token)
  }, [])

  const clearToken = useCallback(() => {
    lastTokenRef.current = null
    onExpireRef.current?.()
  }, [])

  const readResponseField = useCallback(() => {
    const token = containerRef.current
      ?.querySelector<HTMLInputElement>('input[name="cf-turnstile-response"]')
      ?.value
      .trim()

    if (token) publishToken(token)
  }, [publishToken])

  const removeWidget = useCallback(() => {
    const widgetId = widgetIdRef.current
    if (!widgetId) return

    try {
      getTurnstile()?.remove?.(widgetId)
    } catch {
      // Cloudflare can already have torn down challenge iframes during navigation.
    } finally {
      lastTokenRef.current = null
      widgetIdRef.current = null
      if (containerRef.current) containerRef.current.innerHTML = ''
    }
  }, [])

  const renderWidget = useCallback(() => {
    if (!containerRef.current || !siteKey || widgetIdRef.current !== null) return

    const turnstile = getTurnstile()
    if (!turnstile) return

    widgetIdRef.current = turnstile.render(containerRef.current, {
      sitekey: siteKey,
      size,
      callback: publishToken,
      'expired-callback': clearToken,
      'error-callback': clearToken,
      'response-field': true,
      'refresh-expired': 'auto',
    })
    readResponseField()
  }, [clearToken, publishToken, readResponseField, siteKey, size])

  useEffect(() => {
    if (!siteKey) return

    const existingScript = document.querySelector<HTMLScriptElement>('script[src*="turnstile"]')
    if (existingScript) {
      renderWidget()
      existingScript.addEventListener('load', renderWidget, { once: true })
      return () => {
        existingScript.removeEventListener('load', renderWidget)
        removeWidget()
      }
    }

    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.async = true
    script.onload = () => renderWidget()
    document.head.appendChild(script)
    return removeWidget
  }, [removeWidget, renderWidget, siteKey])

  useEffect(() => {
    if (resetSignal === undefined || widgetIdRef.current === null) return
    lastTokenRef.current = null
    try {
      getTurnstile()?.reset?.(widgetIdRef.current)
    } catch {
      removeWidget()
    }
  }, [removeWidget, resetSignal])

  useEffect(() => {
    if (!siteKey) return

    const intervalId = window.setInterval(readResponseField, 500)
    return () => window.clearInterval(intervalId)
  }, [readResponseField, siteKey])

  if (!siteKey) return null

  return <div ref={containerRef} className={className} />
}