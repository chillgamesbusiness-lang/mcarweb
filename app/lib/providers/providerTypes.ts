/**
 * Market Comps Provider — Shared types for all market data providers.
 *
 * Each provider returns normalised CompResult objects.
 * The orchestrator merges and deduplicates across providers.
 */

// ── Single comparable listing ─────────────────────────────────────────────────

export interface CompListing {
  source: string              // 'ebay' | 'internal' | etc.
  title: string               // listing title (anonymised for display)
  price: number               // listing/sold price in GBP
  year: number
  mileage: number | null
  fuel: string | null
  engineCC: number | null
  transmission: string | null
  bodyType: string | null
  colour: string | null
  listingAgeDays: number | null
  location: string | null     // region hint
  url: string | null          // anonymised or null
}

// ── Provider result (what each provider returns) ──────────────────────────────

export interface ProviderResult {
  source: string
  query: string               // the search query used
  sampleCount: number
  priceStats: {
    min: number
    median: number
    p25: number
    p75: number
    max: number
  } | null
  listingAgeDaysMedian: number | null
  geoHint: 'uk_wide' | 'local'
  qualityScore: number        // 0–100
  listings: CompListing[]
  error: string | null
  cachedAt: string | null
}

// ── Provider interface ────────────────────────────────────────────────────────

export interface CompProviderQuery {
  make: string
  model: string
  year: number
  fuel: string
  engineCC: number | null
  mileage: number
  postcode: string
}

export interface CompProvider {
  name: string
  enabled: boolean
  /** Fetch comparable listings. Must handle its own rate limiting + caching. */
  fetchComps(query: CompProviderQuery): Promise<ProviderResult>
}

// ── Merged comps result (from orchestrator) ──────────────────────────────────

export interface MergedCompsResult {
  providers: ProviderResult[]
  allListings: CompListing[]
  sampleCount: number
  priceStats: {
    min: number
    median: number
    p25: number
    p75: number
    max: number
  } | null
  overallQuality: number      // weighted average of provider quality scores
}
