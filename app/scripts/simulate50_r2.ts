/**
 * 50-Vehicle Valuation Simulation — Round 2 (different vehicles)
 *
 * Second validation pass with 50 DIFFERENT UK vehicles not used in round 1.
 * Tests edge cases, niche models, and more varied conditions.
 *
 * Run with: npx tsx scripts/simulate50_r2.ts
 */

import { calculateValuation } from '@/lib/pricingEngine'
import type { VehicleProfile, Condition, MOTAnalysis } from '@/lib/types'

const NOW = new Date('2026-03-22T12:00:00Z')
const CY = NOW.getFullYear()

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

const VEHICLES: SimVehicle[] = [
  // === DIFFERENT FORD VARIANTS ===
  { label: '2023 Ford Puma 1.0 Hybrid 12k', make: 'FORD', model: 'PUMA', year: 2023, fuel: 'hybrid', mileage: 12000, condition: 'excellent', postcode: 'B1 1AA', expectedTradeLow: 14000, expectedTradeHigh: 20000 },
  { label: '2020 Ford Focus 1.0 Petrol 45k', make: 'FORD', model: 'FOCUS', year: 2020, fuel: 'petrol', mileage: 45000, condition: 'good', postcode: 'M2 1AA', expectedTradeLow: 9000, expectedTradeHigh: 14000 },
  { label: '2016 Ford Focus 1.5 Petrol 70k', make: 'FORD', model: 'FOCUS', year: 2016, fuel: 'petrol', mileage: 70000, condition: 'fair', postcode: 'L1 1AA', expectedTradeLow: 3500, expectedTradeHigh: 7000 },
  { label: '2021 Ford Kuga 2.5 Hybrid 28k', make: 'FORD', model: 'KUGA', year: 2021, fuel: 'hybrid', mileage: 28000, condition: 'good', postcode: 'NG2 1AA', expectedTradeLow: 14000, expectedTradeHigh: 21000 },

  // === VAUXHALL RANGE ===
  { label: '2022 Vauxhall Mokka 1.2 Petrol 15k', make: 'VAUXHALL', model: 'MOKKA', year: 2022, fuel: 'petrol', mileage: 15000, condition: 'good', postcode: 'SL1 1AA', expectedTradeLow: 12000, expectedTradeHigh: 18000 },
  { label: '2019 Vauxhall Astra 1.4 Petrol 40k', make: 'VAUXHALL', model: 'ASTRA', year: 2019, fuel: 'petrol', mileage: 40000, condition: 'good', postcode: 'WA1 1AA', expectedTradeLow: 6000, expectedTradeHigh: 10000 },
  { label: '2023 Vauxhall Corsa-e Electric 8k', make: 'VAUXHALL', model: 'CORSA', year: 2023, fuel: 'electric', mileage: 8000, condition: 'excellent', postcode: 'CV1 1AA', expectedTradeLow: 13000, expectedTradeHigh: 19000 },

  // === VW DEEPER RANGE ===
  { label: '2021 VW Polo 1.0 Petrol 22k', make: 'VOLKSWAGEN', model: 'POLO', year: 2021, fuel: 'petrol', mileage: 22000, condition: 'good', postcode: 'DE1 1AA', expectedTradeLow: 10000, expectedTradeHigh: 15000 },
  { label: '2019 VW Tiguan 2.0 Diesel 45k', make: 'VOLKSWAGEN', model: 'TIGUAN', year: 2019, fuel: 'diesel', mileage: 45000, condition: 'good', postcode: 'AB1 1AA', expectedTradeLow: 14000, expectedTradeHigh: 21000 },
  { label: '2022 VW T-Roc 1.5 Petrol 18k', make: 'VOLKSWAGEN', model: 'T-ROC', year: 2022, fuel: 'petrol', mileage: 18000, condition: 'good', postcode: 'G1 1AA', expectedTradeLow: 15000, expectedTradeHigh: 22000 },
  { label: '2018 VW Polo 1.0 Petrol 55k', make: 'VOLKSWAGEN', model: 'POLO', year: 2018, fuel: 'petrol', mileage: 55000, condition: 'good', postcode: 'KY1 1AA', expectedTradeLow: 6000, expectedTradeHigh: 10000 },

  // === BMW DEEPER ===
  { label: '2022 BMW X1 sDrive18i 20k', make: 'BMW', model: 'X1', year: 2022, fuel: 'petrol', mileage: 20000, condition: 'good', postcode: 'KT2 1AA', expectedTradeLow: 20000, expectedTradeHigh: 28000 },
  { label: '2019 BMW X3 xDrive20d 40k', make: 'BMW', model: 'X3', year: 2019, fuel: 'diesel', mileage: 40000, condition: 'good', postcode: 'GU2 1AA', expectedTradeLow: 18000, expectedTradeHigh: 26000 },

  // === MERCEDES DEEPER ===
  { label: '2021 Mercedes GLA Petrol 25k', make: 'MERCEDES-BENZ', model: 'GLA', year: 2021, fuel: 'petrol', mileage: 25000, condition: 'good', postcode: 'SW7 1AA', expectedTradeLow: 18000, expectedTradeHigh: 27000 },
  { label: '2018 Mercedes E-Class Diesel 55k', make: 'MERCEDES-BENZ', model: 'E-CLASS', year: 2018, fuel: 'diesel', mileage: 55000, condition: 'good', postcode: 'W2 1AA', expectedTradeLow: 14000, expectedTradeHigh: 22000 },

  // === TOYOTA DEEPER ===
  { label: '2020 Toyota Yaris 1.5 Petrol 30k', make: 'TOYOTA', model: 'YARIS', year: 2020, fuel: 'petrol', mileage: 30000, condition: 'good', postcode: 'BT1 1AA', expectedTradeLow: 8000, expectedTradeHigh: 13000 },
  { label: '2021 Toyota C-HR Hybrid 20k', make: 'TOYOTA', model: 'C-HR', year: 2021, fuel: 'hybrid', mileage: 20000, condition: 'good', postcode: 'NP1 1AA', expectedTradeLow: 14000, expectedTradeHigh: 20000 },
  { label: '2018 Toyota Aygo 1.0 Petrol 40k', make: 'TOYOTA', model: 'AYGO', year: 2018, fuel: 'petrol', mileage: 40000, condition: 'good', postcode: 'TD1 1AA', expectedTradeLow: 4000, expectedTradeHigh: 7000 },

  // === NISSAN DEEPER ===
  { label: '2022 Nissan Juke 1.0 Petrol 15k', make: 'NISSAN', model: 'JUKE', year: 2022, fuel: 'petrol', mileage: 15000, condition: 'good', postcode: 'PA1 1AA', expectedTradeLow: 11000, expectedTradeHigh: 16000 },
  { label: '2020 Nissan X-Trail 1.7 Petrol 35k', make: 'NISSAN', model: 'X-TRAIL', year: 2020, fuel: 'petrol', mileage: 35000, condition: 'good', postcode: 'DG1 1AA', expectedTradeLow: 11000, expectedTradeHigh: 17000 },

  // === KIA DEEPER ===
  { label: '2021 Kia Ceed 1.0 Petrol 25k', make: 'KIA', model: 'CEED', year: 2021, fuel: 'petrol', mileage: 25000, condition: 'good', postcode: 'FK1 1AA', expectedTradeLow: 9000, expectedTradeHigh: 14000 },
  { label: '2024 Kia EV6 Electric 5k', make: 'KIA', model: 'EV6', year: 2024, fuel: 'electric', mileage: 5000, condition: 'excellent', postcode: 'AL1 1AA', expectedTradeLow: 24000, expectedTradeHigh: 34000 },
  { label: '2020 Kia Picanto 1.0 Petrol 22k', make: 'KIA', model: 'PICANTO', year: 2020, fuel: 'petrol', mileage: 22000, condition: 'good', postcode: 'SG1 1AA', expectedTradeLow: 5500, expectedTradeHigh: 9000 },

  // === HYUNDAI DEEPER ===
  { label: '2023 Hyundai Ioniq 5 Electric 10k', make: 'HYUNDAI', model: 'IONIQ 5', year: 2023, fuel: 'electric', mileage: 10000, condition: 'excellent', postcode: 'EN1 1AA', expectedTradeLow: 22000, expectedTradeHigh: 32000 },
  { label: '2019 Hyundai i30 1.4 Petrol 38k', make: 'HYUNDAI', model: 'I30', year: 2019, fuel: 'petrol', mileage: 38000, condition: 'good', postcode: 'HA1 1AA', expectedTradeLow: 8000, expectedTradeHigh: 13000 },

  // === SKODA DEEPER ===
  { label: '2022 Skoda Octavia 1.5 Petrol 20k', make: 'SKODA', model: 'OCTAVIA', year: 2022, fuel: 'petrol', mileage: 20000, condition: 'good', postcode: 'LU1 1AA', expectedTradeLow: 14000, expectedTradeHigh: 20000 },
  { label: '2020 Skoda Fabia 1.0 Petrol 30k', make: 'SKODA', model: 'FABIA', year: 2020, fuel: 'petrol', mileage: 30000, condition: 'good', postcode: 'MK2 1AA', expectedTradeLow: 6000, expectedTradeHigh: 10000 },
  { label: '2023 Skoda Enyaq Electric 8k', make: 'SKODA', model: 'ENYAQ', year: 2023, fuel: 'electric', mileage: 8000, condition: 'excellent', postcode: 'OX2 1AA', expectedTradeLow: 20000, expectedTradeHigh: 30000 },

  // === SEAT/CUPRA ===
  { label: '2020 Seat Ateca 1.5 Petrol 32k', make: 'SEAT', model: 'ATECA', year: 2020, fuel: 'petrol', mileage: 32000, condition: 'good', postcode: 'RG2 1AA', expectedTradeLow: 10000, expectedTradeHigh: 16000 },
  { label: '2023 Cupra Born Electric 6k', make: 'CUPRA', model: 'BORN', year: 2023, fuel: 'electric', mileage: 6000, condition: 'excellent', postcode: 'CM1 1AA', expectedTradeLow: 17000, expectedTradeHigh: 25000 },

  // === PEUGEOT DEEPER ===
  { label: '2021 Peugeot 2008 1.2 Petrol 22k', make: 'PEUGEOT', model: '2008', year: 2021, fuel: 'petrol', mileage: 22000, condition: 'good', postcode: 'GL2 1AA', expectedTradeLow: 12000, expectedTradeHigh: 18000 },
  { label: '2019 Peugeot 3008 1.5 Diesel 45k', make: 'PEUGEOT', model: '3008', year: 2019, fuel: 'diesel', mileage: 45000, condition: 'good', postcode: 'SN2 1AA', expectedTradeLow: 10000, expectedTradeHigh: 16000 },

  // === CITROEN ===
  { label: '2021 Citroen C3 1.2 Petrol 18k', make: 'CITROEN', model: 'C3', year: 2021, fuel: 'petrol', mileage: 18000, condition: 'good', postcode: 'PE2 1AA', expectedTradeLow: 7000, expectedTradeHigh: 11000 },
  { label: '2020 Citroen C5 Aircross Hybrid 25k', make: 'CITROEN', model: 'C5 AIRCROSS', year: 2020, fuel: 'hybrid', mileage: 25000, condition: 'good', postcode: 'BA2 1AA', expectedTradeLow: 12000, expectedTradeHigh: 19000 },

  // === RENAULT ===
  { label: '2022 Renault Captur 1.0 Petrol 14k', make: 'RENAULT', model: 'CAPTUR', year: 2022, fuel: 'petrol', mileage: 14000, condition: 'good', postcode: 'TN2 1AA', expectedTradeLow: 11000, expectedTradeHigh: 17000 },
  { label: '2021 Renault Zoe Electric 20k', make: 'RENAULT', model: 'ZOE', year: 2021, fuel: 'electric', mileage: 20000, condition: 'good', postcode: 'IP2 1AA', expectedTradeLow: 8000, expectedTradeHigh: 14000 },

  // === HONDA ===
  { label: '2022 Honda Civic Hybrid 15k', make: 'HONDA', model: 'CIVIC', year: 2022, fuel: 'hybrid', mileage: 15000, condition: 'good', postcode: 'BH2 1AA', expectedTradeLow: 18000, expectedTradeHigh: 25000 },
  { label: '2016 Honda Jazz 1.3 Petrol 55k', make: 'HONDA', model: 'JAZZ', year: 2016, fuel: 'petrol', mileage: 55000, condition: 'good', postcode: 'CT2 1AA', expectedTradeLow: 4000, expectedTradeHigh: 8000 },

  // === VOLVO DEEPER ===
  { label: '2020 Volvo XC60 Diesel 30k', make: 'VOLVO', model: 'XC60', year: 2020, fuel: 'diesel', mileage: 30000, condition: 'good', postcode: 'HP2 1AA', expectedTradeLow: 20000, expectedTradeHigh: 28000 },
  { label: '2017 Volvo V40 1.5 Petrol 50k', make: 'VOLVO', model: 'V40', year: 2017, fuel: 'petrol', mileage: 50000, condition: 'good', postcode: 'DA1 1AA', expectedTradeLow: 5000, expectedTradeHigh: 9000 },

  // === LAND ROVER DEEPER ===
  { label: '2021 Land Rover Discovery Sport Diesel 30k', make: 'LAND ROVER', model: 'DISCOVERY SPORT', year: 2021, fuel: 'diesel', mileage: 30000, condition: 'good', postcode: 'GU3 1AA', expectedTradeLow: 18000, expectedTradeHigh: 27000 },

  // === TESLA DEEPER ===
  { label: '2023 Tesla Model Y 12k', make: 'TESLA', model: 'MODEL Y', year: 2023, fuel: 'electric', mileage: 12000, condition: 'excellent', postcode: 'EC2A 1AA', expectedTradeLow: 25000, expectedTradeHigh: 35000 },

  // === DACIA ===
  { label: '2023 Dacia Duster 1.3 Petrol 10k', make: 'DACIA', model: 'DUSTER', year: 2023, fuel: 'petrol', mileage: 10000, condition: 'good', postcode: 'YO2 1AA', expectedTradeLow: 10000, expectedTradeHigh: 15000 },
  { label: '2022 Dacia Jogger Hybrid 15k', make: 'DACIA', model: 'JOGGER', year: 2022, fuel: 'hybrid', mileage: 15000, condition: 'good', postcode: 'DL1 1AA', expectedTradeLow: 11000, expectedTradeHigh: 17000 },

  // === MG ===
  { label: '2023 MG ZS EV 10k', make: 'MG', model: 'ZS', year: 2023, fuel: 'electric', mileage: 10000, condition: 'good', postcode: 'SS1 1AA', expectedTradeLow: 11000, expectedTradeHigh: 17000 },
  { label: '2021 MG HS Hybrid 25k', make: 'MG', model: 'HS', year: 2021, fuel: 'hybrid', mileage: 25000, condition: 'good', postcode: 'CO1 1AA', expectedTradeLow: 11000, expectedTradeHigh: 18000 },

  // === FIAT ===
  { label: '2022 Fiat 500 Electric 12k', make: 'FIAT', model: '500', year: 2022, fuel: 'electric', mileage: 12000, condition: 'good', postcode: 'BN2 1AA', expectedTradeLow: 12000, expectedTradeHigh: 18000 },

  // === SUZUKI ===
  { label: '2021 Suzuki Vitara Hybrid 20k', make: 'SUZUKI', model: 'VITARA', year: 2021, fuel: 'hybrid', mileage: 20000, condition: 'good', postcode: 'EX2 1AA', expectedTradeLow: 11000, expectedTradeHigh: 16000 },
  { label: '2022 Suzuki Jimny 1.5 Petrol 8k', make: 'SUZUKI', model: 'JIMNY', year: 2022, fuel: 'petrol', mileage: 8000, condition: 'excellent', postcode: 'SA1 1AA', expectedTradeLow: 16000, expectedTradeHigh: 23000 },

  // === MAZDA ===
  { label: '2021 Mazda CX-30 2.0 Petrol 25k', make: 'MAZDA', model: 'CX-30', year: 2021, fuel: 'petrol', mileage: 25000, condition: 'good', postcode: 'CF2 1AA', expectedTradeLow: 13000, expectedTradeHigh: 19000 },
  { label: '2020 Mazda 3 2.0 Petrol 30k', make: 'MAZDA', model: '3', year: 2020, fuel: 'petrol', mileage: 30000, condition: 'good', postcode: 'LL1 1AA', expectedTradeLow: 12000, expectedTradeHigh: 18000 },
]

// ── Run simulation ───────────────────────────────────────────────────────────

function runSim() {
  console.log('═══════════════════════════════════════════════════════════════════')
  console.log('  50-VEHICLE VALUATION SIMULATION — ROUND 2')
  console.log(`  Engine: v3 recalibrated | Date: ${NOW.toISOString().slice(0, 10)}`)
  console.log('═══════════════════════════════════════════════════════════════════\n')

  let pass = 0
  let fail = 0
  let manual = 0
  const failures: string[] = []

  const results: {
    label: string; min: number; max: number; mid: number
    expLow: number; expHigh: number; status: string; mode: string; risk: string; matchQ: string
  }[] = []

  for (const v of VEHICLES) {
    const age = CY - v.year
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
      (result.min <= v.expectedTradeHigh && result.max >= v.expectedTradeLow)

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
      label: v.label, min: result.min, max: result.max, mid,
      expLow: v.expectedTradeLow, expHigh: v.expectedTradeHigh,
      status, mode: result.quoteMode, risk: result.riskTier, matchQ: result.matchQuality,
    })
  }

  console.log('─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────')
  console.log(`${'Vehicle'.padEnd(50)} ${'Engine Range'.padStart(22)} ${'Expected Range'.padStart(22)} ${'Status'.padStart(10)} ${'Mode'.padStart(15)} ${'Match'.padStart(12)}`)
  console.log('─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────')

  for (const r of results) {
    const engineRange = r.mode === 'blocked' ? 'BLOCKED' : `£${r.min.toLocaleString()}-£${r.max.toLocaleString()}`
    const expectedRange = `£${r.expLow.toLocaleString()}-£${r.expHigh.toLocaleString()}`
    console.log(
      `${r.label.padEnd(50)} ${engineRange.padStart(22)} ${expectedRange.padStart(22)} ${r.status.padStart(10)} ${r.mode.padStart(15)} ${r.matchQ.padStart(12)}`
    )
  }

  console.log('─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────')

  const total = VEHICLES.length
  const passRate = (total - manual) > 0 ? ((pass / (total - manual)) * 100).toFixed(1) : '0.0'

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
