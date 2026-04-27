import { NextRequest, NextResponse } from 'next/server'
import { sendOTP, isValidUkMobile, cleanPhone, isBlockedNumber } from '@/lib/leadVerification'
import { verifyTurnstile } from '@/lib/turnstile'
import { reportError } from '@/lib/reportError'

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
    const turnstileToken = body?.turnstileToken ?? null

    if (!phone || typeof phone !== 'string') {
      // Generic response — don't reveal validation details
      return NextResponse.json({
        message: 'If this is a valid UK mobile number, a verification code has been sent.',
        sessionId: null,
      })
    }

    const cleaned = cleanPhone(phone)

    const turnstileOk = await verifyTurnstile(turnstileToken)
    if (!turnstileOk) {
      return NextResponse.json(
        { error: 'Bot verification failed. Please try again.', sessionId: null },
        { status: 400 }
      )
    }

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
    await reportError(err, {
      severity: message.includes('Too many') || message.includes('wait') ? 'warning' : 'error',
      area: 'otp',
      operation: 'send_route',
      provider: message.includes('Verification service') ? 'twilio' : undefined,
    })

    // Rate limit errors get specific messages; everything else is generic
    if (message.includes('Too many') || message.includes('wait')) {
      return NextResponse.json({ error: message, sessionId: null }, { status: 429 })
    }

    return NextResponse.json(
      { error: 'Could not send verification code. Please try again.', sessionId: null },
      { status: 503 }
    )
  }
}
