/**
 * Valuation Cache — In-memory TTL cache for live valuation results.
 *
 * Key: normalised make_model_yearBand
 * TTL: 6 hours (configurable)
 *
 * Prevents re-scraping the same vehicle spec within the TTL window.
 * Production: swap for Redis/Upstash if needed.
 */

import type { ValuationCacheEntry, LiveValuationResult, CleanListing } from '@/lib/liveValuation/types'

// ── Config ─────────────────────────────────────────────────────────────────────

const DEFAULT_TTL_MS = 6 * 60 * 60 * 1000  // 6 hours

const cache = new Map<string, ValuationCacheEntry>()

// ── Key builder ────────────────────────────────────────────────────────────────

export function buildCacheKey(
  make: string,
  model: string,
  yearBand: string,
  fuel?: string,
): string {
  const parts = [
    make.toLowerCase().trim(),
    model.toLowerCase().trim(),
    yearBand,
  ]
  if (fuel) parts.push(fuel.toLowerCase())
  return parts.join('_')
}

export function getYearBand(year: number): string {
  // Group into 3-year bands: 2020-2022, 2023-2025, etc.
  const bandStart = Math.floor(year / 3) * 3
  return `${bandStart}-${bandStart + 2}`
}

// ── Public API ─────────────────────────────────────────────────────────────────

export function getCachedValuation(
  make: string,
  model: string,
  year: number,
  fuel?: string,
  ttlMs: number = DEFAULT_TTL_MS,
): { result: LiveValuationResult; listings: CleanListing[] } | null {
  const key = buildCacheKey(make, model, getYearBand(year), fuel)
  const entry = cache.get(key)
  if (!entry) return null

  const age = Date.now() - entry.storedAt
  if (age > ttlMs) {
    cache.delete(key)
    return null
  }

  return { result: entry.result, listings: entry.listings }
}

export function setCachedValuation(
  make: string,
  model: string,
  year: number,
  fuel: string | undefined,
  result: LiveValuationResult,
  listings: CleanListing[],
): void {
  const key = buildCacheKey(make, model, getYearBand(year), fuel)
  cache.set(key, { result, listings, storedAt: Date.now() })
}

export function clearValuationCache(): void {
  cache.clear()
}

export function evictStaleEntries(ttlMs: number = DEFAULT_TTL_MS): number {
  const now = Date.now()
  let evicted = 0
  for (const [key, entry] of cache) {
    if (now - entry.storedAt > ttlMs) {
      cache.delete(key)
      evicted++
    }
  }
  return evicted
}
