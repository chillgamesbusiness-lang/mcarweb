/**
 * Production Valuation Engine v2 — 14-step conservative pricing.
 *
 * v2 additions over v1:
 *  - Volatility multiplier (step 10)
 *  - Keeper history check (step 11)
 *  - Age multiplier from yearRange midpoint
 *  - Fuel multiplier: diesel age-split, electric 3-tier
 *  - MOT multiplier: additive with 0.80 floor, structural/brake penalties
 *  - Updated mileage bands (0-10k, 10-20k, 20-40k, 40-60k, 60k+)
 *  - Dynamic spread with value scaling (4%-15% of adjustedValue)
 *  - QuoteMode enum instead of boolean
 *  - 7-day valuation expiry
 *  - Round to nearest £50
 *  - Separate confidence scorer module
 *
 * User sees: range only.
 * Admin sees: confidence score + deductions + all flags + all multiplier values.
  */

import { getMarketValue } from '@/lib/marketData'
import { getRegionMultiplier } from '@/lib/regionPricing'
import { calculateConfidence } from '@/lib/confidenceScorer'
import type {
  VehicleProfile,
  Condition,
  FuelType,
  MileageConsistency,
  Volatility,
  RiskTier,
  QuoteMode,
  MultiplierBreakdown,
  ValuationResult,
} from '@/lib/types'

// ── Constants ──────────────────────────────────────────────────────────────────

const CURRENT_YEAR = 2026

const CONDITION_MULTIPLIER: Record<Condition, number> = {
  excellent: 1.00,
  good: 0.97,
  fair: 0.92,
  poor: 0.85,
}

const LIQUIDITY_BUFFER = 0.07 // 7%
const TRADE_MARGIN = 0.80     // 80% of retail = trade base
const COMPOUND_ADJUSTMENT_FLOOR = 0.35

// ── Main calculation ───────────────────────────────────────────────────────────

export function calculateValuation(input: {
  vehicleProfile: VehicleProfile
  condition: Condition
  postcode: string
  /** Inject a fixed clock for deterministic tests; defaults to real clock */
  now?: Date
}): ValuationResult {
  const { vehicleProfile: vp, condition, postcode, now = new Date() } = input
  const riskFlags: string[] = []
  /**
   * Spread signals: only serious risks that should widen the quote range.
   * Informational flags (diesel, old age, volatile market) go to riskFlags only
   * because the pricing multipliers already account for them.
   */
  const spreadSignals: string[] = []
  let quoteMode: QuoteMode = 'auto'

  const CURRENT_YEAR = now.getFullYear()
  const vehicleAge = Math.max(0, CURRENT_YEAR - vp.year)
  const normFuel = vp.fuel as FuelType

  // ── Step 1: Market value anchor ────────────────────────────────────────
  const marketResult = getMarketValue(vp.make, vp.model, vp.year, vp.fuel)

  if (marketResult === null) {
    riskFlags.push('No market data — manual quote required')

    // Still score confidence for admin
    const { score: confidenceScore, deductions } = calculateConfidence(vp, condition)

    return buildManualResult(riskFlags, confidenceScore, deductions, now)
  }

  const estimatedRetail = marketResult.avgRetail
  const volatility = marketResult.volatility
  const tradeBase = Math.round(estimatedRetail * TRADE_MARGIN)

  // ── Step 2: Age depreciation (non-linear, from yearRange midpoint) ────
  const ageMultiplier = getAgeMultiplier(vehicleAge)

  if (vehicleAge > 10) {
    riskFlags.push('Vehicle over 10 years old')
  }

  // ── Step 3: Mileage risk curve ─────────────────────────────────────────
  const resolvedMileage = vp.resolvedMileage || vp.userDeclaredMileage
  const expectedMileage = vehicleAge * 8000
  const mileageDelta = resolvedMileage - expectedMileage
  const mileageMultiplier = getMileageMultiplier(mileageDelta)

  // Trigger on absolute threshold OR large delta — whichever comes first
  if (resolvedMileage > 100000 || mileageDelta > 40000) {
    riskFlags.push(`High mileage for age (+${Math.round(mileageDelta).toLocaleString()} over expected)`)
    spreadSignals.push('high_mileage')
  }

  // ── Step 4: MOT risk adjustment ────────────────────────────────────────
  const motMultiplier = getMotMultiplier(vp, riskFlags, spreadSignals)

  // ── Step 5: Fuel & market risk ─────────────────────────────────────────
  const fuelMultiplier = getFuelMultiplier(normFuel, vehicleAge)

  if (normFuel === 'diesel') {
    riskFlags.push('Diesel — market softness')
  }
  if (normFuel === 'electric' && vehicleAge > 6) {
    riskFlags.push('Older electric — battery degradation uncertainty')
  } else if (normFuel === 'electric' && vehicleAge > 4) {
    riskFlags.push('Electric 5-6yr — battery warranty concerns')
  }

  // ── Step 6: ULEZ penalty ───────────────────────────────────────────────
  let ulezMultiplier = 1.0
  if (!vp.ulezCompliant) {
    ulezMultiplier = 0.95
    riskFlags.push('Non-ULEZ compliant — reduced urban demand')
  }

  // ── Step 7: Condition ──────────────────────────────────────────────────
  const condMultiplier = CONDITION_MULTIPLIER[condition] ?? 0.92
  if (condition === 'poor') {
    riskFlags.push('Poor condition — high reconditioning cost')
  }

  // ── Step 8: Regional adjustment ────────────────────────────────────────
  const regionResult = getRegionMultiplier(postcode, normFuel, vp.ulezCompliant)
  const regionMultiplier = regionResult.multiplier
  riskFlags.push(...regionResult.flags)

  // ── Step 9: Mileage consistency penalty ────────────────────────────────
  const consistencyMultiplier = getConsistencyMultiplier(
    vp.motAnalysis.mileageConsistency,
    vp.mileageDiscrepancy,
    vp.mileageDiscrepancyAmount,
    riskFlags,
    spreadSignals
  )

  if (vp.motAnalysis.mileageConsistency === 'rollback_detected') {
    // 'blocked': rollback means we cannot show any auto range
    quoteMode = 'blocked'
  }

  // ── Step 10: Volatility adjustment (v2 NEW) ───────────────────────────
  const volatilityMultiplier = getVolatilityMultiplier(volatility)

  if (volatility === 'volatile') {
    riskFlags.push('Volatile market segment — wider spread applied')
  }

  // ── Step 11: Keeper history check (v2 NEW) ────────────────────────────
  const keeperMultiplier = getKeeperMultiplier(vp.dateOfLastV5C, vehicleAge)

  if (keeperMultiplier < 1.0) {
    riskFlags.push('Recent keeper change on older vehicle')
  }

  // ── SORN check ─────────────────────────────────────────────────────────
  let sornMultiplier = 1.0
  if (vp.sornRegistered) {
    sornMultiplier = 0.90
    riskFlags.push('SORN registered — not currently roadworthy/legal')
    spreadSignals.push('sorn')
    quoteMode = 'manual_review'
  }

  // ── Step 12: Liquidity buffer ──────────────────────────────────────────
  // Applied via final formula

  // ── Step 13: Final calculation ─────────────────────────────────────────
  const combinedAdjustment = Math.max(
    COMPOUND_ADJUSTMENT_FLOOR,
    ageMultiplier *
    mileageMultiplier *
    motMultiplier *
    fuelMultiplier *
    condMultiplier *
    regionMultiplier *
    ulezMultiplier *
    consistencyMultiplier *
    volatilityMultiplier *
    keeperMultiplier *
    sornMultiplier
  )

  const rawValue = tradeBase * combinedAdjustment * (1 - LIQUIDITY_BUFFER)
  const adjustedValue = roundToNearest50(rawValue)

  // ── Confidence score ───────────────────────────────────────────────────
  const { score: confidenceScore, deductions: confidenceDeductions } =
    calculateConfidence(vp, condition)

  // ── Step 14: Dynamic spread ────────────────────────────────────────────
  const { spread: spreadApplied, riskTier } = calculateSpread(
    adjustedValue,
    spreadSignals,
    confidenceScore,
    volatility,
    riskFlags
  )

  // Fix: manual_only (e.g. rollback detected) must return no range — not a £0-£100 stub
  if (riskTier === 'manual_only') {
    return buildManualResult(riskFlags, confidenceScore, confidenceDeductions, now)
  }

  let min = adjustedValue - spreadApplied
  let max = adjustedValue + spreadApplied

  // Floor: never show below £200
  min = Math.max(200, min)

  // Sanity: min must be < max
  if (min >= max) max = min + 100

  const midpoint = Math.round((min + max) / 2)

  // Expiry: 7 days from the injected/real clock
  const calculatedAt = now.toISOString()
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()

  return {
    min,
    max,
    midpoint,
    adjustedValue,
    confidenceScore,
    confidenceDeductions,
    riskFlags,
    riskTier,
    marketValueUsed: estimatedRetail,
    marketDataMatched: true,
    allMultipliers: {
      tradeBase,
      ageMultiplier: round4(ageMultiplier),
      mileageMultiplier: round4(mileageMultiplier),
      motMultiplier: round4(motMultiplier),
      fuelMultiplier: round4(fuelMultiplier),
      conditionMultiplier: round4(condMultiplier),
      regionMultiplier: round4(regionMultiplier),
      ulezMultiplier: round4(ulezMultiplier),
      mileageConsistencyMultiplier: round4(consistencyMultiplier),
      volatilityMultiplier: round4(volatilityMultiplier),
      keeperMultiplier: round4(keeperMultiplier),
      sornMultiplier: round4(sornMultiplier),
      liquidityBuffer: LIQUIDITY_BUFFER,
      // Admin debug: full pipeline trace
      combinedAdjustment: round4(combinedAdjustment),
      rawValue: Math.round(rawValue),
    },
    quoteMode,
    regionUsed: regionResult.region,
    spreadApplied,
    calculatedAt,
    expiresAt,
  }
}

// ── Step helpers ────────────────────────────────────────────────────────────────

/**
 * Non-linear age depreciation.
 * 0–3yr: 12% p.a., 4–7yr: 8% p.a., 8–12yr: 6% p.a., 12+: 0%.
 * Floor at 0.40.
 */
function getAgeMultiplier(vehicleAge: number): number {
  if (vehicleAge <= 0) return 1.0

  let totalDepreciation = 0

  for (let y = 1; y <= vehicleAge; y++) {
    if (y <= 3) totalDepreciation += 0.12
    else if (y <= 7) totalDepreciation += 0.08
    else if (y <= 12) totalDepreciation += 0.06
    else totalDepreciation += 0.02 // Slow continued depreciation after 12yr (was 0 = wrong)
  }

  return Math.max(0.40, 1 - totalDepreciation)
}

/**
 * Mileage delta bands (v2 updated):
 * < -20k: +3%, -20k–0: neutral, 0–10k: -3%, 10–20k: -6%, 20–40k: -12%, 40–60k: -18%, 60k+: -25%
 */
function getMileageMultiplier(delta: number): number {
  if (delta < -20000) return 1.03
  if (delta <= 0) return 1.00
  if (delta <= 10000) return 0.97
  if (delta <= 20000) return 0.94
  if (delta <= 40000) return 0.88
  if (delta <= 60000) return 0.82
  return 0.75
}

/**
 * MOT multiplier v2: additive with floor 0.80.
 * Includes structural + brake advisory penalties.
 */
function getMotMultiplier(
  vp: VehicleProfile,
  flags: string[],
  signals: string[] // Serious signals that widen spread
): number {
  const mot = vp.motAnalysis
  let m = 1.0

  // Months remaining
  if (mot.motMonthsRemaining >= 10) {
    m += 0.02 // bonus
  } else if (mot.motMonthsRemaining >= 4) {
    // neutral
  } else if (mot.motMonthsRemaining >= 1) {
    m -= 0.03
    flags.push(`MOT expiring within 3 months`)
    signals.push('mot_expiring')
  } else if (mot.motExpired) {
    m -= 0.07
    flags.push('MOT expired — inspection risk + cost')
    signals.push('mot_expired')
  }

  // Recent failures
  if (mot.recentFailCount >= 2) {
    m -= 0.03
    flags.push(`Multiple recent MOT failures (${mot.recentFailCount} of last 3)`)
    signals.push('mot_failures')
  }

  // Advisory burden — 8+ is spread-worthy; 5+ informational
  if (mot.advisoryCount >= 8) {
    m -= 0.03
    flags.push('High advisory count on latest MOT (8+)')
    signals.push('mot_advisories_high')
  } else if (mot.advisoryCount >= 5) {
    m -= 0.02
    flags.push('High advisory count on latest MOT (5+)')
  }

  // Dangerous defects
  if (mot.dangerousDefects) {
    m -= 0.03
    flags.push('Dangerous defect in MOT history')
    signals.push('mot_dangerous')
  }

  // Structural concerns (corrosion, subframe, chassis)
  if (mot.structuralAdvisories) {
    m -= 0.04
    flags.push('Structural/corrosion advisories present')
    signals.push('mot_structural')
  }

  // Brake advisories
  if (mot.brakeAdvisories) {
    m -= 0.02
    flags.push('Brake system advisories on latest MOT')
    signals.push('mot_brakes')
  }

  // Floor: MOT multiplier can't go below 0.80
  return Math.max(0.80, m)
}

/**
 * Fuel multiplier v2:
 * - Diesel ≤5yr: 0.97, >5yr: 0.94
 * - Hybrid: 1.03
 * - Electric ≤4yr: 1.03, 5-6yr: 0.98, >6yr: 0.90
 * - Petrol: 1.00
 */
function getFuelMultiplier(fuel: FuelType, age: number): number {
  switch (fuel) {
    case 'diesel':
      return age <= 5 ? 0.97 : 0.94
    case 'hybrid':
      return 1.03
    case 'electric':
      if (age <= 4) return 1.03
      if (age <= 6) return 0.98
      return 0.90
    default:
      return 1.00
  }
}

/**
 * Mileage consistency penalty.
 * Rollback: -15%, Suspicious: -5%, Discrepancy: additional -3%.
 */
function getConsistencyMultiplier(
  consistency: MileageConsistency,
  discrepancy: boolean,
  discrepancyAmount: number,
  flags: string[],
  signals: string[] // Serious signals that widen spread
): number {
  let m = 1.0

  if (consistency === 'rollback_detected') {
    m = 0.85
    flags.push('⚠️ MILEAGE ROLLBACK DETECTED — manual review required')
    signals.push('rollback')
  } else if (consistency === 'suspicious') {
    m = 0.95
    flags.push('Mileage pattern irregular — verify at inspection')
    signals.push('suspicious_mileage')
  }

  if (discrepancy) {
    m *= 0.97
    flags.push(
      `User-declared mileage doesn't match MOT records (Δ${Math.abs(discrepancyAmount).toLocaleString()} miles)`
    )
    signals.push('mileage_discrepancy')
  }

  return m
}

/**
 * Volatility multiplier (v2 new):
 * stable: 1.00, moderate: 0.98, volatile: 0.95
 */
function getVolatilityMultiplier(volatility: Volatility): number {
  switch (volatility) {
    case 'stable': return 1.00
    case 'moderate': return 0.98
    case 'volatile': return 0.95
    default: return 1.00
  }
}

/**
 * Keeper history multiplier (v2 new):
 * Recent V5C change (< 6 months) on non-new vehicle (> 3yr) → -2%.
 */
function getKeeperMultiplier(
  dateOfLastV5C: string | null,
  vehicleAge: number
): number {
  if (!dateOfLastV5C) return 1.00

  const v5cDate = new Date(dateOfLastV5C)

  // Guard against malformed dates (would produce NaN and silently disable the check)
  if (isNaN(v5cDate.getTime())) return 1.00

  const today = new Date()
  const monthsSinceV5C =
    (today.getFullYear() - v5cDate.getFullYear()) * 12 +
    (today.getMonth() - v5cDate.getMonth())

  if (vehicleAge > 3 && monthsSinceV5C < 6) {
    return 0.98
  }

  return 1.00
}

// ── Dynamic spread (v2) ────────────────────────────────────────────────────────

function calculateSpread(
  adjustedValue: number,
  spreadSignals: string[], // Counted for tier — serious risks only
  confidenceScore: number,
  volatility: Volatility,
  riskFlags: string[]     // Full flags — for rollback/structural pattern checks
): { spread: number; riskTier: RiskTier } {
  const flagCount = spreadSignals.length
  const hasRollback = spreadSignals.includes('rollback')
  const hasStructural = spreadSignals.includes('mot_structural')

  // Showstopper → manual only, max spread
  if (hasRollback) {
    return { spread: 0, riskTier: 'manual_only' }
  }

  // Base spread by flag count
  let spread: number
  let tier: RiskTier

  if (flagCount <= 1) {
    spread = 250
    tier = 'low'
  } else if (flagCount <= 3) {
    spread = 400
    tier = 'medium'
  } else if (flagCount <= 5) {
    spread = 650
    tier = 'high'
  } else {
    spread = 900
    tier = 'high'
  }

  // Widen for volatile markets
  if (volatility === 'volatile') spread = Math.round(spread * 1.3)
  else if (volatility === 'moderate') spread = Math.round(spread * 1.1)

  // Widen for structural concerns
  if (hasStructural) spread = Math.round(spread * 1.2)

  // Widen for low confidence
  if (confidenceScore < 50) spread = Math.round(spread * 1.3)

  // Scale spread with value — min 4% of adjustedValue
  const minSpread = Math.round(adjustedValue * 0.04)
  spread = Math.max(spread, minSpread)

  // Cap spread at 15% of adjustedValue
  const maxSpread = Math.round(adjustedValue * 0.15)
  spread = Math.min(spread, maxSpread)

  // Round to nearest £25
  spread = Math.round(spread / 25) * 25

  return { spread, riskTier: tier }
}

// ── Manual result builder ──────────────────────────────────────────────────────

function buildManualResult(
  flags: string[],
  confidenceScore: number,
  confidenceDeductions: { reason: string; amount: number }[],
  now: Date = new Date()
): ValuationResult {
  return {
    min: 0,
    max: 0,
    midpoint: 0,
    adjustedValue: 0,
    confidenceScore,
    confidenceDeductions,
    riskFlags: flags,
    riskTier: 'manual_only',
    marketValueUsed: 0,
    marketDataMatched: false,
    allMultipliers: {
      tradeBase: 0,
      ageMultiplier: 0,
      mileageMultiplier: 0,
      motMultiplier: 0,
      fuelMultiplier: 0,
      conditionMultiplier: 0,
      regionMultiplier: 0,
      ulezMultiplier: 0,
      mileageConsistencyMultiplier: 0,
      volatilityMultiplier: 0,
      keeperMultiplier: 0,
      sornMultiplier: 0,
      liquidityBuffer: 0,
      combinedAdjustment: 0,
      rawValue: 0,
    },
    // 'blocked': UI must show no range; this goes to manual human review
    quoteMode: 'blocked',
    regionUsed: 'unknown',
    spreadApplied: 0,
    calculatedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  }
}

// ── Utilities ──────────────────────────────────────────────────────────────────

function roundToNearest50(n: number): number {
  return Math.round(n / 50) * 50
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000
}
