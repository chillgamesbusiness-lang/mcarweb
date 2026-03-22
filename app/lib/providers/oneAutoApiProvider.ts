/**
 * OneAutoAPI.com Provider — Vehicle valuations + market data.
 *
 * https://www.oneautoapi.com/dashboard/keys/
 *
 * Provides UK vehicle valuations including trade, retail and private values.
 * Auth: Bearer token via ONEAUTOAPI_KEY env var.
 *
 * Rate limit: 30 calls/hour (conservative — adjust based on your plan).
 * Cache: 6h via compsCache.
 *
 * NOTE: If their endpoint URL or response shape differs from what's below,
 * update buildUrl() and parseResponse() — the rest of the provider is stable.
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
    source: 'oneautoapi',
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

function makeListing(query: CompProviderQuery, label: string, price: number): CompListing {
  return {
    source: 'oneautoapi',
    title: `${query.make} ${query.model} ${query.year} (${label})`,
    price,
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
  }
}

// ── API request builder ────────────────────────────────────────────────────────

function buildUrl(query: CompProviderQuery): string {
  const params = new URLSearchParams({
    make: query.make,
    model: query.model,
    year: String(query.year),
    mileage: String(query.mileage),
    fuel_type: query.fuel,
    ...(query.engineCC ? { engine_size: String(query.engineCC) } : {}),
  })
  // Adjust path if their docs show a different endpoint
  return `https://www.oneautoapi.com/api/v1/valuations?${params}`
}

// ── Response parser ────────────────────────────────────────────────────────────

function parseResponse(
  data: Record<string, unknown>,
  query: CompProviderQuery,
): CompListing[] {
  const listings: CompListing[] = []

  // Try common response shapes — oneautoapi.com may nest under data/result/valuation
  const payload = (data?.data ?? data?.result ?? data?.valuation ?? data) as Record<string, unknown>

  // Trade / auction value
  const tradeValue = safeNum(payload?.trade_value ?? payload?.tradeValue ?? payload?.trade)
  if (tradeValue > 500 && tradeValue < 150_000) {
    listings.push(makeListing(query, 'trade', tradeValue))
  }

  // Retail value
  const retailValue = safeNum(payload?.retail_value ?? payload?.retailValue ?? payload?.retail)
  if (retailValue > 500 && retailValue < 150_000) {
    listings.push(makeListing(query, 'retail', retailValue))
  }

  // Private sale value
  const privateValue = safeNum(payload?.private_value ?? payload?.privateValue ?? payload?.private)
  if (privateValue > 500 && privateValue < 150_000) {
    listings.push(makeListing(query, 'private', privateValue))
  }

  // Auction / CAP clean if exposed directly
  const capClean = safeNum(payload?.cap_clean ?? payload?.capClean)
  if (capClean > 500 && capClean < 150_000) {
    listings.push(makeListing(query, 'CAP clean', capClean))
  }

  // Glass's retail
  const glassRetail = safeNum(payload?.glass_retail ?? payload?.glassRetail)
  if (glassRetail > 500 && glassRetail < 150_000) {
    listings.push(makeListing(query, "Glass's retail", glassRetail))
  }

  return listings
}

// ── Provider implementation ────────────────────────────────────────────────────

export const oneAutoApiProvider: CompProvider = {
  name: 'oneautoapi',
  enabled: !!process.env.ONEAUTOAPI_KEY,

  async fetchComps(query: CompProviderQuery): Promise<ProviderResult> {
    const regionBand = detectRegionBand(query.postcode)
    const searchQuery = `${query.make} ${query.model} ${query.year}`

    // Check cache
    const cached = getCachedComps('oneautoapi', query.make, query.model, query.year, query.fuel, regionBand)
    if (cached) return cached

    if (!canMakeCall()) {
      return emptyResult(searchQuery, 'Rate limit exceeded')
    }

    const apiKey = process.env.ONEAUTOAPI_KEY!

    try {
      recordCall()

      const res = await fetch(buildUrl(query), {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(8000),
      })

      if (!res.ok) {
        const body = await res.text().catch(() => '')
        return emptyResult(searchQuery, `OneAutoAPI ${res.status}${body ? `: ${body.slice(0, 100)}` : ''}`)
      }

      const data = await res.json() as Record<string, unknown>
      const listings = parseResponse(data, query)

      if (listings.length === 0) {
        return emptyResult(searchQuery, 'No usable valuation data from OneAutoAPI')
      }

      const prices = listings.map(l => l.price).sort((a, b) => a - b)
      const n = prices.length

      // Quality: valuation APIs with multiple book values are high-quality
      const qualityScore = Math.min(75, 40 + listings.length * 8)

      const result: ProviderResult = {
        source: 'oneautoapi',
        query: searchQuery,
        sampleCount: listings.length,
        priceStats: {
          min: prices[0],
          p25: prices[Math.floor(n * 0.25)] ?? prices[0],
          median: prices[Math.floor(n * 0.5)] ?? prices[0],
          p75: prices[Math.floor(n * 0.75)] ?? prices[n - 1],
          max: prices[n - 1],
        },
        listingAgeDaysMedian: null,
        geoHint: 'uk_wide',
        qualityScore,
        listings,
        error: null,
        cachedAt: null,
      }

      setCachedComps('oneautoapi', query.make, query.model, query.year, query.fuel, regionBand, result)
      return result
    } catch (err) {
      return emptyResult(searchQuery, err instanceof Error ? err.message : 'OneAutoAPI fetch failed')
    }
  },
}
