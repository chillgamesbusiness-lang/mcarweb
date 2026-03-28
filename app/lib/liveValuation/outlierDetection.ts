/**
 * Outlier Detection — Median Absolute Deviation (MAD) method.
 *
 * Removes price outliers that would distort the median valuation.
 * Uses MAD (robust against outliers, unlike std deviation).
 *
 * Algorithm:
 *   median = getMedian(prices)
 *   deviation = median(|price - median|)  // MAD
 *   remove if |price - median| > threshold * deviation
 *
 * Default threshold: 2.5 (≈ 2σ equivalent for normal distribution)
 */

import type { CleanListing } from '@/lib/liveValuation/types'

// ── Statistical helpers ────────────────────────────────────────────────────────

export function getMedian(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]
}

export function getPercentile(values: number[], p: number): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const index = (p / 100) * (sorted.length - 1)
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  if (lower === upper) return sorted[lower]
  const weight = index - lower
  return sorted[lower] * (1 - weight) + sorted[upper] * weight
}

export function getMAD(values: number[]): number {
  if (values.length === 0) return 0
  const median = getMedian(values)
  const deviations = values.map(v => Math.abs(v - median))
  return getMedian(deviations)
}

// ── Outlier filter ─────────────────────────────────────────────────────────────

const DEFAULT_MAD_THRESHOLD = 2.5
const MIN_SAMPLE_FOR_OUTLIER = 5 // Don't filter outliers if too few samples

export interface OutlierResult {
  filtered: CleanListing[]
  removed: CleanListing[]
  median: number
  mad: number
  threshold: number
}

/**
 * Remove price outliers using MAD method.
 *
 * @param listings Cleaned listings to filter
 * @param threshold MAD multiplier (default 2.5)
 * @returns filtered listings + removed outliers + stats
 */
export function removeOutliers(
  listings: CleanListing[],
  threshold: number = DEFAULT_MAD_THRESHOLD,
): OutlierResult {
  if (listings.length < MIN_SAMPLE_FOR_OUTLIER) {
    return {
      filtered: [...listings],
      removed: [],
      median: getMedian(listings.map(l => l.price)),
      mad: 0,
      threshold,
    }
  }

  const prices = listings.map(l => l.price)
  const median = getMedian(prices)
  const mad = getMAD(prices)

  // If MAD is 0 (all same price), no outliers
  if (mad === 0) {
    return {
      filtered: [...listings],
      removed: [],
      median,
      mad: 0,
      threshold,
    }
  }

  const filtered: CleanListing[] = []
  const removed: CleanListing[] = []

  for (const listing of listings) {
    const deviation = Math.abs(listing.price - median)
    if (deviation > threshold * mad) {
      removed.push(listing)
    } else {
      filtered.push(listing)
    }
  }

  // Safety: if outlier removal would remove more than 40% of data,
  // something is wrong with the data — return all listings instead
  if (filtered.length < listings.length * 0.6) {
    return {
      filtered: [...listings],
      removed: [],
      median,
      mad,
      threshold,
    }
  }

  return { filtered, removed, median, mad, threshold }
}
