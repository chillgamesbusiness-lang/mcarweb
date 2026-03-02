/**
 * Segment Pricing — Vehicle segment detection + segment-specific adjustments.
 *
 * Detects vehicle segment (diesel, EV, 10yr+, region) and returns
 * segment-specific multiplier overlays + volatility heat classification.
 *
 * These sit on top of the base pricing engine multipliers — they don't replace
 * them. They tighten or loosen where the base model is known to be weak
 * for specific vehicle segments.
 *
 * Phase 4 deliverable: volatility heat map + segment coefficients.
 */

import type { FuelType, Volatility, MarketMatchQuality } from '@/lib/types'
import { extractPostcodePrefix } from '@/lib/regionPricing'

// ── Types ──────────────────────────────────────────────────────────────────────

export type VehicleSegment =
  | 'petrol_standard'
  | 'diesel_modern'     // ≤5yr diesel
  | 'diesel_aging'      // 6-10yr diesel
  | 'diesel_old'        // >10yr diesel
  | 'ev_young'          // ≤4yr EV
  | 'ev_mid'            // 5-7yr EV
  | 'ev_aging'          // 8+yr EV
  | 'hybrid'
  | 'high_age'          // >10yr any fuel

export type RegionBand = 'london' | 'south_east' | 'midlands' | 'north' | 'scotland_wales_ni'

export type HeatLevel = 'cool' | 'warm' | 'hot'

export interface SegmentProfile {
  segment: VehicleSegment
  regionBand: RegionBand
  heatLevel: HeatLevel
  /** Overlay multiplier: <1 = tighter pricing, >1 = more generous */
  segmentMultiplier: number
  /** Extra spread percentage to add (0-0.05 = 0%-5% of value) */
  extraSpreadPct: number
  /** Whether this segment should auto-trigger manual review */
  forceManualReview: boolean
  /** Human-readable risk note */
  note: string
}

// ── Segment detection ──────────────────────────────────────────────────────────

export function detectSegment(
  fuel: FuelType,
  vehicleAge: number
): VehicleSegment {
  if (fuel === 'electric') {
    if (vehicleAge <= 4) return 'ev_young'
    if (vehicleAge <= 7) return 'ev_mid'
    return 'ev_aging'
  }
  if (fuel === 'hybrid') return 'hybrid'
  if (fuel === 'diesel') {
    if (vehicleAge <= 5) return 'diesel_modern'
    if (vehicleAge <= 10) return 'diesel_aging'
    return 'diesel_old'
  }
  if (vehicleAge > 10) return 'high_age'
  return 'petrol_standard'
}

// ── Region band detection ──────────────────────────────────────────────────────

const LONDON_PREFIXES = new Set(['E', 'EC', 'N', 'NW', 'SE', 'SW', 'W', 'WC'])
const SE_PREFIXES = new Set([
  'RH', 'TN', 'GU', 'BN', 'ME', 'CT', 'DA', 'SS', 'CM', 'CO',
  'BR', 'CR', 'KT', 'SM', 'SL', 'HP', 'AL', 'EN', 'HA', 'UB', 'TW',
  'WD', 'IG', 'RM', 'SG', 'LU', 'CB', 'MK', 'OX', 'RG', 'PO', 'SO',
])
const MIDLANDS_PREFIXES = new Set([
  'B', 'CV', 'WS', 'WV', 'DY', 'DE', 'NG', 'LE', 'NN', 'ST', 'TF', 'PE', 'LN', 'IP', 'NR', 'WR', 'HR',
])
const NORTH_PREFIXES = new Set([
  'M', 'L', 'WA', 'WN', 'BL', 'OL', 'SK', 'CW', 'CH', 'PR', 'BB', 'FY', 'LA', 'CA',
  'LS', 'BD', 'HG', 'YO', 'HU', 'DN', 'S', 'HD', 'WF', 'NE', 'SR', 'DH', 'DL', 'TS', 'HX',
])

export function detectRegionBand(postcode: string): RegionBand {
  const prefix = extractPostcodePrefix(postcode)
  if (LONDON_PREFIXES.has(prefix)) return 'london'
  if (SE_PREFIXES.has(prefix)) return 'south_east'
  if (MIDLANDS_PREFIXES.has(prefix)) return 'midlands'
  if (NORTH_PREFIXES.has(prefix)) return 'north'
  return 'scotland_wales_ni'
}

// ── Volatility heat map ────────────────────────────────────────────────────────

/**
 * Heat level combines market volatility + segment risk + region liquidity.
 *
 * Hot = volatile market + illiquid segment + weak region
 * Warm = moderate volatility or moderate risk segment
 * Cool = stable market + liquid segment + strong region
 */
export function computeHeatLevel(
  segment: VehicleSegment,
  regionBand: RegionBand,
  volatility: Volatility,
  matchQuality: MarketMatchQuality
): HeatLevel {
  let heat = 0

  // Market volatility contribution
  if (volatility === 'volatile') heat += 3
  else if (volatility === 'moderate') heat += 1

  // Segment risk contribution
  const segmentHeat: Record<VehicleSegment, number> = {
    petrol_standard: 0,
    hybrid: 0,
    diesel_modern: 1,
    ev_young: 1,
    diesel_aging: 2,
    ev_mid: 2,
    diesel_old: 3,
    ev_aging: 3,
    high_age: 2,
  }
  heat += segmentHeat[segment]

  // Region liquidity: London/SE = liquid, North/Scotland = illiquid
  const regionHeat: Record<RegionBand, number> = {
    london: 0,
    south_east: 0,
    midlands: 1,
    north: 2,
    scotland_wales_ni: 2,
  }
  heat += regionHeat[regionBand]

  // Weak market match adds uncertainty
  if (matchQuality === 'partial' || matchQuality === 'none') heat += 2
  else if (matchQuality === 'year_fuzzy') heat += 1

  if (heat >= 6) return 'hot'
  if (heat >= 3) return 'warm'
  return 'cool'
}

// ── Segment-specific coefficient overlays ──────────────────────────────────────

/**
 * Returns a segment profile with multiplier adjustments.
 *
 * These are conservative: they tighten pricing on high-risk segments
 * and slightly loosen on low-risk segments where the base engine
 * is known to be too harsh (e.g. young hybrids).
 */
export function getSegmentProfile(
  fuel: FuelType,
  vehicleAge: number,
  postcode: string,
  volatility: Volatility,
  matchQuality: MarketMatchQuality
): SegmentProfile {
  const segment = detectSegment(fuel, vehicleAge)
  const regionBand = detectRegionBand(postcode)
  const heatLevel = computeHeatLevel(segment, regionBand, volatility, matchQuality)

  // Base segment adjustments (data-informed defaults)
  const SEGMENT_CONFIG: Record<VehicleSegment, {
    multiplier: number
    extraSpread: number
    forceReview: boolean
    note: string
  }> = {
    petrol_standard: {
      multiplier: 1.00,
      extraSpread: 0,
      forceReview: false,
      note: 'Standard petrol — no segment adjustment',
    },
    hybrid: {
      multiplier: 1.01,
      extraSpread: 0,
      forceReview: false,
      note: 'Hybrid demand strong — slight uplift',
    },
    diesel_modern: {
      multiplier: 0.99,
      extraSpread: 0.01,
      forceReview: false,
      note: 'Modern diesel — mild demand softness',
    },
    diesel_aging: {
      multiplier: 0.97,
      extraSpread: 0.02,
      forceReview: false,
      note: 'Aging diesel (6-10yr) — accelerating depreciation + emissions risk',
    },
    diesel_old: {
      multiplier: 0.94,
      extraSpread: 0.03,
      forceReview: false,
      note: 'Old diesel (10yr+) — illiquid, ULEZ risk, high recon probability',
    },
    ev_young: {
      multiplier: 1.00,
      extraSpread: 0.01,
      forceReview: false,
      note: 'Young EV — stable but volatile pricing segment',
    },
    ev_mid: {
      multiplier: 0.97,
      extraSpread: 0.02,
      forceReview: false,
      note: 'Mid-age EV (5-7yr) — battery uncertainty emerging',
    },
    ev_aging: {
      multiplier: 0.93,
      extraSpread: 0.04,
      forceReview: true,
      note: 'Aging EV (8yr+) — battery pack anxiety, low trader demand',
    },
    high_age: {
      multiplier: 0.97,
      extraSpread: 0.02,
      forceReview: false,
      note: 'High age vehicle (10yr+) — limited buyer pool',
    },
  }

  const config = SEGMENT_CONFIG[segment]

  // Regional overlay: illiquid regions tighten further for hot segments
  let regionOverlay = 1.0
  if (heatLevel === 'hot') {
    if (regionBand === 'scotland_wales_ni') regionOverlay = 0.98
    else if (regionBand === 'north') regionOverlay = 0.99
  }

  return {
    segment,
    regionBand,
    heatLevel,
    segmentMultiplier: Math.round(config.multiplier * regionOverlay * 10000) / 10000,
    extraSpreadPct: config.extraSpread,
    forceManualReview: config.forceReview,
    note: config.note,
  }
}

// ── Heat map summary (for dashboard display) ────────────────────────────────────

export interface HeatMapEntry {
  segment: VehicleSegment
  region: RegionBand
  heat: HeatLevel
  multiplier: number
  note: string
}

/**
 * Generate a full heat map grid for the dashboard.
 * Returns all segment × region combinations with their heat levels.
 */
export function generateHeatMap(
  volatility: Volatility = 'moderate',
  matchQuality: MarketMatchQuality = 'exact'
): HeatMapEntry[] {
  const segments: VehicleSegment[] = [
    'petrol_standard', 'diesel_modern', 'diesel_aging', 'diesel_old',
    'ev_young', 'ev_mid', 'ev_aging', 'hybrid', 'high_age',
  ]
  const regions: RegionBand[] = [
    'london', 'south_east', 'midlands', 'north', 'scotland_wales_ni',
  ]

  // Representative fuel/age for each segment
  const segmentParams: Record<VehicleSegment, { fuel: FuelType; age: number }> = {
    petrol_standard: { fuel: 'petrol', age: 5 },
    diesel_modern: { fuel: 'diesel', age: 3 },
    diesel_aging: { fuel: 'diesel', age: 8 },
    diesel_old: { fuel: 'diesel', age: 13 },
    ev_young: { fuel: 'electric', age: 2 },
    ev_mid: { fuel: 'electric', age: 6 },
    ev_aging: { fuel: 'electric', age: 9 },
    hybrid: { fuel: 'hybrid', age: 5 },
    high_age: { fuel: 'petrol', age: 12 },
  }

  // Representative postcode per region
  const regionPostcodes: Record<RegionBand, string> = {
    london: 'SW1A',
    south_east: 'GU1',
    midlands: 'B1',
    north: 'M1',
    scotland_wales_ni: 'EH1',
  }

  const entries: HeatMapEntry[] = []
  for (const seg of segments) {
    const params = segmentParams[seg]
    for (const reg of regions) {
      const pc = regionPostcodes[reg]
      const profile = getSegmentProfile(params.fuel, params.age, pc, volatility, matchQuality)
      entries.push({
        segment: seg,
        region: reg,
        heat: profile.heatLevel,
        multiplier: profile.segmentMultiplier,
        note: profile.note,
      })
    }
  }
  return entries
}
