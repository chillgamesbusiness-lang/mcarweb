/**
 * MotorSpecs Provider — Private, auction, and trade vehicle valuations.
 *
 * MotorSpecs provides detailed vehicle specification data alongside valuation
 * estimates including private sale, auction, and trade values.
 * Free account available with API access.
 *
 * Requires: MOTORSPECS_API_KEY env var.
 * Rate limit: 20 calls/hour (conservative for free tier).
 * Cache: 6h via compsCache.
 *
 * Unique value: provides auction values which feed into the auction vs retail
 * spread tracking feature.
 */

import type {
  CompProvider,
  CompProviderQuery,
  CompListing,
  ProviderResult,
} from '@/lib/providers/providerTypes'
import { getCachedComps, setCachedComps } from '@/lib/providers/compsCache'
import { detectRegionBand } from '@/lib/segmentPricing'

// ── Rate limiter ───────────────────────────────────────────────────────────────

const MAX_CALLS_PER_HOUR = 20
let callTimestamps: number[] = []

function canMakeCall(): boolean {
  const oneHourAgo = Date.now() - 60 * 60 * 1000
  callTimestamps = callTimestamps.filter(ts => ts > oneHourAgo)
  return callTimestamps.length < MAX_CALLS_PER_HOUR
}

function recordCall(): void {
  callTimestamps.push(Date.now())
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function emptyResult(query: string, error: string | null = null): ProviderResult {
  return {
    source: 'motorspecs',
    query,
    sampleCount: 0,
    priceStats: null,
    listingAgeDaysMedian: null,
    geoHint: 'uk_wide',
    qualityScore: 0,
    listings: [],
    error,
    cachedAt: null,
  }
}

function safeNum(val: unknown): number {
  if (typeof val === 'number') return val
  if (typeof val === 'string') {
    const n = parseFloat(val.replace(/[^0-9.]/g, ''))
    return isNaN(n) ? 0 : n
  }
  return 0
}

// ── Provider implementation ────────────────────────────────────────────────────

export const motorSpecsProvider: CompProvider = {
  name: 'motorspecs',
  enabled: !!process.env.MOTORSPECS_API_KEY,

  async fetchComps(query: CompProviderQuery): Promise<ProviderResult> {
    const regionBand = detectRegionBand(query.postcode)
    const searchQuery = `${query.make} ${query.model} ${query.year}`

    // Check cache
    const cached = getCachedComps('motorspecs', query.make, query.model, query.year, query.fuel, regionBand)
    if (cached) return cached

    if (!canMakeCall()) {
      return emptyResult(searchQuery, 'Rate limit exceeded')
    }

    const apiKey = process.env.MOTORSPECS_API_KEY!

    try {
      recordCall()

      // MotorSpecs API — valuation endpoint
      const res = await fetch('https://api.motorspecs.co.uk/v1/valuation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': apiKey,
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          make: query.make,
          model: query.model,
          year: query.year,
          fuel_type: query.fuel,
          mileage: query.mileage,
          engine_size: query.engineCC,
        }),
        signal: AbortSignal.timeout(8000),
      })

      if (!res.ok) {
        return emptyResult(searchQuery, `MotorSpecs API ${res.status}`)
      }

      const data = await res.json()

      // MotorSpecs returns:
      // { private_value, auction_value, trade_value, retail_value, condition_adjustments }
      const privateValue = safeNum(data?.private_value)
      const auctionValue = safeNum(data?.auction_value)
      const tradeValue = safeNum(data?.trade_value)
      const retailValue = safeNum(data?.retail_value)

      const listings: CompListing[] = []
      const prices: number[] = []

      if (auctionValue > 500 && auctionValue < 150_000) {
        listings.push({
          source: 'motorspecs',
          title: `${query.make} ${query.model} ${query.year} (auction)`,
          price: auctionValue,
          year: query.year,
          mileage: query.mileage,
          fuel: query.fuel,
          engineCC: query.engineCC,
          transmission: null,
          bodyType: null,
          colour: null,
          listingAgeDays: null,
          location: 'UK',
          url: null,
        })
        prices.push(auctionValue)
      }

      if (tradeValue > 500 && tradeValue < 150_000) {
        listings.push({
          source: 'motorspecs',
          title: `${query.make} ${query.model} ${query.year} (trade)`,
          price: tradeValue,
          year: query.year,
          mileage: query.mileage,
          fuel: query.fuel,
          engineCC: query.engineCC,
          transmission: null,
          bodyType: null,
          colour: null,
          listingAgeDays: null,
          location: 'UK',
          url: null,
        })
        prices.push(tradeValue)
      }

      if (privateValue > 500 && privateValue < 150_000) {
        listings.push({
          source: 'motorspecs',
          title: `${query.make} ${query.model} ${query.year} (private)`,
          price: privateValue,
          year: query.year,
          mileage: query.mileage,
          fuel: query.fuel,
          engineCC: query.engineCC,
          transmission: null,
          bodyType: null,
          colour: null,
          listingAgeDays: null,
          location: 'UK',
          url: null,
        })
        prices.push(privateValue)
      }

      if (retailValue > 500 && retailValue < 150_000) {
        listings.push({
          source: 'motorspecs',
          title: `${query.make} ${query.model} ${query.year} (retail)`,
          price: retailValue,
          year: query.year,
          mileage: query.mileage,
          fuel: query.fuel,
          engineCC: query.engineCC,
          transmission: null,
          bodyType: null,
          colour: null,
          listingAgeDays: null,
          location: 'UK',
          url: null,
        })
        prices.push(retailValue)
      }

      if (prices.length === 0) {
        return emptyResult(searchQuery, 'No usable data from MotorSpecs')
      }

      const sorted = prices.sort((a, b) => a - b)
      const n = sorted.length

      // Quality: auction + trade + retail = good triangulation
      const qualityScore = Math.min(75, 35 + listings.length * 10)

      const result: ProviderResult = {
        source: 'motorspecs',
        query: searchQuery,
        sampleCount: listings.length,
        priceStats: {
          min: sorted[0],
          p25: sorted[Math.floor(n * 0.25)] ?? sorted[0],
          median: sorted[Math.floor(n * 0.5)] ?? sorted[0],
          p75: sorted[Math.floor(n * 0.75)] ?? sorted[n - 1],
          max: sorted[n - 1],
        },
        listingAgeDaysMedian: null,
        geoHint: 'uk_wide',
        qualityScore,
        listings,
        error: null,
        cachedAt: null,
      }

      setCachedComps('motorspecs', query.make, query.model, query.year, query.fuel, regionBand, result)
      return result
    } catch (err) {
      return emptyResult(searchQuery, err instanceof Error ? err.message : 'MotorSpecs fetch failed')
    }
  },
}
