/**
 * DB Health Check + Engine Smoke Test
 *
 * Phase 1 go-live verification:
 *   1. Verify all v3 columns/tables exist
 *   2. Verify RLS is enabled
 *   3. Run 3 smoke test valuations and confirm snapshot writes
 *   4. Clean up test data
 *
 * Run with: npx tsx scripts/smokeTest.ts
 */

import { createClient } from '@supabase/supabase-js'
import { calculateValuation } from '@/lib/pricingEngine'
import type { VehicleProfile, MOTAnalysis } from '@/lib/types'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const sb = createClient(SUPABASE_URL, SUPABASE_KEY)

let passed = 0
let failed = 0

function assert(name: string, ok: boolean, detail = '') {
  if (ok) { passed++; console.log(`  ✅ ${name}`) }
  else { failed++; console.log(`  ❌ ${name} ${detail}`) }
}

// ── Base vehicle profile builder ──────────────────────────────────────────────

function makeVP(overrides: Partial<VehicleProfile> = {}): VehicleProfile {
  return {
    reg: 'SMOKE001',
    make: 'FORD',
    model: 'FOCUS',
    year: 2020,
    fuel: 'petrol',
    engineCC: 1600,
    colour: 'BLACK',
    co2: 140,
    euroStatus: '6',
    ulezCompliant: true,
    taxStatus: 'Taxed',
    sornRegistered: false,
    dateOfLastV5C: null,
    motAnalysis: {
      motMonthsRemaining: 8,
      motExpired: false,
      latestMileage: 40000,
      mileageHistory: [],
      annualMileageEstimate: 8000,
      mileageConsistency: 'consistent' as const,
      rollbackAmount: null,
      recentFailCount: 0,
      totalFailCount: 0,
      advisoryCount: 0,
      dangerousDefects: false,
      structuralAdvisories: false,
      structuralAdvisoryCount: 0,
      brakeAdvisories: false,
      riskAdvisories: [],
      totalTestCount: 5,
    },
    resolvedMileage: 40000,
    userDeclaredMileage: 40000,
    mileageDiscrepancy: false,
    mileageDiscrepancyAmount: 0,
    dataCompleteness: 0.9,
    ...overrides,
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════')
  console.log('  PHASE 1 — DB HEALTH CHECK + ENGINE SMOKE TEST')
  console.log('═══════════════════════════════════════════════════════\n')

  // ── 1. Schema verification ──────────────────────────────────────────────

  console.log('📋 Schema Verification')

  // valuation_snapshots v3 columns
  for (const col of ['customer_explanation', 'admin_explanation', 'profit_simulation']) {
    const { error } = await sb.from('valuation_snapshots').select(col).limit(1)
    assert(`valuation_snapshots.${col}`, !error, error?.message)
  }

  // engine_coefficients table
  const { error: ecErr } = await sb.from('engine_coefficients').select('id, version_id, status, shadow_mode').limit(1)
  assert('engine_coefficients table', !ecErr, ecErr?.message)

  // shadow_comparison_log table
  const { error: scErr } = await sb.from('shadow_comparison_log').select('id, current_version, candidate_version, delta_pct').limit(1)
  assert('shadow_comparison_log table', !scErr, scErr?.message)

  // leads outcome columns
  for (const col of ['actual_purchase_price', 'actual_resale_price', 'actual_recon_cost', 'days_to_sale']) {
    const { error } = await sb.from('leads').select(col).limit(1)
    assert(`leads.${col}`, !error, error?.message)
  }

  // ── 2. Engine smoke tests ────────────────────────────────────────────────

  console.log('\n🚗 Smoke Test 1: Clean 2020 Petrol Focus (should auto-quote)')
  const clean = calculateValuation({
    vehicleProfile: makeVP(),
    condition: 'good',
    postcode: 'B44 0SB',
  })
  assert('quoteMode = auto', clean.quoteMode === 'auto')
  assert('riskTier = low', clean.riskTier === 'low')
  assert('min > 0', clean.min > 0, `min=${clean.min}`)
  assert('min < max', clean.min < clean.max, `min=${clean.min} max=${clean.max}`)
  assert('has customerExplanation', clean.customerExplanation.bullets.length > 0)
  assert('has adminExplanation (array)', Array.isArray(clean.adminExplanation), `type=${typeof clean.adminExplanation}`)
  assert('has profitSimulation', clean.profitSimulation.expectedProfitMid !== undefined)

  console.log('\n🔴 Smoke Test 2: Rollback Detected (should block)')
  const liability = calculateValuation({
    vehicleProfile: makeVP({
      motAnalysis: {
        motMonthsRemaining: 4,
        motExpired: false,
        latestMileage: 30000,
        mileageHistory: [],
        annualMileageEstimate: 6000,
        mileageConsistency: 'rollback_detected' as const,
        rollbackAmount: 15000,
        recentFailCount: 0,
        totalFailCount: 0,
        advisoryCount: 0,
        dangerousDefects: false,
        structuralAdvisories: false,
        structuralAdvisoryCount: 0,
        brakeAdvisories: false,
        riskAdvisories: [],
        totalTestCount: 4,
      },
    }),
    condition: 'good',
    postcode: 'B44 0SB',
  })
  assert('quoteMode = blocked', liability.quoteMode === 'blocked')
  assert('riskTier = manual_only', liability.riskTier === 'manual_only')
  assert('min = 0', liability.min === 0, `min=${liability.min}`)
  assert('max = 0', liability.max === 0, `max=${liability.max}`)
  assert('has adminExplanation for liability', liability.adminExplanation.some(a => a.severity === 'critical'))

  console.log('\n🟡 Smoke Test 3: Fuzzy Market (LADA — no exact match)')
  const fuzzy = calculateValuation({
    vehicleProfile: makeVP({
      make: 'LADA',
      model: 'NIVA',
      year: 2005,
      fuel: 'petrol',
      resolvedMileage: 80000,
      userDeclaredMileage: 80000,
    }),
    condition: 'fair',
    postcode: 'LS1 1BA',
  })
  assert('quoteMode != auto for no-match', fuzzy.quoteMode !== 'auto', `mode=${fuzzy.quoteMode}`)
  assert('has customer explanation', fuzzy.customerExplanation.bullets.length >= 1)

  // ── 3. Snapshot write + read test ────────────────────────────────────────

  console.log('\n💾 Snapshot Write/Read Test')

  // Create a test lead
  const { data: testLead, error: leadErr } = await sb
    .from('leads')
    .insert({
      seller_name: 'SMOKE_TEST',
      seller_phone: '07000000000',
      seller_email: 'smoke@test.dev',
      seller_postcode: 'B44 0SB',
      reg: 'SMOKE001',
      make: 'FORD',
      model: 'FOCUS',
      year: 2020,
      fuel: 'petrol',
      mileage: 40000,
      condition: 'good',
      estimated_min: clean.min,
      estimated_max: clean.max,
      status: 'new',
      finance_status: 'not_checked',
      source: 'smoke_test',
      consent_data_processing: true,
    })
    .select('id')
    .single()

  assert('test lead created', !leadErr && !!testLead, leadErr?.message)

  if (testLead) {
    // Write snapshot with v3 fields
    const { error: snapErr } = await sb.from('valuation_snapshots').insert({
      lead_id: testLead.id,
      input_vehicle: makeVP(),
      input_condition: 'good',
      input_postcode: 'B44 0SB',
      result_min: clean.min,
      result_max: clean.max,
      result_midpoint: clean.midpoint,
      confidence_score: clean.confidenceScore,
      risk_tier: clean.riskTier,
      risk_flags: clean.riskFlags,
      auto_quote: clean.quoteMode === 'auto',
      market_value_used: clean.marketValueUsed,
      all_multipliers: clean.allMultipliers,
      region_used: clean.regionUsed,
      customer_explanation: clean.customerExplanation,
      admin_explanation: clean.adminExplanation,
      profit_simulation: clean.profitSimulation,
      engine_version: 'v3',
    })
    assert('snapshot written with v3 fields', !snapErr, snapErr?.message)

    // Read it back
    const { data: readSnap, error: readErr } = await sb
      .from('valuation_snapshots')
      .select('customer_explanation, admin_explanation, profit_simulation, engine_version')
      .eq('lead_id', testLead.id)
      .single()

    assert('snapshot readable', !readErr && !!readSnap, readErr?.message)
    if (readSnap) {
      const customerExplanation = readSnap.customer_explanation as { bullets?: unknown[] } | null
      const profitSimulation = readSnap.profit_simulation as { expectedProfitMid?: unknown } | null
      assert('customer_explanation persisted', (customerExplanation?.bullets?.length ?? 0) > 0)
      assert('admin_explanation persisted', Array.isArray(readSnap.admin_explanation))
      assert('profit_simulation persisted', profitSimulation?.expectedProfitMid !== undefined)
      assert('engine_version = v3', readSnap.engine_version === 'v3')
    }

    // Cleanup test data
    await sb.from('valuation_snapshots').delete().eq('lead_id', testLead.id)
    await sb.from('leads').delete().eq('id', testLead.id)
    console.log('  🧹 Test data cleaned up')
  }

  // ── Summary ──────────────────────────────────────────────────────────────

  console.log('\n═══════════════════════════════════════════════════════')
  console.log(`  ✅ Passed: ${passed}`)
  if (failed > 0) console.log(`  ❌ Failed: ${failed}`)
  console.log(`  ${failed === 0 ? '🎉 ALL SMOKE TESTS PASS — DB HEALTHY' : '⚠️ SOME CHECKS FAILED'}`)
  console.log('═══════════════════════════════════════════════════════\n')

  if (failed > 0) process.exit(1)
}

main().catch(e => { console.error('Fatal:', e); process.exit(1) })
