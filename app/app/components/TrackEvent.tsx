'use client'

import { useEffect } from 'react'
import { track } from '@vercel/analytics'

interface TrackEventProps {
  /** Event name sent to Vercel Analytics */
  event: string
  /** Optional key/value properties attached to the event */
  properties?: Record<string, string | number | boolean>
}

/**
 * Invisible component that fires a single Vercel Analytics custom event
 * on mount. Drop it into any server-rendered page to track a conversion step.
 *
 * Example:
 *   <TrackEvent event="booking_confirmed" />
 */
export default function TrackEvent({ event, properties }: TrackEventProps) {
  useEffect(() => {
    track(event, properties)
    // Fire once on mount only — deps intentionally empty
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
