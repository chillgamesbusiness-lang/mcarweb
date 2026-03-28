import { NextRequest, NextResponse } from 'next/server'
import { computeLiveValuation } from '@/lib/liveValuation'
import { checkRateLimit } from '@/lib/rateLimit'

/**
 * POST /api/vehicle/live-valuation
 *
 * Body: {
 *   make: string,
 *   model: string,
 *   year: number,
 *   mileage: number,
 *   fuel?: string,
 *   postcode?: string,
 *   skipScrape?: boolean
 * }
 *
 * Returns a LiveValuationResult with confidence-scored market valuation.
 * Uses live scraping (AutoTrader + eBay) with MARKET_DATA v3 fallback.
 */

export async function POST(request: NextRequest) {
  try {
    // ── Rate limiting ────────────────────────────────────────────────────
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown'

    const rl = await checkRateLimit(`live-valuation:${ip}`)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a few minutes and try again.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((rl.resetMs - Date.now()) / 1000)),
          },
        },
      )
    }

    // ── Parse + validate body ────────────────────────────────────────────
    const body = await request.json()
    const { make, model, year, mileage, fuel, postcode, skipScrape } = body ?? {}

    if (!make || typeof make !== 'string') {
      return NextResponse.json({ error: 'make is required (string)' }, { status: 400 })
    }
    if (!model || typeof model !== 'string') {
      return NextResponse.json({ error: 'model is required (string)' }, { status: 400 })
    }
    if (typeof year !== 'number' || year < 1990 || year > new Date().getFullYear() + 1) {
      return NextResponse.json({ error: 'year is required (number, 1990+)' }, { status: 400 })
    }
    if (typeof mileage !== 'number' || mileage < 0 || mileage > 500_000) {
      return NextResponse.json({ error: 'mileage is required (number, 0–500000)' }, { status: 400 })
    }
    if (fuel !== undefined && typeof fuel !== 'string') {
      return NextResponse.json({ error: 'fuel must be a string if provided' }, { status: 400 })
    }
    if (postcode !== undefined && typeof postcode !== 'string') {
      return NextResponse.json({ error: 'postcode must be a string if provided' }, { status: 400 })
    }

    // ── Compute valuation ────────────────────────────────────────────────
    const result = await computeLiveValuation({
      make: make.toUpperCase().trim(),
      model: model.toUpperCase().trim(),
      year,
      mileage: Math.round(mileage),
      fuel: fuel?.toUpperCase().trim(),
      postcode: postcode?.toUpperCase().trim(),
      skipScrape: skipScrape === true,
    })

    return NextResponse.json(result)
  } catch (err) {
    console.error('[live-valuation] Error:', err)
    return NextResponse.json(
      { error: 'Internal error computing valuation' },
      { status: 500 },
    )
  }
}
