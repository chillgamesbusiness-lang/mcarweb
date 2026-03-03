/**
 * TCO Model — Total Cost of Ownership for pre-sale preparation.
 *
 * Estimates the true cost of getting a vehicle ready for resale, beyond
 * the basic recon estimate from the pricing engine. Factors in:
 *
 *   - Maintenance catch-up (service, brakes, tyres based on mileage/age)
 *   - MOT preparation costs (advisory-driven)
 *   - Cosmetic preparation (paint, interior, wheels)
 *   - Administrative costs (V5C transfer, HPI check etc.)
 *
 * This feeds into the v4 profit simulation as an additional cost layer
 * that makes profit estimates more realistic.
 */

import type { VehicleSegment } from '@/lib/segmentPricing'
import type { Condition, FuelType } from '@/lib/types'

// ── Types ──────────────────────────────────────────────────────────────────────

export interface TCOBreakdown {
  // Maintenance catch-up
  serviceCostGBP: number          // overdue service
  brakeCostGBP: number            // brake pads/discs based on mileage
  tyreCostGBP: number             // tyre replacement estimate
  // MOT prep
  motPrepCostGBP: number          // fixes for known advisories
  // Cosmetic
  cosmeticCostGBP: number         // paint touch-up, interior, wheels
  // Admin
  adminCostGBP: number            // V5C, HPI check, fuel for transport
  // Totals
  totalGBP: number
  totalAsPctOfValue: number       // as % of adjusted value
  breakdown: string[]             // human-readable lines
  riskNote: string | null         // warning if TCO is high relative to value
}

export interface TCOInput {
  mileage: number
  year: number
  fuel: FuelType
  condition: Condition
  segment: VehicleSegment
  adjustedValue: number
  reconEstimate: number           // existing recon estimate (we extend, not replace)
  advisoryCount: number           // from MOT data
  structuralAdvisoryCount: number
  brakeAdvisories: boolean
  motExpired: boolean
}

// ── Constants ──────────────────────────────────────────────────────────────────

const CURRENT_YEAR = new Date().getFullYear()

// Service intervals by fuel type (miles)
const SERVICE_INTERVAL: Record<FuelType, number> = {
  petrol: 12_000,
  diesel: 12_000,
  hybrid: 15_000,
  electric: 20_000,
}

// Average service cost by fuel type
const SERVICE_COST_BASE: Record<FuelType, number> = {
  petrol: 180,
  diesel: 210,
  hybrid: 200,
  electric: 120,
}

// Tyre costs (set of 4) by segment
const TYRE_SET_COST: Partial<Record<VehicleSegment, number>> = {
  petrol_standard: 280,
  diesel_modern: 300,
  diesel_aging: 300,
  diesel_old: 300,
  high_age: 280,
  ev_aging: 380,     // EVs use specialist tyres
  ev_mid: 350,
  ev_young: 320,
  hybrid: 310,
}
const TYRE_DEFAULT = 300

// Brake costs (pads + discs) by mileage band
const BRAKE_COST_BY_MILEAGE: { maxMiles: number; cost: number }[] = [
  { maxMiles: 30_000, cost: 0 },      // likely OK
  { maxMiles: 60_000, cost: 120 },     // pads probably
  { maxMiles: 90_000, cost: 250 },     // pads + front discs
  { maxMiles: 150_000, cost: 400 },    // full brake overhaul
  { maxMiles: Infinity, cost: 500 },   // assume worst
]

// Cosmetic cost by condition
const COSMETIC_BY_CONDITION: Record<Condition, number> = {
  excellent: 50,    // minor detail
  good: 150,        // touch-up paint, interior clean
  fair: 350,        // bodywork, wheels, deep clean
  poor: 600,        // significant cosmetic work
}

// Admin fixed costs
const ADMIN_BASE = 85 // V5C transfer + HPI + fuel

// ── Main function ──────────────────────────────────────────────────────────────

export function estimateTCO(input: TCOInput): TCOBreakdown {
  const breakdown: string[] = []
  const age = CURRENT_YEAR - input.year

  // ── 1. Service catch-up ────────────────────────────────────────────────
  // Estimate if service is overdue based on mileage vs expected interval
  const serviceInterval = SERVICE_INTERVAL[input.fuel]
  const expectedServices = Math.floor(input.mileage / serviceInterval)
  // Assume last service was done at last interval — cost is for the next one
  const serviceBase = SERVICE_COST_BASE[input.fuel]
  // Older cars: add 20% for age-related parts
  const serviceAgePremium = age > 8 ? 1.2 : age > 5 ? 1.1 : 1.0
  const serviceCostGBP = Math.round(serviceBase * serviceAgePremium * (input.condition === 'poor' ? 1.3 : 1.0))
  breakdown.push(`Service catch-up: £${serviceCostGBP} (${input.fuel}, ${age}yr, ~${expectedServices} expected services)`)

  // ── 2. Brakes ──────────────────────────────────────────────────────────
  let brakeCostGBP = BRAKE_COST_BY_MILEAGE.find(b => input.mileage <= b.maxMiles)?.cost ?? 500
  // If MOT has brake advisories, add £100
  if (input.brakeAdvisories) {
    brakeCostGBP += 100
    breakdown.push(`Brakes: £${brakeCostGBP} (${(input.mileage / 1000).toFixed(0)}k miles + brake advisories)`)
  } else {
    breakdown.push(`Brakes: £${brakeCostGBP} (${(input.mileage / 1000).toFixed(0)}k miles)`)
  }

  // ── 3. Tyres ───────────────────────────────────────────────────────────
  // Estimate tyre replacement need based on mileage
  // Average tyre life: ~25,000 miles. If high mileage, likely needs at least 2.
  const tyreSetCost = TYRE_SET_COST[input.segment] ?? TYRE_DEFAULT
  let tyreCostGBP = 0
  if (input.mileage > 80_000) {
    tyreCostGBP = tyreSetCost                // full set
  } else if (input.mileage > 40_000) {
    tyreCostGBP = Math.round(tyreSetCost / 2) // 2 tyres
  } else if (input.condition === 'fair' || input.condition === 'poor') {
    tyreCostGBP = Math.round(tyreSetCost / 2) // 2 tyres for condition
  }
  if (tyreCostGBP > 0) {
    breakdown.push(`Tyres: £${tyreCostGBP}`)
  }

  // ── 4. MOT prep ────────────────────────────────────────────────────────
  let motPrepCostGBP = 0
  if (input.motExpired) {
    motPrepCostGBP += 100 // MOT booking + likely minor fixes
    breakdown.push('MOT prep: £100 (expired — needs rebooking + likely fixes)')
  }
  if (input.advisoryCount > 0) {
    // Assume ~£60 per advisory on average for fixes
    const advisoryFixCost = Math.min(input.advisoryCount * 60, 500)
    motPrepCostGBP += advisoryFixCost
    breakdown.push(`Advisory fixes: £${advisoryFixCost} (${input.advisoryCount} advisories)`)
  }
  if (input.structuralAdvisoryCount > 0) {
    const structuralCost = input.structuralAdvisoryCount * 150
    motPrepCostGBP += structuralCost
    breakdown.push(`Structural repairs: £${structuralCost} (${input.structuralAdvisoryCount} structural advisories)`)
  }

  // ── 5. Cosmetic ────────────────────────────────────────────────────────
  const cosmeticCostGBP = COSMETIC_BY_CONDITION[input.condition]
  breakdown.push(`Cosmetic prep: £${cosmeticCostGBP} (${input.condition} condition)`)

  // ── 6. Admin ───────────────────────────────────────────────────────────
  const adminCostGBP = ADMIN_BASE
  breakdown.push(`Admin & logistics: £${adminCostGBP}`)

  // ── Total ──────────────────────────────────────────────────────────────
  const totalGBP = serviceCostGBP + brakeCostGBP + tyreCostGBP + motPrepCostGBP + cosmeticCostGBP + adminCostGBP
  const totalAsPctOfValue = input.adjustedValue > 0 ? Math.round((totalGBP / input.adjustedValue) * 1000) / 10 : 0

  breakdown.push(`─────────────────────`)
  breakdown.push(`Total TCO prep: £${totalGBP} (${totalAsPctOfValue.toFixed(1)}% of value)`)

  // Risk note if TCO is high relative to value
  let riskNote: string | null = null
  if (totalAsPctOfValue > 25) {
    riskNote = `⚠ TCO prep cost is ${totalAsPctOfValue.toFixed(0)}% of vehicle value — likely uneconomical`
  } else if (totalAsPctOfValue > 15) {
    riskNote = `⚠ TCO prep cost is ${totalAsPctOfValue.toFixed(0)}% of value — margin pressure expected`
  }

  return {
    serviceCostGBP,
    brakeCostGBP,
    tyreCostGBP,
    motPrepCostGBP,
    cosmeticCostGBP,
    adminCostGBP,
    totalGBP,
    totalAsPctOfValue,
    breakdown,
    riskNote,
  }
}
