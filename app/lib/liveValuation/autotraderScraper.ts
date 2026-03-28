/**
 * AutoTrader Scraper — Fetches live UK car listings from AutoTrader.
 *
 * Strategy:
 *  - Uses AutoTrader's search results JSON embedded in page markup
 *  - Extracts only required fields (price, mileage, year, fuel, transmission)
 *  - Rate-limited via scraperUtils (2 req/sec max)
 *  - Retry with exponential backoff
 *  - Discards "from £X" promotional listings
 *
 * AutoTrader embeds structured JSON-LD and data attributes in their search
 * results pages. We extract from the JSON data payloads rather than
 * scraping HTML, which is more reliable and resistant to layout changes.
 */

import type { RawListing, ScraperQuery } from '@/lib/liveValuation/types'
import {
  fetchWithRetry,
  extractPrice,
  extractYear,
  stripHtml,
} from '@/lib/liveValuation/scraperUtils'

// ── Constants ──────────────────────────────────────────────────────────────────

const BASE_URL = 'https://www.autotrader.co.uk/car-search'
const MAX_PAGES = 3        // Max pages to scrape (13 results/page ≈ 39 listings)
const RESULTS_PER_PAGE = 13

// ── Build search URL ───────────────────────────────────────────────────────────

function buildSearchUrl(query: ScraperQuery, page: number): string {
  const params = new URLSearchParams()
  params.set('make', query.make)
  params.set('model', query.model)
  params.set('sort', 'relevance')
  params.set('postcode', query.postcode || 'SW1A 1AA')
  params.set('radius', '1500')    // UK-wide
  params.set('page', String(page))

  if (query.yearMin) params.set('year-from', String(query.yearMin))
  if (query.yearMax) params.set('year-to', String(query.yearMax))
  if (query.fuel) {
    const fuelMap: Record<string, string> = {
      petrol: 'Petrol',
      diesel: 'Diesel',
      electric: 'Electric',
      hybrid: 'Hybrid',
    }
    const mapped = fuelMap[query.fuel.toLowerCase()]
    if (mapped) params.set('fuel-type', mapped)
  }

  return `${BASE_URL}?${params.toString()}`
}

// ── Parse listings from AutoTrader HTML ────────────────────────────────────────

function parseListingsFromHtml(html: string): RawListing[] {
  const listings: RawListing[] = []

  // AutoTrader embeds listing data in JSON-LD script blocks and
  // structured data-* attributes. Try JSON-LD first.
  const jsonLdMatches = html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)
  for (const match of jsonLdMatches) {
    try {
      const data = JSON.parse(match[1])
      if (data['@type'] === 'Car' || data['@type'] === 'Vehicle') {
        const listing = parseJsonLdCar(data)
        if (listing) listings.push(listing)
      }
      if (Array.isArray(data['@graph'])) {
        for (const item of data['@graph']) {
          if (item['@type'] === 'Car' || item['@type'] === 'Vehicle') {
            const listing = parseJsonLdCar(item)
            if (listing) listings.push(listing)
          }
        }
      }
    } catch {
      // Not valid JSON-LD, skip
    }
  }

  // Fallback: parse from listing card patterns in HTML
  if (listings.length === 0) {
    const cardPattern = /data-testid="trader-seller-listing"[\s\S]*?<\/article>/gi
    const cards = html.matchAll(cardPattern)
    for (const card of cards) {
      const listing = parseListingCard(card[0])
      if (listing) listings.push(listing)
    }
  }

  // Secondary fallback: look for __NEXT_DATA__ JSON payload
  if (listings.length === 0) {
    const nextDataMatch = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i)
    if (nextDataMatch) {
      try {
        const nextData = JSON.parse(nextDataMatch[1])
        const pageData = nextData?.props?.pageProps
        if (pageData) {
          const searchResults = pageData.listings || pageData.searchResults || pageData.results
          if (Array.isArray(searchResults)) {
            for (const item of searchResults) {
              const listing = parseNextDataListing(item)
              if (listing) listings.push(listing)
            }
          }
        }
      } catch {
        // Not parseable, fall through
      }
    }
  }

  return listings
}

// ── Parse individual listing formats ───────────────────────────────────────────

function parseJsonLdCar(data: Record<string, unknown>): RawListing | null {
  try {
    const name = String(data.name || data.description || '')
    const offers = data.offers as Record<string, unknown> | undefined

    let price: number | null = null
    if (offers?.price) {
      price = typeof offers.price === 'number' ? offers.price : extractPrice(String(offers.price))
    }
    if (!price) return null

    // Skip "from £X" promotional prices
    if (offers?.priceSpecification || name.toLowerCase().includes('from £')) return null

    const year = extractYear(name) ?? (typeof data.modelDate === 'string' ? parseInt(data.modelDate, 10) : null)
    if (!year) return null

    let mileage: number | null = null
    if (data.mileageFromOdometer) {
      const mObj = data.mileageFromOdometer as Record<string, unknown>
      mileage = typeof mObj.value === 'number' ? mObj.value : extractPrice(String(mObj.value || ''))
    }

    const fuel = typeof data.fuelType === 'string' ? data.fuelType : null
    const transmission = typeof data.vehicleTransmission === 'string' ? data.vehicleTransmission : null

    return {
      price,
      mileage,
      year,
      fuel,
      transmission,
      title: name.slice(0, 200),
      source: 'autotrader',
      timestamp: Date.now(),
      url: typeof data.url === 'string' ? data.url : null,
    }
  } catch {
    return null
  }
}

function parseListingCard(cardHtml: string): RawListing | null {
  try {
    const text = stripHtml(cardHtml)

    // Price: look for £ followed by digits
    const priceMatch = text.match(/£\s*([\d,]+)/i)
    if (!priceMatch) return null
    const price = parseInt(priceMatch[1].replace(/,/g, ''), 10)
    if (isNaN(price) || price < 500) return null

    // Skip "from" prices
    if (/from\s*£/i.test(text)) return null

    const year = extractYear(text)
    if (!year) return null

    // Mileage
    let mileage: number | null = null
    const mileageMatch = text.match(/([\d,]+)\s*(?:miles?|mi)/i)
    if (mileageMatch) {
      mileage = parseInt(mileageMatch[1].replace(/,/g, ''), 10)
    }

    // Fuel
    let fuel: string | null = null
    if (/\bpetrol\b/i.test(text)) fuel = 'Petrol'
    else if (/\bdiesel\b/i.test(text)) fuel = 'Diesel'
    else if (/\belectric\b/i.test(text)) fuel = 'Electric'
    else if (/\bhybrid\b/i.test(text)) fuel = 'Hybrid'

    // Transmission
    let transmission: string | null = null
    if (/\bautomatic\b/i.test(text)) transmission = 'Automatic'
    else if (/\bmanual\b/i.test(text)) transmission = 'Manual'

    // Title: first 200 chars of visible text
    const title = text.slice(0, 200).trim()

    return {
      price,
      mileage,
      year,
      fuel,
      transmission,
      title,
      source: 'autotrader',
      timestamp: Date.now(),
      url: null,
    }
  } catch {
    return null
  }
}

function parseNextDataListing(item: Record<string, unknown>): RawListing | null {
  try {
    const price = typeof item.price === 'number'
      ? item.price
      : typeof item.price === 'string'
        ? parseInt(item.price.replace(/[^0-9]/g, ''), 10)
        : null
    if (!price || price < 500) return null

    // Skip promotional
    if (item.priceIndicator === 'FROM' || item.isPromoted) return null

    const year = typeof item.year === 'number'
      ? item.year
      : typeof item.yearOfManufacture === 'number'
        ? item.yearOfManufacture
        : extractYear(String(item.title || ''))
    if (!year) return null

    let mileage: number | null = null
    if (typeof item.mileage === 'number') mileage = item.mileage
    else if (typeof item.mileage === 'string') {
      mileage = parseInt(item.mileage.replace(/[^0-9]/g, ''), 10)
      if (isNaN(mileage)) mileage = null
    }

    const fuel = typeof item.fuelType === 'string' ? item.fuelType : null
    const transmission = typeof item.transmission === 'string' ? item.transmission : null
    const title = typeof item.title === 'string' ? item.title.slice(0, 200) : 'Unknown'

    return {
      price,
      mileage,
      year,
      fuel,
      transmission,
      title,
      source: 'autotrader',
      timestamp: Date.now(),
      url: typeof item.url === 'string' ? item.url : null,
    }
  } catch {
    return null
  }
}

// ── Main scraper function ──────────────────────────────────────────────────────

/**
 * Scrape AutoTrader for live UK car listings.
 * Returns raw listings (pre-cleaning).
 * Handles paginated results up to MAX_PAGES.
 */
export async function scrapeAutoTrader(query: ScraperQuery): Promise<RawListing[]> {
  const allListings: RawListing[] = []

  for (let page = 1; page <= MAX_PAGES; page++) {
    try {
      const url = buildSearchUrl(query, page)
      const html = await fetchWithRetry(url, { timeoutMs: 12_000 })

      const listings = parseListingsFromHtml(html)
      if (listings.length === 0 && page > 1) break // No more results

      allListings.push(...listings)

      // If we got fewer than expected, no more pages
      if (listings.length < RESULTS_PER_PAGE * 0.5) break

      // Small random delay between pages
      if (page < MAX_PAGES) {
        await new Promise(r => setTimeout(r, 500 + Math.random() * 1000))
      }
    } catch (err) {
      console.warn(`[autotrader] Page ${page} failed:`, err instanceof Error ? err.message : err)
      break // Don't keep trying if one page fails
    }
  }

  return allListings
}
