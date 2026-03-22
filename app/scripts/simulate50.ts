/**
 * 50-Vehicle Valuation Simulation
 *
 * Runs the pricing engine against 50 realistic UK vehicles and compares
 * output ranges to known approximate trade values.
 *
 * Run with: npx tsx scripts/simulate50.ts
 */

import { calculateValuation } from '@/lib/pricingEngine'
import type { VehicleProfile, Condition, MOTAnalysis } from '@/lib/types'

const NOW = new Date('2026-03-22T12:00:00Z')
const CY = NOW.getFullYear()

// ── Helpers ──────────────────────────────────────────────────────────────────

function baseMOT(overrides: Partial<MOTAnalysis> = {}): MOTAnalysis {
  return {
    motMonthsRemaining: 8,
    motExpired: false,
    latestMileage: null,
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
    totalTestCount: 4,
    ...overrides,
  }
}

interface SimVehicle {
  label: string
  make: string
  model: string
  year: number
  fuel: string
  mileage: number
  condition: Condition
  postcode: string
  expectedTradeLow: number
  expectedTradeHigh: number
  motOverrides?: Partial<MOTAnalysis>
  sorn?: boolean
  ulezCompliant?: boolean
  engineCC?: number
  dateOfLastV5C?: string | null
}

// ── 50 Test Vehicles ─────────────────────────────────────────────────────────

const VEHICLES: SimVehicle[] = [
  // === POPULAR HATCHBACKS ===
  { label: '2022 Ford Fiesta 1.0 Petrol 25k', make: 'FORD', model: 'FIESTA', year: 2022, fuel: 'petrol', mileage: 25000, condition: 'good', postcode: 'B15 1TH', expectedTradeLow: 8000, expectedTradeHigh: 12000 },
  { label: '2019 Ford Fiesta 1.0 Petrol 55k', make: 'FORD', model: 'FIESTA', year: 2019, fuel: 'petrol', mileage: 55000, condition: 'good', postcode: 'M1 1AA', expectedTradeLow: 6000, expectedTradeHigh: 9500 },
  { label: '2020 VW Golf 1.5 Petrol 35k', make: 'VOLKSWAGEN', model: 'GOLF', year: 2020, fuel: 'petrol', mileage: 35000, condition: 'good', postcode: 'SW1A 1AA', expectedTradeLow: 12000, expectedTradeHigh: 18000 },
  { label: '2017 VW Golf 2.0 Diesel 80k', make: 'VOLKSWAGEN', model: 'GOLF', year: 2017, fuel: 'diesel', mileage: 80000, condition: 'fair', postcode: 'LS1 1BA', expectedTradeLow: 6000, expectedTradeHigh: 10000 },
  { label: '2021 Vauxhall Corsa 1.2 Petrol 20k', make: 'VAUXHALL', model: 'CORSA', year: 2021, fuel: 'petrol', mileage: 20000, condition: 'excellent', postcode: 'B44 0SB', expectedTradeLow: 8000, expectedTradeHigh: 13000 },
  { label: '2018 Vauxhall Corsa 1.4 Petrol 50k', make: 'VAUXHALL', model: 'CORSA', year: 2018, fuel: 'petrol', mileage: 50000, condition: 'good', postcode: 'NG1 1AA', expectedTradeLow: 4000, expectedTradeHigh: 7500 },
  { label: '2023 Hyundai i20 1.0 Petrol 10k', make: 'HYUNDAI', model: 'I20', year: 2023, fuel: 'petrol', mileage: 10000, condition: 'excellent', postcode: 'CF10 1AA', expectedTradeLow: 10000, expectedTradeHigh: 14000 },
  { label: '2016 Hyundai i10 1.0 Petrol 60k', make: 'HYUNDAI', model: 'I10', year: 2016, fuel: 'petrol', mileage: 60000, condition: 'good', postcode: 'EH1 1AA', expectedTradeLow: 3000, expectedTradeHigh: 5500 },

  // === SUVs & CROSSOVERS ===
  { label: '2021 Nissan Qashqai 1.3 Petrol 30k', make: 'NISSAN', model: 'QASHQAI', year: 2021, fuel: 'petrol', mileage: 30000, condition: 'good', postcode: 'NE1 1AA', expectedTradeLow: 14000, expectedTradeHigh: 20000 },
  { label: '2018 Nissan Qashqai 1.5 Diesel 65k', make: 'NISSAN', model: 'QASHQAI', year: 2018, fuel: 'diesel', mileage: 65000, condition: 'good', postcode: 'LE1 1AA', expectedTradeLow: 7000, expectedTradeHigh: 11000 },
  { label: '2022 Toyota RAV4 Hybrid 15k', make: 'TOYOTA', model: 'RAV4', year: 2022, fuel: 'hybrid', mileage: 15000, condition: 'excellent', postcode: 'OX1 1AA', expectedTradeLow: 22000, expectedTradeHigh: 30000 },
  { label: '2020 Kia Sportage 1.6 Petrol 40k', make: 'KIA', model: 'SPORTAGE', year: 2020, fuel: 'petrol', mileage: 40000, condition: 'good', postcode: 'SO14 1AA', expectedTradeLow: 9000, expectedTradeHigh: 14000 },
  { label: '2019 Hyundai Tucson 1.6 Diesel 55k', make: 'HYUNDAI', model: 'TUCSON', year: 2019, fuel: 'diesel', mileage: 55000, condition: 'good', postcode: 'PO1 1AA', expectedTradeLow: 7000, expectedTradeHigh: 12000 },
  { label: '2023 Skoda Karoq 1.5 Petrol 8k', make: 'SKODA', model: 'KAROQ', year: 2023, fuel: 'petrol', mileage: 8000, condition: 'excellent', postcode: 'CB1 1AA', expectedTradeLow: 16000, expectedTradeHigh: 22000 },
  { label: '2017 Mazda CX-5 2.2 Diesel 70k', make: 'MAZDA', model: 'CX-5', year: 2017, fuel: 'diesel', mileage: 70000, condition: 'fair', postcode: 'BA1 1AA', expectedTradeLow: 8000, expectedTradeHigh: 14000 },

  // === PREMIUM / GERMAN ===
  { label: '2021 BMW 3 Series 320d 25k', make: 'BMW', model: '3 SERIES', year: 2021, fuel: 'diesel', mileage: 25000, condition: 'good', postcode: 'SW3 1AA', expectedTradeLow: 18000, expectedTradeHigh: 26000 },
  { label: '2019 Audi A3 1.5 Petrol 40k', make: 'AUDI', model: 'A3', year: 2019, fuel: 'petrol', mileage: 40000, condition: 'good', postcode: 'GU1 1AA', expectedTradeLow: 12000, expectedTradeHigh: 18000 },
  { label: '2020 Mercedes C-Class Diesel 35k', make: 'MERCEDES-BENZ', model: 'C-CLASS', year: 2020, fuel: 'diesel', mileage: 35000, condition: 'good', postcode: 'KT1 1AA', expectedTradeLow: 16000, expectedTradeHigh: 24000 },
  { label: '2022 Audi Q3 2.0 Petrol 20k', make: 'AUDI', model: 'Q3', year: 2022, fuel: 'petrol', mileage: 20000, condition: 'excellent', postcode: 'RH1 1AA', expectedTradeLow: 20000, expectedTradeHigh: 28000 },
  { label: '2018 BMW 1 Series 118i 50k', make: 'BMW', model: '1 SERIES', year: 2018, fuel: 'petrol', mileage: 50000, condition: 'good', postcode: 'TW1 1AA', expectedTradeLow: 8000, expectedTradeHigh: 14000 },

  // === EVs ===
  { label: '2022 Tesla Model 3 20k', make: 'TESLA', model: 'MODEL 3', year: 2022, fuel: 'electric', mileage: 20000, condition: 'good', postcode: 'EC1A 1AA', expectedTradeLow: 18000, expectedTradeHigh: 27000 },
  { label: '2020 Nissan Leaf 30k', make: 'NISSAN', model: 'LEAF', year: 2020, fuel: 'electric', mileage: 30000, condition: 'good', postcode: 'BS1 1AA', expectedTradeLow: 10000, expectedTradeHigh: 16000 },
  { label: '2023 MG4 Electric 5k', make: 'MG', model: '4', year: 2023, fuel: 'electric', mileage: 5000, condition: 'excellent', postcode: 'NN1 1AA', expectedTradeLow: 15000, expectedTradeHigh: 22000 },
  { label: '2019 Hyundai Kona Electric 40k', make: 'HYUNDAI', model: 'KONA', year: 2019, fuel: 'electric', mileage: 40000, condition: 'good', postcode: 'PE1 1AA', expectedTradeLow: 12000, expectedTradeHigh: 19000 },
  { label: '2021 Kia Niro Electric 25k', make: 'KIA', model: 'NIRO', year: 2021, fuel: 'electric', mileage: 25000, condition: 'good', postcode: 'IP1 1AA', expectedTradeLow: 15000, expectedTradeHigh: 22000 },

  // === HYBRIDS ===
  { label: '2022 Toyota Corolla Hybrid 18k', make: 'TOYOTA', model: 'COROLLA', year: 2022, fuel: 'hybrid', mileage: 18000, condition: 'good', postcode: 'ME1 1AA', expectedTradeLow: 15000, expectedTradeHigh: 21000 },
  { label: '2020 Honda Jazz Hybrid 28k', make: 'HONDA', model: 'JAZZ', year: 2020, fuel: 'hybrid', mileage: 28000, condition: 'good', postcode: 'SN1 1AA', expectedTradeLow: 10000, expectedTradeHigh: 16000 },
  { label: '2023 Kia Sportage Hybrid 7k', make: 'KIA', model: 'SPORTAGE', year: 2023, fuel: 'hybrid', mileage: 7000, condition: 'excellent', postcode: 'GL1 1AA', expectedTradeLow: 22000, expectedTradeHigh: 29000 },

  // === DIESEL OLDER ===
  { label: '2015 Ford Focus 1.5 Diesel 90k', make: 'FORD', model: 'FOCUS', year: 2015, fuel: 'diesel', mileage: 90000, condition: 'fair', postcode: 'DN1 1AA', expectedTradeLow: 2500, expectedTradeHigh: 5500 },
  { label: '2016 Skoda Octavia 2.0 Diesel 75k', make: 'SKODA', model: 'OCTAVIA', year: 2016, fuel: 'diesel', mileage: 75000, condition: 'good', postcode: 'HU1 1AA', expectedTradeLow: 5000, expectedTradeHigh: 9000 },
  { label: '2014 Audi A4 2.0 Diesel 100k', make: 'AUDI', model: 'A4', year: 2014, fuel: 'diesel', mileage: 100000, condition: 'fair', postcode: 'WF1 1AA', expectedTradeLow: 4000, expectedTradeHigh: 9000 },

  // === BUDGET / SMALL ===
  { label: '2019 Dacia Sandero 1.0 25k', make: 'DACIA', model: 'SANDERO', year: 2019, fuel: 'petrol', mileage: 25000, condition: 'good', postcode: 'BD1 1AA', expectedTradeLow: 3000, expectedTradeHigh: 5500 },
  { label: '2020 Fiat 500 1.0 Petrol 18k', make: 'FIAT', model: '500', year: 2020, fuel: 'petrol', mileage: 18000, condition: 'good', postcode: 'BN1 1AA', expectedTradeLow: 6000, expectedTradeHigh: 10000 },
  { label: '2018 Suzuki Swift 1.0 35k', make: 'SUZUKI', model: 'SWIFT', year: 2018, fuel: 'petrol', mileage: 35000, condition: 'good', postcode: 'EX1 1AA', expectedTradeLow: 5500, expectedTradeHigh: 9500 },
  { label: '2021 Seat Ibiza 1.0 Petrol 22k', make: 'SEAT', model: 'IBIZA', year: 2021, fuel: 'petrol', mileage: 22000, condition: 'good', postcode: 'PL1 1AA', expectedTradeLow: 7000, expectedTradeHigh: 11000 },

  // === PREMIUM SUVs ===
  { label: '2020 Land Rover Evoque Diesel 35k', make: 'LAND ROVER', model: 'RANGE ROVER EVOQUE', year: 2020, fuel: 'diesel', mileage: 35000, condition: 'good', postcode: 'RG1 1AA', expectedTradeLow: 18000, expectedTradeHigh: 28000 },
  { label: '2021 Volvo XC40 Petrol 25k', make: 'VOLVO', model: 'XC40', year: 2021, fuel: 'petrol', mileage: 25000, condition: 'good', postcode: 'HP1 1AA', expectedTradeLow: 17000, expectedTradeHigh: 25000 },
  { label: '2019 Jaguar E-Pace Diesel 45k', make: 'JAGUAR', model: 'E-PACE', year: 2019, fuel: 'diesel', mileage: 45000, condition: 'good', postcode: 'MK1 1AA', expectedTradeLow: 12000, expectedTradeHigh: 20000 },

  // === EDGE CASES: HIGH MILEAGE ===
  { label: '2017 Ford Focus 1.0 Petrol 120k', make: 'FORD', model: 'FOCUS', year: 2017, fuel: 'petrol', mileage: 120000, condition: 'fair', postcode: 'ST1 1AA', expectedTradeLow: 2000, expectedTradeHigh: 5000, motOverrides: { advisoryCount: 6 } },
  { label: '2016 Vauxhall Astra 1.4 Petrol 110k', make: 'VAUXHALL', model: 'ASTRA', year: 2016, fuel: 'petrol', mileage: 110000, condition: 'fair', postcode: 'WV1 1AA', expectedTradeLow: 2000, expectedTradeHigh: 5000, motOverrides: { advisoryCount: 4 } },

  // === EDGE CASES: VERY NEW ===
  { label: '2025 Toyota Yaris Hybrid 3k', make: 'TOYOTA', model: 'YARIS', year: 2025, fuel: 'hybrid', mileage: 3000, condition: 'excellent', postcode: 'W1A 1AA', expectedTradeLow: 13000, expectedTradeHigh: 18000 },
  { label: '2024 Peugeot 208 Petrol 8k', make: 'PEUGEOT', model: '208', year: 2024, fuel: 'petrol', mileage: 8000, condition: 'excellent', postcode: 'SE1 1AA', expectedTradeLow: 11000, expectedTradeHigh: 16000 },

  // === EDGE CASES: POOR CONDITION ===
  { label: '2017 Renault Clio 1.2 55k POOR', make: 'RENAULT', model: 'CLIO', year: 2017, fuel: 'petrol', mileage: 55000, condition: 'poor', postcode: 'SR1 1AA', expectedTradeLow: 1500, expectedTradeHigh: 4000, motOverrides: { advisoryCount: 8, brakeAdvisories: true } },
  { label: '2015 Peugeot 308 1.6 Diesel 95k POOR', make: 'PEUGEOT', model: '308', year: 2015, fuel: 'diesel', mileage: 95000, condition: 'poor', postcode: 'TS1 1AA', expectedTradeLow: 1000, expectedTradeHigh: 4000, motOverrides: { advisoryCount: 7, recentFailCount: 2 } },

  // === NICHE / LESS COMMON ===
  { label: '2020 Mazda MX-5 Petrol 12k', make: 'MAZDA', model: 'MX-5', year: 2020, fuel: 'petrol', mileage: 12000, condition: 'excellent', postcode: 'BH1 1AA', expectedTradeLow: 15000, expectedTradeHigh: 22000 },
  { label: '2022 Cupra Formentor 1.5 Petrol 15k', make: 'CUPRA', model: 'FORMENTOR', year: 2022, fuel: 'petrol', mileage: 15000, condition: 'good', postcode: 'CT1 1AA', expectedTradeLow: 17000, expectedTradeHigh: 24000 },
  { label: '2021 Mini Countryman Hybrid 20k', make: 'MINI', model: 'COUNTRYMAN', year: 2021, fuel: 'hybrid', mileage: 20000, condition: 'good', postcode: 'TN1 1AA', expectedTradeLow: 14000, expectedTradeHigh: 21000 },
  { label: '2019 Honda CR-V Hybrid 35k', make: 'HONDA', model: 'CR-V', year: 2019, fuel: 'hybrid', mileage: 35000, condition: 'good', postcode: 'YO1 1AA', expectedTradeLow: 16000, expectedTradeHigh: 24000 },

  // === VERY OLD ===
  { label: '2012 Ford Fiesta 1.25 Petrol 85k', make: 'FORD', model: 'FIESTA', year: 2012, fuel: 'petrol', mileage: 85000, condition: 'fair', postcode: 'DY1 1AA', expectedTradeLow: 1200, expectedTradeHigh: 3500, motOverrides: { advisoryCount: 5 } },
  { label: '2013 Nissan Juke 1.6 Petrol 70k', make: 'NISSAN', model: 'JUKE', year: 2013, fuel: 'petrol', mileage: 70000, condition: 'good', postcode: 'DH1 1AA', expectedTradeLow: 2500, expectedTradeHigh: 5500 },
]

// ── Run simulation ───────────────────────────────────────────────────────────

function runSim() {
  console.log('═══════════════════════════════════════════════════════════════════')
  console.log('  50-VEHICLE VALUATION SIMULATION')
  console.log(`  Engine: v3 recalibrated | Date: ${NOW.toISOString().slice(0, 10)}`)
  console.log('═══════════════════════════════════════════════════════════════════\n')

  let pass = 0
  let fail = 0
  let manual = 0
  const failures: string[] = []

  const results: {
    label: string
    min: number
    max: number
    mid: number
    expLow: number
    expHigh: number
    status: string
    mode: string
    risk: string
    matchQ: string
  }[] = []

  for (const v of VEHICLES) {
    const age = CY - v.year
    const expectedMileage = age * 8000

    const vp: VehicleProfile = {
      reg: 'SIM' + v.year,
      make: v.make,
      model: v.model,
      year: v.year,
      fuel: v.fuel as VehicleProfile['fuel'],
      engineCC: v.engineCC ?? 1500,
      colour: 'BLACK',
      co2: 140,
      euroStatus: '6',
      ulezCompliant: v.ulezCompliant ?? true,
      taxStatus: v.sorn ? 'SORN' : 'Taxed',
      sornRegistered: v.sorn ?? false,
      dateOfLastV5C: v.dateOfLastV5C ?? null,
      motAnalysis: baseMOT({
        latestMileage: v.mileage,
        annualMileageEstimate: age > 0 ? Math.round(v.mileage / age) : 5000,
        totalTestCount: Math.max(1, age - 2),
        ...v.motOverrides,
      }),
      resolvedMileage: v.mileage,
      userDeclaredMileage: v.mileage,
      mileageDiscrepancy: false,
      mileageDiscrepancyAmount: 0,
      dataCompleteness: 0.85,
    }

    const result = calculateValuation({
      vehicleProfile: vp,
      condition: v.condition,
      postcode: v.postcode,
      now: NOW,
    })

    const mid = result.midpoint
    const withinRange = result.quoteMode === 'blocked' ||
      result.quoteMode === 'manual_review' ||
      (mid >= v.expectedTradeLow && mid <= v.expectedTradeHigh) ||
      (result.min <= v.expectedTradeHigh && result.max >= v.expectedTradeLow) // overlapping ranges

    let status = '✅ PASS'
    if (result.quoteMode === 'blocked' || result.quoteMode === 'manual_review') {
      status = '🟡 MANUAL'
      manual++
    } else if (!withinRange) {
      status = '❌ FAIL'
      fail++
      const direction = mid < v.expectedTradeLow ? 'LOW' : 'HIGH'
      const delta = direction === 'LOW'
        ? v.expectedTradeLow - mid
        : mid - v.expectedTradeHigh
      failures.push(`  ${v.label}: got £${mid.toLocaleString()} (${result.min.toLocaleString()}-${result.max.toLocaleString()}) expected £${v.expectedTradeLow.toLocaleString()}-£${v.expectedTradeHigh.toLocaleString()} [${direction} by £${delta.toLocaleString()}]`)
    } else {
      pass++
    }

    results.push({
      label: v.label,
      min: result.min,
      max: result.max,
      mid,
      expLow: v.expectedTradeLow,
      expHigh: v.expectedTradeHigh,
      status,
      mode: result.quoteMode,
      risk: result.riskTier,
      matchQ: result.matchQuality,
    })
  }

  // ── Print results table ──────────────────────────────────────────────────
  console.log('─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────')
  console.log(`${'Vehicle'.padEnd(45)} ${'Engine Range'.padStart(22)} ${'Expected Range'.padStart(22)} ${'Status'.padStart(10)} ${'Mode'.padStart(15)} ${'Match'.padStart(12)}`)
  console.log('─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────')

  for (const r of results) {
    const engineRange = r.mode === 'blocked' ? 'BLOCKED' : `£${r.min.toLocaleString()}-£${r.max.toLocaleString()}`
    const expectedRange = `£${r.expLow.toLocaleString()}-£${r.expHigh.toLocaleString()}`
    console.log(
      `${r.label.padEnd(45)} ${engineRange.padStart(22)} ${expectedRange.padStart(22)} ${r.status.padStart(10)} ${r.mode.padStart(15)} ${r.matchQ.padStart(12)}`
    )
  }

  console.log('─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────')

  // ── Summary ──────────────────────────────────────────────────────────────
  const total = VEHICLES.length
  const passRate = ((pass / (total - manual)) * 100).toFixed(1)

  console.log(`\n📊 SUMMARY`)
  console.log(`  Total vehicles:  ${total}`)
  console.log(`  ✅ Pass:         ${pass}`)
  console.log(`  ❌ Fail:         ${fail}`)
  console.log(`  🟡 Manual:       ${manual}`)
  console.log(`  Accuracy rate:   ${passRate}% (excluding manual)`)

  if (failures.length > 0) {
    console.log(`\n❌ FAILURES:`)
    failures.forEach(f => console.log(f))
  }

  console.log('')
}

runSim()
