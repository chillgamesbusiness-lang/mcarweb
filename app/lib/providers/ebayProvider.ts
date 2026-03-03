/**
 * eBay Browse API Provider — Fetches active UK car listings as market comps.
 *
 * Uses the eBay Browse API (search endpoint) which is legitimately available
 * via eBay Developer Programme. Requires EBAY_APP_ID + EBAY_CERT_ID env vars
 * for OAuth client credentials grant.
 *
 * Implementation:
 *  - Client credentials OAuth2 token (cached until expiry)
 *  - Search by make/model/year with mileage hints in query
 *  - Filter to "Cars" category (9801) + UK marketplace (EBAY_GB)
 *  - Parse price + item specifics for spec matching
 *  - Rate-limited: max 20 calls/hour, cached by key for 6h
 *  - Returns normalised ProviderResult
 *
 * If env vars are missing, provider is disabled (graceful degradation).
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

// ── OAuth token cache ──────────────────────────────────────────────────────────

let cachedToken: { token: string; expiresAt: number } | null = null

async function getAccessToken(): Promise<string | null> {
  const appId = process.env.EBAY_APP_ID
  const certId = process.env.EBAY_CERT_ID

  if (!appId || !certId) return null

  // Return cached token if still valid (with 60s buffer)
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token
  }

  try {
    const credentials = Buffer.from(`${appId}:${certId}`).toString('base64')
    const res = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${credentials}`,
      },
      body: 'grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope',
    })

    if (!res.ok) return null

    const data = await res.json()
    cachedToken = {
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in - 60) * 1000,
    }
    return cachedToken.token
  } catch {
    return null
  }
}

// ── Build search query ─────────────────────────────────────────────────────────

function buildSearchQuery(q: CompProviderQuery): string {
  const parts = [q.make, q.model, String(q.year)]
  if (q.fuel) parts.push(q.fuel)
  return parts.join(' ')
}

// ── Parse eBay item to CompListing ─────────────────────────────────────────────

function parseItem(item: Record<string, unknown>): CompListing | null {
  try {
    const price = item.price as { value?: string; currency?: string } | undefined
    if (!price?.value || price.currency !== 'GBP') return null

    const priceNum = parseFloat(price.value)
    if (isNaN(priceNum) || priceNum < 500 || priceNum > 100_000) return null

    // Extract year from title or item specifics
    const title = (item.title as string) || ''
    const yearMatch = title.match(/\b(19|20)\d{2}\b/)
    const year = yearMatch ? parseInt(yearMatch[0], 10) : 0

    // Mileage from localizedAspects
    let mileage: number | null = null
    const aspects = item.localizedAspects as Array<{ name: string; value: string }> | undefined
    if (aspects) {
      const mileageAspect = aspects.find(a =>
        a.name.toLowerCase().includes('mileage')
      )
      if (mileageAspect) {
        const m = mileageAspect.value.replace(/[^0-9]/g, '')
        if (m) mileage = parseInt(m, 10)
      }
    }

    // Listing age
    let listingAgeDays: number | null = null
    if (item.itemCreationDate) {
      const created = new Date(item.itemCreationDate as string)
      listingAgeDays = Math.round((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24))
    }

    return {
      source: 'ebay',
      title: title.slice(0, 100),
      price: priceNum,
      year,
      mileage,
      fuel: null, // extracted via aspects if available
      engineCC: null,
      transmission: null,
      bodyType: null,
      colour: null,
      listingAgeDays,
      location: (item.itemLocation as { country?: string })?.country ?? null,
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
  let score = 50 // base

  // Sample size
  if (listings.length >= 20) score += 20
  else if (listings.length >= 10) score += 15
  else if (listings.length >= 5) score += 10
  else if (listings.length >= 2) score += 5
  else if (listings.length === 0) return 0

  // Year match precision
  const yearMatches = listings.filter(l => Math.abs(l.year - query.year) <= 1).length
  score += Math.round((yearMatches / listings.length) * 15)

  // Mileage data availability
  const hasMileage = listings.filter(l => l.mileage !== null).length
  score += Math.round((hasMileage / listings.length) * 10)

  // Price variance (lower = better)
  const prices = listings.map(l => l.price)
  if (prices.length >= 3) {
    const mean = prices.reduce((a, b) => a + b, 0) / prices.length
    const cv = Math.sqrt(prices.reduce((s, p) => s + (p - mean) ** 2, 0) / prices.length) / mean
    if (cv < 0.15) score += 5
    else if (cv > 0.5) score -= 10
  }

  return Math.max(0, Math.min(100, score))
}

// ── Provider implementation ────────────────────────────────────────────────────

export const ebayProvider: CompProvider = {
  name: 'ebay',
  enabled: !!(process.env.EBAY_APP_ID && process.env.EBAY_CERT_ID),

  async fetchComps(query: CompProviderQuery): Promise<ProviderResult> {
    const regionBand = detectRegionBand(query.postcode)
    const searchQuery = buildSearchQuery(query)

    const emptyResult: ProviderResult = {
      source: 'ebay',
      query: searchQuery,
      sampleCount: 0,
      priceStats: null,
      listingAgeDaysMedian: null,
      geoHint: 'uk_wide',
      qualityScore: 0,
      listings: [],
      error: null,
      cachedAt: null,
    }

    // Check cache first
    const cached = getCachedComps('ebay', query.make, query.model, query.year, query.fuel, regionBand)
    if (cached) return cached

    // Rate limit check
    if (!canMakeCall()) {
      return { ...emptyResult, error: 'Rate limit exceeded — using baseline only' }
    }

    // Get OAuth token
    const token = await getAccessToken()
    if (!token) {
      return { ...emptyResult, error: 'eBay credentials not configured' }
    }

    try {
      recordCall()

      const params = new URLSearchParams({
        q: searchQuery,
        category_ids: '9801', // Cars
        filter: 'buyingOptions:{FIXED_PRICE},deliveryCountry:GB',
        sort: 'price',
        limit: '50',
      })

      const res = await fetch(
        `https://api.ebay.com/buy/browse/v1/item_summary/search?${params}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-EBAY-C-MARKETPLACE-ID': 'EBAY_GB',
            'X-EBAY-C-ENDUSERCTX': 'affiliateCampaignId=<default>',
          },
          signal: AbortSignal.timeout(8000),
        }
      )

      if (!res.ok) {
        return { ...emptyResult, error: `eBay API ${res.status}: ${res.statusText}` }
      }

      const data = await res.json()
      const items = (data.itemSummaries ?? []) as Record<string, unknown>[]
      const listings = items.map(parseItem).filter((l): l is CompListing => l !== null)

      const prices = listings.map(l => l.price)
      const priceStats = calculatePriceStats(prices)

      const ages = listings
        .map(l => l.listingAgeDays)
        .filter((a): a is number => a !== null)
        .sort((a, b) => a - b)
      const listingAgeDaysMedian = ages.length > 0 ? ages[Math.floor(ages.length / 2)] : null

      const qualityScore = computeQuality(listings, query)

      const result: ProviderResult = {
        source: 'ebay',
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

      // Cache the result
      setCachedComps('ebay', query.make, query.model, query.year, query.fuel, regionBand, result)

      return result
    } catch (err) {
      return {
        ...emptyResult,
        error: err instanceof Error ? err.message : 'eBay fetch failed',
      }
    }
  },
}
