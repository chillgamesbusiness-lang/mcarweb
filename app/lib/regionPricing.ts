/**
 * Regional pricing adjustments based on UK postcode areas v2.
 *
 * Maps the first 1–2 letters of a postcode to a pricing region,
 * then applies fuel-aware multipliers per spec Part 3 Step 8.
 *
 * v2 changes:
 *  - London diesel split: non-ULEZ = 0.93, ULEZ diesel = 0.98, default = 1.03
 *  - NI at 0.94 (was 0.95)
 *  - Rural/unmatched = 0.98 (was 1.0)
 *  - extractPostcodePrefix exported
 */

import type { FuelType } from '@/lib/types'

// ── Types ──────────────────────────────────────────────────────────────────────

export interface RegionResult {
  region: string
  multiplier: number
  flags: string[]
}

// ── Extract postcode prefix ────────────────────────────────────────────────────

/** Extract alphabetic prefix: "SW1A 1AA" → "SW", "B1 1AA" → "B" */
export function extractPostcodePrefix(postcode: string): string {
  const clean = postcode.toUpperCase().replace(/\s/g, '')
  const match = clean.match(/^([A-Z]{1,2})/)
  return match ? match[1] : ''
}

// ── Prefix sets ────────────────────────────────────────────────────────────────

const LONDON = new Set(['E', 'EC', 'N', 'NW', 'SE', 'SW', 'W', 'WC'])
const SOUTH_EAST = new Set([
  'RH', 'TN', 'GU', 'BN', 'ME', 'CT', 'DA', 'SS', 'CM', 'CO',
  'BR', 'CR', 'KT', 'SM', 'SL', 'HP', 'AL', 'EN', 'HA', 'UB', 'TW',
  'WD', 'IG', 'RM', 'SG', 'LU', 'CB', 'MK', 'OX', 'RG', 'PO', 'SO',
])
const SOUTH_WEST = new Set(['BS', 'BA', 'GL', 'SN', 'SP', 'BH', 'DT', 'EX', 'PL', 'TQ', 'TA', 'TR'])
const MIDLANDS = new Set(['B', 'CV', 'WS', 'WV', 'DY', 'DE', 'NG', 'LE', 'NN', 'MK', 'LU', 'ST', 'TF', 'PE', 'LN', 'IP', 'NR', 'WR', 'HR'])
const NORTH_WEST = new Set(['M', 'L', 'WA', 'WN', 'BL', 'OL', 'SK', 'CW', 'CH', 'PR', 'BB', 'FY', 'LA', 'CA'])
const NORTH_EAST = new Set(['LS', 'BD', 'HG', 'YO', 'HU', 'DN', 'S', 'HD', 'WF', 'NE', 'SR', 'DH', 'DL', 'TS', 'HX'])
const SCOTLAND = new Set(['G', 'EH', 'AB', 'DD', 'KY', 'FK', 'PA', 'ML', 'KA', 'DG', 'IV', 'PH', 'HS', 'ZE', 'TD', 'KW'])
const WALES = new Set(['CF', 'SA', 'NP', 'LL', 'SY', 'LD', 'HR'])
const NI = new Set(['BT'])

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Get the regional pricing multiplier for a postcode.
 *
 * @param postcode - UK postcode (full or area-only)
 * @param fuel - normalised FuelType
 * @param ulezCompliant - whether the vehicle is ULEZ compliant
 */
export function getRegionMultiplier(
  postcode: string,
  fuel: FuelType,
  ulezCompliant: boolean
): RegionResult {
  const prefix = extractPostcodePrefix(postcode)
  const flags: string[] = []

  // London — 3-way diesel split
  if (LONDON.has(prefix)) {
    if (fuel === 'diesel' && !ulezCompliant) {
      flags.push('Diesel non-ULEZ in London — severe demand penalty')
      return { multiplier: 0.93, region: 'London', flags }
    }
    if (fuel === 'diesel') {
      flags.push('Diesel in London — ULEZ-compliant but demand still soft')
      return { multiplier: 0.98, region: 'London', flags }
    }
    return { multiplier: 1.03, region: 'London', flags }
  }

  // South East
  if (SOUTH_EAST.has(prefix)) {
    return { multiplier: 1.02, region: 'South East', flags }
  }

  // South West
  if (SOUTH_WEST.has(prefix)) {
    return { multiplier: 1.00, region: 'South West', flags }
  }

  // Midlands
  if (MIDLANDS.has(prefix)) {
    return { multiplier: 1.00, region: 'Midlands', flags }
  }

  // North West
  if (NORTH_WEST.has(prefix)) {
    return { multiplier: 0.97, region: 'North West', flags }
  }

  // North East / Yorkshire
  if (NORTH_EAST.has(prefix)) {
    return { multiplier: 0.97, region: 'North East / Yorkshire', flags }
  }

  // Scotland
  if (SCOTLAND.has(prefix)) {
    return { multiplier: 0.96, region: 'Scotland', flags }
  }

  // Wales
  if (WALES.has(prefix)) {
    return { multiplier: 0.97, region: 'Wales', flags }
  }

  // Northern Ireland
  if (NI.has(prefix)) {
    flags.push('Northern Ireland — transport logistics apply')
    return { multiplier: 0.94, region: 'Northern Ireland', flags }
  }

  // Rural / unmatched
  flags.push('Limited local demand — transport cost may apply')
  return { multiplier: 0.98, region: 'Other', flags }
}
