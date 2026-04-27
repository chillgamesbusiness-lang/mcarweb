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
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

  const renderWidget = useCallback(() => {
    if (!containerRef.current || !siteKey || widgetIdRef.current !== null) return

    const turnstile = getTurnstile()
    if (!turnstile) return

    widgetIdRef.current = turnstile.render(containerRef.current, {
      sitekey: siteKey,
      size,
      callback: onToken,
      'expired-callback': onExpire,
      'error-callback': onExpire,
      'refresh-expired': 'auto',
    })
  }, [onExpire, onToken, siteKey, size])

  useEffect(() => {
    if (!siteKey) return

    const existingScript = document.querySelector<HTMLScriptElement>('script[src*="turnstile"]')
    if (existingScript) {
      renderWidget()
      existingScript.addEventListener('load', renderWidget, { once: true })
      return () => existingScript.removeEventListener('load', renderWidget)
    }

    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.async = true
    script.onload = () => renderWidget()
    document.head.appendChild(script)
  }, [renderWidget, siteKey])

  useEffect(() => {
    if (resetSignal === undefined || widgetIdRef.current === null) return
    getTurnstile()?.reset?.(widgetIdRef.current)
  }, [resetSignal])

  if (!siteKey) return null

  return <div ref={containerRef} className={className} />
}