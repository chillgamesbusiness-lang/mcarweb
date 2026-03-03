/**
 * Marketcheck UK Provider — High-frequency UK used car listing data.
 *
 * Marketcheck aggregates 680,000+ UK car adverts with daily price shift
 * tracking, days-to-sell metrics, and regional pricing data.
 * This is the highest-volume comparable data source in our stack.
 *
 * Requires: MARKETCHECK_API_KEY env var.
 * Rate limit: 25 calls/hour (free tier: ~1000/day).
 * Cache: 6h via compsCache.
 *
 * Unique value:
 *   - Real listing data (not synthesised valuations)
 *   - Days-on-market for each listing (feeds time-to-sell model)
 *   - Price change history (feeds volatility signals)
 *   - Regional inventory supply signals
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

const MAX_CALLS_PER_HOUR = 25
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
    source: 'marketcheck',
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

// ── Parse a Marketcheck listing ────────────────────────────────────────────────

function parseMarketCheckListing(
  item: Record<string, unknown>,
  queryYear: number,
): CompListing | null {
  try {
    const price = typeof item.price === 'number' ? item.price
      : typeof item.price === 'string' ? parseFloat(item.price) : 0
    if (price < 500 || price > 150_000 || isNaN(price)) return null

    const year = typeof item.year === 'number' ? item.year
      : typeof item.build_year === 'number' ? (item.build_year as number) : queryYear

    const miles = typeof item.miles === 'number' ? item.miles
      : typeof item.mileage === 'number' ? item.mileage : null

    // Days on market (unique to Marketcheck)
    let listingAgeDays: number | null = null
    if (typeof item.dom === 'number') listingAgeDays = item.dom as number
    else if (typeof item.days_on_market === 'number') listingAgeDays = item.days_on_market as number
    else if (typeof item.first_seen === 'string') {
      const firstSeen = new Date(item.first_seen as string)
      if (!isNaN(firstSeen.getTime())) {
        listingAgeDays = Math.round((Date.now() - firstSeen.getTime()) / (1000 * 60 * 60 * 24))
      }
    }

    const title = typeof item.heading === 'string' ? (item.heading as string).slice(0, 100)
      : typeof item.title === 'string' ? (item.title as string).slice(0, 100)
      : `${year} listing`

    const fuel = typeof item.fuel_type === 'string' ? item.fuel_type as string : null
    const engineCC = typeof item.engine_size === 'number' ? item.engine_size as number : null
    const transmission = typeof item.transmission === 'string' ? item.transmission as string : null
    const bodyType = typeof item.body_type === 'string' ? item.body_type as string : null
    const colour = typeof item.exterior_color === 'string' ? item.exterior_color as string : null
    const location = typeof item.city === 'string' ? item.city as string
      : typeof item.seller_region === 'string' ? item.seller_region as string : null

    return {
      source: 'marketcheck',
      title,
      price,
      year,
      mileage: typeof miles === 'number' ? miles : null,
      fuel,
      engineCC,
      transmission,
      bodyType,
      colour,
      listingAgeDays,
      location,
      url: null, // anonymised
    }
  } catch {
    return null
  }
}

// ── Stats calculator ───────────────────────────────────────────────────────────

function calculatePriceStats(prices: number[]): ProviderResult['priceStats'] {
  if (prices.length === 0) return null
  const sorted = [...prices].sort((a, b) => a - b)
  const n = sorted.length
  return {
    min: sorted[0],
    p25: sorted[Math.floor(n * 0.25)] ?? sorted[0],
    median: sorted[Math.floor(n * 0.5)] ?? sorted[0],
    p75: sorted[Math.floor(n * 0.75)] ?? sorted[n - 1],
    max: sorted[n - 1],
  }
}

// ── Quality scorer ─────────────────────────────────────────────────────────────

function computeQuality(listings: CompListing[], query: CompProviderQuery): number {
  let score = 50

  // Sample size — Marketcheck typically returns high volumes
  if (listings.length >= 30) score += 25
  else if (listings.length >= 20) score += 20
  else if (listings.length >= 10) score += 15
  else if (listings.length >= 5) score += 10
  else if (listings.length >= 2) score += 5
  else if (listings.length === 0) return 0

  // Year match
  const yearMatches = listings.filter(l => Math.abs(l.year - query.year) <= 1).length
  score += Math.round((yearMatches / listings.length) * 10)

  // Mileage data availability
  const hasMileage = listings.filter(l => l.mileage !== null).length
  score += Math.round((hasMileage / listings.length) * 8)

  // Days-on-market data availability (unique value)
  const hasDom = listings.filter(l => l.listingAgeDays !== null).length
  score += Math.round((hasDom / listings.length) * 7)

  return Math.max(0, Math.min(100, score))
}

// ── Provider implementation ────────────────────────────────────────────────────

export const marketcheckProvider: CompProvider = {
  name: 'marketcheck',
  enabled: !!process.env.MARKETCHECK_API_KEY,

  async fetchComps(query: CompProviderQuery): Promise<ProviderResult> {
    const regionBand = detectRegionBand(query.postcode)
    const searchQuery = `${query.make} ${query.model} ${query.year}`

    // Check cache
    const cached = getCachedComps('marketcheck', query.make, query.model, query.year, query.fuel, regionBand)
    if (cached) return cached

    if (!canMakeCall()) {
      return emptyResult(searchQuery, 'Rate limit exceeded')
    }

    const apiKey = process.env.MARKETCHECK_API_KEY!

    try {
      recordCall()

      // Marketcheck UK API — search used car listings
      const params = new URLSearchParams({
        api_key: apiKey,
        make: query.make,
        model: query.model,
        year: String(query.year),
        fuel_type: query.fuel,
        rows: '50',
        country: 'GB',
        sort_by: 'price',
        sort_order: 'asc',
      })

      // Add mileage range filter (±30% of declared mileage)
      const mileageLow = Math.round(query.mileage * 0.7)
      const mileageHigh = Math.round(query.mileage * 1.3)
      params.set('miles_range', `${mileageLow}-${mileageHigh}`)

      if (query.engineCC) {
        // Search ±200cc of declared engine size
        const ccLow = query.engineCC - 200
        const ccHigh = query.engineCC + 200
        params.set('engine_size_range', `${ccLow}-${ccHigh}`)
      }

      const res = await fetch(
        `https://mc-api.marketcheck.com/v2/search/car/active?${params}`,
        {
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(8000),
        }
      )

      if (!res.ok) {
        return emptyResult(searchQuery, `Marketcheck API ${res.status}`)
      }

      const data = await res.json()

      // Marketcheck returns: { num_found, listings: [...] }
      const items = (data?.listings ?? data?.results ?? []) as Record<string, unknown>[]
      const listings = items
        .map(item => parseMarketCheckListing(item, query.year))
        .filter((l): l is CompListing => l !== null)

      const prices = listings.map(l => l.price)
      const priceStats = calculatePriceStats(prices)

      // Calculate median days on market (valuable for time-to-sell)
      const ages = listings
        .map(l => l.listingAgeDays)
        .filter((a): a is number => a !== null)
        .sort((a, b) => a - b)
      const listingAgeDaysMedian = ages.length > 0 ? ages[Math.floor(ages.length / 2)] : null

      const qualityScore = computeQuality(listings, query)

      const result: ProviderResult = {
        source: 'marketcheck',
        query: searchQuery,
        sampleCount: listings.length,
        priceStats,
        listingAgeDaysMedian,
        geoHint: 'uk_wide',
        qualityScore,
        listings,
        error: null,
        cachedAt: null,
      }

      setCachedComps('marketcheck', query.make, query.model, query.year, query.fuel, regionBand, result)
      return result
    } catch (err) {
      return emptyResult(searchQuery, err instanceof Error ? err.message : 'Marketcheck fetch failed')
    }
  },
}
