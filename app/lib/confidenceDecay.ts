/**
 * Confidence Decay — Profit floor enforcement under uncertainty.
 *
 * When the engine has low confidence in its inputs (fuzzy market match,
 * volatile segment, high recon uncertainty), instead of just lowering the
 * multiplier (which can still produce thin-profit offers), we RAISE the
 * minimum profit threshold.
 *
 * This is the "if you're not sure, demand more margin" principle.
 *
 * Mechanics:
 *   - Base profit floor = £300 (from guardrail)
 *   - Each uncertainty signal adds to the floor
 *   - Maximum elevated floor = £800
 *   - If expectedProfitMid < elevated floor → manual_review
 *
 * Phase 5 / Optional elite deliverable.
 */

import type { Volatility, MarketMatchQuality } from '@/lib/types'
import type { HeatLevel } from '@/lib/segmentPricing'

// ── Configuration ──────────────────────────────────────────────────────────────

export interface DecayConfig {
  /** Base profit floor (same as guardrail) */
  baseProfitFloor: number
  /** Max elevated floor */
  maxProfitFloor: number
  /** Floor bump for volatile market */
  volatileBump: number
  /** Floor bump for moderate market */
  moderateBump: number
  /** Floor bump for fuzzy market match */
  fuzzyMatchBump: number
  /** Floor bump for partial/no market match */
  weakMatchBump: number
  /** Floor bump for high recon (> reconPctThreshold of trade base) */
  highReconBump: number
  /** Recon % threshold above which the bump applies */
  reconPctThreshold: number
  /** Floor bump for hot heat level */
  hotHeatBump: number
  /** Floor bump for low confidence score (< confidenceThreshold) */
  lowConfidenceBump: number
  /** Confidence score threshold */
  confidenceThreshold: number
}

export const DEFAULT_DECAY_CONFIG: DecayConfig = {
  baseProfitFloor: 300,
  maxProfitFloor: 800,
  volatileBump: 100,
  moderateBump: 50,
  fuzzyMatchBump: 75,
  weakMatchBump: 150,
  highReconBump: 100,
  reconPctThreshold: 0.15,
  hotHeatBump: 100,
  lowConfidenceBump: 75,
  confidenceThreshold: 50,
}

// ── Result type ────────────────────────────────────────────────────────────────

export interface DecayResult {
  /** The original base floor (£300) */
  baseProfitFloor: number
  /** The elevated profit floor after decay signals */
  elevatedProfitFloor: number
  /** Whether the elevated floor exceeds the expected profit mid */
  floorBreached: boolean
  /** Signals that contributed to the floor elevation */
  decaySignals: string[]
  /** Total bump amount (£) */
  totalBump: number
}

// ── Main function ──────────────────────────────────────────────────────────────

/**
 * Calculate the effective profit floor based on uncertainty signals.
 *
 * Call AFTER the main valuation but BEFORE returning the result.
 * If floorBreached=true, set quoteMode='manual_review'.
 */
export function calculateConfidenceDecay(input: {
  expectedProfitMid: number
  volatility: Volatility
  matchQuality: MarketMatchQuality
  reconEstimate: number
  tradeBase: number
  confidenceScore: number
  heatLevel: HeatLevel
  config?: DecayConfig
}): DecayResult {
  const cfg = input.config ?? DEFAULT_DECAY_CONFIG
  const signals: string[] = []
  let bump = 0

  // ── Volatility ──
  if (input.volatility === 'volatile') {
    bump += cfg.volatileBump
    signals.push(`Volatile market: +£${cfg.volatileBump} floor`)
  } else if (input.volatility === 'moderate') {
    bump += cfg.moderateBump
    signals.push(`Moderate volatility: +£${cfg.moderateBump} floor`)
  }

  // ── Market match quality ──
  if (input.matchQuality === 'partial' || input.matchQuality === 'none') {
    bump += cfg.weakMatchBump
    signals.push(`Weak market match (${input.matchQuality}): +£${cfg.weakMatchBump} floor`)
  } else if (input.matchQuality === 'year_fuzzy' || input.matchQuality === 'fuel_fuzzy') {
    bump += cfg.fuzzyMatchBump
    signals.push(`Fuzzy market match (${input.matchQuality}): +£${cfg.fuzzyMatchBump} floor`)
  }

  // ── Recon uncertainty ──
  if (input.tradeBase > 0 && input.reconEstimate / input.tradeBase > cfg.reconPctThreshold) {
    bump += cfg.highReconBump
    signals.push(
      `High recon (${Math.round(input.reconEstimate / input.tradeBase * 100)}% of trade): +£${cfg.highReconBump} floor`
    )
  }

  // ── Heat level ──
  if (input.heatLevel === 'hot') {
    bump += cfg.hotHeatBump
    signals.push(`Hot segment heat: +£${cfg.hotHeatBump} floor`)
  }

  // ── Low confidence score ──
  if (input.confidenceScore < cfg.confidenceThreshold) {
    bump += cfg.lowConfidenceBump
    signals.push(`Low confidence (${input.confidenceScore}): +£${cfg.lowConfidenceBump} floor`)
  }

  const elevatedFloor = Math.min(cfg.baseProfitFloor + bump, cfg.maxProfitFloor)
  const floorBreached = input.expectedProfitMid < elevatedFloor

  return {
    baseProfitFloor: cfg.baseProfitFloor,
    elevatedProfitFloor: elevatedFloor,
    floorBreached,
    decaySignals: signals,
    totalBump: bump,
  }
}
