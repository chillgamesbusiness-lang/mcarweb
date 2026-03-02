/**
 * Production Valuation Engine v3 — 16-step conservative pricing.
 *
 * v3 additions over v2:
 *  - Conditional compound floor: 0.35 for normal vehicles, 0.15 for liability
 *    vehicles (rollback, structural, SORN, expired MOT)
 *  - Mileage discrepancy scaling: tiered by delta (<2k/2-10k/10-25k/25k+)
 *  - Structural advisory proportional weighting by count
 *  - Severity-weighted spread tiers (fraud=5, mechanical=3, financial=2, info=1)
 *  - EV battery age 4-tier: ≤4yr/5-6yr/7-8yr/8+yr
 *  - Recon cost estimation from advisory classification
 *
 * v2 features retained:
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
import { estimateReconCost } from '@/lib/mileageAnalyser'
import { getSegmentProfile } from '@/lib/segmentPricing'
import { calculateConfidenceDecay } from '@/lib/confidenceDecay'
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
  MarketMatchQuality,
  QuoteExplanation,
  AdminExplanationItem,
  ProfitSimulation,
  ProfitRiskBand,
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
  const matchQuality: MarketMatchQuality = marketResult.matchQuality
  const tradeBase = Math.round(estimatedRetail * TRADE_MARGIN)

  // ── Step 1b: Market anchor confidence ──────────────────────────────────
  // Weak match quality = less trust in the anchor → small haircut + wider spread
  const marketConfidenceMultiplier = getMarketConfidenceMultiplier(matchQuality, volatility)
  if (marketConfidenceMultiplier < 1.0) {
    riskFlags.push(`Market data match: ${matchQuality} — anchor discounted`)
  }

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
  if (normFuel === 'electric' && vehicleAge > 8) {
    riskFlags.push(`Older electric (${vehicleAge}yr) — battery pack uncertainty`)
  } else if (normFuel === 'electric' && vehicleAge > 6) {
    riskFlags.push(`Older electric (${vehicleAge}yr) — battery degradation uncertainty`)
  } else if (normFuel === 'electric' && vehicleAge > 4) {
    riskFlags.push(`Electric (${vehicleAge}yr) — battery warranty concerns`)
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

  // ── Step 7b: Anti-gaming — user input trust model ─────────────────────
  const { multiplier: inputTrustMultiplier, flags: trustFlags } =
    getInputTrustMultiplier(vp, condition, vehicleAge)
  riskFlags.push(...trustFlags)

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

  // ── Step 12b: Recon estimation from advisories ────────────────────────
  const reconEstimate = estimateReconCost(vp.motAnalysis.riskAdvisories)
  // Cap recon deduction at 20% of trade base
  const reconMultiplier = Math.max(0.80, 1 - reconEstimate / tradeBase)

  if (reconEstimate > 500) {
    riskFlags.push(`Estimated recon cost: £${reconEstimate.toLocaleString()}`)
  }
  if (reconEstimate > 1500) {
    spreadSignals.push('high_recon')
  }

  // ── Step 12d: Segment-specific pricing overlay ────────────────────────
  const segmentProfile = getSegmentProfile(
    normFuel, vehicleAge, postcode, volatility, matchQuality
  )
  const segmentMultiplier = segmentProfile.segmentMultiplier
  if (segmentMultiplier < 1.0) {
    riskFlags.push(`Segment: ${segmentProfile.note}`)
  }
  if (segmentProfile.forceManualReview) {
    quoteMode = 'manual_review'
  }

  // ── Step 12c: Liability overrides — hard rule gates ───────────────────
  // Explicit, predictable, explainable behaviour for high-liability vehicles.
  // These override quoteMode regardless of multiplier math.
  const liabilityResult = applyLiabilityOverrides(vp, reconEstimate, tradeBase, riskFlags)
  if (liabilityResult.blocked) {
    const { score: cs, deductions: cd } = calculateConfidence(vp, condition)
    return buildManualResult(riskFlags, cs, cd, now)
  }
  if (liabilityResult.manualReview) {
    quoteMode = 'manual_review'
  }

  // ── Step 13: Final calculation ─────────────────────────────────────────
  const rawCombined =
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
    sornMultiplier *
    reconMultiplier *
    marketConfidenceMultiplier *
    inputTrustMultiplier *
    segmentMultiplier

  // Conditional compound floor: only protect if vehicle has no liability flags.
  // Rollback, structural damage, SORN, or expired MOT = liability, not just risk.
  // Those vehicles are allowed to fall below the normal 0.35 floor.
  const hasLiabilityFlag =
    vp.motAnalysis.mileageConsistency === 'rollback_detected' ||
    vp.motAnalysis.structuralAdvisories ||
    vp.sornRegistered ||
    vp.motAnalysis.motExpired

  const effectiveFloor = hasLiabilityFlag ? 0.15 : COMPOUND_ADJUSTMENT_FLOOR
  const combinedAdjustment = Math.max(effectiveFloor, rawCombined)

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

  // ── Explanation payloads ─────────────────────────────────────────────
  const customerExplanation = buildCustomerExplanation(
    vp, condition, normFuel, vehicleAge, volatility, matchQuality,
    reconEstimate, motMultiplier, mileageMultiplier, fuelMultiplier,
    ulezMultiplier, consistencyMultiplier, sornMultiplier, quoteMode
  )
  const adminExplanation = buildAdminExplanation(
    vp, condition, vehicleAge, normFuel, volatility, matchQuality,
    reconEstimate, tradeBase, motMultiplier, fuelMultiplier,
    mileageMultiplier, consistencyMultiplier, ulezMultiplier,
    inputTrustMultiplier, marketConfidenceMultiplier, keeperMultiplier,
    sornMultiplier, reconMultiplier, liabilityResult
  )
  const profitSimulation = buildProfitSimulation(
    estimatedRetail, reconEstimate, min, max, midpoint, quoteMode
  )

  // ── Profit guardrail: if expectedProfitMid < £300 → manual_review ──
  if (profitSimulation.guardrailTriggered && quoteMode === 'auto') {
    quoteMode = 'manual_review'
  }

  // ── Confidence decay: elevated profit floor under uncertainty ────────
  const decayResult = calculateConfidenceDecay({
    expectedProfitMid: profitSimulation.expectedProfitMid,
    volatility,
    matchQuality,
    reconEstimate,
    tradeBase,
    confidenceScore,
    heatLevel: segmentProfile.heatLevel,
  })
  if (decayResult.floorBreached && quoteMode === 'auto') {
    quoteMode = 'manual_review'
    riskFlags.push(
      `Confidence decay: profit £${profitSimulation.expectedProfitMid} < elevated floor £${decayResult.elevatedProfitFloor}`
    )
  }

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
      reconMultiplier: round4(reconMultiplier),
      reconEstimate: Math.round(reconEstimate),
      marketConfidenceMultiplier: round4(marketConfidenceMultiplier),
      inputTrustMultiplier: round4(inputTrustMultiplier),
      segmentMultiplier: round4(segmentMultiplier),
      liquidityBuffer: LIQUIDITY_BUFFER,
      // Admin debug: full pipeline trace
      combinedAdjustment: round4(combinedAdjustment),
      rawValue: Math.round(rawValue),
    },
    quoteMode,
    matchQuality,
    regionUsed: regionResult.region,
    spreadApplied,
    calculatedAt,
    expiresAt,
    customerExplanation,
    adminExplanation,
    profitSimulation,
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

  // Structural concerns — proportional to advisory count
  if (mot.structuralAdvisories) {
    const structCount = mot.structuralAdvisoryCount ?? 1
    // Base -3%, then -2% for 2+, then -3% more for 4+
    m -= 0.03
    if (structCount > 1) m -= 0.02
    if (structCount > 3) m -= 0.03
    flags.push(
      `Structural/corrosion advisories present (${structCount} found)`
    )
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
 * Fuel multiplier v3:
 * - Diesel ≤5yr: 0.97, >5yr: 0.94
 * - Hybrid: 1.03
 * - Electric ≤4yr: 1.03, 5-6yr: 0.98, 7-8yr: 0.90, >8yr: 0.85
 * - Petrol: 1.00
 *
 * EV >8yr gets steeper discount due to battery pack uncertainty
 * and trader resistance on older packs without warranty.
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
      if (age <= 8) return 0.90
      return 0.85 // Battery anxiety premium
    default:
      return 1.00
  }
}

/**
 * Mileage consistency penalty.
 * Rollback: -15%, Suspicious: -5%.
 * Discrepancy: scaled by delta miles (not flat).
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

  // Scaled mileage discrepancy: larger delta → bigger penalty
  if (discrepancy) {
    const absDelta = Math.abs(discrepancyAmount)
    let discMult: number
    if (absDelta < 2000)       discMult = 0.98
    else if (absDelta < 10000) discMult = 0.95
    else if (absDelta < 25000) discMult = 0.90
    else                       discMult = 0.80

    m *= discMult
    flags.push(
      `User-declared mileage doesn't match MOT records (Δ${absDelta.toLocaleString()} miles)`
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

// ── Severity-weighted spread signals ───────────────────────────────────────────

const SIGNAL_SEVERITY: Record<string, number> = {
  // Fraud risk (5)
  rollback: 5,
  // Mechanical / liability risk (3)
  mot_structural: 3,
  mot_dangerous: 3,
  sorn: 3,
  mot_expired: 3,
  suspicious_mileage: 3,
  // Financial risk (2)
  mot_failures: 2,
  mot_advisories_high: 2,
  mot_brakes: 2,
  high_mileage: 2,
  mileage_discrepancy: 2,
  high_recon: 2,
  // Informational (1)
  mot_expiring: 1,
}

function calculateSpread(
  adjustedValue: number,
  spreadSignals: string[], // Weighted by severity for tier
  confidenceScore: number,
  volatility: Volatility,
  riskFlags: string[]     // Full flags — for rollback/structural pattern checks
): { spread: number; riskTier: RiskTier } {
  const hasRollback = spreadSignals.includes('rollback')
  const hasStructural = spreadSignals.includes('mot_structural')

  // Showstopper → manual only, max spread
  if (hasRollback) {
    return { spread: 0, riskTier: 'manual_only' }
  }

  // Severity-weighted risk score (not just flag count)
  const riskScore = spreadSignals.reduce(
    (sum, signal) => sum + (SIGNAL_SEVERITY[signal] ?? 1),
    0
  )

  // Base spread by severity score
  let spread: number
  let tier: RiskTier

  if (riskScore <= 2) {
    spread = 250
    tier = 'low'
  } else if (riskScore <= 5) {
    spread = 400
    tier = 'medium'
  } else if (riskScore <= 9) {
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

  // Volatile market segments floor at medium — spread widening happens above,
  // but the displayed tier should also reflect market resale uncertainty.
  if (volatility === 'volatile' && tier === 'low') {
    tier = 'medium'
  }

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
      reconMultiplier: 0,
      reconEstimate: 0,
      marketConfidenceMultiplier: 0,
      inputTrustMultiplier: 0,
      segmentMultiplier: 0,
      liquidityBuffer: 0,
      combinedAdjustment: 0,
      rawValue: 0,
    },
    quoteMode: 'blocked',
    matchQuality: 'none',
    regionUsed: 'unknown',
    spreadApplied: 0,
    calculatedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    customerExplanation: {
      bullets: ['This vehicle requires a specialist review before we can provide an offer.'],
      summary: 'We need to take a closer look at this one.',
    },
    adminExplanation: flags.map(f => ({
      rule: 'MANUAL_BLOCKED',
      severity: 'critical' as const,
      description: f,
      impact: 'blocked',
    })),
    profitSimulation: {
      estimatedRetail: 0,
      sellCostPct: 0.05,
      reconEstimate: 0,
      expectedProfitMin: 0,
      expectedProfitMid: 0,
      expectedProfitMax: 0,
      profitRiskBand: 'red',
      guardrailTriggered: true,
      guardrailReason: 'Vehicle blocked — no auto-quote',
    },
  }
}

// ── Market confidence multiplier ────────────────────────────────────────────

/**
 * Weaker market data match = less trust in the anchor.
 * exact: 1.00, fuel_fuzzy: 0.99, year_fuzzy: 0.97, partial: 0.95
 * Volatile markets get an extra -1% on top.
 */
function getMarketConfidenceMultiplier(
  matchQuality: MarketMatchQuality,
  volatility: Volatility
): number {
  let m: number
  switch (matchQuality) {
    case 'exact':      m = 1.00; break
    case 'fuel_fuzzy': m = 0.99; break
    case 'year_fuzzy': m = 0.97; break
    case 'partial':    m = 0.95; break
    default:           m = 1.00
  }
  // Volatile markets with weak match = extra uncertainty
  if (volatility === 'volatile' && matchQuality !== 'exact') {
    m -= 0.01
  }
  return m
}

// ── Anti-gaming: user input trust model ─────────────────────────────────────

/**
 * Treat user-supplied "nice" inputs as claims, not facts.
 *
 * 1. Mileage edited away from MOT prefill → small trust penalty
 * 2. "Excellent" on 12+ year diesel → downweight to "good" equivalent
 * 3. Future: postcode plausibility checks
 */
function getInputTrustMultiplier(
  vp: VehicleProfile,
  condition: Condition,
  vehicleAge: number
): { multiplier: number; flags: string[] } {
  let m = 1.0
  const flags: string[] = []

  // If user declared mileage differs from MOT even within "allowed" range,
  // apply a micro-penalty. They edited the prefill — that's a trust signal.
  if (
    vp.motAnalysis.latestMileage != null &&
    vp.userDeclaredMileage !== vp.motAnalysis.latestMileage &&
    !vp.mileageDiscrepancy // Not already penalised by the discrepancy scaler
  ) {
    const drift = Math.abs(vp.userDeclaredMileage - vp.motAnalysis.latestMileage)
    if (drift > 500) {
      m *= 0.99
      flags.push(`Mileage edited from MOT prefill (Δ${drift.toLocaleString()} mi) — trust penalty`)
    }
  }

  // "Excellent" condition on old diesel / high-mileage = suspicious claim
  if (condition === 'excellent') {
    if (vehicleAge >= 12) {
      m *= 0.97 // Equivalent to downgrading toward "good"
      flags.push('Excellent condition claim on 12+ year vehicle — auto-discounted')
    } else if (vehicleAge >= 8 && vp.fuel === 'diesel') {
      m *= 0.98
      flags.push('Excellent condition claim on older diesel — auto-discounted')
    } else if (vp.resolvedMileage > 100000) {
      m *= 0.98
      flags.push('Excellent condition claim on 100k+ mileage vehicle — auto-discounted')
    }
  }

  // "Excellent" with multiple MOT advisories = contradiction
  if (condition === 'excellent' && vp.motAnalysis.advisoryCount >= 5) {
    m *= 0.97
    flags.push('Excellent condition contradicts 5+ MOT advisories — auto-discounted')
  }

  return { multiplier: m, flags }
}

// ── Liability overrides — explicit hard rule gates ──────────────────────────

/**
 * Predictable, explainable overrides independent of multiplier math.
 * These are the "laws" of the engine — non-negotiable.
 */
function applyLiabilityOverrides(
  vp: VehicleProfile,
  reconEstimate: number,
  tradeBase: number,
  flags: string[]
): { blocked: boolean; manualReview: boolean } {
  let blocked = false
  let manualReview = false

  // RULE 1: Rollback → always blocked (already handled by quoteMode, belt-and-suspenders)
  if (vp.motAnalysis.mileageConsistency === 'rollback_detected') {
    blocked = true
    // Flag already pushed by consistency multiplier
  }

  // RULE 2: Structural 4+ AND MOT expired → blocked
  if (
    (vp.motAnalysis.structuralAdvisoryCount ?? 0) >= 4 &&
    vp.motAnalysis.motExpired
  ) {
    blocked = true
    flags.push('BLOCKED: 4+ structural advisories + expired MOT → liability')
  }

  // RULE 3: Recon estimate > 18% of trade base → manual review
  if (tradeBase > 0 && reconEstimate / tradeBase > 0.18) {
    manualReview = true
    flags.push(`Recon estimate exceeds 18% of trade base (${Math.round(reconEstimate / tradeBase * 100)}%) — manual review`)
  }

  // RULE 4: Dangerous defects present → manual review
  if (vp.motAnalysis.dangerousDefects) {
    manualReview = true
    flags.push('Dangerous defect in history — manual review required')
  }

  // RULE 5: SORN + expired MOT = not roadworthy at all → blocked
  if (vp.sornRegistered && vp.motAnalysis.motExpired) {
    blocked = true
    flags.push('BLOCKED: SORN + expired MOT → vehicle not roadworthy')
  }

  return { blocked, manualReview }
}

// ── Customer-facing explanation builder ──────────────────────────────────────

/**
 * Generate 3–5 neutral, customer-safe explanation bullets.
 *
 * Rules: NEVER use words like "fraud", "rollback", "gaming", "suspicious",
 * "blocked", "liability". Customers should understand the range, not feel accused.
 */
function buildCustomerExplanation(
  vp: VehicleProfile, condition: Condition, fuel: FuelType,
  vehicleAge: number, volatility: Volatility, matchQuality: MarketMatchQuality,
  reconEstimate: number, motMult: number, mileageMult: number, fuelMult: number,
  ulezMult: number, consistencyMult: number, sornMult: number, quoteMode: QuoteMode
): QuoteExplanation {
  const bullets: string[] = []

  // Age
  if (vehicleAge <= 3) {
    bullets.push('Recent model year helps your valuation.')
  } else if (vehicleAge >= 10) {
    bullets.push('Older vehicles typically attract lower offers due to wear expectations.')
  }

  // Mileage
  if (mileageMult < 0.95) {
    bullets.push('Higher-than-average mileage for this vehicle\'s age has been factored in.')
  } else if (mileageMult > 1.0) {
    bullets.push('Lower-than-average mileage supports a stronger offer.')
  }

  // MOT / repair expectations
  if (reconEstimate > 500) {
    bullets.push('Expected service and repair costs have been considered.')
  } else if (motMult < 0.97) {
    bullets.push('MOT status has been factored into the valuation.')
  }

  // Fuel type
  if (fuel === 'diesel' && vehicleAge > 5) {
    bullets.push('Diesel vehicles of this age have lower market demand currently.')
  } else if (fuel === 'electric' && vehicleAge > 6) {
    bullets.push('Battery technology age has been considered in the valuation.')
  } else if (fuel === 'hybrid') {
    bullets.push('Hybrid vehicles enjoy strong current demand.')
  }

  // ULEZ
  if (ulezMult < 1.0) {
    bullets.push('Emissions compliance affects demand in some regions.')
  }

  // Market data quality
  if (matchQuality === 'partial' || matchQuality === 'year_fuzzy') {
    bullets.push('Limited market data for this exact specification — range may be wider.')
  }

  // Volatility
  if (volatility === 'volatile') {
    bullets.push('This market segment is experiencing price fluctuations.')
  }

  // SORN
  if (sornMult < 1.0) {
    bullets.push('The vehicle\'s current registration status has been factored in.')
  }

  // Mileage consistency
  if (consistencyMult < 0.98) {
    bullets.push('Mileage records require further verification at inspection.')
  }

  // Condition
  if (condition === 'poor') {
    bullets.push('Condition assessment suggests significant reconditioning may be needed.')
  } else if (condition === 'fair') {
    bullets.push('Some reconditioning may be needed based on the condition described.')
  }

  // Manual review mode
  if (quoteMode === 'manual_review') {
    bullets.push('A specialist will confirm this valuation at your appointment.')
  }

  // Cap at 5 bullets
  const selected = bullets.slice(0, 5)

  // If somehow empty, add a default
  if (selected.length === 0) {
    selected.push('Your offer is based on current market conditions for this vehicle.')
  }

  const summary = quoteMode === 'manual_review'
    ? 'This vehicle needs a specialist review to finalise the offer.'
    : 'Your offer range is based on market data, vehicle history, and condition.'

  return { bullets: selected, summary }
}

// ── Admin-facing deep explanation builder ────────────────────────────────────

function buildAdminExplanation(
  vp: VehicleProfile, condition: Condition, vehicleAge: number,
  fuel: FuelType, volatility: Volatility, matchQuality: MarketMatchQuality,
  reconEstimate: number, tradeBase: number,
  motMult: number, fuelMult: number, mileageMult: number,
  consistencyMult: number, ulezMult: number, inputTrustMult: number,
  marketConfMult: number, keeperMult: number, sornMult: number,
  reconMult: number,
  liabilityResult: { blocked: boolean; manualReview: boolean }
): AdminExplanationItem[] {
  const items: AdminExplanationItem[] = []

  // Age
  if (vehicleAge > 10) {
    items.push({ rule: 'AGE_10PLUS', severity: 'warning', description: `Vehicle age ${vehicleAge}yr — deep depreciation curve`, impact: `age floor hit` })
  } else if (vehicleAge > 7) {
    items.push({ rule: 'AGE_7PLUS', severity: 'info', description: `Vehicle age ${vehicleAge}yr — mid depreciation`, impact: `${((1 - mileageMult) * 100).toFixed(0)}%` })
  }

  // Mileage
  if (mileageMult < 0.90) {
    items.push({ rule: 'MILEAGE_EXCESS', severity: 'warning', description: `Mileage multiplier ${mileageMult} — significantly over expected`, impact: `-${((1 - mileageMult) * 100).toFixed(0)}%` })
  } else if (mileageMult < 1.0) {
    items.push({ rule: 'MILEAGE_HIGH', severity: 'info', description: `Mileage multiplier ${mileageMult}`, impact: `-${((1 - mileageMult) * 100).toFixed(0)}%` })
  }

  // MOT
  if (vp.motAnalysis.motExpired) {
    items.push({ rule: 'MOT_EXPIRED', severity: 'critical', description: 'MOT expired — inspection cost + risk', impact: `-${((1 - motMult) * 100).toFixed(0)}%` })
  } else if (motMult < 0.95) {
    items.push({ rule: 'MOT_RISK', severity: 'warning', description: `MOT multiplier ${motMult} — advisories/failures`, impact: `-${((1 - motMult) * 100).toFixed(0)}%` })
  }

  // Structural
  if (vp.motAnalysis.structuralAdvisories) {
    items.push({ rule: 'STRUCTURAL', severity: 'critical', description: `${vp.motAnalysis.structuralAdvisoryCount} structural/corrosion advisories`, impact: `structural penalty` })
  }

  // Dangerous
  if (vp.motAnalysis.dangerousDefects) {
    items.push({ rule: 'DANGEROUS_DEFECT', severity: 'critical', description: 'Dangerous defect recorded in MOT history', impact: 'manual_review' })
  }

  // Rollback
  if (vp.motAnalysis.mileageConsistency === 'rollback_detected') {
    items.push({ rule: 'ROLLBACK', severity: 'critical', description: `Mileage rollback detected (${vp.motAnalysis.rollbackAmount?.toLocaleString()} mi)`, impact: 'blocked' })
  } else if (vp.motAnalysis.mileageConsistency === 'suspicious') {
    items.push({ rule: 'SUSPICIOUS_MILEAGE', severity: 'warning', description: 'Mileage pattern irregular', impact: `-${((1 - consistencyMult) * 100).toFixed(0)}%` })
  }

  // Discrepancy
  if (vp.mileageDiscrepancy) {
    items.push({ rule: 'MILEAGE_DISCREPANCY', severity: 'warning', description: `User mileage differs from MOT by ${Math.abs(vp.mileageDiscrepancyAmount).toLocaleString()} mi`, impact: `consistency penalty` })
  }

  // Recon
  if (reconEstimate > 0) {
    items.push({
      rule: 'RECON_ESTIMATE',
      severity: reconEstimate > 1500 ? 'critical' : reconEstimate > 500 ? 'warning' : 'info',
      description: `Estimated recon: £${reconEstimate.toLocaleString()} (${Math.round(reconEstimate / tradeBase * 100)}% of trade base)`,
      impact: `£${reconEstimate.toLocaleString()} recon`,
    })
  }

  // Fuel
  if (fuel === 'electric' && vehicleAge > 8) {
    items.push({ rule: 'EV_BATTERY_8PLUS', severity: 'warning', description: `EV battery ${vehicleAge}yr — 0.85 multiplier`, impact: '-15%' })
  } else if (fuel === 'electric' && vehicleAge > 6) {
    items.push({ rule: 'EV_BATTERY_MID', severity: 'info', description: `EV battery ${vehicleAge}yr — degradation risk`, impact: `-${((1 - fuelMult) * 100).toFixed(0)}%` })
  } else if (fuel === 'diesel' && fuelMult < 1.0) {
    items.push({ rule: 'DIESEL_SOFTNESS', severity: 'info', description: `Diesel market softness (${vehicleAge > 5 ? '>5yr' : '≤5yr'})`, impact: `-${((1 - fuelMult) * 100).toFixed(0)}%` })
  }

  // ULEZ
  if (ulezMult < 1.0) {
    items.push({ rule: 'ULEZ_NON_COMPLIANT', severity: 'info', description: 'Non-ULEZ compliant', impact: '-5%' })
  }

  // SORN
  if (sornMult < 1.0) {
    items.push({ rule: 'SORN', severity: 'warning', description: 'SORN registered', impact: '-10%' })
  }

  // Input trust
  if (inputTrustMult < 1.0) {
    items.push({ rule: 'INPUT_TRUST', severity: 'info', description: `Input trust model penalty (${inputTrustMult})`, impact: `-${((1 - inputTrustMult) * 100).toFixed(1)}%` })
  }

  // Market confidence
  if (marketConfMult < 1.0) {
    items.push({ rule: 'MARKET_MATCH_WEAK', severity: 'info', description: `Market match: ${matchQuality} (confidence ${marketConfMult})`, impact: `-${((1 - marketConfMult) * 100).toFixed(1)}%` })
  }

  // Keeper
  if (keeperMult < 1.0) {
    items.push({ rule: 'KEEPER_FLIP', severity: 'info', description: 'Recent keeper change on older vehicle', impact: '-2%' })
  }

  // Volatility
  if (volatility === 'volatile') {
    items.push({ rule: 'VOLATILE_MARKET', severity: 'warning', description: 'Volatile market segment', impact: '-5%' })
  }

  // Liability overrides
  if (liabilityResult.blocked) {
    items.push({ rule: 'LIABILITY_BLOCKED', severity: 'critical', description: 'Hard rule gate triggered — vehicle blocked', impact: 'blocked' })
  } else if (liabilityResult.manualReview) {
    items.push({ rule: 'LIABILITY_REVIEW', severity: 'warning', description: 'Liability override triggered manual review', impact: 'manual_review' })
  }

  return items
}

// ── Profit simulation builder ───────────────────────────────────────────────

const SELL_COST_PCT = 0.05  // 5% auction/prep/transport

function buildProfitSimulation(
  estimatedRetail: number, reconEstimate: number,
  min: number, max: number, midpoint: number,
  quoteMode: QuoteMode
): ProfitSimulation {
  const sellCost = Math.round(estimatedRetail * SELL_COST_PCT)
  const netRetail = estimatedRetail - sellCost

  const expectedProfitMin = netRetail - reconEstimate - max  // worst case: paid max
  const expectedProfitMid = netRetail - reconEstimate - midpoint
  const expectedProfitMax = netRetail - reconEstimate - min  // best case: paid min

  let band: ProfitRiskBand = 'green'
  if (expectedProfitMid < 300) band = 'amber'
  if (expectedProfitMid < 0) band = 'red'

  const guardrailTriggered = quoteMode !== 'blocked' && expectedProfitMid < 300
  const guardrailReason = guardrailTriggered
    ? `Expected profit £${expectedProfitMid} < £300 threshold`
    : null

  return {
    estimatedRetail,
    sellCostPct: SELL_COST_PCT,
    reconEstimate: Math.round(reconEstimate),
    expectedProfitMin: Math.round(expectedProfitMin),
    expectedProfitMid: Math.round(expectedProfitMid),
    expectedProfitMax: Math.round(expectedProfitMax),
    profitRiskBand: band,
    guardrailTriggered,
    guardrailReason,
  }
}

// ── Utilities ──────────────────────────────────────────────────────────────────

function roundToNearest50(n: number): number {
  return Math.round(n / 50) * 50
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000
}
