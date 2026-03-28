/**
 * Data Cleaning Pipeline — Filters garbage listings + deduplication.
 *
 * Filters applied:
 *  1. price < £500 → discard (trade/salvage/parts)
 *  2. price > £100,000 → discard (prestige/outlier)
 *  3. mileage > 250,000 → discard (data error)
 *  4. missing key fields → discard (price, year required; mileage imputed)
 *  5. duplicate listings → dedupe via title + price fingerprint
 *  6. "from £X" listings → already filtered in scrapers
 *  7. EV vs petrol split → flag for caller
 *  8. Van misclassification → flag Transit/Transporter etc.
 */

import type { RawListing, CleanListing } from '@/lib/liveValuation/types'

// ── Constants ──────────────────────────────────────────────────────────────────

const MIN_PRICE = 500
const MAX_PRICE = 100_000
const MAX_MILEAGE = 250_000
const MIN_YEAR = 1990
const MAX_YEAR = new Date().getFullYear() + 1

// Van models that often appear in car searches
const VAN_MODELS = [
  'TRANSIT', 'TRANSPORTER', 'CADDY', 'BERLINGO', 'PARTNER',
  'DISPATCH', 'RELAY', 'BOXER', 'MASTER', 'MOVANO',
  'SPRINTER', 'CRAFTER', 'VIVARO', 'TRAFIC', 'PROACE',
  'COMBO', 'DUCATO', 'EXPERT',
]

// ── Normalisation helpers ──────────────────────────────────────────────────────

export function normaliseFuel(fuel: string | null): string {
  if (!fuel) return 'UNKNOWN'
  const f = fuel.toUpperCase().trim()
  if (f.includes('ELECTRIC') && !f.includes('HYBRID')) return 'ELECTRIC'
  if (f.includes('HYBRID') || f.includes('PHEV') || f.includes('MHEV')) return 'HYBRID'
  if (f.includes('DIESEL')) return 'DIESEL'
  if (f.includes('PETROL') || f.includes('GASOLINE') || f.includes('UNLEADED')) return 'PETROL'
  return 'UNKNOWN'
}

export function normaliseTransmission(transmission: string | null): string {
  if (!transmission) return 'UNKNOWN'
  const t = transmission.toUpperCase().trim()
  if (t.includes('AUTO') || t.includes('CVT') || t.includes('DSG') || t.includes('PDK') || t.includes('TIPTRONIC')) return 'AUTOMATIC'
  if (t.includes('MANUAL')) return 'MANUAL'
  return 'UNKNOWN'
}

// ── Deduplication ──────────────────────────────────────────────────────────────

function dedupeFingerprint(listing: RawListing): string {
  // Combine normalised title fragment + price to detect duplicates
  const titleKey = listing.title
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 40)
  return `${titleKey}_${listing.price}`
}

// ── Check for van misclassification ────────────────────────────────────────────

function isLikelyVan(title: string): boolean {
  const upper = title.toUpperCase()
  return VAN_MODELS.some(van => upper.includes(van))
}

// ── Main cleaning pipeline ─────────────────────────────────────────────────────

export interface CleaningResult {
  cleaned: CleanListing[]
  discarded: number
  deduped: number
  vanWarnings: number
  fuelSplitWarning: boolean
}

/**
 * Clean raw listings through the data quality pipeline.
 *
 * @param listings Raw listings from scrapers
 * @param expectedFuel Optional fuel filter (e.g. 'PETROL') to separate EV/hybrid
 */
export function cleanListings(
  listings: RawListing[],
  expectedFuel?: string,
): CleaningResult {
  let discarded = 0
  let vanWarnings = 0
  const seen = new Set<string>()
  let deduped = 0
  const cleaned: CleanListing[] = []
  const fuelTypes = new Set<string>()

  for (const raw of listings) {
    // Filter: price bounds
    if (raw.price < MIN_PRICE || raw.price > MAX_PRICE) {
      discarded++
      continue
    }

    // Filter: year bounds
    if (raw.year < MIN_YEAR || raw.year > MAX_YEAR) {
      discarded++
      continue
    }

    // Filter: mileage bounds (if present)
    if (raw.mileage !== null && raw.mileage > MAX_MILEAGE) {
      discarded++
      continue
    }

    // Normalise fuel and transmission
    const fuel = normaliseFuel(raw.fuel)
    const transmission = normaliseTransmission(raw.transmission)

    // Filter: EV/petrol split — only keep matching fuel if specified
    if (expectedFuel) {
      const normExpected = normaliseFuel(expectedFuel)
      if (fuel !== 'UNKNOWN' && fuel !== normExpected) {
        // Don't count as discarded — it's a different vehicle type
        continue
      }
    }

    // Track fuel types for split warning
    if (fuel !== 'UNKNOWN') fuelTypes.add(fuel)

    // Van misclassification check
    if (isLikelyVan(raw.title)) {
      vanWarnings++
      discarded++
      continue
    }

    // Dedup
    const fingerprint = dedupeFingerprint(raw)
    if (seen.has(fingerprint)) {
      deduped++
      continue
    }
    seen.add(fingerprint)

    // Impute mileage as null → use expected mileage downstream
    const mileage = raw.mileage ?? -1 // -1 signals "impute later"

    cleaned.push({
      price: raw.price,
      mileage,
      year: raw.year,
      fuel,
      transmission,
      title: raw.title,
      source: raw.source,
      timestamp: raw.timestamp,
    })
  }

  // Fuel split warning: mixed EV/ICE in results without filter
  const fuelSplitWarning = !expectedFuel && fuelTypes.has('ELECTRIC') && (fuelTypes.has('PETROL') || fuelTypes.has('DIESEL'))

  return { cleaned, discarded, deduped, vanWarnings, fuelSplitWarning }
}
