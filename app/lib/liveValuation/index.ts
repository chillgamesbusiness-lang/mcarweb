/**
 * Live Valuation Intelligence Engine — Public API.
 *
 * Usage:
 *   import { computeLiveValuation } from '@/lib/liveValuation'
 *
 *   const result = await computeLiveValuation({
 *     make: 'FORD',
 *     model: 'FIESTA',
 *     year: 2019,
 *     mileage: 45000,
 *     fuel: 'PETROL',
 *   })
 */

export { computeLiveValuation } from '@/lib/liveValuation/valuationEngine'
export type { LiveValuationInput } from '@/lib/liveValuation/valuationEngine'
export type { LiveValuationResult, RawListing, CleanListing, ScraperQuery } from '@/lib/liveValuation/types'
export { cleanListings, normaliseFuel, normaliseTransmission } from '@/lib/liveValuation/dataCleaner'
export { removeOutliers, getMedian, getPercentile, getMAD } from '@/lib/liveValuation/outlierDetection'
export { clearValuationCache } from '@/lib/liveValuation/cache'
