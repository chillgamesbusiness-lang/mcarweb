/**
 * Time-to-Sell Model — Estimates expected days to sell + discount for holding risk.
 *
 * Even without paid market data, we can model time risk from:
 *   - Volatility class (stable/moderate/volatile)
 *   - Segment heat score (from heatmap)
 *   - Risk tier
 *   - Mileage extreme flags
 *   - ULEZ non-compliance
 *   - Advisory/recon burden
 *
 * Outputs:
 *   - expectedDaysToSell (min/mid/max range)
 *   - timeRiskDiscount (0–6% applied to resale)
 *   - explanation: human-readable summary
 */

import type { RiskTier, Volatility } from '@/lib/types'
import type { HeatLevel, VehicleSegment } from '@/lib/segmentPricing'

// ── Types ──────────────────────────────────────────────────────────────────────

export interface TimeToSellInput {
  volatility: Volatility
  heatLevel: HeatLevel
  segment: VehicleSegment
  riskTier: RiskTier
  mileage: number
  ulezCompliant: boolean
  reconEstimate: number
  tradeBase: number          // for recon % calculation
  listingAgeDaysMedian: number | null  // from comps if available
}

export interface TimeToSellResult {
  expectedDaysMin: number
  expectedDaysMid: number
  expectedDaysMax: number
  timeRiskDiscountPct: number   // 0.00–0.06
  explanation: string
  signals: string[]
}

// ── Rule-based model ───────────────────────────────────────────────────────────

export function estimateTimeToSell(input: TimeToSellInput): TimeToSellResult {
  const signals: string[] = []
  let baseDaysMid = 21  // 3 weeks default

  // ── 1. Risk tier base ──────────────────────────────────────────────────
  switch (input.riskTier) {
    case 'low':
      baseDaysMid = 14
      break
    case 'medium':
      baseDaysMid = 21
      break
    case 'high':
      baseDaysMid = 35
      signals.push('High risk tier → slower sale')
      break
    case 'manual_only':
      baseDaysMid = 60
      signals.push('Manual-only → extended time to sell')
      break
  }

  // ── 2. Heat level adjustment ───────────────────────────────────────────
  switch (input.heatLevel) {
    case 'hot':
      baseDaysMid += 14
      signals.push('Hot segment → reduced demand')
      break
    case 'warm':
      baseDaysMid += 5
      break
    case 'cool':
      baseDaysMid -= 3
      signals.push('Cool segment → good liquidity')
      break
  }

  // ── 3. Segment-specific adjustments ────────────────────────────────────
  if (input.segment === 'diesel_old') {
    baseDaysMid += 14
    signals.push('Old diesel → extended selling period')
  } else if (input.segment === 'ev_aging') {
    baseDaysMid += 10
    signals.push('Aging EV → battery anxiety slows sale')
  } else if (input.segment === 'diesel_aging') {
    baseDaysMid += 5
    signals.push('Aging diesel → moderately slower')
  }

  // ── 4. ULEZ non-compliance ─────────────────────────────────────────────
  if (!input.ulezCompliant) {
    baseDaysMid += 10
    signals.push('Non-ULEZ → restricted buyer pool')
  }

  // ── 5. Extreme mileage ─────────────────────────────────────────────────
  if (input.mileage > 150000) {
    baseDaysMid += 14
    signals.push('Very high mileage (>150k) → niche buyer pool')
  } else if (input.mileage > 100000) {
    baseDaysMid += 5
    signals.push('High mileage (>100k) → somewhat slower')
  }

  // ── 6. Recon burden ────────────────────────────────────────────────────
  const reconPct = input.tradeBase > 0 ? input.reconEstimate / input.tradeBase : 0
  if (reconPct > 0.15) {
    baseDaysMid += 7
    signals.push('High recon burden → delayed listing')
  }

  // ── 7. Market volatility ───────────────────────────────────────────────
  if (input.volatility === 'volatile') {
    baseDaysMid += 7
    signals.push('Volatile market → pricing uncertainty')
  }

  // ── 8. Comp listing age signal (if available) ──────────────────────────
  if (input.listingAgeDaysMedian !== null) {
    // If comps are sitting on the market a long time, that's a signal
    if (input.listingAgeDaysMedian > 30) {
      baseDaysMid += 7
      signals.push(`Market comps averaging ${input.listingAgeDaysMedian}d on market`)
    } else if (input.listingAgeDaysMedian < 10) {
      baseDaysMid -= 3
      signals.push('Comps selling quickly (median <10d)')
    }
  }

  // ── Clamp and compute range ────────────────────────────────────────────
  baseDaysMid = Math.max(7, Math.min(90, baseDaysMid))
  const expectedDaysMin = Math.max(3, Math.round(baseDaysMid * 0.5))
  const expectedDaysMax = Math.min(120, Math.round(baseDaysMid * 1.8))

  // ── Time risk discount ─────────────────────────────────────────────────
  // Maps days-to-sell to a resale discount percentage
  let timeRiskDiscountPct = 0
  if (baseDaysMid <= 14) {
    timeRiskDiscountPct = 0.005 // 0.5%
  } else if (baseDaysMid <= 21) {
    timeRiskDiscountPct = 0.01  // 1%
  } else if (baseDaysMid <= 28) {
    timeRiskDiscountPct = 0.02  // 2%
  } else if (baseDaysMid <= 45) {
    timeRiskDiscountPct = 0.035 // 3.5%
  } else if (baseDaysMid <= 60) {
    timeRiskDiscountPct = 0.05  // 5%
  } else {
    timeRiskDiscountPct = 0.06  // 6% max
  }

  // ── Explanation ────────────────────────────────────────────────────────
  const explanation = signals.length > 0
    ? `Expected ${expectedDaysMin}–${expectedDaysMax} days to sell. ${signals.slice(0, 3).join('. ')}.`
    : `Expected ${expectedDaysMin}–${expectedDaysMax} days to sell. Standard conditions.`

  return {
    expectedDaysMin,
    expectedDaysMid: baseDaysMid,
    expectedDaysMax,
    timeRiskDiscountPct,
    explanation,
    signals,
  }
}
