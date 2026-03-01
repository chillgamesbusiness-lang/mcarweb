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
