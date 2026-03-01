/**
 * Calibration Store v2 — Transaction recording + analytics queries.
 *
 * Records every completed deal outcome for engine tuning.
 * After 30+ transactions, calibration data reveals systematic errors.
 *
 * Spec reference: valuationeng.md Part 6
 *
 * Requires Supabase table: calibration_records
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { extractPostcodePrefix } from '@/lib/regionPricing'
import type { CalibrationRecord, Lead, ValuationResult } from '@/lib/types'

let _supabase: SupabaseClient | null = null
function getSupabase(): SupabaseClient {
  if (_supabase) return _supabase
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase env vars not configured for calibration store')
  _supabase = createClient(url, key)
  return _supabase
}

// ── Record a transaction ───────────────────────────────────────────────────────

/**
 * Record a completed transaction for calibration.
 * Only call when actualPurchasePrice is available.
 */
export async function recordTransaction(lead: {
  id: string
  submission: {
    vehicleProfile: { make: string; model: string; year: number; fuel: string }
    condition: string
    postcode: string
  }
  valuation: { midpoint: number }
  actual_purchase_price: number
  actual_resale_price?: number | null
  recon_cost?: number | null
  days_to_sale?: number | null
}): Promise<void> {
  if (!lead.actual_purchase_price) return

  const midpoint = lead.valuation.midpoint
  const purchase = lead.actual_purchase_price

  const record = {
    lead_id: lead.id,
    make: lead.submission.vehicleProfile.make,
    model: lead.submission.vehicleProfile.model,
    year: lead.submission.vehicleProfile.year,
    fuel: lead.submission.vehicleProfile.fuel,
    condition: lead.submission.condition,
    engine_midpoint: midpoint,
    actual_purchase_price: purchase,
    actual_resale_price: lead.actual_resale_price ?? null,
    recon_cost: lead.recon_cost ?? null,
    days_to_sale: lead.days_to_sale ?? null,
    deviation: midpoint - purchase,
    deviation_pct: ((midpoint - purchase) / purchase) * 100,
    region: getRegionFromPostcode(lead.submission.postcode),
    created_at: new Date().toISOString(),
  }

  const { error } = await getSupabase()
    .from('calibration_records')
    .insert(record)

  if (error) {
    console.error('Calibration record insert error:', error)
    throw new Error('Failed to record calibration data')
  }
}

function getRegionFromPostcode(postcode: string): string {
  return extractPostcodePrefix(postcode) || 'unknown'
}

// ── Analytics queries ──────────────────────────────────────────────────────────

/**
 * Average deviation across all transactions.
 * Positive = engine was conservative (quoted higher than purchase) = good.
 */
export async function getAverageDeviation(): Promise<{
  avg: number
  pct: number
  count: number
}> {
  const { data, error } = await getSupabase()
    .from('calibration_records')
    .select('deviation, deviation_pct')

  if (error || !data || data.length === 0) {
    return { avg: 0, pct: 0, count: 0 }
  }

  const totalDev = data.reduce((s, r) => s + (r.deviation ?? 0), 0)
  const totalPct = data.reduce((s, r) => s + (r.deviation_pct ?? 0), 0)

  return {
    avg: Math.round(totalDev / data.length),
    pct: Math.round((totalPct / data.length) * 100) / 100,
    count: data.length,
  }
}

/**
 * Deviation by make/model — identify systematically wrong pricing.
 */
export async function getDeviationByMakeModel(): Promise<
  { make: string; model: string; avgDev: number; count: number }[]
> {
  const { data, error } = await getSupabase()
    .from('calibration_records')
    .select('make, model, deviation')

  if (error || !data) return []

  const grouped: Record<string, { total: number; count: number }> = {}
  for (const r of data) {
    const key = `${r.make}|${r.model}`
    if (!grouped[key]) grouped[key] = { total: 0, count: 0 }
    grouped[key].total += r.deviation ?? 0
    grouped[key].count++
  }

  return Object.entries(grouped).map(([key, val]) => {
    const [make, model] = key.split('|')
    return { make, model, avgDev: Math.round(val.total / val.count), count: val.count }
  })
}

/**
 * Deviation by condition — is "fair" penalty too harsh?
 */
export async function getDeviationByCondition(): Promise<
  { condition: string; avgDev: number; count: number }[]
> {
  const { data, error } = await getSupabase()
    .from('calibration_records')
    .select('condition, deviation')

  if (error || !data) return []

  const grouped: Record<string, { total: number; count: number }> = {}
  for (const r of data) {
    const key = r.condition ?? 'unknown'
    if (!grouped[key]) grouped[key] = { total: 0, count: 0 }
    grouped[key].total += r.deviation ?? 0
    grouped[key].count++
  }

  return Object.entries(grouped).map(([condition, val]) => ({
    condition,
    avgDev: Math.round(val.total / val.count),
    count: val.count,
  }))
}

/**
 * Deviation by region — are regional multipliers accurate?
 */
export async function getDeviationByRegion(): Promise<
  { region: string; avgDev: number; count: number }[]
> {
  const { data, error } = await getSupabase()
    .from('calibration_records')
    .select('region, deviation')

  if (error || !data) return []

  const grouped: Record<string, { total: number; count: number }> = {}
  for (const r of data) {
    const key = r.region ?? 'unknown'
    if (!grouped[key]) grouped[key] = { total: 0, count: 0 }
    grouped[key].total += r.deviation ?? 0
    grouped[key].count++
  }

  return Object.entries(grouped).map(([region, val]) => ({
    region,
    avgDev: Math.round(val.total / val.count),
    count: val.count,
  }))
}

/**
 * Full P&L per transaction — only for records with resale data.
 */
export async function getMarginAnalysis(): Promise<{
  avgMargin: number
  avgReconCost: number
  avgDaysToSale: number
  profitableRate: number
}> {
  const { data, error } = await getSupabase()
    .from('calibration_records')
    .select('actual_purchase_price, actual_resale_price, recon_cost, days_to_sale')
    .not('actual_resale_price', 'is', null)

  if (error || !data || data.length === 0) {
    return { avgMargin: 0, avgReconCost: 0, avgDaysToSale: 0, profitableRate: 0 }
  }

  let totalMargin = 0
  let totalRecon = 0
  let totalDays = 0
  let profitable = 0

  for (const r of data) {
    const margin =
      (r.actual_resale_price ?? 0) -
      (r.actual_purchase_price ?? 0) -
      (r.recon_cost ?? 0)
    totalMargin += margin
    totalRecon += r.recon_cost ?? 0
    totalDays += r.days_to_sale ?? 0
    if (margin > 0) profitable++
  }

  return {
    avgMargin: Math.round(totalMargin / data.length),
    avgReconCost: Math.round(totalRecon / data.length),
    avgDaysToSale: Math.round(totalDays / data.length),
    profitableRate: Math.round((profitable / data.length) * 100),
  }
}

/**
 * Conversion funnel stats.
 */
export async function getConversionFunnel(): Promise<{
  regEntries: number
  otpVerified: number
  contacted: number
  inspected: number
  purchased: number
  conversionRate: number
}> {
  const { data: leads, error } = await getSupabase()
    .from('leads')
    .select('status, otp_verified')

  if (error || !leads) {
    return {
      regEntries: 0,
      otpVerified: 0,
      contacted: 0,
      inspected: 0,
      purchased: 0,
      conversionRate: 0,
    }
  }

  const regEntries = leads.length
  const otpVerified = leads.filter((l) => l.otp_verified).length
  const contacted = leads.filter((l) =>
    ['contacted', 'inspected', 'offered', 'purchased', 'rejected'].includes(l.status)
  ).length
  const inspected = leads.filter((l) =>
    ['inspected', 'offered', 'purchased'].includes(l.status)
  ).length
  const purchased = leads.filter((l) => l.status === 'purchased').length

  return {
    regEntries,
    otpVerified,
    contacted,
    inspected,
    purchased,
    conversionRate: regEntries > 0 ? Math.round((purchased / regEntries) * 100) : 0,
  }
}

// ── Calibration Loop ───────────────────────────────────────────────────────────

/**
 * Calibration coefficients — adjustable global parameters that tune the engine.
 * Start at defaults, get nudged by calibration feedback.
 */
export interface CalibrationCoefficients {
  liquidityBuffer: number    // default 0.07
  tradeMarginBase: number    // default 0.80
  reconCapPct: number        // default 0.20
  spreadLowThreshold: number // riskScore threshold for low→medium tier
  spreadMidThreshold: number // riskScore threshold for medium→high tier
  updatedAt: string
  sampleSize: number
}

const DEFAULT_COEFFICIENTS: CalibrationCoefficients = {
  liquidityBuffer: 0.07,
  tradeMarginBase: 0.80,
  reconCapPct: 0.20,
  spreadLowThreshold: 2,
  spreadMidThreshold: 5,
  updatedAt: new Date().toISOString(),
  sampleSize: 0,
}

/**
 * Compute recommended coefficient adjustments from transaction history.
 *
 * Logic:
 * - If engine is systematically overpaying (negative margin), increase liquidity buffer
 * - If engine is too conservative (>15% avg deviation), decrease liquidity buffer
 * - If recon costs consistently exceed estimates, tighten recon cap
 * - Requires minimum 30 transactions for reliability
 *
 * Returns current coefficients + recommended adjustments with reasoning.
 */
export async function computeCalibrationAdjustments(): Promise<{
  current: CalibrationCoefficients
  recommended: CalibrationCoefficients
  reasoning: string[]
  sampleSize: number
}> {
  const reasoning: string[] = []

  // Fetch all calibration records
  const { data, error } = await getSupabase()
    .from('calibration_records')
    .select('*')

  if (error || !data || data.length < 30) {
    return {
      current: DEFAULT_COEFFICIENTS,
      recommended: DEFAULT_COEFFICIENTS,
      reasoning: [`Insufficient data (${data?.length ?? 0}/30 minimum). Using defaults.`],
      sampleSize: data?.length ?? 0,
    }
  }

  const recommended = { ...DEFAULT_COEFFICIENTS }
  recommended.sampleSize = data.length
  recommended.updatedAt = new Date().toISOString()

  // ── Bias analysis: deviation = engine midpoint − actual purchase price ──
  const avgDeviation = data.reduce((s, r) => s + (r.deviation ?? 0), 0) / data.length
  const avgDeviationPct = data.reduce((s, r) => s + (r.deviation_pct ?? 0), 0) / data.length

  if (avgDeviationPct < -5) {
    // Engine consistently overpays — increase liquidity buffer
    const bump = Math.min(0.03, Math.abs(avgDeviationPct) * 0.002)
    recommended.liquidityBuffer = Math.min(0.15, DEFAULT_COEFFICIENTS.liquidityBuffer + bump)
    reasoning.push(
      `Engine overpaying by ~${Math.abs(Math.round(avgDeviationPct))}% avg → ` +
      `increase liquidity buffer to ${(recommended.liquidityBuffer * 100).toFixed(1)}%`
    )
  } else if (avgDeviationPct > 15) {
    // Engine too conservative — decrease liquidity buffer
    const bump = Math.min(0.02, avgDeviationPct * 0.001)
    recommended.liquidityBuffer = Math.max(0.03, DEFAULT_COEFFICIENTS.liquidityBuffer - bump)
    reasoning.push(
      `Engine too conservative by ~${Math.round(avgDeviationPct)}% avg → ` +
      `decrease liquidity buffer to ${(recommended.liquidityBuffer * 100).toFixed(1)}%`
    )
  } else {
    reasoning.push(`Liquidity buffer OK (avg deviation ${Math.round(avgDeviationPct)}%)`)
  }

  // ── Trade margin analysis ──
  const withResale = data.filter((r) => r.actual_resale_price != null)
  if (withResale.length >= 10) {
    const avgMarginPct = withResale.reduce((s, r) => {
      const margin = (r.actual_resale_price - r.actual_purchase_price - (r.recon_cost ?? 0))
      return s + (margin / r.actual_purchase_price) * 100
    }, 0) / withResale.length

    if (avgMarginPct < 5) {
      // Margins too thin — lower trade margin base
      recommended.tradeMarginBase = Math.max(0.70, DEFAULT_COEFFICIENTS.tradeMarginBase - 0.02)
      reasoning.push(
        `Thin margins (${Math.round(avgMarginPct)}% avg) → ` +
        `decrease trade margin to ${(recommended.tradeMarginBase * 100).toFixed(0)}%`
      )
    } else if (avgMarginPct > 25) {
      // Margins too fat — could be losing deals
      recommended.tradeMarginBase = Math.min(0.85, DEFAULT_COEFFICIENTS.tradeMarginBase + 0.02)
      reasoning.push(
        `Wide margins (${Math.round(avgMarginPct)}% avg) → ` +
        `increase trade margin to ${(recommended.tradeMarginBase * 100).toFixed(0)}%`
      )
    } else {
      reasoning.push(`Trade margin OK (avg margin ${Math.round(avgMarginPct)}%)`)
    }
  }

  // ── Recon accuracy analysis ──
  const withRecon = data.filter((r) => r.recon_cost != null && r.recon_cost > 0)
  if (withRecon.length >= 10) {
    const avgReconCost = withRecon.reduce((s, r) => s + (r.recon_cost ?? 0), 0) / withRecon.length
    const avgPurchase = withRecon.reduce((s, r) => s + r.actual_purchase_price, 0) / withRecon.length
    const reconPct = (avgReconCost / avgPurchase) * 100

    if (reconPct > 15) {
      recommended.reconCapPct = Math.min(0.30, DEFAULT_COEFFICIENTS.reconCapPct + 0.05)
      reasoning.push(
        `Recon costs averaging ${Math.round(reconPct)}% of purchase → ` +
        `increase recon cap to ${(recommended.reconCapPct * 100).toFixed(0)}%`
      )
    } else {
      reasoning.push(`Recon cap OK (avg recon ${Math.round(reconPct)}% of purchase)`)
    }
  }

  return {
    current: DEFAULT_COEFFICIENTS,
    recommended,
    reasoning,
    sampleSize: data.length,
  }
}
