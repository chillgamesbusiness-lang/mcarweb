/**
 * Capital Exposure Cap — Portfolio concentration risk management.
 *
 * Tracks open positions (purchased but not sold) and applies tightening
 * when the book gets too concentrated in any single segment.
 *
 * Rules:
 *   1. If ≥N open positions in the same make+model → tighten spread + review
 *   2. If ≥N total open EVs → tighten EV pricing further
 *   3. If ≥N total open >10yr diesels → tighten old diesel pricing
 *   4. Total open capital exceeds £X → enterprise-wide tightening
 *
 * Phase 4.3 deliverable.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let _sb: SupabaseClient | null = null
function getSb(): SupabaseClient {
  if (_sb) return _sb
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase env vars not configured for exposure cap')
  _sb = createClient(url, key)
  return _sb
}

// ── Configuration ──────────────────────────────────────────────────────────────

export interface ExposureThresholds {
  /** Max open positions in same make+model before tightening */
  maxSameModelOpen: number
  /** Max open EV positions before EV tightening */
  maxEvOpen: number
  /** Max open >10yr diesel positions */
  maxOldDieselOpen: number
  /** Total open capital ceiling (£) */
  maxTotalCapital: number
}

export const DEFAULT_EXPOSURE_THRESHOLDS: ExposureThresholds = {
  maxSameModelOpen: 3,
  maxEvOpen: 5,
  maxOldDieselOpen: 4,
  maxTotalCapital: 150_000,
}

// ── Result types ───────────────────────────────────────────────────────────────

export interface ExposureResult {
  /** Extra tightening multiplier (< 1 = tighter) */
  exposureMultiplier: number
  /** Whether to force manual review due to concentration */
  forceManualReview: boolean
  /** Human-readable reasons */
  flags: string[]
  /** Raw position counts for dashboard display */
  positions: {
    totalOpen: number
    totalCapital: number
    sameModelCount: number
    evCount: number
    oldDieselCount: number
  }
}

// ── Open position types ────────────────────────────────────────────────────────

interface OpenPosition {
  make: string | null
  model: string | null
  year: number | null
  fuel: string | null
  actual_purchase_price: number | null
}

// ── Main exposure check ────────────────────────────────────────────────────────

/**
 * Check capital exposure before issuing a new offer.
 *
 * Queries open positions (status = won/purchased, no resale price yet)
 * and computes concentration risk for the vehicle being quoted.
 */
export async function checkExposure(
  make: string,
  model: string,
  fuel: string,
  year: number,
  thresholds: ExposureThresholds = DEFAULT_EXPOSURE_THRESHOLDS
): Promise<ExposureResult> {
  const flags: string[] = []
  let multiplier = 1.0
  let forceReview = false

  // Fetch all open positions: purchased/won but not yet resold
  const { data, error } = await getSb()
    .from('leads')
    .select('make, model, year, fuel, actual_purchase_price')
    .in('outcome', ['won'])
    .is('actual_resale_price', null)

  const openPositions: OpenPosition[] = (error || !data) ? [] : data

  // ── Count concentrations ──
  const normMake = make.toUpperCase()
  const normModel = model.toUpperCase()
  const normFuel = fuel.toUpperCase()
  const currentYear = new Date().getFullYear()

  const sameModelCount = openPositions.filter(
    p => p.make?.toUpperCase() === normMake && p.model?.toUpperCase() === normModel
  ).length

  const evCount = openPositions.filter(
    p => p.fuel?.toUpperCase() === 'ELECTRIC'
  ).length

  const oldDieselCount = openPositions.filter(
    p => p.fuel?.toUpperCase() === 'DIESEL' && p.year != null && (currentYear - p.year) > 10
  ).length

  const totalCapital = openPositions.reduce(
    (sum, p) => sum + (p.actual_purchase_price ?? 0), 0
  )

  // ── Rule 1: Same make+model concentration ──
  if (sameModelCount >= thresholds.maxSameModelOpen) {
    multiplier *= 0.97
    forceReview = true
    flags.push(
      `Concentration: ${sameModelCount} open ${normMake} ${normModel} ` +
      `(max ${thresholds.maxSameModelOpen}) — spread tightened, manual review`
    )
  }

  // ── Rule 2: EV portfolio concentration ──
  if (normFuel === 'ELECTRIC' && evCount >= thresholds.maxEvOpen) {
    multiplier *= 0.96
    forceReview = true
    flags.push(
      `EV exposure: ${evCount} open EVs (max ${thresholds.maxEvOpen}) — tightened`
    )
  }

  // ── Rule 3: Old diesel concentration ──
  if (normFuel === 'DIESEL' && (currentYear - year) > 10 && oldDieselCount >= thresholds.maxOldDieselOpen) {
    multiplier *= 0.95
    forceReview = true
    flags.push(
      `Old diesel exposure: ${oldDieselCount} open >10yr diesels ` +
      `(max ${thresholds.maxOldDieselOpen}) — tightened`
    )
  }

  // ── Rule 4: Total capital ceiling ──
  if (totalCapital >= thresholds.maxTotalCapital) {
    multiplier *= 0.98
    forceReview = true
    flags.push(
      `Total open capital £${totalCapital.toLocaleString()} ≥ ` +
      `ceiling £${thresholds.maxTotalCapital.toLocaleString()} — enterprise tightening`
    )
  }

  return {
    exposureMultiplier: Math.round(multiplier * 10000) / 10000,
    forceManualReview: forceReview,
    flags,
    positions: {
      totalOpen: openPositions.length,
      totalCapital,
      sameModelCount,
      evCount,
      oldDieselCount,
    },
  }
}

/**
 * Synchronous version that takes pre-fetched positions (for use in tests
 * or when the DB query is done externally).
 */
export function checkExposureSync(
  make: string,
  model: string,
  fuel: string,
  year: number,
  openPositions: OpenPosition[],
  thresholds: ExposureThresholds = DEFAULT_EXPOSURE_THRESHOLDS
): ExposureResult {
  const flags: string[] = []
  let multiplier = 1.0
  let forceReview = false

  const normMake = make.toUpperCase()
  const normModel = model.toUpperCase()
  const normFuel = fuel.toUpperCase()
  const currentYear = new Date().getFullYear()

  const sameModelCount = openPositions.filter(
    p => p.make?.toUpperCase() === normMake && p.model?.toUpperCase() === normModel
  ).length

  const evCount = openPositions.filter(
    p => p.fuel?.toUpperCase() === 'ELECTRIC'
  ).length

  const oldDieselCount = openPositions.filter(
    p => p.fuel?.toUpperCase() === 'DIESEL' && p.year != null && (currentYear - p.year) > 10
  ).length

  const totalCapital = openPositions.reduce(
    (sum, p) => sum + (p.actual_purchase_price ?? 0), 0
  )

  if (sameModelCount >= thresholds.maxSameModelOpen) {
    multiplier *= 0.97
    forceReview = true
    flags.push(`Concentration: ${sameModelCount} open ${normMake} ${normModel}`)
  }

  if (normFuel === 'ELECTRIC' && evCount >= thresholds.maxEvOpen) {
    multiplier *= 0.96
    forceReview = true
    flags.push(`EV exposure: ${evCount} open EVs`)
  }

  if (normFuel === 'DIESEL' && (currentYear - year) > 10 && oldDieselCount >= thresholds.maxOldDieselOpen) {
    multiplier *= 0.95
    forceReview = true
    flags.push(`Old diesel exposure: ${oldDieselCount} open >10yr diesels`)
  }

  if (totalCapital >= thresholds.maxTotalCapital) {
    multiplier *= 0.98
    forceReview = true
    flags.push(`Total open capital £${totalCapital.toLocaleString()} over ceiling`)
  }

  return {
    exposureMultiplier: Math.round(multiplier * 10000) / 10000,
    forceManualReview: forceReview,
    flags,
    positions: {
      totalOpen: openPositions.length,
      totalCapital,
      sameModelCount,
      evCount,
      oldDieselCount,
    },
  }
}
