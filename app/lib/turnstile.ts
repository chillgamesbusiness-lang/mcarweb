/**
 * Cloudflare Turnstile server-side verification.
 *
 * Returns true when Turnstile env vars are not configured (dev passthrough).
 */

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

export async function verifyTurnstile(token: string | null): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY

  // If Turnstile is not configured, allow through (dev/preview)
  if (!secret) return true

  if (!token) return false

  try {
    const res = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret,
        response: token,
      }),
    })

    const data = await res.json()
    return data.success === true
  } catch (err) {
    console.error('[turnstile] Verification error:', err)
    return false
  }
}
