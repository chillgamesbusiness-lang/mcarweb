export const CANONICAL_VALUATION_ENGINE = 'pricingEngine.calculateValuation:v3.0'

export function isExperimentalLiveValuationEnabled(): boolean {
  return process.env.ENABLE_EXPERIMENTAL_LIVE_VALUATION === 'true' && process.env.NODE_ENV !== 'production'
}