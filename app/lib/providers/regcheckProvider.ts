/**
 * RegCheck.org.uk Provider — Free/bespoke UK vehicle valuation API.
 *
 * RegCheck provides vehicle spec data and basic valuation by registration.
 * API: https://www.regcheck.org.uk/api/reg.asmx
 *
 * Requires: REGCHECK_API_KEY env var (free tier available).
 * Rate limit: 30 calls/hour (self-imposed — free tier is generous).
 * Cache: 6h via compsCache.
 *
 * Note: RegCheck returns single-vehicle valuation data rather than listings,
 * so we synthesise a ProviderResult with a single "comp" representing
 * the RegCheck valuation anchor. This still contributes to the blended estimate.
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

const MAX_CALLS_PER_HOUR = 30
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
    source: 'regcheck',
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

export const regcheckProvider: CompProvider = {
  name: 'regcheck',
  enabled: !!process.env.REGCHECK_API_KEY,

  async fetchComps(query: CompProviderQuery): Promise<ProviderResult> {
    const regionBand = detectRegionBand(query.postcode)
    const searchQuery = `${query.make} ${query.model} ${query.year}`

    // Check cache
    const cached = getCachedComps('regcheck', query.make, query.model, query.year, query.fuel, regionBand)
    if (cached) return cached

    if (!canMakeCall()) {
      return emptyResult(searchQuery, 'Rate limit exceeded')
    }

    const apiKey = process.env.REGCHECK_API_KEY!

    try {
      recordCall()

      // RegCheck API — getBespokeValuation endpoint
      // Returns JSON with valuation bands for the specific vehicle
      const res = await fetch(
        `https://www.regcheck.org.uk/api/json.aspx/${encodeURIComponent(query.make)}+${encodeURIComponent(query.model)}?apikey=${encodeURIComponent(apiKey)}&mileage=${query.mileage}`,
        { signal: AbortSignal.timeout(8000) }
      )

      if (!res.ok) {
        return emptyResult(searchQuery, `RegCheck API ${res.status}`)
      }

      const data = await res.json()

      // RegCheck returns valuation data in various formats.
      // Extract trade and retail values from the response.
      const tradeValue = parseFloat(data?.CurrentTextValue ?? data?.TradeValue ?? '0')
      const retailValue = parseFloat(data?.RetailValue ?? data?.CurrentRetailValue ?? '0')
      const privateValue = parseFloat(data?.PrivateValue ?? '0')

      // We need at least one usable price
      const prices = [tradeValue, retailValue, privateValue].filter(p => p > 500 && p < 150_000)

      if (prices.length === 0) {
        return emptyResult(searchQuery, 'No usable valuation data from RegCheck')
      }

      // Synthesise comp listings from valuation bands
      const listings: CompListing[] = []

      if (tradeValue > 500) {
        listings.push({
          source: 'regcheck',
          title: `${query.make} ${query.model} ${query.year} (trade value)`,
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
          source: 'regcheck',
          title: `${query.make} ${query.model} ${query.year} (retail value)`,
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
          source: 'regcheck',
          title: `${query.make} ${query.model} ${query.year} (private sale)`,
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

      // Quality: valuation APIs are precise but single-source (cap at 65)
      const qualityScore = Math.min(65, 40 + listings.length * 10)

      const result: ProviderResult = {
        source: 'regcheck',
        query: searchQuery,
        sampleCount: listings.length,
        priceStats: {
          min: sortedPrices[0],
          p25: sortedPrices[0],
          median: sortedPrices[Math.floor(n / 2)],
          p75: sortedPrices[n - 1],
          max: sortedPrices[n - 1],
        },
        listingAgeDaysMedian: null, // not applicable for valuation data
        geoHint: 'uk_wide',
        qualityScore,
        listings,
        error: null,
        cachedAt: null,
      }

      setCachedComps('regcheck', query.make, query.model, query.year, query.fuel, regionBand, result)
      return result
    } catch (err) {
      return emptyResult(searchQuery, err instanceof Error ? err.message : 'RegCheck fetch failed')
    }
  },
}
