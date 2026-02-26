import { NextRequest, NextResponse } from 'next/server'
import { sendOTP, isValidUkMobile, cleanPhone, isBlockedNumber } from '@/lib/leadVerification'

/**
 * POST /api/otp/send
 *
 * Body: { phone: string }
 * Returns: { sessionId: string } with generic success message.
 *
 * IMPORTANT: Always returns a generic "If this is a valid mobile number,
 * a code has been sent" response to avoid phone enumeration.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const phone = body?.phone

    if (!phone || typeof phone !== 'string') {
      // Generic response — don't reveal validation details
      return NextResponse.json({
        message: 'If this is a valid UK mobile number, a verification code has been sent.',
        sessionId: null,
      })
    }

    const cleaned = cleanPhone(phone)

    // Silently reject invalid/blocked numbers with generic response
    if (!isValidUkMobile(cleaned) || isBlockedNumber(cleaned)) {
      return NextResponse.json({
        message: 'If this is a valid UK mobile number, a verification code has been sent.',
        sessionId: null,
      })
    }

    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown'

    const { sessionId } = await sendOTP(phone, ip)

    return NextResponse.json({
      message: 'If this is a valid UK mobile number, a verification code has been sent.',
      sessionId,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Verification failed'

    // Rate limit errors get specific messages; everything else is generic
    if (message.includes('Too many') || message.includes('wait')) {
      return NextResponse.json({ error: message, sessionId: null }, { status: 429 })
    }

    // Generic response for all other errors
    return NextResponse.json({
      message: 'If this is a valid UK mobile number, a verification code has been sent.',
      sessionId: null,
    })
  }
}
