import { NextRequest, NextResponse } from 'next/server'
import { verifyOTP } from '@/lib/leadVerification'

/**
 * POST /api/otp/verify
 *
 * Body: { sessionId: string, code: string }
 * Returns: { verified: boolean }
 */
export async function POST(request: NextRequest) {
  try {
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
