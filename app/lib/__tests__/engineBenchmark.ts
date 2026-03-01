/**
 * Engine Performance Micro-Benchmark + Determinism Check.
 *
 * Runs 10,000 valuations in-memory and reports:
 *   - p50, p95, p99, max latency
 *   - Total wall-clock time
 *   - Determinism: every identical input returns identical output
 *
 * Run with: npx tsx lib/__tests__/engineBenchmark.ts
 */

import { calculateValuation } from '@/lib/pricingEngine'
import type { VehicleProfile, Condition, ValuationResult } from '@/lib/types'

const NOW = new Date('2026-03-01T12:00:00Z')
const ITERATIONS = 10_000
const DETERMINISM_CHECKS = 100

// ── Test profiles ──────────────────────────────────────────────────────────────

function makeVP(overrides: Partial<VehicleProfile>): VehicleProfile {
  return {
    reg: 'BENCH001',
    make: 'FORD',
    model: 'FOCUS',
    year: 2018,
    fuel: 'petrol',
    engineCC: 1600,
    colour: 'BLUE',
    co2: 140,
    euroStatus: '6',
    ulezCompliant: true,
    taxStatus: 'Taxed',
    sornRegistered: false,
    dateOfLastV5C: null,
    motAnalysis: {
      motMonthsRemaining: 8,
      motExpired: false,
      latestMileage: 45000,
      mileageHistory: [],
      annualMileageEstimate: 9000,
      mileageConsistency: 'consistent',
      rollbackAmount: null,
      recentFailCount: 0,
      totalFailCount: 1,
      advisoryCount: 2,
      dangerousDefects: false,
      structuralAdvisories: false,
      structuralAdvisoryCount: 0,
      brakeAdvisories: false,
      riskAdvisories: [],
      totalTestCount: 5,
    },
    resolvedMileage: 45000,
    userDeclaredMileage: 45000,
    mileageDiscrepancy: false,
    mileageDiscrepancyAmount: 0,
    dataCompleteness: 0.9,
    ...overrides,
  }
}

/** Diverse input scenarios to exercise different code paths */
const SCENARIOS: Array<{ vp: VehicleProfile; condition: Condition; postcode: string }> = [
  // Happy path: clean petrol
  { vp: makeVP({}), condition: 'good', postcode: 'B44 0SB' },
  // Older car, fair condition
  { vp: makeVP({ year: 2012, resolvedMileage: 120000, userDeclaredMileage: 120000 }), condition: 'fair', postcode: 'SW1A 1AA' },
  // Diesel, ULEZ-non-compliant
  { vp: makeVP({ fuel: 'diesel', euroStatus: '4', ulezCompliant: false }), condition: 'good', postcode: 'E1 6AN' },
  // EV, low mileage
  { vp: makeVP({ fuel: 'electric', year: 2021, resolvedMileage: 15000, userDeclaredMileage: 15000 }), condition: 'excellent', postcode: 'M1 1AA' },
  // Poor condition, high mileage, structural
  {
    vp: makeVP({
      year: 2010,
      resolvedMileage: 180000,
      userDeclaredMileage: 180000,
      motAnalysis: {
        motMonthsRemaining: 1,
        motExpired: false,
        latestMileage: 178000,
        mileageHistory: [],
        annualMileageEstimate: 15000,
        mileageConsistency: 'consistent',
        rollbackAmount: null,
        recentFailCount: 3,
        totalFailCount: 6,
        advisoryCount: 8,
        dangerousDefects: false,
        structuralAdvisories: true,
        structuralAdvisoryCount: 2,
        brakeAdvisories: true,
        riskAdvisories: ['Corrosion on rear subframe', 'Brake disc worn'],
        totalTestCount: 10,
      },
    }),
    condition: 'poor',
    postcode: 'LS1 1BA',
  },
  // SORN
  { vp: makeVP({ taxStatus: 'SORN', sornRegistered: true }), condition: 'fair', postcode: 'BN1 1AA' },
  // Mileage discrepancy
  {
    vp: makeVP({
      resolvedMileage: 50000,
      userDeclaredMileage: 30000,
      mileageDiscrepancy: true,
      mileageDiscrepancyAmount: 20000,
    }),
    condition: 'good',
    postcode: 'CF10 1AA',
  },
  // Very old car
  { vp: makeVP({ year: 2005, resolvedMileage: 200000, userDeclaredMileage: 200000 }), condition: 'poor', postcode: 'G1 1AA' },
  // Rollback detected (blocked)
  {
    vp: makeVP({
      motAnalysis: {
        motMonthsRemaining: 4,
        motExpired: false,
        latestMileage: 30000,
        mileageHistory: [],
        annualMileageEstimate: 6000,
        mileageConsistency: 'rollback_detected',
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
    postcode: 'EH1 1BB',
  },
  // Dangerous defects (blocked)
  {
    vp: makeVP({
      motAnalysis: {
        motMonthsRemaining: 0,
        motExpired: true,
        latestMileage: 60000,
        mileageHistory: [],
        annualMileageEstimate: 12000,
        mileageConsistency: 'consistent',
        rollbackAmount: null,
        recentFailCount: 2,
        totalFailCount: 4,
        advisoryCount: 5,
        dangerousDefects: true,
        structuralAdvisories: false,
        structuralAdvisoryCount: 0,
        brakeAdvisories: false,
        riskAdvisories: [],
        totalTestCount: 6,
      },
    }),
    condition: 'fair',
    postcode: 'NE1 1AA',
  },
]

// ── Benchmark ──────────────────────────────────────────────────────────────────

function percentile(sorted: number[], pct: number): number {
  const idx = Math.ceil((pct / 100) * sorted.length) - 1
  return sorted[Math.max(0, idx)]
}

console.log('═══════════════════════════════════════════════════════')
console.log('  ENGINE PERFORMANCE MICRO-BENCHMARK')
console.log(`  ${ITERATIONS.toLocaleString()} iterations across ${SCENARIOS.length} scenarios`)
console.log('═══════════════════════════════════════════════════════\n')

// Warmup — JIT optimization
console.log('⏳ Warming up (100 iterations)...')
for (let i = 0; i < 100; i++) {
  const s = SCENARIOS[i % SCENARIOS.length]
  calculateValuation({ vehicleProfile: s.vp, condition: s.condition, postcode: s.postcode, now: NOW })
}

// Timed benchmark
const timings: number[] = []
const scenarioTimings: Map<number, number[]> = new Map()

console.log(`⏱  Running ${ITERATIONS.toLocaleString()} valuations...\n`)
const wallStart = performance.now()

for (let i = 0; i < ITERATIONS; i++) {
  const sIdx = i % SCENARIOS.length
  const s = SCENARIOS[sIdx]

  const t0 = performance.now()
  calculateValuation({ vehicleProfile: s.vp, condition: s.condition, postcode: s.postcode, now: NOW })
  const elapsed = performance.now() - t0

  timings.push(elapsed)
  if (!scenarioTimings.has(sIdx)) scenarioTimings.set(sIdx, [])
  scenarioTimings.get(sIdx)!.push(elapsed)
}

const wallEnd = performance.now()
const wallMs = Math.round(wallEnd - wallStart)

// Sort for percentile calculations
timings.sort((a, b) => a - b)

const p50 = percentile(timings, 50)
const p95 = percentile(timings, 95)
const p99 = percentile(timings, 99)
const maxMs = timings[timings.length - 1]
const avgMs = timings.reduce((a, b) => a + b, 0) / timings.length

console.log('─── Overall ─────────────────────────────────────────')
console.log(`  Total wall-clock:  ${wallMs}ms`)
console.log(`  Avg per valuation: ${avgMs.toFixed(3)}ms`)
console.log(`  p50:               ${p50.toFixed(3)}ms`)
console.log(`  p95:               ${p95.toFixed(3)}ms`)
console.log(`  p99:               ${p99.toFixed(3)}ms`)
console.log(`  Max:               ${maxMs.toFixed(3)}ms`)
console.log(`  Throughput:        ${Math.round(ITERATIONS / (wallMs / 1000))}/sec`)

// Per-scenario breakdown
console.log('\n─── Per-Scenario Avg ────────────────────────────────')
for (let i = 0; i < SCENARIOS.length; i++) {
  const st = scenarioTimings.get(i) || []
  const avg = st.reduce((a, b) => a + b, 0) / st.length
  const label = `Scenario ${i + 1}`
  console.log(`  ${label.padEnd(14)} ${avg.toFixed(3)}ms avg  (${st.length} runs)`)
}

// ── Determinism check ──────────────────────────────────────────────────────────

console.log(`\n─── Determinism Check (${DETERMINISM_CHECKS} per scenario) ──────`)
let detPassed = 0
let detFailed = 0

for (let sIdx = 0; sIdx < SCENARIOS.length; sIdx++) {
  const s = SCENARIOS[sIdx]
  const baseline = calculateValuation({ vehicleProfile: s.vp, condition: s.condition, postcode: s.postcode, now: NOW })

  let allMatch = true
  for (let j = 0; j < DETERMINISM_CHECKS; j++) {
    const repeat = calculateValuation({ vehicleProfile: s.vp, condition: s.condition, postcode: s.postcode, now: NOW })

    if (
      repeat.min !== baseline.min ||
      repeat.max !== baseline.max ||
      repeat.midpoint !== baseline.midpoint ||
      repeat.confidenceScore !== baseline.confidenceScore ||
      repeat.riskTier !== baseline.riskTier ||
      repeat.quoteMode !== baseline.quoteMode
    ) {
      allMatch = false
      console.log(`  ❌ Scenario ${sIdx + 1}: non-deterministic! baseline.mid=${baseline.midpoint} repeat.mid=${repeat.midpoint}`)
      detFailed++
      break
    }
  }

  if (allMatch) {
    detPassed++
    console.log(`  ✅ Scenario ${sIdx + 1}: deterministic (${DETERMINISM_CHECKS} runs identical)`)
  }
}

// ── Memory ─────────────────────────────────────────────────────────────────────

console.log('\n─── Memory ─────────────────────────────────────────')
const mem = process.memoryUsage()
console.log(`  RSS:          ${(mem.rss / 1024 / 1024).toFixed(1)}MB`)
console.log(`  Heap Used:    ${(mem.heapUsed / 1024 / 1024).toFixed(1)}MB`)
console.log(`  Heap Total:   ${(mem.heapTotal / 1024 / 1024).toFixed(1)}MB`)
console.log(`  External:     ${(mem.external / 1024 / 1024).toFixed(1)}MB`)

// ── Summary ────────────────────────────────────────────────────────────────────

console.log('\n═══════════════════════════════════════════════════════')
console.log(`  RESULTS: ${ITERATIONS.toLocaleString()} valuations in ${wallMs}ms`)
console.log(`  LATENCY: p50=${p50.toFixed(3)}ms  p95=${p95.toFixed(3)}ms  p99=${p99.toFixed(3)}ms`)
console.log(`  DETERMINISM: ${detPassed}/${detPassed + detFailed} scenarios passed`)

// Performance gates
const GATE_P95_MS = 5.0  // p95 must be under 5ms
const GATE_P99_MS = 10.0 // p99 must be under 10ms

let gatesPassed = true
if (p95 > GATE_P95_MS) {
  console.log(`  ⚠️  GATE FAIL: p95 ${p95.toFixed(3)}ms > ${GATE_P95_MS}ms target`)
  gatesPassed = false
}
if (p99 > GATE_P99_MS) {
  console.log(`  ⚠️  GATE FAIL: p99 ${p99.toFixed(3)}ms > ${GATE_P99_MS}ms target`)
  gatesPassed = false
}
if (detFailed > 0) {
  console.log(`  ⚠️  GATE FAIL: ${detFailed} non-deterministic scenarios`)
  gatesPassed = false
}

if (gatesPassed) {
  console.log('  ✅ ALL GATES PASSED')
} else {
  console.log('  ❌ SOME GATES FAILED')
}

console.log('═══════════════════════════════════════════════════════\n')

// Exit with error code if gates failed
if (!gatesPassed || detFailed > 0) process.exit(1)
