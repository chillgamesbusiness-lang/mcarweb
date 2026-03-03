/**
 * Sell Cost Model — Segmented sell cost estimation.
 *
 * Instead of a flat 5%, this model estimates sell costs based on:
 *   - Vehicle price band (cheap cars have higher % overhead)
 *   - Segment type
 *   - Whether auction or trade sale
 *
 * Cost categories (shown in details):
 *   - Platform/auction fees
 *   - Valeting & prep
 *   - Warranty allowance
 *   - Admin & logistics
 *
 * Default range: 4%–7% of resale price.
 */

import type { VehicleSegment } from '@/lib/segmentPricing'

// ── Types ──────────────────────────────────────────────────────────────────────

export interface SellCostBreakdown {
  platformFeePct: number       // auction/platform fee
  valetingGBP: number          // flat valeting cost
  warrantyAllowanceGBP: number // provision for minor claims
  adminGBP: number             // admin + transport
  totalPct: number             // effective total as % of resale
  totalGBP: number             // total in £
  breakdown: string[]          // human-readable lines
}

// ── Constants ──────────────────────────────────────────────────────────────────

const BASE_PLATFORM_FEE_PCT = 0.025   // 2.5% platform/auction
const VALETING_BASE = 150             // £150 valet + prep
const WARRANTY_ALLOWANCE = 100        // £100 warranty provision
const ADMIN_BASE = 75                 // £75 admin + logistics

// ── Segment overrides ──────────────────────────────────────────────────────────

const SEGMENT_FEE_OVERRIDES: Partial<Record<VehicleSegment, number>> = {
  diesel_old: 0.035,      // harder to sell → higher fees
  ev_aging: 0.035,        // niche market
  high_age: 0.030,
  diesel_aging: 0.028,
}

// ── Main function ──────────────────────────────────────────────────────────────

export function estimateSellCosts(
  resalePrice: number,
  segment: VehicleSegment
): SellCostBreakdown {
  const breakdown: string[] = []

  // Platform fee: base or segment override
  const platformFeePct = SEGMENT_FEE_OVERRIDES[segment] ?? BASE_PLATFORM_FEE_PCT
  const platformFeeGBP = Math.round(resalePrice * platformFeePct)
  breakdown.push(`Platform/auction: ${(platformFeePct * 100).toFixed(1)}% = £${platformFeeGBP}`)

  // Valeting: higher for cheap cars (fixed cost = higher %)
  const valetingGBP = VALETING_BASE
  breakdown.push(`Valeting & prep: £${valetingGBP}`)

  // Warranty allowance
  const warrantyGBP = WARRANTY_ALLOWANCE
  breakdown.push(`Warranty provision: £${warrantyGBP}`)

  // Admin
  const adminGBP = ADMIN_BASE
  breakdown.push(`Admin & logistics: £${adminGBP}`)

  // Total
  const totalGBP = platformFeeGBP + valetingGBP + warrantyGBP + adminGBP
  const totalPct = resalePrice > 0 ? totalGBP / resalePrice : 0

  breakdown.push(`Total: £${totalGBP} (${(totalPct * 100).toFixed(1)}% of resale)`)

  return {
    platformFeePct,
    valetingGBP,
    warrantyAllowanceGBP: warrantyGBP,
    adminGBP,
    totalPct: Math.round(totalPct * 1000) / 1000,
    totalGBP,
    breakdown,
  }
}
