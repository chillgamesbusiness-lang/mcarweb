import { NextRequest, NextResponse } from 'next/server'
import { createOfferToken } from '@/lib/offerSession'
import type { MOTSummary } from '@/lib/offerSession'
import { fetchDvlaData, sanitiseReg, isValidRegFormat, normaliseFuel } from '@/lib/dvlaService'
import { fetchMotHistory } from '@/lib/motService'
import { buildMotAnalysis, newVehicleExemptAnalysis } from '@/lib/mileageAnalyser'
import { checkRateLimit } from '@/lib/rateLimit'
import { verifyTurnstile } from '@/lib/turnstile'

/**
 * POST /api/vehicle/lookup
 *
 * Body: { reg: string, turnstileToken?: string }
 * Returns vehicle data + MOT summary + a signed offer token.
 *
 * v2: uses dvlaService + motService + mileageAnalyser v2.
 */

export async function POST(request: NextRequest) {
  const CURRENT_YEAR = new Date().getFullYear()
  try {
    // ── Rate limiting ─────────────────────────────────────────────────────
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown'

    const rl = await checkRateLimit(`vehicle-lookup:${ip}`)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a few minutes and try again.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((rl.resetMs - Date.now()) / 1000)),
          },
        }
      )
    }

    const body = await request.json()
    const rawReg = body?.reg
    const turnstileToken = body?.turnstileToken ?? null

    if (!rawReg || typeof rawReg !== 'string') {
      return NextResponse.json({ error: 'Registration is required' }, { status: 400 })
    }

    // ── Turnstile verification ────────────────────────────────────────────
    const turnstileOk = await verifyTurnstile(turnstileToken)
    if (!turnstileOk) {
      return NextResponse.json(
        { error: 'Bot verification failed. Please try again.' },
        { status: 400 }
      )
    }

    // ── Validate reg format ───────────────────────────────────────────────
    const reg = sanitiseReg(rawReg)

    if (!isValidRegFormat(reg)) {
      return NextResponse.json({ error: 'Invalid registration format' }, { status: 400 })
    }

    // ── Vehicle lookup (DVLA VES, with cache) ────────────────────────────
    const dvla = await fetchDvlaData(reg)

    if (!dvla) {
      return NextResponse.json(
        { error: "We couldn't find that registration. Please check and try again." },
        { status: 404 }
      )
    }

    // Map DvlaRawResponse → VehicleInfo for token/frontend
    const vehicle = {
      make: dvla.make || '',
      model: '', // DVLA doesn't return model — backfilled from MOT
      year: dvla.yearOfManufacture,
      fuel: dvla.fuelType || '',
      transmission: '', // Not in DVLA response
      colour: dvla.colour || '',
      engineCapacity: dvla.engineCapacity ?? undefined,
      co2Emissions: dvla.co2Emissions ?? undefined,
      taxStatus: dvla.taxStatus || '',
      taxDueDate: dvla.taxDueDate ?? undefined,
      motStatus: dvla.motStatus || '',
      motExpiryDate: dvla.motExpiryDate ?? undefined,
      euroStatus: dvla.euroStatus ?? undefined,
      dateOfLastV5C: dvla.dateOfLastV5CIssued ?? undefined,
    }

    const vehicleAge = Math.max(0, CURRENT_YEAR - vehicle.year)

    // ── MOT enrichment + v2 analysis ────────────────────────────────────
    let motSummary: MOTSummary | undefined

    try {
      const mot = await fetchMotHistory(reg)
      if (mot) {
        // Backfill model from MOT (DVLA doesn't provide it)
        if ((!vehicle.model || vehicle.model === '') && mot.model) {
          vehicle.model = mot.model
        }

        // Run full v2 MOT analysis
        const analysis = buildMotAnalysis(
          mot.motTests,
          vehicleAge,
          vehicle.motExpiryDate
        )

        // Find latest test date
        const sortedTests = [...mot.motTests].sort(
          (a, b) =>
            new Date(b.completedDate).getTime() -
            new Date(a.completedDate).getTime()
        )
        const latestTestDate =
          sortedTests.length > 0 ? sortedTests[0].completedDate : null

        motSummary = {
          monthsRemaining: analysis.motMonthsRemaining,
          motExpired: analysis.motExpired,
          latestMileage: analysis.latestMileage,
          latestTestDate,
          annualMileageEstimate: analysis.annualMileageEstimate,
          mileageConsistency: analysis.mileageConsistency,
          rollbackAmount: analysis.rollbackAmount,
          recentFailCount: analysis.recentFailCount,
          totalFailCount: analysis.totalFailCount,
          advisoryCount: analysis.advisoryCount,
          dangerousDefects: analysis.dangerousDefects,
          structuralAdvisories: analysis.structuralAdvisories,
          brakeAdvisories: analysis.brakeAdvisories,
          riskAdvisories: analysis.riskAdvisories.slice(0, 5),
          totalTestCount: analysis.totalTestCount,
        }
      } else if (vehicleAge < 3) {
        // New vehicle — MOT exempt
        const exemptAnalysis = newVehicleExemptAnalysis(0, vehicleAge)
        motSummary = {
          monthsRemaining: exemptAnalysis.motMonthsRemaining,
          motExpired: false,
          latestMileage: null,
          latestTestDate: null,
          annualMileageEstimate: 0,
          mileageConsistency: 'consistent',
          rollbackAmount: null,
          recentFailCount: 0,
          totalFailCount: 0,
          advisoryCount: 0,
          dangerousDefects: false,
          structuralAdvisories: false,
          brakeAdvisories: false,
          riskAdvisories: [],
          totalTestCount: 0,
        }
      }
    } catch {
      // Non-critical — continue without MOT enrichment
    }

    const token = createOfferToken({ reg, vehicle, motSummary })

    return NextResponse.json({ vehicle, motSummary, token })
  } catch (err) {
    console.error('[vehicle-lookup] Error:', err)
    return NextResponse.json({ error: 'Vehicle lookup failed. Please try again.' }, { status: 400 })
  }
}
