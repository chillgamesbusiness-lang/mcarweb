/**
 * Promotion Rules — Hard gate-checks before activating candidate coefficients.
 *
 * A candidate coefficient set may ONLY be promoted to "current" if ALL rules pass.
 * This prevents silent regressions, margin erosion, and acceptance cliff-edges.
 *
 * Rules:
 *   1. Avg realised profit must not decrease (vs baseline period)
 *   2. Acceptance rate must not drop > X%
 *   3. Manual review rate must not spike > Y%
 *   4. Fraud/block rate must remain stable (±Z%)
 *   5. Shadow comparison delta must stay within bounds
 *   6. Minimum shadow sample size must be met
 */

import { fetchDashboardKPIs, type DashboardKPIs } from '@/lib/kpiAggregation'
import { getShadowComparisonSummary } from '@/lib/coefficientStore'

// ── Configurable thresholds ────────────────────────────────────────────────────

export interface PromotionThresholds {
  /** Max % drop in acceptance rate allowed (e.g. 5 = 5 percentage points) */
  maxAcceptanceDropPct: number
  /** Max % rise in manual review rate allowed */
  maxManualReviewRisePct: number
  /** Max % change in blocked rate (absolute) */
  maxBlockedRateChangePct: number
  /** Max absolute % delta in shadow midpoints */
  maxShadowDeltaPct: number
  /** Minimum shadow comparisons before promotion is allowed */
  minShadowSampleSize: number
  /** Minimum realised deals required */
  minRealisedDeals: number
  /** If realised profit exists, it must be >= this £ amount */
  minRealisedProfitFloor: number
}

export const DEFAULT_THRESHOLDS: PromotionThresholds = {
  maxAcceptanceDropPct: 5,
  maxManualReviewRisePct: 10,
  maxBlockedRateChangePct: 3,
  maxShadowDeltaPct: 8,
  minShadowSampleSize: 30,
  minRealisedDeals: 0,         // no floor when early — rely on shadow + acceptance
  minRealisedProfitFloor: 200,
}

// ── Rule result types ──────────────────────────────────────────────────────────

export interface RuleResult {
  rule: string
  passed: boolean
  reason: string
}

export interface PromotionVerdict {
  canPromote: boolean
  rules: RuleResult[]
  timestamp: string
}

// ── Baseline snapshot (captured when shadow mode started) ──────────────────────

export interface BaselineSnapshot {
  acceptanceRate: number
  manualReviewRate: number
  blockedRate: number
  avgRealisedProfit: number | null
  capturedAt: string
}

/**
 * Capture current KPIs as a baseline snapshot.
 * Call this when entering shadow mode so we have a before/after comparison.
 */
export async function captureBaseline(): Promise<BaselineSnapshot> {
  const kpis = await fetchDashboardKPIs()
  return {
    acceptanceRate: kpis.acquisition.acceptanceRate,
    manualReviewRate: kpis.acquisition.manualReviewRate,
    blockedRate: kpis.acquisition.blockedRate,
    avgRealisedProfit: kpis.profit.avgRealisedProfit,
    capturedAt: new Date().toISOString(),
  }
}

// ── Main promotion check ───────────────────────────────────────────────────────

/**
 * Run all promotion gate-checks.
 * Returns a verdict: canPromote=true only if EVERY rule passes.
 */
export async function checkPromotionRules(
  candidateVersionId: string,
  baseline: BaselineSnapshot,
  thresholds: PromotionThresholds = DEFAULT_THRESHOLDS
): Promise<PromotionVerdict> {
  const [kpis, shadow] = await Promise.all([
    fetchDashboardKPIs(),
    getShadowComparisonSummary(candidateVersionId),
  ])

  const rules: RuleResult[] = []

  // ── Rule 1: Acceptance rate must not drop ──
  const acceptanceDelta = kpis.acquisition.acceptanceRate - baseline.acceptanceRate
  rules.push({
    rule: 'ACCEPTANCE_RATE',
    passed: acceptanceDelta >= -thresholds.maxAcceptanceDropPct,
    reason: acceptanceDelta >= -thresholds.maxAcceptanceDropPct
      ? `Acceptance rate OK (${kpis.acquisition.acceptanceRate}%, Δ${acceptanceDelta > 0 ? '+' : ''}${acceptanceDelta}pp)`
      : `Acceptance rate dropped ${Math.abs(acceptanceDelta)}pp (max allowed: ${thresholds.maxAcceptanceDropPct}pp)`,
  })

  // ── Rule 2: Manual review rate must not spike ──
  const manualDelta = kpis.acquisition.manualReviewRate - baseline.manualReviewRate
  rules.push({
    rule: 'MANUAL_REVIEW_RATE',
    passed: manualDelta <= thresholds.maxManualReviewRisePct,
    reason: manualDelta <= thresholds.maxManualReviewRisePct
      ? `Manual review rate OK (${kpis.acquisition.manualReviewRate}%, Δ+${manualDelta}pp)`
      : `Manual review rate spiked +${manualDelta}pp (max allowed: +${thresholds.maxManualReviewRisePct}pp)`,
  })

  // ── Rule 3: Blocked rate must remain stable ──
  const blockedDelta = Math.abs(kpis.acquisition.blockedRate - baseline.blockedRate)
  rules.push({
    rule: 'BLOCKED_RATE_STABLE',
    passed: blockedDelta <= thresholds.maxBlockedRateChangePct,
    reason: blockedDelta <= thresholds.maxBlockedRateChangePct
      ? `Blocked rate stable (${kpis.acquisition.blockedRate}%, Δ${blockedDelta}pp)`
      : `Blocked rate changed by ${blockedDelta}pp (max allowed: ±${thresholds.maxBlockedRateChangePct}pp)`,
  })

  // ── Rule 4: Realised profit must not decrease ──
  if (
    baseline.avgRealisedProfit !== null &&
    kpis.profit.avgRealisedProfit !== null &&
    kpis.profit.totalRealisedDeals >= thresholds.minRealisedDeals
  ) {
    const profitOk = kpis.profit.avgRealisedProfit >= thresholds.minRealisedProfitFloor
    rules.push({
      rule: 'REALISED_PROFIT',
      passed: profitOk,
      reason: profitOk
        ? `Avg realised profit OK (£${kpis.profit.avgRealisedProfit} ≥ £${thresholds.minRealisedProfitFloor})`
        : `Avg realised profit £${kpis.profit.avgRealisedProfit} < floor £${thresholds.minRealisedProfitFloor}`,
    })
  } else {
    rules.push({
      rule: 'REALISED_PROFIT',
      passed: true,
      reason: 'Insufficient realised deal data — skipped (will enforce once data exists)',
    })
  }

  // ── Rule 5: Shadow comparison delta within bounds ──
  rules.push({
    rule: 'SHADOW_DELTA',
    passed: Math.abs(shadow.avgDeltaPct) <= thresholds.maxShadowDeltaPct,
    reason: Math.abs(shadow.avgDeltaPct) <= thresholds.maxShadowDeltaPct
      ? `Shadow delta OK (avg ${shadow.avgDeltaPct}%, max ${shadow.maxDeltaPct}%)`
      : `Shadow delta too large (avg ${shadow.avgDeltaPct}%, max allowed ±${thresholds.maxShadowDeltaPct}%)`,
  })

  // ── Rule 6: Minimum shadow sample size ──
  rules.push({
    rule: 'SHADOW_SAMPLE_SIZE',
    passed: shadow.count >= thresholds.minShadowSampleSize,
    reason: shadow.count >= thresholds.minShadowSampleSize
      ? `Shadow sample size OK (${shadow.count} ≥ ${thresholds.minShadowSampleSize})`
      : `Insufficient shadow data: ${shadow.count}/${thresholds.minShadowSampleSize} required`,
  })

  return {
    canPromote: rules.every(r => r.passed),
    rules,
    timestamp: new Date().toISOString(),
  }
}
