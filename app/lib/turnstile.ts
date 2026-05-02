import { isStrictProductionEnv } from '@/lib/env'
import { reportError } from '@/lib/reportError'

/**
 * Cloudflare Turnstile server-side verification.
 *
 * Returns true when Turnstile env vars are not configured outside strict production.
 */

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

export interface TurnstileVerificationResult {
  success: boolean
  reason?: 'missing-secret' | 'missing-token' | 'invalid-token' | 'network-error'
  errorCodes?: string[]
}

export async function verifyTurnstileDetailed(token: unknown): Promise<TurnstileVerificationResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY

  if (!secret) {
    if (isStrictProductionEnv()) {
      await reportError(new Error('TURNSTILE_SECRET_KEY is missing'), {
        severity: 'critical',
        area: 'bot_protection',
        operation: 'turnstile_config',
        provider: 'cloudflare',
      })
      return { success: false, reason: 'missing-secret' }
    }
    return { success: true }
  }

  const responseToken = typeof token === 'string' ? token.trim() : ''
  if (!responseToken) return { success: false, reason: 'missing-token' }

  try {
    const res = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret,
        response: responseToken,
      }),
    })

    const data = await res.json()
    if (data.success === true) return { success: true }

    return {
      success: false,
      reason: 'invalid-token',
      errorCodes: Array.isArray(data['error-codes']) ? data['error-codes'] : undefined,
    }
  } catch (err) {
    await reportError(err, {
      severity: 'error',
      area: 'bot_protection',
      operation: 'turnstile_verify',
      provider: 'cloudflare',
    })
    return { success: false, reason: 'network-error' }
  }
}

export async function verifyTurnstile(token: unknown): Promise<boolean> {
  const result = await verifyTurnstileDetailed(token)
  return result.success
}
