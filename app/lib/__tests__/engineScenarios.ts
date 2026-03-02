/**
 * Engine v3 Regression Suite — 28 scenarios.
 *
 * Covers the full surface area: clean, stressed, blocked, edge-case, gaming,
 * liability overrides, market confidence, fuel types, postcodes, conditions,
 * EV battery tiers, recon cost, and spread behaviour.
 *
 * Run with: npx tsx lib/__tests__/engineScenarios.ts
 */

import { calculateValuation } from '@/lib/pricingEngine'
import type { VehicleProfile, Condition, ValuationResult } from '@/lib/types'

const NOW = new Date('2026-03-01T12:00:00Z')

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeVP(overrides: Partial<VehicleProfile>): VehicleProfile {
  return {
    reg: 'SCEN00',
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
  cond: Condition = 'good',
  postcode: string = 'B44 0SB'
): ValuationResult {
  return calculateValuation({ vehicleProfile: vp, condition: cond, postcode, now: NOW })
}

let passed = 0
let failed = 0

function assert(ok: boolean, msg: string) {
  if (ok) { passed++; console.log(`    ✅ ${msg}`) }
  else    { failed++; console.log(`    ❌ ${msg}`) }
}

function hr() { console.log('\n' + '─'.repeat(70)) }

// ============================================================================
// 1. Clean Petrol — Golden Path
// ============================================================================
function s01() {
  console.log('\n📗 S01 — Clean 2022 Ford Focus, petrol, 20k, excellent, London')
  const r = run(makeVP({
    make: 'FORD', model: 'FOCUS', year: 2022, resolvedMileage: 20000, userDeclaredMileage: 20000,
    dataCompleteness: 95,
    motAnalysis: { ...makeVP({}).motAnalysis, motMonthsRemaining: 11, latestMileage: 19000, totalTestCount: 2, annualMileageEstimate: 6500 },
  }), 'excellent', 'SW1A 1AA')
  console.log(`    mode=${r.quoteMode} tier=${r.riskTier} range=£${r.min}–£${r.max} mid=£${r.midpoint} conf=${r.confidenceScore}`)
  assert(r.quoteMode === 'auto', 'quoteMode=auto')
  assert(r.riskTier === 'low', 'riskTier=low')
  assert(r.min >= 200 && r.min < r.max, 'valid range')
  assert(r.confidenceScore >= 70, 'confidence ≥ 70')
}

// ============================================================================
// 2. Clean Diesel — Low mileage
// ============================================================================
function s02() {
  console.log('\n📗 S02 — 2021 VW Golf diesel, 25k, good')
  const r = run(makeVP({
    make: 'VOLKSWAGEN', model: 'GOLF', year: 2021, fuel: 'diesel',
    resolvedMileage: 25000, userDeclaredMileage: 25000,
    motAnalysis: { ...makeVP({}).motAnalysis, motMonthsRemaining: 9, latestMileage: 24000 },
  }))
  console.log(`    mode=${r.quoteMode} tier=${r.riskTier} range=£${r.min}–£${r.max} fuel=${r.allMultipliers.fuelMultiplier}`)
  assert(r.quoteMode === 'auto', 'quoteMode=auto')
  assert(r.allMultipliers.fuelMultiplier === 0.97, 'diesel ≤5yr → 0.97')
}

// ============================================================================
// 3. Old Diesel — Market softness
// ============================================================================
function s03() {
  console.log('\n📗 S03 — 2014 BMW 3 Series diesel, 100k, fair')
  const r = run(makeVP({
    make: 'BMW', model: '3 SERIES', year: 2014, fuel: 'diesel',
    resolvedMileage: 100000, userDeclaredMileage: 100000,
  }), 'fair')
  console.log(`    mode=${r.quoteMode} tier=${r.riskTier} range=£${r.min}–£${r.max} fuel=${r.allMultipliers.fuelMultiplier}`)
  assert(r.allMultipliers.fuelMultiplier === 0.94, 'diesel >5yr → 0.94')
  assert(r.riskFlags.some(f => f.includes('Diesel')), 'diesel flag present')
}

// ============================================================================
// 4. Hybrid — Premium fuel bonus
// ============================================================================
function s04() {
  console.log('\n📗 S04 — 2022 Toyota Yaris hybrid, 15k, excellent')
  const r = run(makeVP({
    make: 'TOYOTA', model: 'YARIS', year: 2022, fuel: 'hybrid',
    resolvedMileage: 15000, userDeclaredMileage: 15000,
  }), 'excellent')
  console.log(`    mode=${r.quoteMode} range=£${r.min}–£${r.max} fuel=${r.allMultipliers.fuelMultiplier}`)
  assert(r.allMultipliers.fuelMultiplier === 1.03, 'hybrid → 1.03')
}

// ============================================================================
// 5. EV Young — ≤4yr battery, premium
// ============================================================================
function s05() {
  console.log('\n📗 S05 — 2023 Tesla Model 3 electric, 20k, excellent')
  const r = run(makeVP({
    make: 'TESLA', model: 'MODEL 3', year: 2023, fuel: 'electric',
    resolvedMileage: 20000, userDeclaredMileage: 20000,
  }), 'excellent')
  console.log(`    mode=${r.quoteMode} range=£${r.min}–£${r.max} fuel=${r.allMultipliers.fuelMultiplier}`)
  assert(r.allMultipliers.fuelMultiplier === 1.03, 'EV ≤4yr → 1.03')
}

// ============================================================================
// 6. EV Mid — 5-6yr battery
// ============================================================================
function s06() {
  console.log('\n📗 S06 — 2020 Nissan Leaf electric, 45k, good')
  const r = run(makeVP({
    make: 'NISSAN', model: 'LEAF', year: 2020, fuel: 'electric',
    resolvedMileage: 45000, userDeclaredMileage: 45000,
  }))
  console.log(`    mode=${r.quoteMode} range=£${r.min}–£${r.max} fuel=${r.allMultipliers.fuelMultiplier}`)
  assert(r.allMultipliers.fuelMultiplier === 0.98, 'EV 5-6yr → 0.98')
}

// ============================================================================
// 7. EV Old — 7-8yr battery
// ============================================================================
function s07() {
  console.log('\n📗 S07 — 2018 Nissan Leaf electric, 55k, good')
  const r = run(makeVP({
    make: 'NISSAN', model: 'LEAF', year: 2018, fuel: 'electric',
    resolvedMileage: 55000, userDeclaredMileage: 55000,
  }))
  console.log(`    mode=${r.quoteMode} range=£${r.min}–£${r.max} fuel=${r.allMultipliers.fuelMultiplier}`)
  assert(r.allMultipliers.fuelMultiplier === 0.90, 'EV 7-8yr → 0.90')
  assert(r.riskFlags.some(f => f.includes('battery degradation')), 'battery degradation flag')
}

// ============================================================================
// 8. EV Ancient — 8+yr battery time bomb
// ============================================================================
function s08() {
  console.log('\n📗 S08 — 2017 Nissan Leaf electric, 70k, good')
  const r = run(makeVP({
    make: 'NISSAN', model: 'LEAF', year: 2017, fuel: 'electric',
    resolvedMileage: 70000, userDeclaredMileage: 70000,
  }))
  console.log(`    mode=${r.quoteMode} range=£${r.min}–£${r.max} fuel=${r.allMultipliers.fuelMultiplier}`)
  assert(r.allMultipliers.fuelMultiplier === 0.85, 'EV 8+yr → 0.85')
  assert(r.riskFlags.some(f => f.includes('battery pack uncertainty')), 'battery pack uncertainty flag')
}

// ============================================================================
// 9. High Mileage Consistent — Honest seller
// ============================================================================
function s09() {
  console.log('\n📗 S09 — 2016 Ford Focus, 130k, fair, consistent mileage')
  const r = run(makeVP({
    make: 'FORD', model: 'FOCUS', year: 2016,
    resolvedMileage: 130000, userDeclaredMileage: 130000,
    motAnalysis: {
      ...makeVP({}).motAnalysis,
      latestMileage: 128000,
      mileageHistory: [
        { date: '2020-01-01', mileage: 90000 },
        { date: '2021-01-01', mileage: 100000 },
        { date: '2022-01-01', mileage: 110000 },
        { date: '2023-01-01', mileage: 118000 },
        { date: '2024-01-01', mileage: 128000 },
      ],
      annualMileageEstimate: 10000,
    },
  }), 'fair')
  console.log(`    mode=${r.quoteMode} range=£${r.min}–£${r.max} mileage=${r.allMultipliers.mileageMultiplier}`)
  assert(r.quoteMode === 'auto', 'quoteMode=auto (honest high mileage is still quotable)')
  assert(r.allMultipliers.mileageMultiplier < 1.0, 'mileage multiplier < 1.0')
}

// ============================================================================
// 10. Mileage Discrepancy — Moderate delta
// ============================================================================
function s10() {
  console.log('\n📗 S10 — 2019 Ford Focus, declared 50k, MOT says 58k')
  const r = run(makeVP({
    make: 'FORD', model: 'FOCUS', year: 2019,
    resolvedMileage: 58000, userDeclaredMileage: 50000,
    mileageDiscrepancy: true, mileageDiscrepancyAmount: 8000,
  }))
  console.log(`    mode=${r.quoteMode} consistency=${r.allMultipliers.mileageConsistencyMultiplier}`)
  assert(r.allMultipliers.mileageConsistencyMultiplier < 1.0, 'consistency penalty applied')
  assert(r.riskFlags.some(f => f.includes('doesn\'t match MOT')), 'discrepancy flag present')
}

// ============================================================================
// 11. Rollback Detected — BLOCKED
// ============================================================================
function s11() {
  console.log('\n🔴 S11 — 2018 Audi A3, rollback detected')
  const r = run(makeVP({
    make: 'AUDI', model: 'A3', year: 2018,
    resolvedMileage: 60000, userDeclaredMileage: 60000,
    motAnalysis: {
      ...makeVP({}).motAnalysis,
      latestMileage: 60000,
      mileageHistory: [
        { date: '2022-01-01', mileage: 70000 },
        { date: '2023-01-01', mileage: 60000 },
      ],
      mileageConsistency: 'rollback_detected',
      rollbackAmount: 10000,
    },
  }))
  console.log(`    mode=${r.quoteMode} tier=${r.riskTier} min=${r.min} max=${r.max}`)
  assert(r.quoteMode === 'blocked', 'quoteMode=blocked')
  assert(r.riskTier === 'manual_only', 'riskTier=manual_only')
  assert(r.min === 0 && r.max === 0, 'no range offered')
}

// ============================================================================
// 12. Advisory-Heavy — Recon cost estimation
// ============================================================================
function s12() {
  console.log('\n📗 S12 — 2016 BMW 3 Series, 5 advisories, hidden recon')
  const r = run(makeVP({
    make: 'BMW', model: '3 SERIES', year: 2016, fuel: 'diesel',
    resolvedMileage: 80000, userDeclaredMileage: 80000,
    motAnalysis: {
      ...makeVP({}).motAnalysis,
      motMonthsRemaining: 7,
      latestMileage: 78000,
      advisoryCount: 5,
      structuralAdvisories: true, structuralAdvisoryCount: 2,
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
  }))
  console.log(`    mode=${r.quoteMode} recon=£${r.allMultipliers.reconEstimate} reconMult=${r.allMultipliers.reconMultiplier}`)
  assert(r.allMultipliers.reconEstimate > 0, 'recon estimate > 0')
  assert(r.allMultipliers.reconMultiplier < 1.0, 'recon multiplier < 1.0')
}

// ============================================================================
// 13. Structural Repeat 4+ — Liability blocked
// ============================================================================
function s13() {
  console.log('\n🔴 S13 — 2015 Ford Focus, 5 structural + expired MOT → blocked')
  const r = run(makeVP({
    make: 'FORD', model: 'FOCUS', year: 2015,
    motAnalysis: {
      ...makeVP({}).motAnalysis,
      motMonthsRemaining: 0, motExpired: true,
      structuralAdvisories: true, structuralAdvisoryCount: 5,
      advisoryCount: 7,
      riskAdvisories: [
        'Corroded subframe', 'Corrosion sill nearside',
        'Corroded crossmember', 'Structural rust rear',
        'Corrosion chassis rail', 'Brake disc worn', 'Exhaust corroded',
      ],
      totalTestCount: 8,
    },
  }), 'poor')
  console.log(`    mode=${r.quoteMode} tier=${r.riskTier} min=${r.min}`)
  assert(r.min === 0 && r.max === 0, 'blocked — liability override RULE 2')
}

// ============================================================================
// 14. SORN + Expired MOT — Blocked
// ============================================================================
function s14() {
  console.log('\n🔴 S14 — 2016 Vauxhall Corsa, SORN + expired MOT')
  const r = run(makeVP({
    make: 'VAUXHALL', model: 'CORSA', year: 2016,
    sornRegistered: true,
    motAnalysis: { ...makeVP({}).motAnalysis, motMonthsRemaining: 0, motExpired: true },
  }))
  console.log(`    mode=${r.quoteMode} tier=${r.riskTier}`)
  assert(r.min === 0 && r.max === 0, 'blocked — SORN + expired MOT')
}

// ============================================================================
// 15. Dangerous Defects — Manual review
// ============================================================================
function s15() {
  console.log('\n🟡 S15 — 2019 VW Golf, dangerous defect in history')
  const r = run(makeVP({
    make: 'VOLKSWAGEN', model: 'GOLF', year: 2019,
    motAnalysis: {
      ...makeVP({}).motAnalysis,
      dangerousDefects: true,
      advisoryCount: 3,
      riskAdvisories: ['Brake line severe corrosion', 'Tyre low', 'Exhaust leak'],
    },
  }))
  console.log(`    mode=${r.quoteMode} tier=${r.riskTier} range=£${r.min}–£${r.max}`)
  assert(r.quoteMode === 'manual_review', 'quoteMode=manual_review')
  assert(r.riskFlags.some(f => f.includes('Dangerous defect')), 'dangerous defect flag')
}

// ============================================================================
// 16. ULEZ Non-Compliant — Regional penalty
// ============================================================================
function s16() {
  console.log('\n📗 S16 — 2012 Ford Focus diesel, non-ULEZ, London')
  const r = run(makeVP({
    make: 'FORD', model: 'FOCUS', year: 2012, fuel: 'diesel',
    ulezCompliant: false,
  }), 'fair', 'E1 6AN')
  console.log(`    mode=${r.quoteMode} ulez=${r.allMultipliers.ulezMultiplier} region=${r.allMultipliers.regionMultiplier}`)
  assert(r.allMultipliers.ulezMultiplier === 0.95, 'ULEZ penalty applied')
  assert(r.riskFlags.some(f => f.includes('ULEZ')), 'ULEZ flag present')
}

// ============================================================================
// 17. Non-ULEZ Outside London — No extra regional penalty
// ============================================================================
function s17() {
  console.log('\n📗 S17 — 2012 Ford Focus diesel, non-ULEZ, Birmingham')
  const r = run(makeVP({
    make: 'FORD', model: 'FOCUS', year: 2012, fuel: 'diesel',
    ulezCompliant: false,
  }), 'fair', 'B44 0SB')
  console.log(`    mode=${r.quoteMode} ulez=${r.allMultipliers.ulezMultiplier}`)
  assert(r.allMultipliers.ulezMultiplier === 0.95, 'ULEZ penalty still applies')
}

// ============================================================================
// 18. Recent Keeper Change — Older car
// ============================================================================
function s18() {
  console.log('\n📗 S18 — 2015 Ford Focus, V5C changed 2 months ago')
  const r = run(makeVP({
    make: 'FORD', model: 'FOCUS', year: 2015,
    dateOfLastV5C: '2026-01-10',
  }))
  console.log(`    mode=${r.quoteMode} keeper=${r.allMultipliers.keeperMultiplier}`)
  assert(r.allMultipliers.keeperMultiplier < 1.0, 'keeper penalty applied')
  assert(r.riskFlags.some(f => f.includes('keeper')), 'keeper flag present')
}

// ============================================================================
// 19. SORN Only (no MOT expiry) — Manual review, not blocked
// ============================================================================
function s19() {
  console.log('\n🟡 S19 — 2019 Ford Focus, SORN but MOT valid')
  const r = run(makeVP({
    make: 'FORD', model: 'FOCUS', year: 2019,
    sornRegistered: true,
  }))
  console.log(`    mode=${r.quoteMode} sorn=${r.allMultipliers.sornMultiplier} range=£${r.min}–£${r.max}`)
  assert(r.quoteMode === 'manual_review', 'quoteMode=manual_review (SORN)')
  assert(r.allMultipliers.sornMultiplier === 0.9, 'SORN → 0.90')
  assert(r.min > 0, 'still shows a range (not blocked)')
}

// ============================================================================
// 20. Gaming — Excellent condition on 12yr vehicle
// ============================================================================
function s20() {
  console.log('\n📗 S20 — Gaming: 2014 Ford Focus, claims "excellent"')
  const r = run(makeVP({
    make: 'FORD', model: 'FOCUS', year: 2014,
    resolvedMileage: 90000, userDeclaredMileage: 90000,
  }), 'excellent')
  console.log(`    mode=${r.quoteMode} inputTrust=${r.allMultipliers.inputTrustMultiplier}`)
  assert(r.allMultipliers.inputTrustMultiplier < 1.0, 'input trust penalty for excellent on old car')
  assert(r.riskFlags.some(f => f.includes('Condition adjusted for vehicle age')), 'auto-discounted flag')
}

// ============================================================================
// 21. Gaming — Mileage edited from MOT prefill
// ============================================================================
function s21() {
  console.log('\n📗 S21 — Gaming: mileage edited away from MOT (no discrepancy flag)')
  const r = run(makeVP({
    make: 'FORD', model: 'FOCUS', year: 2020,
    resolvedMileage: 40000, userDeclaredMileage: 38000,
    mileageDiscrepancy: false, mileageDiscrepancyAmount: 0,
    motAnalysis: { ...makeVP({}).motAnalysis, latestMileage: 40000 },
  }))
  console.log(`    inputTrust=${r.allMultipliers.inputTrustMultiplier}`)
  assert(r.allMultipliers.inputTrustMultiplier < 1.0, 'trust penalty for editing mileage from prefill')
}

// ============================================================================
// 22. Gaming — Excellent + 5+ advisories contradiction
// ============================================================================
function s22() {
  console.log('\n📗 S22 — Gaming: excellent condition + 6 advisories')
  const r = run(makeVP({
    make: 'FORD', model: 'FOCUS', year: 2020,
    motAnalysis: {
      ...makeVP({}).motAnalysis,
      advisoryCount: 6,
      riskAdvisories: ['A', 'B', 'C', 'D', 'E', 'F'],
    },
  }), 'excellent')
  console.log(`    inputTrust=${r.allMultipliers.inputTrustMultiplier}`)
  assert(r.allMultipliers.inputTrustMultiplier < 1.0, 'contradiction penalty applied')
}

// ============================================================================
// 23. Market Match — Fuzzy fuel match
// ============================================================================
function s23() {
  console.log('\n📗 S23 — Fuzzy market match: VW Golf hybrid (no exact)')
  const r = run(makeVP({
    make: 'VOLKSWAGEN', model: 'GOLF', year: 2021, fuel: 'hybrid',
    resolvedMileage: 30000, userDeclaredMileage: 30000,
  }))
  console.log(`    matchQuality=${r.matchQuality} marketConf=${r.allMultipliers.marketConfidenceMultiplier}`)
  // Golf has diesel/petrol entries but likely not hybrid exact match
  if (r.matchQuality !== 'exact') {
    assert(r.allMultipliers.marketConfidenceMultiplier < 1.0, 'market confidence haircut applied')
  } else {
    assert(r.allMultipliers.marketConfidenceMultiplier === 1.0, 'exact match — no haircut')
  }
}

// ============================================================================
// 24. No Market Data — Manual only
// ============================================================================
function s24() {
  console.log('\n🔴 S24 — No market data: LADA NIVA 2005')
  const r = run(makeVP({
    make: 'LADA', model: 'NIVA', year: 2005,
  }))
  console.log(`    mode=${r.quoteMode} tier=${r.riskTier} matchQuality=${r.matchQuality}`)
  assert(r.riskTier === 'manual_only', 'no market data → manual_only')
  assert(r.marketDataMatched === false, 'marketDataMatched=false')
}

// ============================================================================
// 25. Volatile Market — Tier floors at medium
// ============================================================================
function s25() {
  console.log('\n📗 S25 — Volatile market segment (Nissan Leaf 2020 electric)')
  const r = run(makeVP({
    make: 'NISSAN', model: 'LEAF', year: 2020, fuel: 'electric',
    resolvedMileage: 40000, userDeclaredMileage: 40000,
  }))
  console.log(`    mode=${r.quoteMode} tier=${r.riskTier} vol=${r.allMultipliers.volatilityMultiplier}`)
  assert(r.allMultipliers.volatilityMultiplier < 1.0, 'volatile market → multiplier < 1.0')
  assert(r.riskTier !== 'low', 'volatile market floors tier above low')
}

// ============================================================================
// 26. MOT Expiring Soon — Small penalty, spread signal
// ============================================================================
function s26() {
  console.log('\n📗 S26 — MOT expiring in 2 months')
  const r = run(makeVP({
    make: 'FORD', model: 'FOCUS', year: 2020,
    motAnalysis: { ...makeVP({}).motAnalysis, motMonthsRemaining: 2 },
  }))
  console.log(`    mode=${r.quoteMode} mot=${r.allMultipliers.motMultiplier}`)
  assert(r.allMultipliers.motMultiplier < 1.0, 'MOT expiring penalty applied')
  assert(r.riskFlags.some(f => f.includes('MOT expiring')), 'MOT expiring flag')
}

// ============================================================================
// 27. Very Low Mileage — Bonus
// ============================================================================
function s27() {
  console.log('\n📗 S27 — Very low mileage: 2020 Focus, 10k')
  const r = run(makeVP({
    make: 'FORD', model: 'FOCUS', year: 2020,
    resolvedMileage: 10000, userDeclaredMileage: 10000,
    motAnalysis: { ...makeVP({}).motAnalysis, latestMileage: 10000, annualMileageEstimate: 2000 },
  }))
  console.log(`    mileageMult=${r.allMultipliers.mileageMultiplier}`)
  assert(r.allMultipliers.mileageMultiplier >= 1.0, 'low mileage → neutral or bonus')
}

// ============================================================================
// 28. Recon Cost > 18% — Liability RULE 3 manual review
// ============================================================================
function s28() {
  console.log('\n🟡 S28 — High recon cost triggering liability RULE 3')
  const r = run(makeVP({
    make: 'FORD', model: 'FOCUS', year: 2016,
    resolvedMileage: 80000, userDeclaredMileage: 80000,
    motAnalysis: {
      ...makeVP({}).motAnalysis,
      advisoryCount: 10,
      structuralAdvisories: true, structuralAdvisoryCount: 3,
      brakeAdvisories: true,
      dangerousDefects: false,
      riskAdvisories: [
        'Corroded brake pipes nearside',
        'Suspension arm corrosion offside',
        'Oil leak from engine sump',
        'Tyre tread worn nearside front',
        'Exhaust system corroded at joints',
        'Corroded subframe mounting',
        'Brake disc worn close to limit',
        'Power steering fluid leak',
        'Corroded rear spring mount',
        'Driveshaft gaiter split',
      ],
      totalTestCount: 7,
    },
  }), 'poor')
  console.log(`    mode=${r.quoteMode} recon=£${r.allMultipliers.reconEstimate} trade=£${r.allMultipliers.tradeBase}`)
  const reconPct = r.allMultipliers.tradeBase > 0
    ? Math.round((r.allMultipliers.reconEstimate / r.allMultipliers.tradeBase) * 100) : 0
  console.log(`    recon/trade=${reconPct}%`)
  // Either manual_review due to RULE 3 or blocked due to structural count
  assert(
    r.quoteMode === 'manual_review' || r.quoteMode === 'blocked',
    'high recon → manual_review or blocked'
  )
}

// ============================================================================
// Run all scenarios
// ============================================================================

console.log('🧪 ENGINE v3 REGRESSION SUITE — 28 SCENARIOS')
console.log('Date:', NOW.toISOString())

const scenarios = [
  s01, s02, s03, s04, s05, s06, s07, s08, s09, s10,
  s11, s12, s13, s14, s15, s16, s17, s18, s19, s20,
  s21, s22, s23, s24, s25, s26, s27, s28,
]

for (const fn of scenarios) {
  fn()
}

hr()
console.log(`\n  ✅ Passed: ${passed}`)
if (failed > 0) {
  console.log(`  ❌ Failed: ${failed}`)
  process.exit(1)
} else {
  console.log(`  🎉 All ${passed} assertions pass.`)
}
