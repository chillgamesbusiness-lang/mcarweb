/**
 * Engine Coefficient Store — Versioned, feature-flagged coefficient management.
 *
 * Supports:
 *   - Versioned coefficient sets (current + candidate)
 *   - Shadow mode: candidate coefficients are logged but don't affect real offers
 *   - Activation/rollback with audit trail
 *   - Comparison logging for A/B analysis
 *
 * Requires tables: engine_coefficients, shadow_comparison_log
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { CalibrationCoefficients } from '@/lib/calibrationStore'

// ── Types ──────────────────────────────────────────────────────────────────────

export type CoefficientStatus = 'current' | 'candidate' | 'retired' | 'rolled_back'

export interface EngineCoefficientsRow {
  id: string
  version_id: string
  coefficients: CalibrationCoefficients
  status: CoefficientStatus
  shadow_mode: boolean
  activated_at: string | null
  retired_at: string | null
  owner_admin_id: string | null
  reasoning: string[]
  sample_size: number
  created_at: string
}

export interface ShadowComparison {
  leadId: string | null
  currentVersion: string
  candidateVersion: string
  currentMidpoint: number
  candidateMidpoint: number
  currentMin: number
  candidateMin: number
  currentMax: number
  candidateMax: number
}

// ── Supabase client ────────────────────────────────────────────────────────────

let _supabase: SupabaseClient | null = null
function getSupabase(): SupabaseClient {
  if (_supabase) return _supabase
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase env vars not configured for coefficient store')
  _supabase = createClient(url, key)
  return _supabase
}

// ── Default coefficients (hardcoded baseline) ──────────────────────────────────

const HARDCODED_DEFAULTS: CalibrationCoefficients = {
  liquidityBuffer: 0.07,
  tradeMarginBase: 0.80,
  reconCapPct: 0.20,
  spreadLowThreshold: 2,
  spreadMidThreshold: 5,
  updatedAt: '2026-01-01T00:00:00Z',
  sampleSize: 0,
}

// ── Read operations ────────────────────────────────────────────────────────────

/**
 * Get the current active coefficient set.
 * Falls back to hardcoded defaults if no DB row exists.
 */
export async function getCurrentCoefficients(): Promise<{
  coefficients: CalibrationCoefficients
  versionId: string
  fromDb: boolean
}> {
  try {
    const { data, error } = await getSupabase()
      .from('engine_coefficients')
      .select('*')
      .eq('status', 'current')
      .limit(1)
      .maybeSingle()

    if (error || !data) {
      return { coefficients: HARDCODED_DEFAULTS, versionId: 'v3.0.0-default', fromDb: false }
    }

    return {
      coefficients: data.coefficients as CalibrationCoefficients,
      versionId: data.version_id,
      fromDb: true,
    }
  } catch {
    return { coefficients: HARDCODED_DEFAULTS, versionId: 'v3.0.0-default', fromDb: false }
  }
}

/**
 * Get the candidate coefficient set (if any in shadow mode).
 */
export async function getCandidateCoefficients(): Promise<{
  coefficients: CalibrationCoefficients
  versionId: string
} | null> {
  try {
    const { data, error } = await getSupabase()
      .from('engine_coefficients')
      .select('*')
      .eq('status', 'candidate')
      .eq('shadow_mode', true)
      .limit(1)
      .maybeSingle()

    if (error || !data) return null

    return {
      coefficients: data.coefficients as CalibrationCoefficients,
      versionId: data.version_id,
    }
  } catch {
    return null
  }
}

/**
 * List all coefficient versions (for admin display).
 */
export async function listCoefficientVersions(): Promise<EngineCoefficientsRow[]> {
  const { data, error } = await getSupabase()
    .from('engine_coefficients')
    .select('*')
    .order('created_at', { ascending: false })

  if (error || !data) return []
  return data as EngineCoefficientsRow[]
}

// ── Write operations ───────────────────────────────────────────────────────────

/**
 * Create a new candidate coefficient set from calibration recommendations.
 */
export async function createCandidateCoefficients(input: {
  versionId: string
  coefficients: CalibrationCoefficients
  reasoning: string[]
  sampleSize: number
  ownerAdminId?: string
}): Promise<{ success: boolean; error?: string }> {
  const { error } = await getSupabase()
    .from('engine_coefficients')
    .insert({
      version_id: input.versionId,
      coefficients: input.coefficients,
      status: 'candidate',
      shadow_mode: true,
      reasoning: input.reasoning,
      sample_size: input.sampleSize,
      owner_admin_id: input.ownerAdminId ?? null,
    })

  if (error) return { success: false, error: error.message }
  return { success: true }
}

/**
 * Activate a candidate: promote to current, retire the old current.
 * This is the "flip the switch" operation.
 */
export async function activateCoefficients(versionId: string): Promise<{
  success: boolean
  error?: string
}> {
  const sb = getSupabase()

  // Retire current
  await sb
    .from('engine_coefficients')
    .update({ status: 'retired', retired_at: new Date().toISOString() })
    .eq('status', 'current')

  // Promote candidate
  const { error } = await sb
    .from('engine_coefficients')
    .update({
      status: 'current',
      shadow_mode: false,
      activated_at: new Date().toISOString(),
    })
    .eq('version_id', versionId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

/**
 * Roll back: revert to previous version.
 * Marks current as rolled_back, finds most recent retired, promotes it.
 */
export async function rollbackCoefficients(): Promise<{
  success: boolean
  rolledBackTo: string | null
  error?: string
}> {
  const sb = getSupabase()

  // Mark current as rolled_back
  await sb
    .from('engine_coefficients')
    .update({ status: 'rolled_back', retired_at: new Date().toISOString() })
    .eq('status', 'current')

  // Find most recently retired
  const { data: prev, error: fetchErr } = await sb
    .from('engine_coefficients')
    .select('version_id')
    .eq('status', 'retired')
    .order('retired_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (fetchErr || !prev) {
    return { success: false, rolledBackTo: null, error: 'No previous version to roll back to' }
  }

  // Re-activate
  await sb
    .from('engine_coefficients')
    .update({
      status: 'current',
      shadow_mode: false,
      activated_at: new Date().toISOString(),
      retired_at: null,
    })
    .eq('version_id', prev.version_id)

  return { success: true, rolledBackTo: prev.version_id }
}

// ── Shadow comparison logging ──────────────────────────────────────────────────

/**
 * Log a shadow comparison: what the candidate WOULD have returned.
 */
export async function logShadowComparison(input: ShadowComparison): Promise<void> {
  const deltaMidpoint = input.candidateMidpoint - input.currentMidpoint
  const deltaPct = input.currentMidpoint > 0
    ? Math.round((deltaMidpoint / input.currentMidpoint) * 10000) / 100
    : 0

  await getSupabase()
    .from('shadow_comparison_log')
    .insert({
      lead_id: input.leadId,
      current_version: input.currentVersion,
      candidate_version: input.candidateVersion,
      current_midpoint: input.currentMidpoint,
      candidate_midpoint: input.candidateMidpoint,
      current_min: input.currentMin,
      candidate_min: input.candidateMin,
      current_max: input.currentMax,
      candidate_max: input.candidateMax,
      delta_midpoint: deltaMidpoint,
      delta_pct: deltaPct,
    })
    .then(({ error }) => {
      if (error) console.error('[shadow-log] insert failed:', error.message)
    })
}

/**
 * Get shadow comparison summary — for admin review before activation.
 */
export async function getShadowComparisonSummary(candidateVersion: string): Promise<{
  count: number
  avgDeltaPct: number
  maxDeltaPct: number
  wouldIncrease: number
  wouldDecrease: number
  noChange: number
}> {
  const { data, error } = await getSupabase()
    .from('shadow_comparison_log')
    .select('delta_midpoint, delta_pct')
    .eq('candidate_version', candidateVersion)

  if (error || !data || data.length === 0) {
    return { count: 0, avgDeltaPct: 0, maxDeltaPct: 0, wouldIncrease: 0, wouldDecrease: 0, noChange: 0 }
  }

  const avgDeltaPct = data.reduce((s, r) => s + Number(r.delta_pct), 0) / data.length
  const maxDeltaPct = Math.max(...data.map(r => Math.abs(Number(r.delta_pct))))
  const wouldIncrease = data.filter(r => r.delta_midpoint > 0).length
  const wouldDecrease = data.filter(r => r.delta_midpoint < 0).length
  const noChange = data.filter(r => r.delta_midpoint === 0).length

  return {
    count: data.length,
    avgDeltaPct: Math.round(avgDeltaPct * 100) / 100,
    maxDeltaPct: Math.round(maxDeltaPct * 100) / 100,
    wouldIncrease,
    wouldDecrease,
    noChange,
  }
}
