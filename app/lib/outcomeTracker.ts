/**
 * Outcome Tracking — predicted vs actual price logger.
 *
 * Records every buy/sell event against what the engine predicted,
 * enabling automatic recalibration over time.
 *
 * Usage:
 *   import { logOutcome, getRecalibrationInsights } from '@/lib/outcomeTracker'
 *
 *   // After buying a car:
 *   await logOutcome({
 *     make: 'FORD', model: 'FIESTA', year: 2019, mileage: 45000,
 *     fuel: 'PETROL',
 *     predicted: valuationResult,
 *     eventType: 'purchase',
 *     actualPrice: 8500,
 *   })
 *
 *   // Get recalibration data:
 *   const insights = await getRecalibrationInsights()
 */

import { createServiceClient } from '@/lib/supabase/server'
import type { EnhancedValuationResult } from '@/lib/advancedValuation'

// ── Types ──────────────────────────────────────────────────────────────────────

export interface OutcomeInput {
  registration?: string
  make: string
  model: string
  year: number
  mileage: number
  fuel?: string
  engineCC?: number
  predicted: EnhancedValuationResult
  eventType: 'purchase' | 'sale'
  actualPrice: number
  eventDate?: string   // ISO date, defaults to today
  notes?: string
  leadId?: string
}

export interface RecalibrationInsight {
  make: string
  model: string
  methodology: string
  confidenceLevel: string
  sampleCount: number
  avgDeviationPct: number
  avgAbsDeviationPct: number
  stddevDeviationPct: number
  within10pct: number
  within15pct: number
}

// ── Log an outcome ─────────────────────────────────────────────────────────────

export async function logOutcome(input: OutcomeInput): Promise<{ id: string } | { error: string }> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('valuation_outcomes')
    .insert({
      registration: input.registration ?? null,
      make: input.make.toUpperCase().trim(),
      model: input.model.toUpperCase().trim(),
      year: input.year,
      mileage: input.mileage,
      fuel: input.fuel?.toUpperCase().trim() ?? null,
      engine_cc: input.engineCC ?? null,
      predicted_retail: input.predicted.retailValue,
      predicted_trade: input.predicted.tradeValue,
      predicted_private: input.predicted.privateValue,
      confidence: input.predicted.confidence,
      confidence_level: input.predicted.confidenceLevel,
      methodology: input.predicted.methodology,
      anomaly: input.predicted.anomaly,
      event_type: input.eventType,
      actual_price: input.actualPrice,
      event_date: input.eventDate ?? new Date().toISOString().split('T')[0],
      notes: input.notes ?? null,
      lead_id: input.leadId ?? null,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[outcomeTracker] Insert error:', error.message)
    return { error: error.message }
  }

  return { id: data.id }
}

// ── Get recalibration insights ─────────────────────────────────────────────────

export async function getRecalibrationInsights(): Promise<RecalibrationInsight[]> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('recalibration_summary')
    .select('*')

  if (error) {
    console.error('[outcomeTracker] Query error:', error.message)
    return []
  }

  return (data ?? []).map((row: Record<string, unknown>) => ({
    make: row.make as string,
    model: row.model as string,
    methodology: row.methodology as string,
    confidenceLevel: row.confidence_level as string,
    sampleCount: row.sample_count as number,
    avgDeviationPct: row.avg_deviation_pct as number,
    avgAbsDeviationPct: row.avg_abs_deviation_pct as number,
    stddevDeviationPct: row.stddev_deviation_pct as number,
    within10pct: row.within_10pct as number,
    within15pct: row.within_15pct as number,
  }))
}

// ── Get outcomes for a specific vehicle ────────────────────────────────────────

export async function getOutcomesForVehicle(
  make: string,
  model: string,
): Promise<Array<{
  year: number
  mileage: number
  predictedRetail: number
  actualPrice: number
  deviationPct: number
  eventType: string
  eventDate: string
  methodology: string
}>> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('valuation_outcomes')
    .select('year, mileage, predicted_retail, actual_price, deviation_pct, event_type, event_date, methodology')
    .eq('make', make.toUpperCase().trim())
    .eq('model', model.toUpperCase().trim())
    .order('event_date', { ascending: false })
    .limit(100)

  if (error) {
    console.error('[outcomeTracker] Query error:', error.message)
    return []
  }

  return (data ?? []).map(row => ({
    year: row.year,
    mileage: row.mileage,
    predictedRetail: row.predicted_retail,
    actualPrice: row.actual_price,
    deviationPct: row.deviation_pct,
    eventType: row.event_type,
    eventDate: row.event_date,
    methodology: row.methodology,
  }))
}

// ── Compute bias correction factor from outcomes ───────────────────────────────

/**
 * Returns a multiplicative correction factor based on historical outcomes.
 * If the engine consistently over-predicts by 5%, returns ~0.95.
 * If it under-predicts by 3%, returns ~1.03.
 * Returns 1.0 if insufficient data (< 5 outcomes).
 */
export async function getBiasCorrection(
  make: string,
  model: string,
): Promise<{ factor: number; sampleCount: number; avgBias: number }> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('valuation_outcomes')
    .select('deviation_pct')
    .eq('make', make.toUpperCase().trim())
    .eq('model', model.toUpperCase().trim())
    .not('deviation_pct', 'is', null)
    .order('event_date', { ascending: false })
    .limit(20)

  if (error || !data || data.length < 5) {
    return { factor: 1.0, sampleCount: data?.length ?? 0, avgBias: 0 }
  }

  const avgBias = data.reduce((sum, r) => sum + (r.deviation_pct as number), 0) / data.length
  // Cap correction at ±15% to prevent runaway
  const clampedBias = Math.max(-15, Math.min(15, avgBias))
  const factor = 1 - clampedBias / 100

  return { factor: Math.round(factor * 1000) / 1000, sampleCount: data.length, avgBias: Math.round(avgBias * 10) / 10 }
}
