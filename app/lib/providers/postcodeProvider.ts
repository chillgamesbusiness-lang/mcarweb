/**
 * Postcodes.io Provider — Free UK postcode → region/geo enrichment.
 *
 * Uses the open Postcodes.io API (no key required).
 * Returns latitude/longitude and standardised region for location signals.
 *
 * Rate limiting: polite — max 30 calls/hour, cached by postcode for 24h.
 */

// ── Types ──────────────────────────────────────────────────────────────────────

export interface PostcodeInfo {
  postcode: string
  latitude: number
  longitude: number
  region: string        // e.g. 'London', 'South East', 'North West'
  country: string       // 'England', 'Scotland', 'Wales', 'Northern Ireland'
  adminDistrict: string // e.g. 'Westminster', 'Manchester'
  cached: boolean
}

// ── Cache ──────────────────────────────────────────────────────────────────────

const postcodeCache = new Map<string, { info: PostcodeInfo; storedAt: number }>()
const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

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

// ── Normalise postcode for cache key ───────────────────────────────────────────

function normalise(postcode: string): string {
  return postcode.toUpperCase().replace(/\s/g, '').slice(0, 4)
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Look up a UK postcode via Postcodes.io.
 * Returns null if the postcode is invalid or the API is unavailable.
 */
export async function lookupPostcode(postcode: string): Promise<PostcodeInfo | null> {
  const key = normalise(postcode)

  // Check cache
  const cached = postcodeCache.get(key)
  if (cached && (Date.now() - cached.storedAt) < CACHE_TTL_MS) {
    return { ...cached.info, cached: true }
  }

  if (!canMakeCall()) return null

  try {
    recordCall()

    const res = await fetch(
      `https://api.postcodes.io/postcodes/${encodeURIComponent(postcode.trim())}`,
      { signal: AbortSignal.timeout(5000) }
    )

    if (!res.ok) {
      // Try with just the outcode (first part)
      const outcode = postcode.trim().split(/\s/)[0]
      const res2 = await fetch(
        `https://api.postcodes.io/outcodes/${encodeURIComponent(outcode)}`,
        { signal: AbortSignal.timeout(5000) }
      )
      if (!res2.ok) return null

      const data2 = await res2.json()
      const r2 = data2.result
      if (!r2) return null

      const info: PostcodeInfo = {
        postcode: outcode,
        latitude: r2.latitude ?? 0,
        longitude: r2.longitude ?? 0,
        region: Array.isArray(r2.admin_county) ? r2.admin_county[0] ?? 'Unknown' : r2.admin_county ?? 'Unknown',
        country: Array.isArray(r2.country) ? r2.country[0] ?? 'England' : r2.country ?? 'England',
        adminDistrict: Array.isArray(r2.admin_district) ? r2.admin_district[0] ?? '' : r2.admin_district ?? '',
        cached: false,
      }
      postcodeCache.set(key, { info, storedAt: Date.now() })
      return info
    }

    const data = await res.json()
    const r = data.result
    if (!r) return null

    const info: PostcodeInfo = {
      postcode: r.postcode ?? postcode,
      latitude: r.latitude ?? 0,
      longitude: r.longitude ?? 0,
      region: r.region ?? r.european_electoral_region ?? 'Unknown',
      country: r.country ?? 'England',
      adminDistrict: r.admin_district ?? '',
      cached: false,
    }

    postcodeCache.set(key, { info, storedAt: Date.now() })
    return info
  } catch {
    return null
  }
}

/**
 * Compute distance in km between two lat/lon pairs (Haversine formula).
 */
export function distanceKm(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
