/**
 * eBay Motors Scraper — Fetches live UK car listings from eBay Motors.
 *
 * Strategy:
 *  - Uses eBay's search results page (category 9801 = Cars)
 *  - Extracts structured data from search result cards
 *  - Falls back to JSON-LD or HTML parsing if needed
 *  - Rate-limited via scraperUtils
 *  - Complements the existing eBay Browse API provider
 *
 * This is a secondary source — AutoTrader is primary.
 */

import type { RawListing, ScraperQuery } from '@/lib/liveValuation/types'
import {
  fetchWithRetry,
  extractPrice,
  extractYear,
  stripHtml,
} from '@/lib/liveValuation/scraperUtils'

// ── Constants ──────────────────────────────────────────────────────────────────

const CARS_CATEGORY = 9801
const MAX_PAGES = 2        // 50 results/page on eBay ≈ 100 listings max
const RESULTS_PER_PAGE = 50

// ── Build search URL ───────────────────────────────────────────────────────────

function buildSearchUrl(query: ScraperQuery, page: number): string {
  const params = new URLSearchParams()
  params.set('_sacat', String(CARS_CATEGORY))
  params.set('LH_PrefLoc', '1')          // UK only
  params.set('_sop', '12')               // Sort: Best match
  params.set('LH_BIN', '1')              // Buy It Now only (no auctions)
  params.set('_ipg', String(RESULTS_PER_PAGE))

  // Build query string
  const parts = [query.make, query.model]
  if (query.yearMin && query.yearMax) {
    parts.push(`${query.yearMin}-${query.yearMax}`)
  } else if (query.yearMin) {
    parts.push(String(query.yearMin))
  }
  if (query.fuel) parts.push(query.fuel)
  params.set('_nkw', parts.join(' '))

  if (page > 1) {
    params.set('_pgn', String(page))
  }

  return `https://www.ebay.co.uk/sch/Cars/9801/i.html?${params.toString()}`
}

// ── Parse listings from eBay HTML ──────────────────────────────────────────────

function parseListingsFromHtml(html: string): RawListing[] {
  const listings: RawListing[] = []

  // eBay search results are in <li> items with s-item class
  const itemPattern = /class="s-item\s[^"]*"[\s\S]*?<\/li>/gi
  const items = html.matchAll(itemPattern)

  for (const item of items) {
    const listing = parseSearchItem(item[0])
    if (listing) listings.push(listing)
  }

  // Fallback: try JSON-LD
  if (listings.length === 0) {
    const jsonLdBlocks = html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)
    for (const block of jsonLdBlocks) {
      try {
        const data = JSON.parse(block[1])
        const items = data.itemListElement || (Array.isArray(data) ? data : [data])
        for (const entry of items) {
          const item = entry.item || entry
          if (item['@type'] === 'Car' || item['@type'] === 'Vehicle' || item['@type'] === 'Product') {
            const listing = parseJsonLdItem(item)
            if (listing) listings.push(listing)
          }
        }
      } catch {
        // skip
      }
    }
  }

  return listings
}

// ── Parse individual items ─────────────────────────────────────────────────────

function parseSearchItem(itemHtml: string): RawListing | null {
  try {
    const text = stripHtml(itemHtml)

    // Skip "Shop on eBay" promotional items
    if (/shop on ebay/i.test(text)) return null

    // Price
    const priceMatch = text.match(/£\s*([\d,]+(?:\.\d{2})?)/i)
    if (!priceMatch) return null
    const price = parseFloat(priceMatch[1].replace(/,/g, ''))
    if (isNaN(price) || price < 500 || price > 100_000) return null

    // Skip "from" prices
    if (/from\s*£/i.test(text)) return null

    // Year
    const year = extractYear(text)
    if (!year) return null

    // Mileage
    let mileage: number | null = null
    const mileageMatch = text.match(/([\d,]+)\s*(?:miles?|mi)\b/i)
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

    // URL
    let url: string | null = null
    const urlMatch = itemHtml.match(/href="(https:\/\/www\.ebay\.co\.uk\/itm\/[^"]+)"/i)
    if (urlMatch) url = urlMatch[1]

    const title = text.slice(0, 200).trim()

    return {
      price,
      mileage,
      year,
      fuel,
      transmission,
      title,
      source: 'ebay',
      timestamp: Date.now(),
      url,
    }
  } catch {
    return null
  }
}

function parseJsonLdItem(data: Record<string, unknown>): RawListing | null {
  try {
    const name = String(data.name || '')
    let price: number | null = null

    if (data.offers) {
      const offers = data.offers as Record<string, unknown>
      if (offers.price) {
        price = typeof offers.price === 'number' ? offers.price : extractPrice(String(offers.price))
      }
    }
    if (!price || price < 500 || price > 100_000) return null

    const year = extractYear(name)
    if (!year) return null

    return {
      price,
      mileage: null,
      year,
      fuel: typeof data.fuelType === 'string' ? data.fuelType : null,
      transmission: typeof data.vehicleTransmission === 'string' ? data.vehicleTransmission : null,
      title: name.slice(0, 200),
      source: 'ebay',
      timestamp: Date.now(),
      url: typeof data.url === 'string' ? data.url : null,
    }
  } catch {
    return null
  }
}

// ── Main scraper function ──────────────────────────────────────────────────────

/**
 * Scrape eBay Motors for live UK car listings.
 * Returns raw listings (pre-cleaning).
 */
export async function scrapeEbayMotors(query: ScraperQuery): Promise<RawListing[]> {
  const allListings: RawListing[] = []

  for (let page = 1; page <= MAX_PAGES; page++) {
    try {
      const url = buildSearchUrl(query, page)
      const html = await fetchWithRetry(url, { timeoutMs: 12_000 })

      const listings = parseListingsFromHtml(html)
      if (listings.length === 0 && page > 1) break

      allListings.push(...listings)

      if (listings.length < RESULTS_PER_PAGE * 0.3) break

      if (page < MAX_PAGES) {
        await new Promise(r => setTimeout(r, 800 + Math.random() * 1200))
      }
    } catch (err) {
      console.warn(`[ebay] Page ${page} failed:`, err instanceof Error ? err.message : err)
      break
    }
  }

  return allListings
}
