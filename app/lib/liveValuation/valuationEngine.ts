/**
 * Live Valuation Intelligence Engine — Core module.
 *
 * Deterministic, production-grade valuation that:
 *  1. Scrapes live UK listings (AutoTrader primary, eBay secondary)
 *  2. Cleans, normalises, and deduplicates data
 *  3. Removes outliers via MAD
 *  4. Computes median-based valuation with confidence scoring
 *  5. Applies mileage adjustment
 *  6. Falls back to MARKET_DATA v3 when live data is insufficient
 *  7. Caches results (6h TTL)
 *  8. Applies data freshness scoring
 *
 * Hierarchy: Live data > Cached data > Static dataset (MARKET_DATA v3)
 */

import type { ScraperQuery, RawListing, CleanListing, LiveValuationResult } from '@/lib/liveValuation/types'
import { scrapeAutoTrader } from '@/lib/liveValuation/autotraderScraper'
import { scrapeEbayMotors } from '@/lib/liveValuation/ebayScraper'
import { cleanListings } from '@/lib/liveValuation/dataCleaner'
import { removeOutliers, getMedian, getPercentile, getMAD } from '@/lib/liveValuation/outlierDetection'
import { getCachedValuation, setCachedValuation } from '@/lib/liveValuation/cache'
import { getMarketValue } from '@/lib/marketData'

// ── Constants ──────────────────────────────────────────────────────────────────

const MIN_LISTINGS_FOR_LIVE = 12       // Below this → fallback to MARKET_DATA v3
const CONFIDENCE_FALLBACK_THRESHOLD = 50
const STALE_LISTING_DAYS = 7           // Decay confidence after this
const DISCARD_LISTING_DAYS = 30        // Remove listings older than this
const MILEAGE_COST_PER_MILE = 0.05    // £0.05 per mile deviation
const DEFAULT_ANNUAL_MILEAGE = 8000   // UK average

// ── Confidence scoring weights ─────────────────────────────────────────────────

function computeConfidence(
  sampleSize: number,
  prices: number[],
  listingTimestamps: number[],
): { score: number; freshnessDecay: number } {
  // Component 1: Sample size (max 40 points)
  const sampleScore = Math.min(40, sampleSize * 2)

  // Component 2: Variance stability (max 30 points)
  const median = getMedian(prices)
  const mad = getMAD(prices)
  const cv = median > 0 ? mad / median : 1 // coefficient of variation (MAD-based)
  let stabilityScore = 30
  if (cv > 0.3) stabilityScore = 5
  else if (cv > 0.2) stabilityScore = 10
  else if (cv > 0.15) stabilityScore = 15
  else if (cv > 0.10) stabilityScore = 20
  else if (cv > 0.05) stabilityScore = 25

  // Component 3: Recency (max 30 points)
  const now = Date.now()
  const ages = listingTimestamps.map(ts => (now - ts) / (1000 * 60 * 60 * 24))
  const medianAge = getMedian(ages)
  let recencyScore = 30
  if (medianAge > 21) recencyScore = 5
  else if (medianAge > 14) recencyScore = 10
  else if (medianAge > 7) recencyScore = 15
  else if (medianAge > 3) recencyScore = 22

  const freshnessDecay = medianAge > STALE_LISTING_DAYS
    ? Math.min(20, Math.round((medianAge - STALE_LISTING_DAYS) * 1.5))
    : 0

  const raw = sampleScore + stabilityScore + recencyScore - freshnessDecay
  const score = Math.max(0, Math.min(100, raw))

  return { score, freshnessDecay }
}

// ── Mileage adjustment ────────────────────────────────────────────────────────

function computeMileageAdjustment(
  year: number,
  actualMileage: number,
): number {
  const currentYear = new Date().getFullYear()
  const expectedMileage = (currentYear - year) * DEFAULT_ANNUAL_MILEAGE
  const delta = actualMileage - expectedMileage
  return Math.round(delta * MILEAGE_COST_PER_MILE)
}

// ── Data freshness filter ──────────────────────────────────────────────────────

function filterByFreshness(listings: CleanListing[]): CleanListing[] {
  const cutoff = Date.now() - DISCARD_LISTING_DAYS * 24 * 60 * 60 * 1000
  return listings.filter(l => l.timestamp > cutoff)
}

// ── Fallback to MARKET_DATA v3 ─────────────────────────────────────────────────

function buildFallbackResult(
  make: string,
  model: string,
  year: number,
  mileage: number,
  fuel: string,
  reason: string,
): LiveValuationResult {
  const marketResult = getMarketValue(make, model, year, fuel)

  if (!marketResult) {
    return {
      make, model, year, mileage,
      valuation: 0,
      range: { low: 0, high: 0 },
      confidence: 0,
      sampleSize: 0,
      dataSource: 'fallback',
      flags: {
        lowSample: true,
        fallbackReason: `${reason}; no MARKET_DATA match`,
      },
    }
  }

  const avgRetail = marketResult.avgRetail
  const mileageAdj = computeMileageAdjustment(year, mileage)
  const adjusted = Math.max(500, avgRetail - mileageAdj)

  // Spread based on volatility
  const spreadPct = marketResult.volatility === 'volatile' ? 0.12
    : marketResult.volatility === 'moderate' ? 0.08
    : 0.05

  const low = Math.round(adjusted * (1 - spreadPct))
  const high = Math.round(adjusted * (1 + spreadPct))

  // Confidence: lower for fallback data
  let confidence = 55
  if (marketResult.matchQuality === 'fuel_fuzzy') confidence -= 10
  if (marketResult.matchQuality === 'year_fuzzy') confidence -= 15
  if (marketResult.matchQuality === 'partial') confidence -= 20
  if (marketResult.volatility === 'volatile') confidence -= 10

  return {
    make, model, year, mileage,
    valuation: Math.round(adjusted),
    range: { low, high },
    confidence: Math.max(10, confidence),
    sampleSize: 0,
    dataSource: 'fallback',
    flags: {
      lowSample: true,
      mileageAdjusted: mileageAdj !== 0,
      fallbackReason: reason,
    },
    debug: {
      rawListingCount: 0,
      cleanListingCount: 0,
      outlierCount: 0,
      medianPrice: avgRetail,
      madValue: 0,
      mileageAdjustment: mileageAdj,
      freshnessDecay: 0,
      sources: {},
    },
  }
}

// ── Main valuation function ────────────────────────────────────────────────────

export interface LiveValuationInput {
  make: string
  model: string
  year: number
  mileage: number
  fuel?: string
  postcode?: string
  /** Skip scraping and use only cache/fallback */
  skipScrape?: boolean
}

/**
 * Generate a live market valuation for a UK vehicle.
 *
 * Pipeline:
 *  1. Check cache (6h TTL)
 *  2. Scrape AutoTrader + eBay in parallel
 *  3. Clean, normalise, deduplicate
 *  4. Filter by freshness
 *  5. Remove price outliers (MAD)
 *  6. If >= 12 listings: compute LIVE valuation (median)
 *  7. If < 12: fallback to MARKET_DATA v3
 *  8. Apply mileage adjustment
 *  9. Compute confidence score
 * 10. Cache result
 */
export async function computeLiveValuation(
  input: LiveValuationInput,
): Promise<LiveValuationResult> {
  const { make, model, year, mileage, fuel, postcode } = input

  // ── Step 1: Check cache ──────────────────────────────────────────────
  const cached = getCachedValuation(make, model, year, fuel)
  if (cached) {
    // Adjust for mileage since cache may have different mileage
    const adj = computeMileageAdjustment(year, mileage)
    const cachedAdj = cached.result.debug?.mileageAdjustment ?? 0
    const mileageDelta = adj - cachedAdj

    if (Math.abs(mileageDelta) > 100) {
      // Significant mileage difference — adjust cached result
      return {
        ...cached.result,
        mileage,
        valuation: Math.max(500, cached.result.valuation - mileageDelta),
        range: {
          low: Math.max(500, cached.result.range.low - mileageDelta),
          high: Math.max(500, cached.result.range.high - mileageDelta),
        },
        flags: { ...cached.result.flags, mileageAdjusted: true },
      }
    }

    return { ...cached.result, mileage }
  }

  // ── Step 2: Scrape live listings ─────────────────────────────────────
  if (input.skipScrape) {
    return buildFallbackResult(make, model, year, mileage, fuel || 'PETROL', 'Scraping skipped')
  }

  const query: ScraperQuery = {
    make,
    model,
    yearMin: Math.max(year - 2, 1990),
    yearMax: Math.min(year + 2, new Date().getFullYear() + 1),
    fuel,
    postcode,
  }

  let rawListings: RawListing[] = []
  const errors: string[] = []

  // Scrape AutoTrader + eBay in parallel
  const [autotraderResult, ebayResult] = await Promise.allSettled([
    scrapeAutoTrader(query),
    scrapeEbayMotors(query),
  ])

  if (autotraderResult.status === 'fulfilled') {
    rawListings.push(...autotraderResult.value)
  } else {
    errors.push(`AutoTrader: ${autotraderResult.reason}`)
  }

  if (ebayResult.status === 'fulfilled') {
    rawListings.push(...ebayResult.value)
  } else {
    errors.push(`eBay: ${ebayResult.reason}`)
  }

  const rawCount = rawListings.length

  // ── Step 3: Clean and normalise ──────────────────────────────────────
  const { cleaned, discarded, deduped, fuelSplitWarning } = cleanListings(rawListings, fuel)

  // ── Step 4: Filter by freshness ──────────────────────────────────────
  const fresh = filterByFreshness(cleaned)

  // ── Step 5: Remove outliers ──────────────────────────────────────────
  const { filtered, removed, median, mad } = removeOutliers(fresh)
  const cleanCount = filtered.length
  const outlierCount = removed.length

  // ── Step 6: Check if we have enough data for live valuation ──────────
  if (cleanCount < MIN_LISTINGS_FOR_LIVE) {
    const reason = rawCount === 0
      ? `Scraping returned 0 listings${errors.length ? ` (${errors.join('; ')})` : ''}`
      : `Only ${cleanCount} clean listings after filtering (${rawCount} raw, ${discarded} discarded, ${deduped} dupes, ${outlierCount} outliers)`

    return buildFallbackResult(make, model, year, mileage, fuel || 'PETROL', reason)
  }

  // ── Step 7: LIVE valuation (median-based) ────────────────────────────
  const prices = filtered.map(l => l.price)
  const medianPrice = getMedian(prices)
  const p25 = getPercentile(prices, 25)
  const p75 = getPercentile(prices, 75)

  // ── Step 8: Mileage adjustment ───────────────────────────────────────
  const mileageAdj = computeMileageAdjustment(year, mileage)
  const adjustedValue = Math.max(500, Math.round(medianPrice - mileageAdj))

  // Adjust range too
  const rangeLow = Math.max(500, Math.round(p25 - mileageAdj))
  const rangeHigh = Math.max(500, Math.round(p75 - mileageAdj))

  // ── Step 9: Confidence score ─────────────────────────────────────────
  const timestamps = filtered.map(l => l.timestamp)
  const { score: confidence, freshnessDecay } = computeConfidence(cleanCount, prices, timestamps)

  // If confidence too low, fall back
  if (confidence < CONFIDENCE_FALLBACK_THRESHOLD) {
    return buildFallbackResult(make, model, year, mileage, fuel || 'PETROL', `Low confidence (${confidence}/100)`)
  }

  // Variance flag
  const madBasedCv = medianPrice > 0 ? mad / medianPrice : 0
  const highVariance = madBasedCv > 0.15

  // Source breakdown
  const sources: Record<string, number> = {}
  for (const l of filtered) {
    sources[l.source] = (sources[l.source] || 0) + 1
  }

  // ── Step 10: Build result ────────────────────────────────────────────
  const result: LiveValuationResult = {
    make,
    model,
    year,
    mileage,
    valuation: adjustedValue,
    range: { low: rangeLow, high: rangeHigh },
    confidence,
    sampleSize: cleanCount,
    dataSource: 'live',
    flags: {
      lowSample: cleanCount < 20,
      highVariance,
      staleData: freshnessDecay > 0,
      mileageAdjusted: mileageAdj !== 0,
      outlierFiltered: outlierCount > 0,
      evSplit: fuelSplitWarning,
    },
    debug: {
      rawListingCount: rawCount,
      cleanListingCount: cleanCount,
      outlierCount,
      medianPrice,
      madValue: mad,
      mileageAdjustment: mileageAdj,
      freshnessDecay,
      sources,
    },
  }

  // ── Step 11: Cache ───────────────────────────────────────────────────
  setCachedValuation(make, model, year, fuel, result, filtered)

  return result
}
