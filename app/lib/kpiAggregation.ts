/**
 * KPI Aggregation — Server-side queries for the admin dashboard.
 *
 * Covers:
 *   - Acquisition KPIs: offers generated, acceptance, manual review, blocked rates
 *   - Profit KPIs: predicted profit, realised profit, variance, guardrail triggers
 *   - Risk KPIs: rollback blocked %, recon error %, avg recon % of trade
 *   - Shadow comparison summary
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let _sb: SupabaseClient | null = null
function getSb(): SupabaseClient {
  if (_sb) return _sb
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase env vars not configured for KPI queries')
  _sb = createClient(url, key)
  return _sb
}

// ── Types ──────────────────────────────────────────────────────────────────────

export interface AcquisitionKPIs {
  offersThisWeek: number
  offersLastWeek: number
  totalOffers: number
  acceptanceRate: number     // % of leads that became "won"
  manualReviewRate: number   // % of snapshots with auto_quote=false
  blockedRate: number        // % of snapshots with min=0 (blocked/manual_only)
  avgConfidence: number
}

export interface ProfitKPIs {
  avgPredictedProfitMid: number
  avgRealisedProfit: number | null
  profitVariance: number | null
  guardrailTriggerPct: number   // % of snapshots where profit guardrail triggered
  totalWonDeals: number
  totalRealisedDeals: number    // won + have actual_purchase_price
}

export interface RiskKPIs {
  rollbackBlockedPct: number
  avgReconEstimatePct: number   // avg recon as % of trade base
  reconErrorPct: number | null  // avg |predicted - actual| / actual recon
  dangerousDefectPct: number
  avgRiskFlagCount: number
}

export interface WeeklyTrend {
  weekLabel: string
  offers: number
  won: number
  lost: number
  manualReview: number
}

export interface DashboardKPIs {
  acquisition: AcquisitionKPIs
  profit: ProfitKPIs
  risk: RiskKPIs
  weeklyTrends: WeeklyTrend[]
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function weekAgo(n: number): string {
  return new Date(Date.now() - n * 7 * 24 * 60 * 60 * 1000).toISOString()
}

function safe(n: number | null | undefined, fallback = 0): number {
  return n != null && isFinite(n) ? n : fallback
}

// ── Aggregation queries ────────────────────────────────────────────────────────

export async function fetchDashboardKPIs(): Promise<DashboardKPIs> {
  const sb = getSb()

  // ── Acquisition KPIs ────────────────────────────────────────────────────

  const thisWeekStart = weekAgo(1)
  const lastWeekStart = weekAgo(2)

  const [
    { count: totalOffers },
    { count: offersThisWeek },
    { count: offersLastWeek },
    { count: wonLeads },
    { count: totalOutcomed },
    { data: snapshots },
    { data: wonDeals },
    { data: realisedDeals },
  ] = await Promise.all([
    sb.from('leads').select('*', { count: 'exact', head: true }),
    sb.from('leads').select('*', { count: 'exact', head: true }).gte('created_at', thisWeekStart),
    sb.from('leads').select('*', { count: 'exact', head: true })
      .gte('created_at', lastWeekStart).lt('created_at', thisWeekStart),
    sb.from('leads').select('*', { count: 'exact', head: true }).eq('outcome', 'won'),
    sb.from('leads').select('*', { count: 'exact', head: true })
      .not('outcome', 'is', null),
    // Fetch all snapshots for analysis (limit to last 500 for performance)
    sb.from('valuation_snapshots')
      .select('auto_quote, result_min, confidence_score, risk_flags, all_multipliers, profit_simulation')
      .order('created_at', { ascending: false })
      .limit(500),
    // Won deals with final_offer
    sb.from('leads')
      .select('final_offer, estimated_min, estimated_max')
      .eq('outcome', 'won')
      .not('final_offer', 'is', null),
    // Realised deals (with actual purchase + resale)
    sb.from('leads')
      .select('actual_purchase_price, actual_resale_price, actual_recon_cost, estimated_min, estimated_max')
      .eq('outcome', 'won')
      .not('actual_purchase_price', 'is', null),
  ])

  // Compute acquisition metrics from snapshots
  const snaps = snapshots || []
  const manualReviewCount = snaps.filter(s => !s.auto_quote).length
  const blockedCount = snaps.filter(s => s.result_min === 0).length
  const avgConfidence = snaps.length > 0
    ? Math.round(snaps.reduce((sum, s) => sum + safe(s.confidence_score), 0) / snaps.length)
    : 0

  const totalOffersNum = safe(totalOffers)
  const acceptanceRate = safe(totalOutcomed) > 0
    ? Math.round((safe(wonLeads) / safe(totalOutcomed)) * 100)
    : 0

  const acquisition: AcquisitionKPIs = {
    offersThisWeek: safe(offersThisWeek),
    offersLastWeek: safe(offersLastWeek),
    totalOffers: totalOffersNum,
    acceptanceRate,
    manualReviewRate: snaps.length > 0 ? Math.round((manualReviewCount / snaps.length) * 100) : 0,
    blockedRate: snaps.length > 0 ? Math.round((blockedCount / snaps.length) * 100) : 0,
    avgConfidence,
  }

  // ── Profit KPIs ─────────────────────────────────────────────────────────

  // Predicted profit from snapshots
  const profitSims = snaps
    .map(s => s.profit_simulation as { expectedProfitMid: number; guardrailTriggered: boolean } | null)
    .filter(Boolean)

  const avgPredictedProfitMid = profitSims.length > 0
    ? Math.round(profitSims.reduce((sum, p) => sum + safe(p!.expectedProfitMid), 0) / profitSims.length)
    : 0

  const guardrailTriggerPct = profitSims.length > 0
    ? Math.round((profitSims.filter(p => p!.guardrailTriggered).length / profitSims.length) * 100)
    : 0

  // Realised profit from actual data
  const realisedData = (realisedDeals || []).filter(d =>
    d.actual_purchase_price && d.actual_resale_price
  )
  const avgRealisedProfit = realisedData.length > 0
    ? Math.round(realisedData.reduce((sum, d) =>
        sum + (d.actual_resale_price - d.actual_purchase_price - safe(d.actual_recon_cost)), 0) / realisedData.length)
    : null

  // Profit variance (predicted vs realised)
  let profitVariance: number | null = null
  if (avgRealisedProfit !== null && avgPredictedProfitMid > 0) {
    profitVariance = Math.round(((avgRealisedProfit - avgPredictedProfitMid) / avgPredictedProfitMid) * 100)
  }

  const profit: ProfitKPIs = {
    avgPredictedProfitMid,
    avgRealisedProfit,
    profitVariance,
    guardrailTriggerPct,
    totalWonDeals: safe(wonLeads),
    totalRealisedDeals: realisedData.length,
  }

  // ── Risk KPIs ───────────────────────────────────────────────────────────

  // Rollback blocked: snapshots with 'ROLLBACK_DETECTED' in risk_flags
  const rollbackBlocked = snaps.filter(s => {
    const flags = s.risk_flags as string[] | null
    return flags?.some(f => f.toLowerCase().includes('rollback'))
  }).length

  // Dangerous defect
  const dangerousCount = snaps.filter(s => {
    const flags = s.risk_flags as string[] | null
    return flags?.some(f => f.toLowerCase().includes('dangerous'))
  }).length

  // Avg risk flag count
  const avgFlags = snaps.length > 0
    ? Math.round((snaps.reduce((sum, s) => sum + ((s.risk_flags as string[] | null)?.length || 0), 0) / snaps.length) * 10) / 10
    : 0

  // Avg recon as % of trade base
  const reconEstimates = snaps
    .map(s => {
      const mults = s.all_multipliers as Record<string, number> | null
      if (!mults || !mults.reconEstimate || !mults.tradeBase) return null
      return { recon: mults.reconEstimate, trade: mults.tradeBase }
    })
    .filter(Boolean) as { recon: number; trade: number }[]

  const avgReconPct = reconEstimates.length > 0
    ? Math.round((reconEstimates.reduce((sum, r) => sum + (r.recon / r.trade) * 100, 0) / reconEstimates.length) * 10) / 10
    : 0

  // Recon error % (predicted vs actual for realised deals)
  const reconComparisons = (realisedDeals || []).filter(d =>
    d.actual_recon_cost && d.actual_recon_cost > 0
  )
  // We'd need to join with snapshots for this, simplified: null for now
  const reconErrorPct: number | null = null

  const risk: RiskKPIs = {
    rollbackBlockedPct: snaps.length > 0 ? Math.round((rollbackBlocked / snaps.length) * 100) : 0,
    avgReconEstimatePct: avgReconPct,
    reconErrorPct,
    dangerousDefectPct: snaps.length > 0 ? Math.round((dangerousCount / snaps.length) * 100) : 0,
    avgRiskFlagCount: avgFlags,
  }

  // ── Weekly trends (last 8 weeks) ────────────────────────────────────────

  const weeklyTrends: WeeklyTrend[] = []
  for (let w = 7; w >= 0; w--) {
    const start = weekAgo(w + 1)
    const end = weekAgo(w)
    const label = w === 0 ? 'This week'
      : w === 1 ? 'Last week'
      : `${w}w ago`

    const [
      { count: offers },
      { count: won },
      { count: lost },
    ] = await Promise.all([
      sb.from('leads').select('*', { count: 'exact', head: true })
        .gte('created_at', start).lt('created_at', end),
      sb.from('leads').select('*', { count: 'exact', head: true })
        .eq('outcome', 'won').gte('outcome_at', start).lt('outcome_at', end),
      sb.from('leads').select('*', { count: 'exact', head: true })
        .eq('outcome', 'lost').gte('outcome_at', start).lt('outcome_at', end),
    ])

    // Manual review count from snapshots in this period
    const { data: weekSnaps } = await sb.from('valuation_snapshots')
      .select('auto_quote')
      .gte('created_at', start).lt('created_at', end)

    weeklyTrends.push({
      weekLabel: label,
      offers: safe(offers),
      won: safe(won),
      lost: safe(lost),
      manualReview: (weekSnaps || []).filter(s => !s.auto_quote).length,
    })
  }

  return { acquisition, profit, risk, weeklyTrends }
}
