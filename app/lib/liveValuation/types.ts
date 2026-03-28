/**
 * Live Valuation Intelligence Engine — Types
 *
 * Deterministic, production-grade valuation from live UK listings.
 * Falls back to MARKET_DATA v3 when live data is insufficient.
 */

// ── Raw listing from scrapers ──────────────────────────────────────────────────

export interface RawListing {
  price: number
  mileage: number | null
  year: number
  fuel: string | null
  transmission: string | null
  title: string
  source: 'autotrader' | 'ebay'
  timestamp: number       // epoch ms when listing was scraped
  url: string | null
}

// ── Cleaned listing (post-pipeline) ────────────────────────────────────────────

export interface CleanListing {
  price: number
  mileage: number
  year: number
  fuel: string
  transmission: string
  title: string
  source: 'autotrader' | 'ebay'
  timestamp: number
}

// ── Scraper query input ────────────────────────────────────────────────────────

export interface ScraperQuery {
  make: string
  model: string
  yearMin?: number
  yearMax?: number
  fuel?: string
  postcode?: string
}

// ── Valuation result (final output) ────────────────────────────────────────────

export interface LiveValuationResult {
  make: string
  model: string
  year: number
  mileage: number

  valuation: number
  range: {
    low: number
    high: number
  }

  confidence: number        // 0–100
  sampleSize: number

  dataSource: 'live' | 'fallback'

  flags: {
    lowSample?: boolean
    highVariance?: boolean
    staleData?: boolean
    mileageAdjusted?: boolean
    outlierFiltered?: boolean
    evSplit?: boolean
    fallbackReason?: string
  }

  // Admin detail
  debug?: {
    rawListingCount: number
    cleanListingCount: number
    outlierCount: number
    medianPrice: number
    madValue: number
    mileageAdjustment: number
    freshnessDecay: number
    sources: Record<string, number>
  }
}

// ── Cache entry ────────────────────────────────────────────────────────────────

export interface ValuationCacheEntry {
  result: LiveValuationResult
  listings: CleanListing[]
  storedAt: number
}
