/**
 * Resale Evidence Engine v4 — Orchestrator.
 *
 * Replaces the simple "adjustedValue × 1.20" profit simulation with a
 * multi-source evidence engine that estimates realistic resale, sell costs,
 * time-to-sell risk, and profit distribution.
 *
 * Architecture:
 *   1. Base Resale Model (deterministic, always available)
 *   2. Market Comps Layer (eBay + future providers)
 *   3. Spec Similarity + normalised pricing
 *   4. Time-to-Sell discounting
 *   5. Segmented sell costs
 *   6. Confidence scoring + explainability
 *
 * The engine is designed for shadow-mode deployment: it computes v4 results
 * alongside the existing v3 profit simulation. The caller decides which
 * to use based on promotion rules.
 */

import type { RiskTier, Volatility, QuoteMode, MarketMatchQuality } from '@/lib/types'
import type { VehicleSegment, HeatLevel } from '@/lib/segmentPricing'
import { ebayProvider } from '@/lib/providers/ebayProvider'
import type { CompProviderQuery, MergedCompsResult, ProviderResult, CompListing } from '@/lib/providers/providerTypes'
import { scoreAndFilterComps, type SpecVector } from '@/lib/specSimilarity'
import { estimateTimeToSell, type TimeToSellResult } from '@/lib/timeToSell'
import { estimateSellCosts, type SellCostBreakdown } from '@/lib/sellCostModel'

// ── Types ──────────────────────────────────────────────────────────────────────

export type ConfidenceLevel = 'high' | 'medium' | 'low'

export interface ResaleEstimate {
  low: number
  mid: number
  high: number
}

export interface ProfitEstimate {
  low: number
  mid: number
  high: number
}

export interface EvidencePayload {
  compsSummary: string              // "23 comparable listings (median £X)"
  variance: string                  // "Low" / "Moderate" / "High"
  similarityThreshold: number       // threshold actually used
  compCount: number
  providers: string[]               // which providers contributed
}

export interface AdjustmentDriver {
  factor: string
  impact: string                    // e.g. "+3%", "-£200"
  direction: 'positive' | 'negative' | 'neutral'
}

export interface CostsAndTimePayload {
  sellCostBreakdown: SellCostBreakdown
  timeToSell: TimeToSellResult
}

export interface ProfitSimulationV4 {
  // ── Compact view (Chachu sees this) ──────────────────────────────────
  resale: ResaleEstimate
  profit: ProfitEstimate
  marginPctMid: number              // single margin %
  confidence: ConfidenceLevel
  confidenceScore: number           // 0–100 raw score
  compactNote: string               // one-line explanation

  // ── Detail payloads (behind "Show details") ──────────────────────────
  evidence: EvidencePayload
  adjustmentDrivers: AdjustmentDriver[]
  costsAndTime: CostsAndTimePayload
  topComps: CompListing[]           // top 10 anonymised comps (admin only)

  // ── Guardrails ───────────────────────────────────────────────────────
  guardrailTriggered: boolean
  guardrailReason: string | null

  // ── Shadow mode: store delta vs v3 ──────────────────────────────────
  v3ProfitMidDelta: number | null
}

// ── Risk-tier dynamic margins (spec §1) ────────────────────────────────────────

const RISK_TIER_MARGINS: Record<RiskTier, number> = {
  low: 1.22,
  medium: 1.18,
  high: 1.14,
  manual_only: 1.10,
}

// ── Segment overrides (spec §1) ────────────────────────────────────────────────

function getSegmentMarginOverride(
  segment: VehicleSegment,
  heatLevel: HeatLevel,
  ulezCompliant: boolean,
): number {
  let override = 1.0

  // EV 8+ years: cap resale margin lower (battery anxiety)
  if (segment === 'ev_aging') override *= 0.95

  // Old diesels + non-ULEZ: lower margin
  if (segment === 'diesel_old' && !ulezCompliant) override *= 0.93
  else if (segment === 'diesel_old') override *= 0.96
  else if (segment === 'diesel_aging' && !ulezCompliant) override *= 0.96

  // Hot segment: slightly higher margin (demand is strong)
  if (heatLevel === 'cool') override *= 1.02

  return override
}

// ── Confidence scorer (spec §6) ────────────────────────────────────────────────

function computeConfidenceScore(input: {
  compsQuality: number          // 0–100 from merged comps
  compsCount: number
  priceVariance: 'low' | 'moderate' | 'high'
  reconEstimate: number
  tradeBase: number
  matchQuality: MarketMatchQuality
  heatLevel: HeatLevel
  riskTier: RiskTier
}): { score: number; level: ConfidenceLevel } {
  let score = 80 // start at 80 per spec

  // Weak market comps
  if (input.compsCount < 5) score -= 15
  else if (input.compsCount < 10) score -= 8
  else if (input.compsCount < 20) score -= 3

  // Comp quality
  if (input.compsQuality < 30) score -= 15
  else if (input.compsQuality < 50) score -= 8

  // High variance
  if (input.priceVariance === 'high') score -= 12
  else if (input.priceVariance === 'moderate') score -= 5

  // Fuzzy match quality
  if (input.matchQuality === 'none' || input.matchQuality === 'partial') score -= 12
  else if (input.matchQuality === 'year_fuzzy' || input.matchQuality === 'fuel_fuzzy') score -= 6

  // High recon uncertainty
  const reconPct = input.tradeBase > 0 ? input.reconEstimate / input.tradeBase : 0
  if (reconPct > 0.15) score -= 8
  else if (reconPct > 0.10) score -= 4

  // Hot segment
  if (input.heatLevel === 'hot') score -= 8
  else if (input.heatLevel === 'warm') score -= 3

  // Risk tier
  if (input.riskTier === 'manual_only') score -= 10
  else if (input.riskTier === 'high') score -= 5

  score = Math.max(0, Math.min(100, score))

  let level: ConfidenceLevel = 'high'
  if (score < 45) level = 'low'
  else if (score < 70) level = 'medium'

  return { score, level }
}

// ── Merge provider results ─────────────────────────────────────────────────────

function mergeProviderResults(results: ProviderResult[]): MergedCompsResult {
  const allListings: CompListing[] = []
  let totalQuality = 0
  let totalWeight = 0

  for (const r of results) {
    allListings.push(...r.listings)
    if (r.sampleCount > 0) {
      totalQuality += r.qualityScore * r.sampleCount
      totalWeight += r.sampleCount
    }
  }

  // Deduplicate by title+price
  const seen = new Set<string>()
  const deduped = allListings.filter(l => {
    const key = `${l.title}|${l.price}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  const prices = deduped.map(l => l.price).sort((a, b) => a - b)
  const n = prices.length

  return {
    providers: results,
    allListings: deduped,
    sampleCount: deduped.length,
    priceStats: n > 0 ? {
      min: prices[0],
      p25: prices[Math.floor(n * 0.25)] ?? prices[0],
      median: prices[Math.floor(n * 0.5)] ?? prices[0],
      p75: prices[Math.floor(n * 0.75)] ?? prices[n - 1],
      max: prices[n - 1],
    } : null,
    overallQuality: totalWeight > 0 ? Math.round(totalQuality / totalWeight) : 0,
  }
}

// ── Price variance classification ──────────────────────────────────────────────

function classifyVariance(prices: number[]): 'low' | 'moderate' | 'high' {
  if (prices.length < 3) return 'high' // insufficient data = high uncertainty
  const mean = prices.reduce((a, b) => a + b, 0) / prices.length
  const cv = Math.sqrt(prices.reduce((s, p) => s + (p - mean) ** 2, 0) / prices.length) / mean
  if (cv < 0.15) return 'low'
  if (cv < 0.35) return 'moderate'
  return 'high'
}

// ── Main orchestrator ──────────────────────────────────────────────────────────

export async function buildProfitSimulationV4(input: {
  // Vehicle spec
  make: string
  model: string
  year: number
  fuel: string
  engineCC: number | null
  mileage: number
  ulezCompliant: boolean
  colour: string | null
  postcode: string
  // Engine outputs
  adjustedValue: number
  tradeBase: number
  reconEstimate: number
  min: number
  max: number
  midpoint: number
  riskTier: RiskTier
  quoteMode: QuoteMode
  matchQuality: MarketMatchQuality
  volatility: Volatility
  segment: VehicleSegment
  heatLevel: HeatLevel
  confidenceScore: number
  // For delta tracking
  v3ProfitMid: number | null
}): Promise<ProfitSimulationV4> {

  // ── 1. Base Resale Model ─────────────────────────────────────────────
  const riskMargin = RISK_TIER_MARGINS[input.riskTier]
  const segmentOverride = getSegmentMarginOverride(input.segment, input.heatLevel, input.ulezCompliant)
  const effectiveMargin = riskMargin * segmentOverride

  const baseResaleMid = Math.round(input.adjustedValue * effectiveMargin)
  const baseResaleLow = Math.round(baseResaleMid * 0.92)
  const baseResaleHigh = Math.round(baseResaleMid * 1.08)

  // ── 2. Market Comps Layer ────────────────────────────────────────────
  const providerQuery: CompProviderQuery = {
    make: input.make,
    model: input.model,
    year: input.year,
    fuel: input.fuel,
    engineCC: input.engineCC,
    mileage: input.mileage,
    postcode: input.postcode,
  }

  const providerResults: ProviderResult[] = []

  // Fetch from all enabled providers in parallel
  try {
    if (ebayProvider.enabled) {
      const ebayResult = await ebayProvider.fetchComps(providerQuery)
      providerResults.push(ebayResult)
    }
  } catch {
    // Provider failure = graceful degradation to baseline
  }

  const merged = mergeProviderResults(providerResults)

  // ── 3. Spec Similarity + Normalised Pricing ─────────────────────────
  const specVector: SpecVector = {
    make: input.make,
    model: input.model,
    year: input.year,
    fuel: input.fuel,
    engineCC: input.engineCC,
    mileage: input.mileage,
    ulezCompliant: input.ulezCompliant,
    colour: input.colour,
    regionBand: null, // could enrich from postcodes.io
  }

  const similarityResult = scoreAndFilterComps(specVector, merged.allListings)

  // ── Blend base resale with comps (if available) ─────────────────────
  let resaleMid = baseResaleMid
  let resaleLow = baseResaleLow
  let resaleHigh = baseResaleHigh

  if (similarityResult.normalisedMedian !== null && similarityResult.keptComps.length >= 3) {
    // Blend: weight comps more as quality + count increase
    const compsMedian = similarityResult.normalisedMedian
    const compsWeight = Math.min(0.6, merged.overallQuality / 100 * 0.7)
    const baseWeight = 1 - compsWeight

    // Anti-fantasy cap: comps can't push resale above 140% of adjustedValue
    const cappedCompsMedian = Math.min(compsMedian, input.adjustedValue * 1.40)

    resaleMid = Math.round(baseResaleMid * baseWeight + cappedCompsMedian * compsWeight)

    if (similarityResult.normalisedP25 !== null && similarityResult.normalisedP75 !== null) {
      const cappedP25 = Math.min(similarityResult.normalisedP25, input.adjustedValue * 1.35)
      const cappedP75 = Math.min(similarityResult.normalisedP75, input.adjustedValue * 1.45)
      resaleLow = Math.round(baseResaleLow * baseWeight + cappedP25 * compsWeight)
      resaleHigh = Math.round(baseResaleHigh * baseWeight + cappedP75 * compsWeight)
    }
  }

  // Ensure ordering
  if (resaleLow > resaleMid) resaleLow = Math.round(resaleMid * 0.92)
  if (resaleHigh < resaleMid) resaleHigh = Math.round(resaleMid * 1.08)

  // ── 4. Time-to-Sell Discounting ──────────────────────────────────────
  const timeToSell = estimateTimeToSell({
    volatility: input.volatility,
    heatLevel: input.heatLevel,
    segment: input.segment,
    riskTier: input.riskTier,
    mileage: input.mileage,
    ulezCompliant: input.ulezCompliant,
    reconEstimate: input.reconEstimate,
    tradeBase: input.tradeBase,
    listingAgeDaysMedian: merged.providers[0]?.listingAgeDaysMedian ?? null,
  })

  // Apply time risk discount to resale
  const timeDiscount = 1 - timeToSell.timeRiskDiscountPct
  resaleLow = Math.round(resaleLow * timeDiscount)
  resaleMid = Math.round(resaleMid * timeDiscount)
  resaleHigh = Math.round(resaleHigh * timeDiscount)

  // ── 5. Sell Costs ────────────────────────────────────────────────────
  const sellCosts = estimateSellCosts(resaleMid, input.segment)

  // ── 6. Profit Calculation ────────────────────────────────────────────
  // Profit = net resale - recon - purchase price
  // purchase price = what we pay the seller (min/mid/max from engine)
  const recon = Math.round(input.reconEstimate)

  const profitLow = (resaleLow - sellCosts.totalGBP) - recon - input.max    // worst: low resale, paid max
  const profitMid = (resaleMid - sellCosts.totalGBP) - recon - input.midpoint
  const profitHigh = (resaleHigh - sellCosts.totalGBP) - recon - input.min   // best: high resale, paid min

  // Margin % (mid)
  const marginPctMid = resaleMid > 0 ? Math.round((profitMid / resaleMid) * 100) : 0

  // ── 7. Confidence Score ──────────────────────────────────────────────
  const priceVariance = merged.allListings.length > 0
    ? classifyVariance(merged.allListings.map(l => l.price))
    : 'high'

  const { score: confScore, level: confidence } = computeConfidenceScore({
    compsQuality: merged.overallQuality,
    compsCount: similarityResult.keptComps.length,
    priceVariance,
    reconEstimate: input.reconEstimate,
    tradeBase: input.tradeBase,
    matchQuality: input.matchQuality,
    heatLevel: input.heatLevel,
    riskTier: input.riskTier,
  })

  // ── 8. Evidence Payload ──────────────────────────────────────────────
  const evidence: EvidencePayload = {
    compsSummary: similarityResult.keptComps.length > 0
      ? `${similarityResult.keptComps.length} comparable listings (median £${(similarityResult.normalisedMedian ?? 0).toLocaleString()})`
      : 'No market comps available — using baseline model only',
    variance: priceVariance === 'low' ? 'Low' : priceVariance === 'moderate' ? 'Moderate' : 'High',
    similarityThreshold: similarityResult.thresholdUsed,
    compCount: similarityResult.keptComps.length,
    providers: providerResults.map(p => p.source),
  }

  // ── 9. Adjustment Drivers ────────────────────────────────────────────
  const adjustmentDrivers: AdjustmentDriver[] = []

  // Age
  const currentYear = new Date().getFullYear()
  const vehicleAge = currentYear - input.year
  if (vehicleAge > 10) {
    adjustmentDrivers.push({ factor: 'Age', impact: `${vehicleAge}yr — heavy depreciation`, direction: 'negative' })
  } else if (vehicleAge > 5) {
    adjustmentDrivers.push({ factor: 'Age', impact: `${vehicleAge}yr — moderate depreciation`, direction: 'negative' })
  }

  // Mileage
  if (input.mileage > 100000) {
    adjustmentDrivers.push({ factor: 'Mileage', impact: `${(input.mileage / 1000).toFixed(0)}k — high mileage discount`, direction: 'negative' })
  }

  // ULEZ
  if (!input.ulezCompliant) {
    adjustmentDrivers.push({ factor: 'ULEZ', impact: 'Non-compliant — restricted demand', direction: 'negative' })
  }

  // Recon
  if (input.reconEstimate > 0) {
    adjustmentDrivers.push({ factor: 'Recon', impact: `£${input.reconEstimate} estimated`, direction: 'negative' })
  }

  // Volatility
  if (input.volatility === 'volatile') {
    adjustmentDrivers.push({ factor: 'Volatility', impact: 'Volatile market — wider uncertainty', direction: 'negative' })
  }

  // Time risk
  if (timeToSell.timeRiskDiscountPct > 0.02) {
    adjustmentDrivers.push({
      factor: 'Time-to-Sell',
      impact: `${timeToSell.expectedDaysMid}d expected — ${(timeToSell.timeRiskDiscountPct * 100).toFixed(1)}% discount`,
      direction: 'negative',
    })
  }

  // Segment
  if (segmentOverride < 0.97) {
    adjustmentDrivers.push({ factor: 'Segment', impact: `${input.segment} — reduced margin`, direction: 'negative' })
  }

  // ── 10. Guardrails ──────────────────────────────────────────────────
  const guardrailTriggered = input.quoteMode !== 'blocked' && profitMid < 300
  const guardrailReason = guardrailTriggered
    ? `Expected profit £${profitMid} < £300 threshold`
    : null

  // ── 11. Compact note ─────────────────────────────────────────────────
  const compNote = similarityResult.keptComps.length >= 5
    ? `Estimated from ${similarityResult.keptComps.length} market comps + risk-adjusted value.`
    : 'Estimated from risk-adjusted value + segment model. Limited market data.'

  // ── 12. v3 delta ─────────────────────────────────────────────────────
  const v3ProfitMidDelta = input.v3ProfitMid !== null
    ? profitMid - input.v3ProfitMid
    : null

  // ── 13. Top comps (anonymised, sorted by similarity) ─────────────────
  const topComps = similarityResult.keptComps
    .slice(0, 10)
    .map(c => ({
      ...c.listing,
      url: null,               // anonymise
      title: c.listing.title.slice(0, 60) + '…',
    }))

  return {
    resale: { low: resaleLow, mid: resaleMid, high: resaleHigh },
    profit: { low: profitLow, mid: profitMid, high: profitHigh },
    marginPctMid,
    confidence,
    confidenceScore: confScore,
    compactNote: compNote,
    evidence,
    adjustmentDrivers,
    costsAndTime: { sellCostBreakdown: sellCosts, timeToSell },
    topComps,
    guardrailTriggered,
    guardrailReason,
    v3ProfitMidDelta,
  }
}
