/**
 * Engine Invariant Test Suite — INV-1 through INV-5.
 *
 * These are property-based invariants that must ALWAYS hold, regardless of
 * input combination. If any invariant fails, the engine has drifted.
 *
 * Run with: npx tsx lib/__tests__/engineInvariants.ts
 */

import { calculateValuation } from '@/lib/pricingEngine'
import type { VehicleProfile, Condition, ValuationResult } from '@/lib/types'

const NOW = new Date('2026-03-01T12:00:00Z')

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeVP(overrides: Partial<VehicleProfile>): VehicleProfile {
  return {
    reg: 'INV00TEST',
    make: 'TEST',
    model: 'TEST',
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
      mileageConsistency: 'consistent',
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
    dataCompleteness: 90,
    ...overrides,
  }
}

function run(
  vp: VehicleProfile,
  condition: Condition = 'good',
  postcode: string = 'B44 0SB'
): ValuationResult {
  return calculateValuation({ vehicleProfile: vp, condition, postcode, now: NOW })
}

let passed = 0
let failed = 0

function assert(name: string, ok: boolean, detail: string = '') {
  if (ok) {
    passed++
    console.log(`  ✅ ${name}`)
  } else {
    failed++
    console.log(`  ❌ ${name} ${detail}`)
  }
}

// ── INV-1: blocked/manual_only → min = max = 0 ─────────────────────────────

function inv1() {
  console.log('\n🔒 INV-1: blocked/manual_only → min = max = 0')

  // Case A: Rollback → blocked
  const rollback = run(makeVP({
    make: 'FORD', model: 'FOCUS', year: 2018,
    motAnalysis: {
      motMonthsRemaining: 3,
      motExpired: false,
      latestMileage: 50000,
      mileageHistory: [
        { date: '2022-01-01', mileage: 60000 },
        { date: '2023-01-01', mileage: 50000 },
      ],
      annualMileageEstimate: 10000,
      mileageConsistency: 'rollback_detected',
      rollbackAmount: 10000,
      recentFailCount: 0, totalFailCount: 0, advisoryCount: 0,
      dangerousDefects: false, structuralAdvisories: false,
      structuralAdvisoryCount: 0, brakeAdvisories: false,
      riskAdvisories: [], totalTestCount: 4,
    },
  }))
  assert(
    'Rollback → min=0, max=0',
    rollback.min === 0 && rollback.max === 0,
    `got min=${rollback.min}, max=${rollback.max}`
  )
  assert(
    'Rollback → riskTier=manual_only',
    rollback.riskTier === 'manual_only',
    `got ${rollback.riskTier}`
  )

  // Case B: structural 4+ AND MOT expired → blocked (liability override RULE 2)
  const structExpired = run(makeVP({
    make: 'FORD', model: 'FOCUS', year: 2015,
    motAnalysis: {
      motMonthsRemaining: 0,
      motExpired: true,
      latestMileage: 90000,
      mileageHistory: [],
      annualMileageEstimate: 9000,
      mileageConsistency: 'consistent',
      rollbackAmount: null,
      recentFailCount: 1, totalFailCount: 2, advisoryCount: 8,
      dangerousDefects: false,
      structuralAdvisories: true,
      structuralAdvisoryCount: 5,
      brakeAdvisories: true,
      riskAdvisories: [
        'Corroded subframe mount offside',
        'Corrosion on nearside sill',
        'Corroded crossmember',
        'Structural rust offside rear panel',
        'Corrosion on underside chassis rail',
        'Brake disc worn close to limit',
        'Oil leak engine sump',
        'Exhaust corroded at joint',
      ],
      totalTestCount: 8,
    },
  }), 'poor')
  assert(
    'Structural 4+ AND MOT expired → min=0, max=0',
    structExpired.min === 0 && structExpired.max === 0,
    `got min=${structExpired.min}, max=${structExpired.max}`
  )

  // Case C: SORN + expired MOT → blocked (liability override RULE 5)
  const sornExpired = run(makeVP({
    make: 'FORD', model: 'FOCUS', year: 2016,
    sornRegistered: true,
    motAnalysis: {
      motMonthsRemaining: 0,
      motExpired: true,
      latestMileage: 70000,
      mileageHistory: [],
      annualMileageEstimate: 8000,
      mileageConsistency: 'consistent',
      rollbackAmount: null,
      recentFailCount: 0, totalFailCount: 0, advisoryCount: 0,
      dangerousDefects: false, structuralAdvisories: false,
      structuralAdvisoryCount: 0, brakeAdvisories: false,
      riskAdvisories: [], totalTestCount: 5,
    },
  }))
  assert(
    'SORN + expired MOT → min=0, max=0',
    sornExpired.min === 0 && sornExpired.max === 0,
    `got min=${sornExpired.min}, max=${sornExpired.max}`
  )
}

// ── INV-2: auto quotes → min < max ─────────────────────────────────────────

function inv2() {
  console.log('\n📏 INV-2: auto quotes → min < max')

  const conditions: Condition[] = ['excellent', 'good', 'fair', 'poor']
  const fuels = ['petrol', 'diesel', 'hybrid', 'electric'] as const
  const years = [2023, 2020, 2016, 2012]

  for (const cond of conditions) {
    for (const fuel of fuels) {
      for (const year of years) {
        const r = run(makeVP({
          make: 'FORD', model: 'FOCUS', year, fuel,
        }), cond)

        // Only check auto/manual_review quotes (not blocked)
        if (r.quoteMode !== 'blocked' && r.riskTier !== 'manual_only') {
          assert(
            `${cond}/${fuel}/${year}: min(${r.min}) < max(${r.max})`,
            r.min < r.max,
            `min=${r.min}, max=${r.max}`
          )
        }
      }
    }
  }
}

// ── INV-3: auto quotes → min >= 200 ────────────────────────────────────────

function inv3() {
  console.log('\n💰 INV-3: auto quotes → min ≥ £200')

  // Even worst-case non-blocked scenarios should floor at £200
  const edgeCases = [
    { label: 'Old diesel, poor, 120k', vp: makeVP({ make: 'FORD', model: 'FOCUS', year: 2012, fuel: 'diesel', resolvedMileage: 120000, userDeclaredMileage: 120000 }), cond: 'poor' as Condition },
    { label: 'Old petrol, fair, 100k', vp: makeVP({ make: 'FORD', model: 'FOCUS', year: 2013, fuel: 'petrol', resolvedMileage: 100000, userDeclaredMileage: 100000 }), cond: 'fair' as Condition },
    { label: '2021 hybrid, excellent', vp: makeVP({ make: 'TOYOTA', model: 'YARIS', year: 2021, fuel: 'hybrid', resolvedMileage: 15000, userDeclaredMileage: 15000 }), cond: 'excellent' as Condition },
    { label: '2017 EV, good', vp: makeVP({ make: 'NISSAN', model: 'LEAF', year: 2017, fuel: 'electric', resolvedMileage: 50000, userDeclaredMileage: 50000 }), cond: 'good' as Condition },
  ]

  for (const { label, vp, cond } of edgeCases) {
    const r = run(vp, cond)
    if (r.quoteMode !== 'blocked' && r.riskTier !== 'manual_only') {
      assert(
        `${label}: min(${r.min}) ≥ 200`,
        r.min >= 200,
        `min=${r.min}`
      )
    }
  }
}

// ── INV-4: spread between 4% and 15% of adjustedValue ──────────────────────

function inv4() {
  console.log('\n📊 INV-4: spread within 4%–15% of adjustedValue (unless blocked)')

  const scenarios = [
    { label: 'Clean petrol 2022', vp: makeVP({ make: 'FORD', model: 'FOCUS', year: 2022 }), cond: 'good' as Condition },
    { label: 'Diesel 2018', vp: makeVP({ make: 'BMW', model: '3 SERIES', year: 2018, fuel: 'diesel', resolvedMileage: 60000, userDeclaredMileage: 60000 }), cond: 'fair' as Condition },
    { label: 'EV 2020', vp: makeVP({ make: 'NISSAN', model: 'LEAF', year: 2020, fuel: 'electric' }), cond: 'good' as Condition },
    { label: 'Old Ford 2014', vp: makeVP({ make: 'FORD', model: 'FOCUS', year: 2014, resolvedMileage: 90000, userDeclaredMileage: 90000 }), cond: 'fair' as Condition },
  ]

  for (const { label, vp, cond } of scenarios) {
    const r = run(vp, cond)
    if (r.riskTier === 'manual_only' || r.quoteMode === 'blocked') continue
    if (r.adjustedValue === 0) continue

    const spreadPct = (r.spreadApplied / r.adjustedValue) * 100
    assert(
      `${label}: spread ${spreadPct.toFixed(1)}% ∈ [4%, 15%]`,
      spreadPct >= 4 && spreadPct <= 15,
      `spreadApplied=${r.spreadApplied}, adjustedValue=${r.adjustedValue}, pct=${spreadPct.toFixed(1)}%`
    )
  }
}

// ── INV-5: all multipliers within sane ranges ───────────────────────────────

function inv5() {
  console.log('\n🔬 INV-5: all multipliers within sane ranges')

  const scenarios = [
    { label: 'Clean', vp: makeVP({ make: 'FORD', model: 'FOCUS', year: 2021 }), cond: 'good' as Condition },
    { label: 'Diesel 2014', vp: makeVP({ make: 'BMW', model: '3 SERIES', year: 2014, fuel: 'diesel', resolvedMileage: 85000, userDeclaredMileage: 85000 }), cond: 'fair' as Condition },
    { label: 'EV 2018', vp: makeVP({ make: 'NISSAN', model: 'LEAF', year: 2018, fuel: 'electric', resolvedMileage: 55000, userDeclaredMileage: 55000 }), cond: 'good' as Condition },
    { label: 'Stressed', vp: makeVP({
      make: 'FORD', model: 'FOCUS', year: 2015, fuel: 'diesel',
      resolvedMileage: 130000, userDeclaredMileage: 130000,
      motAnalysis: {
        motMonthsRemaining: 2, motExpired: false,
        latestMileage: 128000,
        mileageHistory: [],
        annualMileageEstimate: 12000,
        mileageConsistency: 'suspicious',
        rollbackAmount: null,
        recentFailCount: 2, totalFailCount: 3, advisoryCount: 6,
        dangerousDefects: false, structuralAdvisories: true,
        structuralAdvisoryCount: 2, brakeAdvisories: true,
        riskAdvisories: [
          'Corroded nearside sill',
          'Brake pipes corroded offside',
          'Oil leak from engine',
          'Tyre close to limit',
          'Exhaust system corroded',
          'Suspension bush worn',
        ],
        totalTestCount: 7,
      },
    }), cond: 'poor' as Condition },
  ]

  const multiplierBounds: Record<string, [number, number]> = {
    ageMultiplier:              [0.30, 1.00],
    mileageMultiplier:          [0.70, 1.05],
    motMultiplier:              [0.80, 1.05],
    fuelMultiplier:             [0.80, 1.05],
    conditionMultiplier:        [0.80, 1.00],
    regionMultiplier:           [0.88, 1.08],
    ulezMultiplier:             [0.90, 1.00],
    mileageConsistencyMultiplier: [0.50, 1.00],
    volatilityMultiplier:       [0.90, 1.00],
    keeperMultiplier:           [0.95, 1.00],
    sornMultiplier:             [0.85, 1.00],
    reconMultiplier:            [0.75, 1.00],
    marketConfidenceMultiplier: [0.90, 1.00],
    inputTrustMultiplier:       [0.85, 1.00],
    combinedAdjustment:         [0.10, 1.00],
  }

  for (const { label, vp, cond } of scenarios) {
    const r = run(vp, cond)
    if (r.riskTier === 'manual_only') continue

    for (const [key, [lo, hi]] of Object.entries(multiplierBounds)) {
      const val = r.allMultipliers[key as keyof typeof r.allMultipliers] as number
      assert(
        `${label} → ${key}: ${val} ∈ [${lo}, ${hi}]`,
        val >= lo && val <= hi,
        `val=${val}`
      )
    }
  }
}

// ── Run all invariants ──────────────────────────────────────────────────────

console.log('🔐 ENGINE INVARIANT TEST SUITE (INV-1 through INV-5)')
console.log('Date:', NOW.toISOString())

inv1()
inv2()
inv3()
inv4()
inv5()

console.log(`\n${'═'.repeat(60)}`)
console.log(`  ✅ Passed: ${passed}`)
if (failed > 0) {
  console.log(`  ❌ Failed: ${failed}`)
  process.exit(1)
} else {
  console.log(`  🎉 All invariants hold.`)
}
