/**
 * Engine v3 Stress Tests — 4 worst-case scenarios.
 *
 * Run with: npx tsx lib/__tests__/engineStressTest.ts
 */

import { calculateValuation } from '@/lib/pricingEngine'
import type { VehicleProfile, Condition } from '@/lib/types'

const NOW = new Date('2026-03-01T12:00:00Z')

// Helper to build a VehicleProfile with defaults
function makeVP(overrides: Partial<VehicleProfile>): VehicleProfile {
  return {
    reg: 'TEST123',
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

function hr() { console.log('\n' + '═'.repeat(80) + '\n') }

// ============================================================================
// ☠️ SCENARIO 1 — "Fraud Special"
// 2013 Audi A5, 180k declared, rollback, 3 failures, expired MOT, SORN,
// diesel, 4 structural advisories, recent keeper change
// Expected: manual_only / blocked, no auto-offer
// ============================================================================

function scenario1() {
  console.log('☠️ SCENARIO 1 — "Fraud Special" (2013 Audi A5)')

  const vp = makeVP({
    make: 'AUDI',
    model: 'A5',
    year: 2013,
    fuel: 'diesel',
    sornRegistered: true,
    dateOfLastV5C: '2026-01-15', // 2 months ago
    resolvedMileage: 180000,
    userDeclaredMileage: 180000,
    mileageDiscrepancy: true,
    mileageDiscrepancyAmount: 15000,
    dataCompleteness: 50,
    motAnalysis: {
      motMonthsRemaining: 0,
      motExpired: true,
      latestMileage: 165000,
      mileageHistory: [
        { date: '2020-01-15', mileage: 120000 },
        { date: '2021-01-10', mileage: 140000 },
        { date: '2022-02-05', mileage: 130000 }, // ROLLBACK
        { date: '2023-03-20', mileage: 155000 },
        { date: '2024-04-01', mileage: 165000 },
      ],
      annualMileageEstimate: 11000,
      mileageConsistency: 'rollback_detected',
      rollbackAmount: 10000,
      recentFailCount: 3,
      totalFailCount: 5,
      advisoryCount: 8,
      dangerousDefects: true,
      structuralAdvisories: true,
      structuralAdvisoryCount: 4,
      brakeAdvisories: true,
      riskAdvisories: [
        'Corroded rear subframe mounting',
        'Corrosion on offside sill',
        'Brake disc worn close to limit nearside front',
        'Oil leak from engine sump gasket',
        'Corroded exhaust pipe',
        'Suspension arm bush worn offside rear',
        'Corrosion on underside crossmember',
        'Tyre tread close to legal limit nearside rear',
      ],
      totalTestCount: 8,
    },
  })

  const result = calculateValuation({
    vehicleProfile: vp,
    condition: 'poor',
    postcode: 'B44 0SB',
    now: NOW,
  })

  console.log(`  quoteMode:    ${result.quoteMode}`)
  console.log(`  riskTier:     ${result.riskTier}`)
  console.log(`  min/max:      £${result.min} – £${result.max}`)
  console.log(`  confidence:   ${result.confidenceScore}/100`)
  console.log(`  riskFlags:    ${result.riskFlags.length}`)
  result.riskFlags.forEach(f => console.log(`    • ${f}`))

  const pass = result.quoteMode === 'blocked' && result.riskTier === 'manual_only' && result.min === 0
  console.log(`  ✅ PASS: ${pass ? 'YES — blocked, no auto-offer' : '❌ NO — engine still offered a range!'}`)
}

// ============================================================================
// ☠️ SCENARIO 2 — "Battery Time Bomb"
// 2017 Nissan Leaf, 70k, electric, 9 years old
// Expected: aggressive EV discount, low offer
// ============================================================================

function scenario2() {
  console.log('☠️ SCENARIO 2 — "Battery Time Bomb" (2017 Nissan Leaf)')

  const vp = makeVP({
    make: 'NISSAN',
    model: 'LEAF',
    year: 2017,
    fuel: 'electric',
    resolvedMileage: 70000,
    userDeclaredMileage: 70000,
    motAnalysis: {
      motMonthsRemaining: 6,
      motExpired: false,
      latestMileage: 68000,
      mileageHistory: [
        { date: '2021-03-01', mileage: 40000 },
        { date: '2022-03-10', mileage: 50000 },
        { date: '2023-04-15', mileage: 58000 },
        { date: '2024-05-20', mileage: 64000 },
        { date: '2025-06-10', mileage: 68000 },
      ],
      annualMileageEstimate: 7000,
      mileageConsistency: 'consistent',
      rollbackAmount: null,
      recentFailCount: 0,
      totalFailCount: 0,
      advisoryCount: 1,
      dangerousDefects: false,
      structuralAdvisories: false,
      structuralAdvisoryCount: 0,
      brakeAdvisories: false,
      riskAdvisories: ['Tyre showing signs of aging nearside rear'],
      totalTestCount: 5,
    },
  })

  const result = calculateValuation({
    vehicleProfile: vp,
    condition: 'good',
    postcode: 'B44 0SB',
    now: NOW,
  })

  console.log(`  quoteMode:    ${result.quoteMode}`)
  console.log(`  riskTier:     ${result.riskTier}`)
  console.log(`  min/max:      £${result.min} – £${result.max}`)
  console.log(`  midpoint:     £${result.midpoint}`)
  console.log(`  confidence:   ${result.confidenceScore}/100`)
  console.log(`  fuelMult:     ${result.allMultipliers.fuelMultiplier}`)
  console.log(`  ageMult:      ${result.allMultipliers.ageMultiplier}`)
  console.log(`  reconEst:     £${result.allMultipliers.reconEstimate}`)
  console.log(`  reconMult:    ${result.allMultipliers.reconMultiplier}`)
  result.riskFlags.forEach(f => console.log(`    • ${f}`))

  const pass = result.allMultipliers.fuelMultiplier <= 0.85
  console.log(`  ✅ PASS: ${pass ? 'YES — EV 8+yr battery discount applied (0.85)' : '❌ NO — EV battery multiplier too generous'}`)
}

// ============================================================================
// ☠️ SCENARIO 3 — "Looks Clean But Hidden Risk"
// 2016 BMW 320d, 80k, 5 risk advisories (structural, brake, oil, suspension, exhaust)
// Expected: proportional structural + recon estimation knocking value down
// ============================================================================

function scenario3() {
  console.log('☠️ SCENARIO 3 — "Looks Clean But Hidden Risk" (2016 BMW 320d)')

  const vp = makeVP({
    make: 'BMW',
    model: '3 SERIES',
    year: 2016,
    fuel: 'diesel',
    resolvedMileage: 80000,
    userDeclaredMileage: 80000,
    motAnalysis: {
      motMonthsRemaining: 7,
      motExpired: false,
      latestMileage: 78000,
      mileageHistory: [
        { date: '2020-06-15', mileage: 45000 },
        { date: '2021-06-20', mileage: 55000 },
        { date: '2022-07-10', mileage: 63000 },
        { date: '2023-08-05', mileage: 71000 },
        { date: '2024-09-01', mileage: 78000 },
      ],
      annualMileageEstimate: 8250,
      mileageConsistency: 'consistent',
      rollbackAmount: null,
      recentFailCount: 0,
      totalFailCount: 1,
      advisoryCount: 5,
      dangerousDefects: false,
      structuralAdvisories: true,
      structuralAdvisoryCount: 2,
      brakeAdvisories: true,
      riskAdvisories: [
        'Corroded brake pipes nearside',
        'Suspension arm corrosion offside rear',
        'Oil leak from engine sump',
        'Tyre tread low offside front',
        'Exhaust corrosion at rear section',
      ],
      totalTestCount: 6,
    },
  })

  const result = calculateValuation({
    vehicleProfile: vp,
    condition: 'good',
    postcode: 'B44 0SB',
    now: NOW,
  })

  console.log(`  quoteMode:    ${result.quoteMode}`)
  console.log(`  riskTier:     ${result.riskTier}`)
  console.log(`  min/max:      £${result.min} – £${result.max}`)
  console.log(`  midpoint:     £${result.midpoint}`)
  console.log(`  confidence:   ${result.confidenceScore}/100`)
  console.log(`  motMult:      ${result.allMultipliers.motMultiplier}`)
  console.log(`  reconEst:     £${result.allMultipliers.reconEstimate}`)
  console.log(`  reconMult:    ${result.allMultipliers.reconMultiplier}`)
  console.log(`  combined:     ${result.allMultipliers.combinedAdjustment}`)
  result.riskFlags.forEach(f => console.log(`    • ${f}`))

  const reconApplied = result.allMultipliers.reconEstimate > 0
  const structuralProportional = result.allMultipliers.motMultiplier < 0.95
  console.log(`  ✅ Recon estimation applied: ${reconApplied ? 'YES' : '❌ NO'}`)
  console.log(`  ✅ Structural proportional: ${structuralProportional ? 'YES' : '❌ NO'}`)
}

// ============================================================================
// ☠️ SCENARIO 4 — "Margin Collapse" (Clean car, must still have margin)
// 2022 Toyota Yaris, petrol, 20k, excellent, London, no issues
// Expected: healthy margin, not at 95% of retail
// ============================================================================

function scenario4() {
  console.log('☠️ SCENARIO 4 — "Margin Collapse" (2022 Toyota Yaris)')

  const vp = makeVP({
    make: 'TOYOTA',
    model: 'YARIS',
    year: 2022,
    fuel: 'petrol',
    resolvedMileage: 20000,
    userDeclaredMileage: 20000,
    dataCompleteness: 95,
    motAnalysis: {
      motMonthsRemaining: 10,
      motExpired: false,
      latestMileage: 19000,
      mileageHistory: [
        { date: '2024-03-15', mileage: 12000 },
        { date: '2025-04-10', mileage: 19000 },
      ],
      annualMileageEstimate: 6500,
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
      totalTestCount: 2,
    },
  })

  const result = calculateValuation({
    vehicleProfile: vp,
    condition: 'excellent',
    postcode: 'SW1A 1AA', // London
    now: NOW,
  })

  console.log(`  quoteMode:    ${result.quoteMode}`)
  console.log(`  riskTier:     ${result.riskTier}`)
  console.log(`  min/max:      £${result.min} – £${result.max}`)
  console.log(`  midpoint:     £${result.midpoint}`)
  console.log(`  marketValue:  £${result.marketValueUsed}`)
  console.log(`  confidence:   ${result.confidenceScore}/100`)
  console.log(`  combined:     ${result.allMultipliers.combinedAdjustment}`)
  console.log(`  tradeBase:    £${result.allMultipliers.tradeBase}`)
  console.log(`  rawValue:     £${result.allMultipliers.rawValue}`)
  result.riskFlags.forEach(f => console.log(`    • ${f}`))

  // Midpoint should be well below retail
  const marginPct = result.marketValueUsed > 0
    ? Math.round((1 - result.midpoint / result.marketValueUsed) * 100)
    : 0
  console.log(`  Margin vs retail: ${marginPct}%`)
  console.log(`  ✅ PASS: ${marginPct >= 15 ? 'YES — healthy margin cushion' : '❌ NO — too close to retail!'}`)
}

// ============================================================================
// Run all scenarios
// ============================================================================

console.log('🔥 ENGINE v3 STRESS TESTS')
console.log('Date:', NOW.toISOString())
hr()
scenario1()
hr()
scenario2()
hr()
scenario3()
hr()
scenario4()
hr()
console.log('🏁 All scenarios complete.')
