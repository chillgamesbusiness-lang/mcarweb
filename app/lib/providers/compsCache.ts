/**
 * Comps Cache — In-memory + TTL cache for market comp results.
 *
 * Cache key = normalised (make, model, yearBucket, fuel, regionBand).
 * TTL = 6 hours (configurable).
 * Falls back gracefully on miss — caller retries provider.
 *
 * Production: replace with Redis/Supabase edge cache if needed.
 * For now, in-process Map is fine for serverless (per-invocation fresh,
 * but within a warm function it avoids duplicate fetches).
 */

import type { ProviderResult } from '@/lib/providers/providerTypes'

// ── Config ─────────────────────────────────────────────────────────────────────

const DEFAULT_TTL_MS = 6 * 60 * 60 * 1000  // 6 hours

interface CacheEntry {
  result: ProviderResult
  storedAt: number
}

const cache = new Map<string, CacheEntry>()

// ── Key builder ────────────────────────────────────────────────────────────────

function buildCacheKey(
  provider: string,
  make: string,
  model: string,
  year: number,
  fuel: string,
  regionBand: string
): string {
  // Year bucket: round to nearest 2 years for cache sharing
  const yearBucket = Math.round(year / 2) * 2
  return [
    provider,
    make.toLowerCase().trim(),
    model.toLowerCase().trim(),
    String(yearBucket),
    fuel.toLowerCase(),
    regionBand,
  ].join('|')
}

// ── Public API ─────────────────────────────────────────────────────────────────

export function getCachedComps(
  provider: string,
  make: string,
  model: string,
  year: number,
  fuel: string,
  regionBand: string,
  ttlMs: number = DEFAULT_TTL_MS
): ProviderResult | null {
  const key = buildCacheKey(provider, make, model, year, fuel, regionBand)
  const entry = cache.get(key)
  if (!entry) return null

  const age = Date.now() - entry.storedAt
  if (age > ttlMs) {
    cache.delete(key)
    return null
  }

  return { ...entry.result, cachedAt: new Date(entry.storedAt).toISOString() }
}

export function setCachedComps(
  provider: string,
  make: string,
  model: string,
  year: number,
  fuel: string,
  regionBand: string,
  result: ProviderResult
): void {
  const key = buildCacheKey(provider, make, model, year, fuel, regionBand)
  cache.set(key, { result, storedAt: Date.now() })
}

/** Evict stale entries (call periodically or on cache pressure). */
export function evictStale(ttlMs: number = DEFAULT_TTL_MS): number {
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

export function clearCache(): void {
  cache.clear()
}

export function cacheSize(): number {
  return cache.size
}
