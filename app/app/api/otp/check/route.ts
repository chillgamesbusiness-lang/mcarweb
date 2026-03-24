import { NextRequest, NextResponse } from 'next/server'
import { checkPhoneVerified, isValidUkMobile, cleanPhone } from '@/lib/leadVerification'

/**
 * POST /api/otp/check
 *
 * Body: { phone: string }
 * Returns: { verified: boolean, sessionId: string | null }
 *
 * Checks whether a phone number has already been verified (recently)
 * or is whitelisted, so the user can skip re-entering an OTP code.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const phone = body?.phone

    if (!phone || typeof phone !== 'string') {
      return NextResponse.json({ verified: false, sessionId: null })
    }

    const cleaned = cleanPhone(phone)

    if (!isValidUkMobile(cleaned)) {
      return NextResponse.json({ verified: false, sessionId: null })
    }

    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown'

    const result = await checkPhoneVerified(phone, ip)

    return NextResponse.json(result)
  } catch (err) {
    console.error('[otp/check] error:', err)
    return NextResponse.json({ verified: false, sessionId: null })
  }
}
