/**
 * Mock offer-range calculator.
 *
 * Uses a deterministic formula based on vehicle attributes, mileage, and condition.
 * No randomness — same inputs always produce same outputs.
 */

interface OfferInput {
  vehicle: {
    make: string
    model: string
    year: number
    fuel: string
    transmission: string
  }
  mileage: number
  condition: 'excellent' | 'good' | 'fair' | 'poor'
}

interface OfferRange {
  min: number
  max: number
}

const CONDITION_MULTIPLIER: Record<string, number> = {
  excellent: 1.0,
  good: 0.85,
  fair: 0.7,
  poor: 0.55,
}

const FUEL_BASE: Record<string, number> = {
  petrol: 8000,
  diesel: 8500,
  electric: 12000,
  hybrid: 10000,
}

export function calculateOfferRange(input: OfferInput): OfferRange {
  const currentYear = new Date().getFullYear()
  const age = Math.max(0, currentYear - input.vehicle.year)

  // Base value from fuel type (default 8000)
  const fuelBase = FUEL_BASE[input.vehicle.fuel.toLowerCase()] ?? 8000

  // Depreciate ~6% per year of age (compound), capped at 85% total loss
  const ageFactor = Math.max(0.15, Math.pow(0.94, age))

  // Mileage penalty: lose ~1% per 10k miles, max 40% off
  const mileagePenalty = Math.min(0.4, (input.mileage / 10000) * 0.01)
  const mileageFactor = Math.max(0.6, 1 - mileagePenalty)

  const conditionFactor = CONDITION_MULTIPLIER[input.condition] ?? 0.7

  // Automatic transmission small premium
  const transFactor = input.vehicle.transmission.toLowerCase() === 'automatic' ? 1.05 : 1.0

  const midpoint = Math.round(fuelBase * ageFactor * mileageFactor * conditionFactor * transFactor)

  const SPREAD = 350

  return {
    min: Math.max(200, midpoint - SPREAD),
    max: midpoint + SPREAD,
  }
}
