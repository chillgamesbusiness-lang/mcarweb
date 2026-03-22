import { NextResponse } from 'next/server'
import { createOfferToken, verifyOfferToken } from '@/lib/offerSession'

/**
 * GET /api/debug-token — diagnostic endpoint for token roundtrip testing.
 * Creates a token, verifies it, and returns diagnostic info.
 * REMOVE AFTER DEBUGGING.
 */
export async function GET() {
  const diag: Record<string, unknown> = {}

  try {
    // Check env vars
    const offerSecret = process.env.OFFER_SESSION_SECRET
    const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    diag.offerSecretLen = offerSecret?.length ?? 0
    diag.offerSecretTrimmedLen = offerSecret?.trim().length ?? 0
    diag.offerSecretHasWhitespace = offerSecret !== offerSecret?.trim()
    diag.offerSecretLast4 = offerSecret ? offerSecret.slice(-4).replace(/[^ -~]/g, '?') : 'MISSING'
    diag.svcKeyPresent = !!svcKey
    diag.svcKeyLen = svcKey?.length ?? 0

    // Create a test token
    const token = createOfferToken({
      reg: 'TEST123',
      vehicle: {
        make: 'TEST',
        model: 'DEBUG',
        year: 2023,
        fuel: 'petrol',
        transmission: 'manual',
      },
    })
    diag.tokenCreated = true
    diag.tokenLen = token.length
    diag.tokenParts = token.split('.').length
    diag.tokenFirst40 = token.slice(0, 40)

    // Verify the token immediately
    const payload = verifyOfferToken(token)
    diag.verifyResult = payload ? 'OK' : 'FAILED'
    diag.verifyReg = payload?.reg ?? null

    // Test URL encode/decode roundtrip
    const encoded = encodeURIComponent(token)
    const decoded = decodeURIComponent(encoded)
    diag.urlRoundtripMatch = decoded === token
    diag.encodedLen = encoded.length

    // Verify after URL roundtrip
    const payload2 = verifyOfferToken(decoded)
    diag.verifyAfterUrlRoundtrip = payload2 ? 'OK' : 'FAILED'

    return NextResponse.json(diag)
  } catch (err) {
    diag.error = (err as Error).message
    diag.stack = (err as Error).stack?.split('\n').slice(0, 3)
    return NextResponse.json(diag, { status: 500 })
  }
}
