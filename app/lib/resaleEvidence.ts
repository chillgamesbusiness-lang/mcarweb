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

import type { RiskTier, Volatility, QuoteMode, MarketMatchQuality, Condition, FuelType } from '@/lib/types'
import type { VehicleSegment, HeatLevel, RegionBand } from '@/lib/segmentPricing'
import { detectRegionBand } from '@/lib/segmentPricing'
import { fetchAllProviders } from '@/lib/providers/providerManager'
import type { CompProviderQuery, MergedCompsResult, ProviderResult, CompListing } from '@/lib/providers/providerTypes'
import { scoreAndFilterComps, type SpecVector } from '@/lib/specSimilarity'
import { estimateTimeToSell, type TimeToSellResult } from '@/lib/timeToSell'
import { estimateSellCosts, type SellCostBreakdown } from '@/lib/sellCostModel'
import { estimateTCO, type TCOBreakdown } from '@/lib/tcoModel'

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
  tco: TCOBreakdown | null
  auctionRetailSpread: AuctionRetailSpread | null
  regionalWeighting: RegionalWeightingResult | null
}

// ── Auction vs Retail Spread ───────────────────────────────────────────────────

export interface AuctionRetailSpread {
  auctionEstimate: number | null
  retailEstimate: number | null
  spreadGBP: number | null
  spreadPct: number | null
  auctionSources: string[]
  retailSources: string[]
  note: string
}

// ── Regional Weighting ─────────────────────────────────────────────────────────

export interface RegionalWeightingResult {
  regionBand: RegionBand
  regionMultiplier: number
  demandLevel: 'high' | 'moderate' | 'low'
  supplyLevel: 'high' | 'moderate' | 'low'
  adjustmentPct: number
  note: string
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
  condition: Condition
  // MOT data (for TCO)
  advisoryCount: number
  structuralAdvisoryCount: number
  brakeAdvisories: boolean
  motExpired: boolean
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

  // Fetch from ALL enabled providers in parallel (provider manager handles isolation)
  let providerResults: ProviderResult[] = []
  try {
    const { results } = await fetchAllProviders(providerQuery)
    providerResults = results
  } catch {
    // Total provider failure = graceful degradation to baseline
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
  // Use the best listing age median across all providers (not just first)
  const allListingAgeMedians = providerResults
    .map(p => p.listingAgeDaysMedian)
    .filter((a): a is number => a !== null)
  const bestListingAgeMedian = allListingAgeMedians.length > 0
    ? allListingAgeMedians.sort((a, b) => a - b)[Math.floor(allListingAgeMedians.length / 2)]
    : null

  const timeToSell = estimateTimeToSell({
    volatility: input.volatility,
    heatLevel: input.heatLevel,
    segment: input.segment,
    riskTier: input.riskTier,
    mileage: input.mileage,
    ulezCompliant: input.ulezCompliant,
    reconEstimate: input.reconEstimate,
    tradeBase: input.tradeBase,
    listingAgeDaysMedian: bestListingAgeMedian,
  })

  // Apply time risk discount to resale
  const timeDiscount = 1 - timeToSell.timeRiskDiscountPct
  resaleLow = Math.round(resaleLow * timeDiscount)
  resaleMid = Math.round(resaleMid * timeDiscount)
  resaleHigh = Math.round(resaleHigh * timeDiscount)

  // ── 4b. Regional Weighting ──────────────────────────────────────────
  const regionBand = detectRegionBand(input.postcode)
  const regionalWeighting = computeRegionalWeighting(
    regionBand,
    input.segment,
    input.heatLevel,
    merged.allListings,
    input.postcode,
  )

  // Apply regional adjustment to resale
  if (regionalWeighting.adjustmentPct !== 0) {
    const regionFactor = 1 + (regionalWeighting.adjustmentPct / 100)
    resaleLow = Math.round(resaleLow * regionFactor)
    resaleMid = Math.round(resaleMid * regionFactor)
    resaleHigh = Math.round(resaleHigh * regionFactor)
  }

  // ── 5. Sell Costs ────────────────────────────────────────────────────
  const sellCosts = estimateSellCosts(resaleMid, input.segment)

  // ── 5b. TCO Analysis ────────────────────────────────────────────────
  let tcoBreakdown: TCOBreakdown | null = null
  try {
    tcoBreakdown = estimateTCO({
      mileage: input.mileage,
      year: input.year,
      fuel: input.fuel as FuelType,
      condition: input.condition,
      segment: input.segment,
      adjustedValue: input.adjustedValue,
      reconEstimate: input.reconEstimate,
      advisoryCount: input.advisoryCount,
      structuralAdvisoryCount: input.structuralAdvisoryCount,
      brakeAdvisories: input.brakeAdvisories,
      motExpired: input.motExpired,
    })
  } catch {
    // TCO failure is non-critical
  }

  // ── 5c. Auction vs Retail Spread ────────────────────────────────────
  const auctionRetailSpread = computeAuctionRetailSpread(providerResults, merged.allListings)

  // ── 6. Profit Calculation ────────────────────────────────────────────
  // Profit = net resale - recon - TCO prep - sell costs - purchase price
  const recon = Math.round(input.reconEstimate)
  const tcoCost = tcoBreakdown ? tcoBreakdown.totalGBP : 0

  // TCO overlaps with recon — take the greater of the two to avoid double-counting
  const prepCost = Math.max(recon, tcoCost)

  const profitLow = (resaleLow - sellCosts.totalGBP) - prepCost - input.max
  const profitMid = (resaleMid - sellCosts.totalGBP) - prepCost - input.midpoint
  const profitHigh = (resaleHigh - sellCosts.totalGBP) - prepCost - input.min

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

  // Boost confidence when multiple providers agree
  let confidenceBoost = 0
  const contributingProviders = providerResults.filter(p => p.sampleCount > 0)
  if (contributingProviders.length >= 3) confidenceBoost += 8
  else if (contributingProviders.length >= 2) confidenceBoost += 4
  const finalConfScore = Math.min(100, confScore + confidenceBoost)
  const finalConfLevel: ConfidenceLevel = finalConfScore >= 70 ? 'high' : finalConfScore >= 45 ? 'medium' : 'low'

  // ── 8. Evidence Payload ──────────────────────────────────────────────
  const evidence: EvidencePayload = {
    compsSummary: similarityResult.keptComps.length > 0
      ? `${similarityResult.keptComps.length} comparable listings from ${contributingProviders.length} source${contributingProviders.length !== 1 ? 's' : ''} (median £${(similarityResult.normalisedMedian ?? 0).toLocaleString()})`
      : `No market comps available — using baseline model only (${providerResults.length} provider${providerResults.length !== 1 ? 's' : ''} queried)`,
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

  // Recon / TCO
  if (prepCost > 0) {
    const prepLabel = tcoCost > recon
      ? `£${prepCost} TCO prep (exceeds £${recon} recon estimate)`
      : `£${prepCost} recon estimated`
    adjustmentDrivers.push({ factor: 'Prep Cost', impact: prepLabel, direction: 'negative' })
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

  // Regional adjustment
  if (regionalWeighting.adjustmentPct !== 0) {
    adjustmentDrivers.push({
      factor: 'Region',
      impact: `${regionBand} — ${regionalWeighting.adjustmentPct > 0 ? '+' : ''}${regionalWeighting.adjustmentPct.toFixed(1)}% (${regionalWeighting.demandLevel} demand)`,
      direction: regionalWeighting.adjustmentPct > 0 ? 'positive' : 'negative',
    })
  }

  // Auction/retail spread insight
  if (auctionRetailSpread.spreadPct !== null && auctionRetailSpread.spreadPct > 15) {
    adjustmentDrivers.push({
      factor: 'Auction Spread',
      impact: `${auctionRetailSpread.spreadPct.toFixed(0)}% auction→retail gap — margin opportunity`,
      direction: 'positive',
    })
  }

  // TCO risk warning
  if (tcoBreakdown?.riskNote) {
    adjustmentDrivers.push({
      factor: 'TCO Risk',
      impact: tcoBreakdown.riskNote,
      direction: 'negative',
    })
  }

  // ── 10. Guardrails ──────────────────────────────────────────────────
  const guardrailTriggered = input.quoteMode !== 'blocked' && profitMid < 300
  const guardrailReason = guardrailTriggered
    ? `Expected profit £${profitMid} < £300 threshold`
    : null

  // ── 11. Compact note ─────────────────────────────────────────────────
  const providerNote = contributingProviders.length > 1
    ? `${contributingProviders.length} data sources`
    : contributingProviders.length === 1
    ? `${contributingProviders[0].source} data`
    : 'baseline model'

  const compNote = similarityResult.keptComps.length >= 5
    ? `Estimated from ${similarityResult.keptComps.length} comps via ${providerNote} + risk-adjusted value.`
    : `Estimated from risk-adjusted value + segment model. ${providerNote}. Limited market data.`

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
    confidence: finalConfLevel,
    confidenceScore: finalConfScore,
    compactNote: compNote,
    evidence,
    adjustmentDrivers,
    costsAndTime: {
      sellCostBreakdown: sellCosts,
      timeToSell,
      tco: tcoBreakdown,
      auctionRetailSpread,
      regionalWeighting,
    },
    topComps,
    guardrailTriggered,
    guardrailReason,
    v3ProfitMidDelta,
  }
}

// ── Auction vs Retail Spread Analysis ──────────────────────────────────────────

/**
 * Analyses provider results to compute the gap between auction-grade
 * and retail-grade prices. Wider spreads indicate more margin opportunity
 * but also more risk.
 */
function computeAuctionRetailSpread(
  providerResults: ProviderResult[],
  allListings: CompListing[],
): AuctionRetailSpread {
  const auctionPrices: number[] = []
  const retailPrices: number[] = []
  const auctionSources: Set<string> = new Set()
  const retailSources: Set<string> = new Set()

  // Classify listings by source type
  for (const listing of allListings) {
    const titleLower = listing.title.toLowerCase()
    const isAuction = titleLower.includes('auction') || titleLower.includes('trade')
    const isRetail = titleLower.includes('retail') || titleLower.includes('private')

    if (isAuction) {
      auctionPrices.push(listing.price)
      auctionSources.add(listing.source)
    } else if (isRetail) {
      retailPrices.push(listing.price)
      retailSources.add(listing.source)
    } else {
      // eBay / Marketcheck listings are retail-like
      if (listing.source === 'ebay' || listing.source === 'marketcheck') {
        retailPrices.push(listing.price)
        retailSources.add(listing.source)
      }
    }
  }

  // Also check provider-level stats
  for (const pr of providerResults) {
    if (pr.source === 'motorspecs' && pr.priceStats) {
      // MotorSpecs min is typically auction, max is retail
      if (pr.priceStats.min > 0) {
        auctionPrices.push(pr.priceStats.min)
        auctionSources.add('motorspecs')
      }
      if (pr.priceStats.max > 0) {
        retailPrices.push(pr.priceStats.max)
        retailSources.add('motorspecs')
      }
    }
  }

  const auctionMedian = auctionPrices.length > 0
    ? auctionPrices.sort((a, b) => a - b)[Math.floor(auctionPrices.length / 2)]
    : null
  const retailMedian = retailPrices.length > 0
    ? retailPrices.sort((a, b) => a - b)[Math.floor(retailPrices.length / 2)]
    : null

  const spreadGBP = auctionMedian !== null && retailMedian !== null
    ? retailMedian - auctionMedian
    : null
  const spreadPct = spreadGBP !== null && auctionMedian !== null && auctionMedian > 0
    ? Math.round((spreadGBP / auctionMedian) * 100)
    : null

  let note: string
  if (spreadPct !== null) {
    if (spreadPct > 25) note = `Wide ${spreadPct}% auction→retail gap — good flip margin but verify condition`
    else if (spreadPct > 15) note = `Moderate ${spreadPct}% auction→retail spread — typical margin`
    else if (spreadPct > 5) note = `Narrow ${spreadPct}% spread — tight margins`
    else note = `Minimal spread (${spreadPct}%) — auction and retail very close`
  } else {
    note = 'Insufficient data for auction vs retail spread analysis'
  }

  return {
    auctionEstimate: auctionMedian,
    retailEstimate: retailMedian,
    spreadGBP,
    spreadPct,
    auctionSources: [...auctionSources],
    retailSources: [...retailSources],
    note,
  }
}

// ── Regional Weighting Model ───────────────────────────────────────────────────

/**
 * Enhanced regional weighting based on:
 *   - Region band (London/SE/Midlands/North/Scotland-Wales-NI)
 *   - Segment-level demand patterns
 *   - Local supply signals from comp listings
 *   - Heat level interactions
 *
 * This goes beyond the static postcode prefix multiplier in regionPricing.ts
 * by incorporating live market signals from the comp data.
 */

// Regional demand multipliers by segment type
const REGIONAL_DEMAND_MATRIX: Record<RegionBand, Partial<Record<VehicleSegment, number>>> = {
  london: {
    ev_aging: 1.05,       // London has strong EV demand
    ev_mid: 1.04,
    ev_young: 1.03,
    diesel_old: 0.92,     // ULEZ kills old diesel demand in London
    diesel_aging: 0.95,
    petrol_standard: 1.03, // city cars do well
    hybrid: 1.04,
  },
  south_east: {
    hybrid: 1.03,
    ev_aging: 1.02,
    diesel_old: 0.96,
    petrol_standard: 1.01,
  },
  midlands: {
    diesel_aging: 1.01,
    high_age: 0.99,
    petrol_standard: 1.00,
  },
  north: {
    diesel_aging: 1.02,   // diesels still popular up north
    diesel_old: 1.00,     // no ULEZ impact
    high_age: 0.97,
    ev_aging: 0.96,       // lower EV adoption
  },
  scotland_wales_ni: {
    diesel_aging: 1.03,
    diesel_old: 1.01,
    high_age: 0.96,
    ev_aging: 0.94,
    petrol_standard: 0.98,
  },
}

// Base region demand levels
const REGION_BASE_DEMAND: Record<RegionBand, 'high' | 'moderate' | 'low'> = {
  london: 'high',
  south_east: 'high',
  midlands: 'moderate',
  north: 'moderate',
  scotland_wales_ni: 'low',
}

function computeRegionalWeighting(
  regionBand: RegionBand,
  segment: VehicleSegment,
  heatLevel: HeatLevel,
  comps: CompListing[],
  _postcode: string,
): RegionalWeightingResult {
  // Base regional demand multiplier
  const segmentDemand = REGIONAL_DEMAND_MATRIX[regionBand]?.[segment] ?? 1.00
  const demandLevel = REGION_BASE_DEMAND[regionBand]

  // Supply signal from comps: more local comps = more supply
  const localComps = comps.filter(c => {
    if (!c.location) return false
    const loc = c.location.toLowerCase()
    // Rough locality matching
    if (regionBand === 'london') return loc.includes('london') || loc.includes('greater london')
    if (regionBand === 'south_east') return loc.includes('south') || loc.includes('surrey') || loc.includes('kent') || loc.includes('sussex')
    if (regionBand === 'midlands') return loc.includes('birmingham') || loc.includes('midlands') || loc.includes('coventry')
    if (regionBand === 'north') return loc.includes('manchester') || loc.includes('leeds') || loc.includes('liverpool') || loc.includes('north')
    return loc.includes('scotland') || loc.includes('wales') || loc.includes('belfast')
  })

  let supplyLevel: 'high' | 'moderate' | 'low'
  if (comps.length === 0) supplyLevel = 'low'
  else if (localComps.length / comps.length > 0.3) supplyLevel = 'high'
  else if (localComps.length / comps.length > 0.1) supplyLevel = 'moderate'
  else supplyLevel = 'low'

  // Supply adjustment: high supply in region = slight price pressure
  let supplyAdjust = 0
  if (supplyLevel === 'high' && demandLevel !== 'high') supplyAdjust = -1.0
  else if (supplyLevel === 'low' && demandLevel === 'high') supplyAdjust = 1.0

  // Heat level interaction
  let heatAdjust = 0
  if (heatLevel === 'hot' && demandLevel === 'high') heatAdjust = 1.5
  else if (heatLevel === 'cool' && demandLevel === 'low') heatAdjust = -1.5

  // Total regional adjustment (%)
  const baseAdjustment = (segmentDemand - 1.0) * 100
  const adjustmentPct = Math.round((baseAdjustment + supplyAdjust + heatAdjust) * 10) / 10

  // Clamp to ±5%
  const clampedAdjustment = Math.max(-5, Math.min(5, adjustmentPct))

  const note = clampedAdjustment === 0
    ? `${regionBand} — neutral regional pricing`
    : `${regionBand} — ${clampedAdjustment > 0 ? 'premium' : 'discount'} of ${Math.abs(clampedAdjustment).toFixed(1)}% (${demandLevel} demand, ${supplyLevel} supply)`

  return {
    regionBand,
    regionMultiplier: 1 + (clampedAdjustment / 100),
    demandLevel,
    supplyLevel,
    adjustmentPct: clampedAdjustment,
    note,
  }
}
