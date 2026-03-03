/**
 * Brego API Provider — AI-driven vehicle valuation and depreciation analytics.
 *
 * Brego provides intelligent car valuations using AI/ML models trained on
 * UK market data. RESTful API with a free trial tier.
 *
 * Requires: BREGO_API_KEY env var.
 * Rate limit: 20 calls/hour (conservative for free tier).
 * Cache: 6h via compsCache.
 *
 * Returns valuation estimates (trade/retail/private) plus depreciation curve data
 * which we convert into synthetic comp listings for the blending engine.
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
    source: 'brego',
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

// ── Provider implementation ────────────────────────────────────────────────────

export const bregoProvider: CompProvider = {
  name: 'brego',
  enabled: !!process.env.BREGO_API_KEY,

  async fetchComps(query: CompProviderQuery): Promise<ProviderResult> {
    const regionBand = detectRegionBand(query.postcode)
    const searchQuery = `${query.make} ${query.model} ${query.year}`

    // Check cache
    const cached = getCachedComps('brego', query.make, query.model, query.year, query.fuel, regionBand)
    if (cached) return cached

    if (!canMakeCall()) {
      return emptyResult(searchQuery, 'Rate limit exceeded')
    }

    const apiKey = process.env.BREGO_API_KEY!

    try {
      recordCall()

      // Brego AI valuation endpoint
      const res = await fetch('https://api.brego.ai/v1/valuation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          make: query.make,
          model: query.model,
          year: query.year,
          fuel_type: query.fuel,
          mileage: query.mileage,
          engine_cc: query.engineCC,
          postcode: query.postcode,
        }),
        signal: AbortSignal.timeout(8000),
      })

      if (!res.ok) {
        return emptyResult(searchQuery, `Brego API ${res.status}`)
      }

      const data = await res.json()

      // Brego returns structured valuation data:
      // { trade_value, retail_value, private_value, confidence, depreciation_rate, market_trend }
      const tradeValue = typeof data?.trade_value === 'number' ? data.trade_value : 0
      const retailValue = typeof data?.retail_value === 'number' ? data.retail_value : 0
      const privateValue = typeof data?.private_value === 'number' ? data.private_value : 0
      const bregoConfidence = typeof data?.confidence === 'number' ? data.confidence : 0.5

      const prices = [tradeValue, retailValue, privateValue].filter(p => p > 500 && p < 150_000)

      if (prices.length === 0) {
        return emptyResult(searchQuery, 'No usable valuation from Brego')
      }

      // Synthesise listings from Brego valuation bands
      const listings: CompListing[] = []

      if (tradeValue > 500) {
        listings.push({
          source: 'brego',
          title: `${query.make} ${query.model} ${query.year} (Brego trade)`,
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
      }

      if (retailValue > 500) {
        listings.push({
          source: 'brego',
          title: `${query.make} ${query.model} ${query.year} (Brego retail)`,
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
      }

      if (privateValue > 500) {
        listings.push({
          source: 'brego',
          title: `${query.make} ${query.model} ${query.year} (Brego private)`,
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
      }

      const sortedPrices = prices.sort((a, b) => a - b)
      const n = sortedPrices.length

      // Quality: AI-driven valuations are typically higher quality (cap 70)
      // Brego confidence (0-1) boosts quality
      const qualityScore = Math.min(70, Math.round(40 + listings.length * 8 + bregoConfidence * 10))

      const result: ProviderResult = {
        source: 'brego',
        query: searchQuery,
        sampleCount: listings.length,
        priceStats: {
          min: sortedPrices[0],
          p25: sortedPrices[0],
          median: sortedPrices[Math.floor(n / 2)],
          p75: sortedPrices[n - 1],
          max: sortedPrices[n - 1],
        },
        listingAgeDaysMedian: null,
        geoHint: 'uk_wide',
        qualityScore,
        listings,
        error: null,
        cachedAt: null,
      }

      setCachedComps('brego', query.make, query.model, query.year, query.fuel, regionBand, result)
      return result
    } catch (err) {
      return emptyResult(searchQuery, err instanceof Error ? err.message : 'Brego fetch failed')
    }
  },
}
