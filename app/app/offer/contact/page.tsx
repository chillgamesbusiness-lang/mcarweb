import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { verifyOfferToken, createOfferToken } from '@/lib/offerSession'
import { calculateValuation, enrichWithResaleEvidence } from '@/lib/pricingEngine'
import type { VehicleProfile, MOTAnalysis } from '@/lib/types'
import { checkMileageDiscrepancy } from '@/lib/mileageAnalyser'
import { normaliseFuel, checkUlezCompliance } from '@/lib/dvlaService'
import { createServiceClient } from '@/lib/supabase/server'
import { sendAdminNewLeadAlert } from '@/lib/email'
import { cleanPhone, isBlockedNumber, isValidEmail, isValidPostcode, isValidUkMobile, verifyOTP } from '@/lib/leadVerification'
import { getCandidateCoefficients, getCurrentCoefficients, logShadowComparison } from '@/lib/coefficientStore'
import { validateMileage, validateCondition, capRiskFlags, capBullets } from '@/lib/inputHardening'
import { checkExposure } from '@/lib/exposureCap'
import { getSegmentProfile } from '@/lib/segmentPricing'
import { writeAuditLog } from '@/lib/auditLog'
import { createRequestId, reportError } from '@/lib/reportError'
import { CANONICAL_VALUATION_ENGINE } from '@/lib/valuationPolicy'
import ContactForm from './ContactForm'
import OfferShell from '../OfferShell'
import StepIndicator from '../StepIndicator'

export const metadata = {
  title: 'Your Details',
  description: 'Enter your contact information to receive your vehicle offer.',
  robots: { index: false, follow: false },
}

interface ContactPageProps {
  searchParams: Promise<{ token?: string }>
}

export default async function OfferContactPage({ searchParams }: ContactPageProps) {
  const { token: urlToken } = await searchParams
  const cookieStore = await cookies()
  const cookieToken = cookieStore.get('offer_token')?.value

  // Try URL param first, fall back to cookie (immune to URL encoding/redirect issues)
  const token = urlToken || cookieToken || null
  console.log(`[offer/contact] urlToken=${!!urlToken}(${urlToken?.length ?? 0}), cookieToken=${!!cookieToken}(${cookieToken?.length ?? 0}), using=${urlToken ? 'url' : cookieToken ? 'cookie' : 'none'}`)

  const payload = token ? verifyOfferToken(token) : null
  console.log(`[offer/contact] verify: ${payload ? 'OK' : 'NULL'}, mileage=${payload?.mileage}, condition=${payload?.condition}`)

  if (!payload || !payload.mileage || !payload.condition) {
    console.error(`[offer/contact] REDIRECTING: payload=${!!payload}, mileage=${payload?.mileage}, condition=${payload?.condition}`)
    redirect('/offer?error=Session+expired+or+invalid.+Please+start+again.')
  }

  async function submitContact(formData: FormData) {
    'use server'

    try {
    const requestId = createRequestId('contact')
    // Re-verify token (could have expired between render and submit)
    const p = token ? verifyOfferToken(token) : null
    if (!p || !p.mileage || !p.condition) {
      redirect('/offer?error=Session+expired.+Please+start+again.')
    }

    const name = (formData.get('name') as string | null)?.trim() ?? ''
    const phone = (formData.get('phone') as string | null)?.trim() ?? ''
    const email = (formData.get('email') as string | null)?.trim() ?? ''
    const postcode = (formData.get('postcode') as string | null)?.trim() ?? ''
    const otpSessionId = (formData.get('otpSessionId') as string | null)?.trim() ?? ''
    const otpCode = (formData.get('otpCode') as string | null)?.trim() ?? ''
    const submitId = (formData.get('submitId') as string | null)?.trim() ?? ''
    const consentGiven = formData.get('consent') === 'on'
    const consentMarketing = formData.get('consent_marketing') === 'on'

    // ── Server-side validation ──────────────────────────────────────────
    const errors: string[] = []

    if (!name || name.length < 2) errors.push('Name is required')

    const phoneDigits = cleanPhone(phone)
    if (!isValidUkMobile(phoneDigits) || isBlockedNumber(phoneDigits)) {
      errors.push('Please enter a valid UK mobile number')
    }

    // Email: proper validation
    if (!email || !isValidEmail(email)) {
      errors.push('Valid email is required')
    }

    // Postcode: proper validation
    if (!postcode || !isValidPostcode(postcode)) {
      errors.push('Valid UK postcode is required')
    }

    // Consent: data processing consent is required
    if (!consentGiven) {
      errors.push('You must agree to our data processing terms')
    }

    if (errors.length > 0) {
      redirect(`/offer/contact?token=${encodeURIComponent(token!)}&error=${encodeURIComponent(errors.join('. '))}`)
    }

    if (!otpSessionId || !otpCode) {
      redirect(`/offer/contact?token=${encodeURIComponent(token!)}&error=${encodeURIComponent('Please verify your phone number before continuing.')}`)
    }

    let otpVerified = false
    try {
      otpVerified = await verifyOTP(otpSessionId, otpCode, phoneDigits)
    } catch (otpErr) {
      await reportError(otpErr, {
        severity: 'warning',
        area: 'offer_contact',
        operation: 'otp_verify_before_lead_insert',
        requestId,
        provider: 'twilio',
        metadata: { reg: p.reg, phone: phoneDigits },
      })
      redirect(`/offer/contact?token=${encodeURIComponent(token!)}&error=${encodeURIComponent(otpErr instanceof Error ? otpErr.message : 'Phone verification failed.')}`)
    }

    if (!otpVerified) {
      redirect(`/offer/contact?token=${encodeURIComponent(token!)}&error=${encodeURIComponent('Invalid verification code. Please try again.')}`)
    }

    // ── Build VehicleProfile for pricing engine ─────────────────────────
    // Validate engine-critical inputs (defense-in-depth)
    const mileageCheck = validateMileage(p.mileage)
    if (!mileageCheck.valid) {
      redirect(`/offer?error=${encodeURIComponent(mileageCheck.error)}`)
    }
    const conditionCheck = validateCondition(p.condition)
    if (!conditionCheck.valid) {
      redirect(`/offer?error=${encodeURIComponent(conditionCheck.error)}`)
    }

    const mot = p.motSummary
    const normFuel = normaliseFuel(p.vehicle.fuel)
    const ulezCompliant = checkUlezCompliance(normFuel, p.vehicle.euroStatus ?? '')

    // Build MOTAnalysis from the compact MOTSummary carried in the token
    const motAnalysis: MOTAnalysis = mot
      ? {
          motMonthsRemaining: mot.monthsRemaining,
          motExpired: mot.motExpired,
          latestMileage: mot.latestMileage,
          mileageHistory: [],
          annualMileageEstimate: mot.annualMileageEstimate,
          mileageConsistency: mot.mileageConsistency,
          rollbackAmount: mot.rollbackAmount,
          recentFailCount: mot.recentFailCount,
          totalFailCount: mot.totalFailCount,
          advisoryCount: mot.advisoryCount,
          dangerousDefects: mot.dangerousDefects,
          structuralAdvisories: mot.structuralAdvisories,
          structuralAdvisoryCount: mot.structuralAdvisoryCount ?? (mot.structuralAdvisories ? 1 : 0),
          brakeAdvisories: mot.brakeAdvisories,
          riskAdvisories: mot.riskAdvisories,
          totalTestCount: mot.totalTestCount,
        }
      : {
          motMonthsRemaining: 0,
          motExpired: true,
          latestMileage: null,
          mileageHistory: [],
          annualMileageEstimate: 0,
          mileageConsistency: 'suspicious' as const,
          rollbackAmount: null,
          recentFailCount: 0,
          totalFailCount: 0,
          advisoryCount: 0,
          dangerousDefects: false,
          structuralAdvisories: false,
          structuralAdvisoryCount: 0,
          brakeAdvisories: false,
          riskAdvisories: [],
          totalTestCount: 0,
        }

    const resolvedMileage = mot?.latestMileage ?? p.mileage!

    // v2: checkMileageDiscrepancy returns { discrepancy, amount, direction }
    const discrepancyResult = mot?.latestMileage != null && mot?.latestTestDate
      ? checkMileageDiscrepancy(p.mileage!, mot.latestMileage, mot.latestTestDate)
      : { discrepancy: false, amount: 0, direction: 'user_higher' }

    // Data completeness: how much info do we have?
    let dataCompleteness = 0.5
    if (mot && mot.totalTestCount > 0) dataCompleteness += 0.2
    if (p.vehicle.euroStatus) dataCompleteness += 0.1
    if (p.vehicle.engineCapacity) dataCompleteness += 0.1
    if (p.vehicle.co2Emissions) dataCompleteness += 0.1
    dataCompleteness = Math.min(1.0, dataCompleteness)

    const vehicleProfile: VehicleProfile = {
      reg: p.reg,
      make: p.vehicle.make,
      model: p.vehicle.model || '',
      year: p.vehicle.year,
      fuel: normFuel,
      engineCC: p.vehicle.engineCapacity ?? 0,
      colour: p.vehicle.colour ?? '',
      co2: p.vehicle.co2Emissions ?? 0,
      euroStatus: p.vehicle.euroStatus ?? '',
      ulezCompliant,
      taxStatus: p.vehicle.taxStatus ?? '',
      sornRegistered: p.vehicle.taxStatus === 'SORN',
      dateOfLastV5C: p.vehicle.dateOfLastV5C ?? null,
      motAnalysis,
      resolvedMileage,
      userDeclaredMileage: p.mileage!,
      mileageDiscrepancy: discrepancyResult.discrepancy,
      mileageDiscrepancyAmount: discrepancyResult.amount,
      dataCompleteness,
    }

    // ── Run pricing engine (with timing) ────────────────────────────────
    const t0 = new Date().getTime()
    const currentCoeffs = await getCurrentCoefficients()
    const valuation = calculateValuation({
      vehicleProfile,
      condition: p.condition!,
      postcode: postcode.toUpperCase().replace(/\s+/g, ''),
    })
    const valuationMs = new Date().getTime() - t0
    console.log(`[valuation] ${p.reg} completed in ${valuationMs}ms risk=${valuation.riskTier} mode=${valuation.quoteMode}`)

    // ── Enrich with v4 Resale Evidence Engine (async, non-blocking) ────
    const cleanPostcode = postcode.toUpperCase().replace(/\s+/g, '')
    const segProfile = getSegmentProfile(
      vehicleProfile.fuel,
      new Date().getFullYear() - vehicleProfile.year,
      cleanPostcode,
      valuation.matchQuality === 'none' ? 'moderate' : 'stable',
      valuation.matchQuality,
    )
    const enrichedValuation = await enrichWithResaleEvidence(
      valuation,
      vehicleProfile,
      cleanPostcode,
      segProfile.segment,
      segProfile.heatLevel,
      valuation.matchQuality === 'none' ? 'moderate' : 'stable',
      p.condition!,
    )

    // ── Capital exposure cap ────────────────────────────────────────────
    const exposure = await checkExposure(
      p.vehicle.make, p.vehicle.model || '', p.vehicle.fuel, p.vehicle.year
    )
    if (exposure.forceManualReview && valuation.quoteMode === 'auto') {
      valuation.quoteMode = 'manual_review' as typeof valuation.quoteMode
      valuation.riskFlags.push(...exposure.flags)
    }

    // ── Create lead ─────────────────────────────────────────────────────
    const serviceClient = createServiceClient()

    // Duplicate lead prevention: reg + phone/email/jti in a recent window.
    const oneDayAgo = new Date(new Date().getTime() - 24 * 60 * 60 * 1000).toISOString()
    const [tokenLead, phoneLead, emailLead] = await Promise.all([
      serviceClient
        .from('leads')
        .select('id')
        .eq('offer_token_jti', p.jti)
        .gte('created_at', oneDayAgo)
        .limit(1)
        .maybeSingle(),
      serviceClient
        .from('leads')
        .select('id')
        .eq('reg', p.reg)
        .eq('seller_phone', phoneDigits)
        .gte('created_at', oneDayAgo)
        .limit(1)
        .maybeSingle(),
      serviceClient
        .from('leads')
        .select('id')
        .eq('reg', p.reg)
        .eq('seller_email', email)
        .gte('created_at', oneDayAgo)
        .limit(1)
        .maybeSingle(),
    ])
    const existingLead = tokenLead.data ?? phoneLead.data ?? emailLead.data

    if (existingLead) {
      // Silently redirect to booking for the existing lead — no duplicate created
      const bookToken = createOfferToken({
        reg: p.reg,
        vehicle: {
          make: p.vehicle.make,
          model: p.vehicle.model,
          year: p.vehicle.year,
          fuel: p.vehicle.fuel,
          transmission: p.vehicle.transmission,
        },
        mileage: p.mileage,
        condition: p.condition,
      })
      redirect(`/offer/book?leadId=${existingLead.id}&token=${encodeURIComponent(bookToken)}`)
    }

    const { data: lead, error: insertErr } = await serviceClient
      .from('leads')
      .insert({
        seller_name: name,
        seller_phone: phoneDigits,
        seller_email: email,
        seller_postcode: postcode.toUpperCase().replace(/\s+/g, ' '),
        reg: p.reg,
        make: p.vehicle.make,
        model: p.vehicle.model,
        year: p.vehicle.year,
        fuel: p.vehicle.fuel,
        transmission: p.vehicle.transmission,
        mileage: p.mileage,
        condition: p.condition,
        estimated_min: valuation.min,
        estimated_max: valuation.max,
        status: 'new',
        finance_status: 'not_checked',
        source: 'offer_funnel',
        consent_data_processing: consentGiven,
        consent_marketing: consentMarketing,
        offer_token_jti: p.jti,
        contact_submit_id: submitId || null,
        otp_session_id: otpSessionId,
      })
      .select('id')
      .single()

    if (insertErr || !lead) {
      redirect(`/offer/contact?token=${encodeURIComponent(token!)}&error=${encodeURIComponent('Failed to create lead. Please try again.')}`)
    }

    // ── Store frozen valuation snapshot ─────────────────────────────────
    // Never recomputed. Legal + operational protection.
    // Try with v4 column first; fall back without it if the migration hasn't run yet.
    const snapPayloadBase = {
      lead_id: lead.id,
      input_vehicle: vehicleProfile,
      input_condition: p.condition,
      input_postcode: postcode.toUpperCase().replace(/\s+/g, ''),
      result_min: valuation.min,
      result_max: valuation.max,
      result_midpoint: valuation.midpoint,
      confidence_score: valuation.confidenceScore,
      risk_tier: valuation.riskTier,
      risk_flags: valuation.riskFlags,
      auto_quote: valuation.quoteMode === 'auto',
      market_value_used: valuation.marketValueUsed,
      all_multipliers: valuation.allMultipliers,
      region_used: valuation.regionUsed,
      customer_explanation: valuation.customerExplanation,
      admin_explanation: valuation.adminExplanation,
      profit_simulation: valuation.profitSimulation,
      engine_version: 'v3',
      coefficient_version: currentCoeffs.versionId,
      git_commit_hash: process.env.NEXT_PUBLIC_GIT_COMMIT_HASH ?? 'unknown',
      valuation_engine_version: CANONICAL_VALUATION_ENGINE,
    }

    const { error: snapErr } = await serviceClient
      .from('valuation_snapshots')
      .insert({ ...snapPayloadBase, profit_simulation_v4: enrichedValuation.profitSimulationV4 ?? null })

    if (snapErr) {
      // Likely the profit_simulation_v4 column doesn't exist yet — fall back without it
      if (snapErr.message?.includes('profit_simulation_v4') || snapErr.code === '42703') {
        const { error: snapErr2 } = await serviceClient
          .from('valuation_snapshots')
          .insert(snapPayloadBase)
        if (snapErr2) {
          await reportError(snapErr2, {
            severity: 'critical',
            area: 'offer_contact',
            operation: 'valuation_snapshot_insert_fallback',
            leadId: lead.id,
            requestId,
          })
          redirect(`/offer/contact?token=${encodeURIComponent(token!)}&error=${encodeURIComponent('We could not save your valuation. Please try again.')}`)
        } else {
          console.warn('[valuation-snapshot] inserted without v4 field — run patch_profit_sim_v4.sql to enable it')
        }
      } else {
        await reportError(snapErr, {
          severity: 'critical',
          area: 'offer_contact',
          operation: 'valuation_snapshot_insert',
          leadId: lead.id,
          requestId,
        })
        redirect(`/offer/contact?token=${encodeURIComponent(token!)}&error=${encodeURIComponent('We could not save your valuation. Please try again.')}`)
      }
    }

    // ── Shadow mode: compare candidate coefficients (fire-and-forget) ──
    getCandidateCoefficients().then(async (candidate) => {
      if (!candidate) return
      try {
        const shadowVal = calculateValuation({
          vehicleProfile,
          condition: p.condition!,
          postcode: postcode.toUpperCase().replace(/\s+/g, ''),
        })
        await logShadowComparison({
          leadId: lead.id,
          currentVersion: currentCoeffs.versionId,
          candidateVersion: candidate.versionId,
          currentMidpoint: valuation.midpoint,
          candidateMidpoint: shadowVal.midpoint,
          currentMin: valuation.min,
          candidateMin: shadowVal.min,
          currentMax: valuation.max,
          candidateMax: shadowVal.max,
        })
      } catch (err) {
        await reportError(err, {
          severity: 'warning',
          area: 'valuation',
          operation: 'shadow_comparison',
          leadId: lead.id,
          requestId,
        })
      }
    }).catch((err) => reportError(err, {
      severity: 'warning',
      area: 'valuation',
      operation: 'shadow_comparison_promise',
      leadId: lead.id,
      requestId,
    }))

    // Write audit log entry
    await writeAuditLog(serviceClient, {
      leadId: lead.id,
      action: 'lead_created',
      actorKind: 'public_user',
      oldValue: null,
      requestId,
      newValue: {
        status: 'new',
        source: 'offer_funnel',
        confidenceScore: valuation.confidenceScore,
        riskTier: valuation.riskTier,
        quoteMode: valuation.quoteMode,
      },
    }, { area: 'offer_contact', blocking: false })

    // Send admin alert email (fire-and-forget)
    sendAdminNewLeadAlert({
      leadId: lead.id,
      sellerName: name,
      sellerEmail: email,
      sellerPhone: phoneDigits,
      reg: p.reg,
      make: p.vehicle.make,
      model: p.vehicle.model,
      estimatedMin: valuation.min,
      estimatedMax: valuation.max,
    }).catch((emailErr) => reportError(emailErr, {
      severity: 'error',
      area: 'email',
      operation: 'admin_new_lead_alert',
      leadId: lead.id,
      requestId,
      provider: 'resend',
    }))

    // Create slim token for book page — drop motSummary to keep URL short.
    // Book page reads valuation from token, lead details from DB.
    const bookToken = createOfferToken({
      reg: p.reg,
      vehicle: {
        make: p.vehicle.make,
        model: p.vehicle.model,
        year: p.vehicle.year,
        fuel: p.vehicle.fuel,
        transmission: p.vehicle.transmission,
      },
      mileage: p.mileage,
      condition: p.condition,
      valuation: {
        min: valuation.min,
        max: valuation.max,
        midpoint: valuation.midpoint,
        adjustedValue: valuation.adjustedValue,
        confidenceScore: valuation.confidenceScore,
        riskTier: valuation.riskTier,
        riskFlags: capRiskFlags(valuation.riskFlags),
        quoteMode: valuation.quoteMode,
        marketValueUsed: valuation.marketValueUsed,
        spreadApplied: valuation.spreadApplied,
        customerBullets: capBullets(valuation.customerExplanation.bullets),
        customerSummary: valuation.customerExplanation.summary,
      },
    })

    redirect(`/offer/book?leadId=${lead.id}&token=${encodeURIComponent(bookToken)}`)
    } catch (err: unknown) {
      // Re-throw Next.js internal redirect/notFound signals — they MUST propagate
      if (
        typeof err === 'object' &&
        err !== null &&
        'digest' in err &&
        typeof (err as { digest: unknown }).digest === 'string' &&
        ((err as { digest: string }).digest.startsWith('NEXT_REDIRECT') ||
          (err as { digest: string }).digest.startsWith('NEXT_NOT_FOUND'))
      ) {
        throw err
      }
      // All other errors: log and redirect to form with message instead of crashing
      console.error('[submitContact] Unexpected error:', err)
      const errMsg = err instanceof Error ? err.message : String(err)
      console.error('[submitContact] detail:', errMsg)
      redirect(
        `/offer/contact?token=${encodeURIComponent(token ?? '')}&error=${encodeURIComponent('An unexpected error occurred. Please try again.')}`
      )
    }
  }

  return (
    <OfferShell>
      <StepIndicator current={2} />

      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-charcoal tracking-tight">Your Details</h1>
        <p className="mt-2 text-warm-gray text-sm">
          Almost there! We need your contact information.
        </p>
      </div>

      {/* Vehicle summary */}
      <div className="bg-surface rounded-xl border border-warm-border p-4 mb-6 text-sm text-warm-gray">
        <span className="font-mono font-bold text-charcoal">{payload.reg}</span>
        {' — '}
        {payload.vehicle.make} {payload.vehicle.model} ({payload.vehicle.year})
        {' · '}
        {payload.mileage!.toLocaleString()} miles · {payload.condition}
      </div>

      <ContactForm submitContact={submitContact} />
    </OfferShell>
  )
}
