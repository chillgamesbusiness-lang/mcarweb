import { NextRequest, NextResponse } from 'next/server'
import { verifyOTP } from '@/lib/leadVerification'
import { checkOtpRateLimit } from '@/lib/rateLimit'

/**
 * POST /api/otp/verify
 *
 * Body: { sessionId: string, code: string }
 * Returns: { verified: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    // IP-level rate limiting to prevent session enumeration
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown'

    const rl = await checkOtpRateLimit(`otp:verify:ip:${ip}`, 20, 3600)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many verification attempts. Please try again later.', verified: false },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { sessionId, code } = body ?? {}

    if (!sessionId || !code || typeof code !== 'string') {
      return NextResponse.json(
        { error: 'Session ID and verification code are required.' },
        { status: 400 }
      )
    }

    const verified = await verifyOTP(sessionId, code)

    return NextResponse.json({ verified })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Verification failed'
    return NextResponse.json({ error: message, verified: false }, { status: 400 })
  }
}
