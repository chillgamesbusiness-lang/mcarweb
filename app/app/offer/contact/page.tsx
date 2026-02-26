import { redirect } from 'next/navigation'
import { verifyOfferToken, createOfferToken } from '@/lib/offerSession'
import { calculateValuation } from '@/lib/pricingEngine'
import type { VehicleProfile, MOTAnalysis } from '@/lib/types'
import { checkMileageDiscrepancy } from '@/lib/mileageAnalyser'
import { normaliseFuel, checkUlezCompliance } from '@/lib/dvlaService'
import { createServiceClient } from '@/lib/supabase/server'
import { sendAdminNewLeadAlert } from '@/lib/email'
import ContactForm from './ContactForm'

interface ContactPageProps {
  searchParams: Promise<{ token?: string }>
}

export default async function OfferContactPage({ searchParams }: ContactPageProps) {
  const { token } = await searchParams
  const payload = token ? verifyOfferToken(token) : null

  if (!payload || !payload.mileage || !payload.condition) {
    redirect('/offer?error=Session+expired+or+invalid.+Please+start+again.')
  }

  async function submitContact(formData: FormData) {
    'use server'

    // Re-verify token (could have expired between render and submit)
    const p = token ? verifyOfferToken(token) : null
    if (!p || !p.mileage || !p.condition) {
      redirect('/offer?error=Session+expired.+Please+start+again.')
    }

    const name = (formData.get('name') as string)?.trim()
    const phone = (formData.get('phone') as string)?.trim()
    const email = (formData.get('email') as string)?.trim()
    const postcode = (formData.get('postcode') as string)?.trim()
    const consentGiven = formData.get('consent') === 'on'
    const consentMarketing = formData.get('consent_marketing') === 'on'

    // ── Server-side validation ──────────────────────────────────────────
    const errors: string[] = []

    if (!name || name.length < 2) errors.push('Name is required')

    // Phone: 10-11 digits
    const phoneDigits = phone.replace(/\D/g, '')
    if (phoneDigits.length < 10 || phoneDigits.length > 11) {
      errors.push('Phone must be 10-11 digits')
    }

    // Email: must contain @
    if (!email || !email.includes('@')) {
      errors.push('Valid email is required')
    }

    // Postcode: 5-8 chars
    if (!postcode || postcode.length < 5 || postcode.length > 8) {
      errors.push('Valid postcode is required')
    }

    // Consent: data processing consent is required
    if (!consentGiven) {
      errors.push('You must agree to our data processing terms')
    }

    if (errors.length > 0) {
      redirect(`/offer/contact?token=${encodeURIComponent(token!)}&error=${encodeURIComponent(errors.join('. '))}`)
    }

    // ── Build VehicleProfile for pricing engine ─────────────────────────
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
    const t0 = performance.now()
    const valuation = calculateValuation({
      vehicleProfile,
      condition: p.condition!,
      postcode: postcode.toUpperCase().replace(/\s+/g, ''),
    })
    const valuationMs = Math.round(performance.now() - t0)
    console.log(`[valuation] ${p.reg} completed in ${valuationMs}ms — mid £${valuation.midpoint} risk=${valuation.riskTier} mode=${valuation.quoteMode}`)

    // ── Create lead ─────────────────────────────────────────────────────
    const serviceClient = createServiceClient()

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
      })
      .select('id')
      .single()

    if (insertErr || !lead) {
      redirect(`/offer/contact?token=${encodeURIComponent(token!)}&error=${encodeURIComponent('Failed to create lead. Please try again.')}`)
    }

    // ── Store frozen valuation snapshot ─────────────────────────────────
    // Never recomputed. Legal + operational protection.
    await serviceClient.from('valuation_snapshots').insert({
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
      engine_version: 'v2',
    }).then(({ error: snapErr }) => {
      if (snapErr) console.error('[valuation-snapshot] insert failed:', snapErr.message)
    })

    // Write audit log entry
    await serviceClient.from('audit_log').insert({
      lead_id: lead.id,
      action: 'status_change',
      old_value: null,
      new_value: {
        status: 'new',
        source: 'offer_funnel',
        confidenceScore: valuation.confidenceScore,
        riskTier: valuation.riskTier,
        quoteMode: valuation.quoteMode,
      },
    })

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
    }).catch(() => {})

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
        riskFlags: valuation.riskFlags.slice(0, 5),
        quoteMode: valuation.quoteMode,
        marketValueUsed: valuation.marketValueUsed,
        spreadApplied: valuation.spreadApplied,
      },
    })

    redirect(`/offer/book?leadId=${lead.id}&token=${encodeURIComponent(bookToken)}`)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Your Details</h1>
          <p className="mt-2 text-gray-500">
            Almost there! We need your contact information.
          </p>
        </div>

        {/* Vehicle summary */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6 text-sm text-gray-600">
          <span className="font-mono font-bold text-gray-900">{payload.reg}</span>
          {' - '}
          {payload.vehicle.make} {payload.vehicle.model} ({payload.vehicle.year})
          {' | '}
          {payload.mileage!.toLocaleString()} miles | {payload.condition}
        </div>

        <ContactForm submitContact={submitContact} />
      </div>
    </div>
  )
}
