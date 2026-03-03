/**
 * Spec Similarity Engine — Compares "this car" vs market comps.
 *
 * Builds a spec vector from DVLA/engine data and scores each comp listing
 * against it. Only comps above the similarity threshold are kept.
 *
 * Similarity dimensions (weights sum to 1.0):
 *   Make+Model exact:  0.35
 *   Year distance:     0.10
 *   Fuel exact:        0.10
 *   Engine size:       0.10
 *   Mileage proximity: 0.20
 *   ULEZ match:        0.10
 *   Region proximity:  0.05
 *
 * Adjustment rules:
 *   When a comp differs, apply delta adjustments using the engine's
 *   own mileage/age curves so the comp price is "normalised" to
 *   the subject vehicle's spec.
 */

import type { CompListing } from '@/lib/providers/providerTypes'

// ── Types ──────────────────────────────────────────────────────────────────────

export interface SpecVector {
  make: string
  model: string
  year: number
  fuel: string
  engineCC: number | null
  mileage: number
  ulezCompliant: boolean
  colour: string | null
  regionBand: string | null
}

export interface ScoredComp {
  listing: CompListing
  similarity: number          // 0–1
  normalisedPrice: number     // price adjusted for spec differences
  adjustments: string[]       // human-readable adjustment notes
}

export interface SimilarityResult {
  keptComps: ScoredComp[]
  droppedCount: number
  thresholdUsed: number
  normalisedMedian: number | null
  normalisedP25: number | null
  normalisedP75: number | null
}

// ── Weights ────────────────────────────────────────────────────────────────────

const W_MAKE_MODEL = 0.35
const W_YEAR       = 0.10
const W_FUEL       = 0.10
const W_ENGINE     = 0.10
const W_MILEAGE    = 0.20
const W_ULEZ       = 0.10
const W_REGION     = 0.05

// ── Default threshold (lowered if too few comps) ───────────────────────────────

const BASE_THRESHOLD = 0.72
const MIN_THRESHOLD  = 0.50
const MIN_COMPS      = 5

// ── Mileage / age adjustment curves (mirrors pricingEngine) ────────────────────

function mileageFactor(mileage: number, vehicleAge: number): number {
  const expected = vehicleAge * 8000
  const delta = mileage - expected
  if (delta < -20000) return 1.03
  if (delta <= 0) return 1.00
  if (delta <= 10000) return 0.97
  if (delta <= 20000) return 0.94
  if (delta <= 40000) return 0.88
  if (delta <= 60000) return 0.82
  return 0.75
}

function ageFactor(vehicleAge: number): number {
  if (vehicleAge <= 0) return 1.0
  let dep = 0
  for (let y = 1; y <= vehicleAge; y++) {
    if (y <= 3) dep += 0.12
    else if (y <= 7) dep += 0.08
    else if (y <= 12) dep += 0.06
    else dep += 0.02
  }
  return Math.max(0.40, 1 - dep)
}

// ── Similarity scoring ─────────────────────────────────────────────────────────

function scoreSimilarity(spec: SpecVector, comp: CompListing): number {
  let score = 0

  // Make + Model (exact match on make, fuzzy on model)
  const makeMatch = comp.title.toLowerCase().includes(spec.make.toLowerCase())
  const modelMatch = comp.title.toLowerCase().includes(spec.model.toLowerCase())
  if (makeMatch && modelMatch) score += W_MAKE_MODEL
  else if (makeMatch) score += W_MAKE_MODEL * 0.5

  // Year distance: full score at ±0, 80% at ±1, 50% at ±2, 0 at ±4+
  if (comp.year > 0) {
    const yearDist = Math.abs(spec.year - comp.year)
    if (yearDist === 0) score += W_YEAR
    else if (yearDist === 1) score += W_YEAR * 0.8
    else if (yearDist === 2) score += W_YEAR * 0.5
    else if (yearDist === 3) score += W_YEAR * 0.2
  }

  // Fuel match
  if (comp.fuel) {
    if (comp.fuel.toLowerCase() === spec.fuel.toLowerCase()) score += W_FUEL
  } else {
    score += W_FUEL * 0.3 // unknown fuel = partial credit
  }

  // Engine size bucket (within 300cc = good)
  if (comp.engineCC && spec.engineCC) {
    const ccDiff = Math.abs(comp.engineCC - spec.engineCC)
    if (ccDiff <= 100) score += W_ENGINE
    else if (ccDiff <= 300) score += W_ENGINE * 0.7
    else if (ccDiff <= 600) score += W_ENGINE * 0.3
  } else {
    score += W_ENGINE * 0.2 // unknown = low credit
  }

  // Mileage proximity (log distance)
  if (comp.mileage !== null && comp.mileage > 0) {
    const logDist = Math.abs(Math.log(comp.mileage + 1) - Math.log(spec.mileage + 1))
    if (logDist < 0.1) score += W_MILEAGE
    else if (logDist < 0.3) score += W_MILEAGE * 0.8
    else if (logDist < 0.5) score += W_MILEAGE * 0.5
    else if (logDist < 1.0) score += W_MILEAGE * 0.2
  } else {
    score += W_MILEAGE * 0.1 // no mileage data = minimal credit
  }

  // ULEZ (can only check if fuel suggests non-compliance)
  // For now, give full score — we can't know comp ULEZ from listing data
  score += W_ULEZ * 0.5

  // Region (basic: UK-wide comps get partial credit)
  score += W_REGION * 0.5

  return Math.round(score * 1000) / 1000
}

// ── Price normalisation ────────────────────────────────────────────────────────

function normalisePrice(
  spec: SpecVector,
  comp: CompListing,
): { price: number; adjustments: string[] } {
  let price = comp.price
  const adjustments: string[] = []
  const currentYear = new Date().getFullYear()

  // Age adjustment: if comp is different year, adjust
  if (comp.year > 0 && comp.year !== spec.year) {
    const specAgeFactor = ageFactor(currentYear - spec.year)
    const compAgeFactor = ageFactor(currentYear - comp.year)
    if (compAgeFactor > 0) {
      const ratio = specAgeFactor / compAgeFactor
      const oldPrice = price
      price = Math.round(price * ratio)
      adjustments.push(`Age adj: ${comp.year}→${spec.year} (${ratio > 1 ? '+' : ''}${Math.round((ratio - 1) * 100)}%) £${oldPrice}→£${price}`)
    }
  }

  // Mileage adjustment: if comp mileage known and differs significantly
  if (comp.mileage !== null && comp.mileage > 0) {
    const vehicleAge = currentYear - spec.year
    const specMileFactor = mileageFactor(spec.mileage, vehicleAge)
    const compMileFactor = mileageFactor(comp.mileage, vehicleAge)
    if (compMileFactor > 0) {
      const ratio = specMileFactor / compMileFactor
      if (Math.abs(ratio - 1) > 0.02) { // only adjust if >2% difference
        const oldPrice = price
        price = Math.round(price * ratio)
        adjustments.push(`Mileage adj: ${(comp.mileage / 1000).toFixed(0)}k→${(spec.mileage / 1000).toFixed(0)}k (${ratio > 1 ? '+' : ''}${Math.round((ratio - 1) * 100)}%) £${oldPrice}→£${price}`)
      }
    }
  }

  // Diesel > 10yr extra discount on comp if spec is also old diesel
  // (comps may be listed optimistically)
  if (spec.fuel === 'diesel' && (currentYear - spec.year) > 10) {
    const discount = 0.95
    const oldPrice = price
    price = Math.round(price * discount)
    adjustments.push(`Old diesel demand adj: -5% £${oldPrice}→£${price}`)
  }

  return { price, adjustments }
}

// ── Main function ──────────────────────────────────────────────────────────────

export function scoreAndFilterComps(
  spec: SpecVector,
  listings: CompListing[]
): SimilarityResult {
  // Score all listings
  const scored: ScoredComp[] = listings.map(listing => {
    const similarity = scoreSimilarity(spec, listing)
    const { price, adjustments } = normalisePrice(spec, listing)
    return { listing, similarity, normalisedPrice: price, adjustments }
  })

  // Sort by similarity descending
  scored.sort((a, b) => b.similarity - a.similarity)

  // Adaptive threshold: if not enough good comps, lower it
  let threshold = BASE_THRESHOLD
  let kept = scored.filter(s => s.similarity >= threshold)

  while (kept.length < MIN_COMPS && threshold > MIN_THRESHOLD) {
    threshold -= 0.05
    kept = scored.filter(s => s.similarity >= threshold)
  }

  const droppedCount = scored.length - kept.length

  // Compute normalised price stats
  const normPrices = kept.map(c => c.normalisedPrice).sort((a, b) => a - b)
  const normalisedMedian = normPrices.length > 0
    ? normPrices[Math.floor(normPrices.length / 2)]
    : null
  const normalisedP25 = normPrices.length >= 4
    ? normPrices[Math.floor(normPrices.length * 0.25)]
    : normPrices[0] ?? null
  const normalisedP75 = normPrices.length >= 4
    ? normPrices[Math.floor(normPrices.length * 0.75)]
    : normPrices[normPrices.length - 1] ?? null

  return {
    keptComps: kept,
    droppedCount,
    thresholdUsed: threshold,
    normalisedMedian,
    normalisedP25,
    normalisedP75,
  }
}
