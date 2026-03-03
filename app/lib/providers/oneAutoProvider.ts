/**
 * One Auto API Provider — Aggregated UK vehicle valuations.
 *
 * One Auto aggregates data from Glass's, CAP HPI, and Auto Trader to provide
 * comprehensive vehicle valuations. Free account available with API access.
 *
 * Requires: ONEAUTO_API_KEY env var.
 * Rate limit: 15 calls/hour (conservative for free tier).
 * Cache: 6h via compsCache.
 *
 * Returns trade/retail/private valuations from multiple underlying book values.
 * Since it aggregates Glass's + CAP HPI + Auto Trader, this is one of the
 * most valuable free-tier data sources.
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

const MAX_CALLS_PER_HOUR = 15
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
    source: 'oneauto',
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

// ── Extract numeric value safely ───────────────────────────────────────────────

function safeNum(val: unknown): number {
  if (typeof val === 'number') return val
  if (typeof val === 'string') {
    const n = parseFloat(val.replace(/[^0-9.]/g, ''))
    return isNaN(n) ? 0 : n
  }
  return 0
}

// ── Provider implementation ────────────────────────────────────────────────────

export const oneAutoProvider: CompProvider = {
  name: 'oneauto',
  enabled: !!process.env.ONEAUTO_API_KEY,

  async fetchComps(query: CompProviderQuery): Promise<ProviderResult> {
    const regionBand = detectRegionBand(query.postcode)
    const searchQuery = `${query.make} ${query.model} ${query.year}`

    // Check cache
    const cached = getCachedComps('oneauto', query.make, query.model, query.year, query.fuel, regionBand)
    if (cached) return cached

    if (!canMakeCall()) {
      return emptyResult(searchQuery, 'Rate limit exceeded')
    }

    const apiKey = process.env.ONEAUTO_API_KEY!

    try {
      recordCall()

      // One Auto API — vehicle valuation endpoint
      const params = new URLSearchParams({
        make: query.make,
        model: query.model,
        year: String(query.year),
        fuel: query.fuel,
        mileage: String(query.mileage),
        ...(query.engineCC ? { engine_cc: String(query.engineCC) } : {}),
      })

      const res = await fetch(
        `https://api.oneauto.co.uk/v1/valuation?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Accept': 'application/json',
          },
          signal: AbortSignal.timeout(8000),
        }
      )

      if (!res.ok) {
        return emptyResult(searchQuery, `One Auto API ${res.status}`)
      }

      const data = await res.json()

      // One Auto may return multiple book values:
      // { glass: { trade, retail }, cap: { trade, retail, clean, average }, autotrader: { retail } }
      const listings: CompListing[] = []
      const prices: number[] = []

      // Glass's values
      const glassTrade = safeNum(data?.glass?.trade)
      const glassRetail = safeNum(data?.glass?.retail)
      if (glassTrade > 500 && glassTrade < 150_000) {
        listings.push(makeListing(query, "Glass's trade", glassTrade))
        prices.push(glassTrade)
      }
      if (glassRetail > 500 && glassRetail < 150_000) {
        listings.push(makeListing(query, "Glass's retail", glassRetail))
        prices.push(glassRetail)
      }

      // CAP HPI values
      const capClean = safeNum(data?.cap?.clean)
      const capAverage = safeNum(data?.cap?.average)
      const capRetail = safeNum(data?.cap?.retail)
      if (capClean > 500 && capClean < 150_000) {
        listings.push(makeListing(query, 'CAP clean', capClean))
        prices.push(capClean)
      }
      if (capAverage > 500 && capAverage < 150_000) {
        listings.push(makeListing(query, 'CAP average', capAverage))
        prices.push(capAverage)
      }
      if (capRetail > 500 && capRetail < 150_000) {
        listings.push(makeListing(query, 'CAP retail', capRetail))
        prices.push(capRetail)
      }

      // Auto Trader values
      const atRetail = safeNum(data?.autotrader?.retail)
      const atTrade = safeNum(data?.autotrader?.trade)
      if (atRetail > 500 && atRetail < 150_000) {
        listings.push(makeListing(query, 'AutoTrader retail', atRetail))
        prices.push(atRetail)
      }
      if (atTrade > 500 && atTrade < 150_000) {
        listings.push(makeListing(query, 'AutoTrader trade', atTrade))
        prices.push(atTrade)
      }

      if (prices.length === 0) {
        return emptyResult(searchQuery, 'No usable data from One Auto')
      }

      const sorted = prices.sort((a, b) => a - b)
      const n = sorted.length

      // Quality: aggregated book values are high-quality reference data
      // Multiple book sources = higher quality
      const sourceCount = [
        glassTrade || glassRetail ? 1 : 0,
        capClean || capAverage || capRetail ? 1 : 0,
        atRetail || atTrade ? 1 : 0,
      ].reduce((a, b) => a + b, 0)

      const qualityScore = Math.min(80, 35 + sourceCount * 12 + prices.length * 3)

      const result: ProviderResult = {
        source: 'oneauto',
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

      setCachedComps('oneauto', query.make, query.model, query.year, query.fuel, regionBand, result)
      return result
    } catch (err) {
      return emptyResult(searchQuery, err instanceof Error ? err.message : 'One Auto fetch failed')
    }
  },
}

// ── Listing factory ────────────────────────────────────────────────────────────

function makeListing(query: CompProviderQuery, label: string, price: number): CompListing {
  return {
    source: 'oneauto',
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
