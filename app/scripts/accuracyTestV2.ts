/**
 * Accuracy Test V2 — 115 vehicles across 25+ makes
 * 
 * Compares getMarketValue() output against real-world median dealer
 * retail prices sourced from AutoTrader UK (March 2025).
 * 
 * Run:  cd app && npx tsx scripts/accuracyTestV2.ts
 */

import { getMarketValue } from '../lib/marketData'

interface TestVehicle {
  make: string
  model: string
  year: number
  fuel: string
  expectedRetail: number   // median dealer retail from AutoTrader
  notes?: string
}

// ─── 115 TEST VEHICLES ─────────────────────────────────────────────────────────
// All expected prices are median dealer retail for typical mileage,
// sourced from AutoTrader UK search results (March 2025).
// Vehicles are DIFFERENT from the 62 used in accuracy test v1.

const TEST_VEHICLES: TestVehicle[] = [
  // ═══ FORD (9) ═══
  { make: 'Ford', model: 'Fiesta', year: 2016, fuel: 'Petrol', expectedRetail: 6000, notes: '45k mi' },
  { make: 'Ford', model: 'Fiesta', year: 2019, fuel: 'Petrol', expectedRetail: 11500, notes: '35k mi, scraped AT median' },
  { make: 'Ford', model: 'Fiesta', year: 2021, fuel: 'Petrol', expectedRetail: 13000, notes: '20k mi, scraped AT median' },
  { make: 'Ford', model: 'Focus', year: 2019, fuel: 'Petrol', expectedRetail: 10000, notes: '40k mi' },
  { make: 'Ford', model: 'Focus', year: 2020, fuel: 'Petrol', expectedRetail: 12500, notes: '35k mi, scraped AT median (excl ST)' },
  { make: 'Ford', model: 'Focus', year: 2022, fuel: 'Petrol', expectedRetail: 14000, notes: '25k mi, scraped AT median (excl ST)' },
  { make: 'Ford', model: 'Puma', year: 2021, fuel: 'Petrol', expectedRetail: 15500, notes: '25k mi' },
  { make: 'Ford', model: 'Kuga', year: 2021, fuel: 'Petrol', expectedRetail: 17000, notes: '30k mi' },
  { make: 'Ford', model: 'EcoSport', year: 2019, fuel: 'Petrol', expectedRetail: 10000, notes: '30k mi' },

  // ═══ VOLKSWAGEN (12) ═══
  { make: 'Volkswagen', model: 'Golf', year: 2020, fuel: 'Petrol', expectedRetail: 16000, notes: '30k mi' },
  { make: 'Volkswagen', model: 'Golf', year: 2022, fuel: 'Petrol', expectedRetail: 22000, notes: '15k mi' },
  { make: 'Volkswagen', model: 'Golf', year: 2020, fuel: 'Diesel', expectedRetail: 14500, notes: '40k mi' },
  { make: 'Volkswagen', model: 'Golf', year: 2023, fuel: 'Petrol', expectedRetail: 24000, notes: '10k mi' },
  { make: 'Volkswagen', model: 'Polo', year: 2019, fuel: 'Petrol', expectedRetail: 11000, notes: '30k mi' },
  { make: 'Volkswagen', model: 'Polo', year: 2021, fuel: 'Petrol', expectedRetail: 14500, notes: '20k mi' },
  { make: 'Volkswagen', model: 'T-Roc', year: 2019, fuel: 'Petrol', expectedRetail: 16000, notes: '30k mi' },
  { make: 'Volkswagen', model: 'T-Roc', year: 2022, fuel: 'Petrol', expectedRetail: 22000, notes: '15k mi' },
  { make: 'Volkswagen', model: 'T-Cross', year: 2020, fuel: 'Petrol', expectedRetail: 15000, notes: '25k mi' },
  { make: 'Volkswagen', model: 'T-Cross', year: 2023, fuel: 'Petrol', expectedRetail: 19000, notes: '10k mi' },
  { make: 'Volkswagen', model: 'Tiguan', year: 2019, fuel: 'Diesel', expectedRetail: 17000, notes: '40k mi' },
  { make: 'Volkswagen', model: 'Tiguan', year: 2022, fuel: 'Diesel', expectedRetail: 24000, notes: '20k mi' },

  // ═══ BMW (9) ═══
  { make: 'BMW', model: '1 Series', year: 2019, fuel: 'Petrol', expectedRetail: 16000, notes: '35k mi' },
  { make: 'BMW', model: '1 Series', year: 2022, fuel: 'Petrol', expectedRetail: 23000, notes: '15k mi' },
  { make: 'BMW', model: '1 Series', year: 2020, fuel: 'Diesel', expectedRetail: 15000, notes: '40k mi' },
  { make: 'BMW', model: '3 Series', year: 2020, fuel: 'Petrol', expectedRetail: 21000, notes: '30k mi' },
  { make: 'BMW', model: '3 Series', year: 2022, fuel: 'Diesel', expectedRetail: 28000, notes: '20k mi' },
  { make: 'BMW', model: '2 Series', year: 2020, fuel: 'Petrol', expectedRetail: 19000, notes: '25k mi' },
  { make: 'BMW', model: '2 Series', year: 2023, fuel: 'Petrol', expectedRetail: 27000, notes: '10k mi' },
  { make: 'BMW', model: 'X1', year: 2020, fuel: 'Petrol', expectedRetail: 20000, notes: '30k mi' },
  { make: 'BMW', model: 'X3', year: 2019, fuel: 'Diesel', expectedRetail: 22000, notes: '40k mi' },

  // ═══ MERCEDES-BENZ (7) ═══
  { make: 'Mercedes-Benz', model: 'A-Class', year: 2019, fuel: 'Petrol', expectedRetail: 17000, notes: '30k mi' },
  { make: 'Mercedes-Benz', model: 'A-Class', year: 2022, fuel: 'Petrol', expectedRetail: 24000, notes: '15k mi' },
  { make: 'Mercedes-Benz', model: 'A-Class', year: 2019, fuel: 'Diesel', expectedRetail: 15500, notes: '35k mi' },
  { make: 'Mercedes-Benz', model: 'C-Class', year: 2020, fuel: 'Petrol', expectedRetail: 24000, notes: '30k mi' },
  { make: 'Mercedes-Benz', model: 'C-Class', year: 2022, fuel: 'Petrol', expectedRetail: 31000, notes: '15k mi' },
  { make: 'Mercedes-Benz', model: 'C-Class', year: 2020, fuel: 'Diesel', expectedRetail: 22000, notes: '35k mi' },
  { make: 'Mercedes-Benz', model: 'GLA', year: 2020, fuel: 'Petrol', expectedRetail: 23000, notes: '25k mi' },

  // ═══ AUDI (6) ═══
  { make: 'Audi', model: 'A1', year: 2019, fuel: 'Petrol', expectedRetail: 14500, notes: '25k mi' },
  { make: 'Audi', model: 'A1', year: 2022, fuel: 'Petrol', expectedRetail: 20000, notes: '10k mi' },
  { make: 'Audi', model: 'A3', year: 2019, fuel: 'Petrol', expectedRetail: 16000, notes: '30k mi' },
  { make: 'Audi', model: 'A3', year: 2022, fuel: 'Petrol', expectedRetail: 23000, notes: '15k mi' },
  { make: 'Audi', model: 'Q3', year: 2020, fuel: 'Petrol', expectedRetail: 23000, notes: '25k mi' },
  { make: 'Audi', model: 'Q3', year: 2022, fuel: 'Diesel', expectedRetail: 28000, notes: '15k mi' },

  // ═══ TOYOTA (8) ═══
  { make: 'Toyota', model: 'Yaris', year: 2019, fuel: 'Petrol', expectedRetail: 10000, notes: '20k mi' },
  { make: 'Toyota', model: 'Yaris', year: 2021, fuel: 'Hybrid', expectedRetail: 16500, notes: '15k mi' },
  { make: 'Toyota', model: 'Corolla', year: 2020, fuel: 'Hybrid', expectedRetail: 17000, notes: '25k mi' },
  { make: 'Toyota', model: 'Corolla', year: 2022, fuel: 'Hybrid', expectedRetail: 21000, notes: '15k mi' },
  { make: 'Toyota', model: 'C-HR', year: 2019, fuel: 'Hybrid', expectedRetail: 17500, notes: '30k mi' },
  { make: 'Toyota', model: 'C-HR', year: 2021, fuel: 'Hybrid', expectedRetail: 22000, notes: '20k mi' },
  { make: 'Toyota', model: 'RAV4', year: 2020, fuel: 'Hybrid', expectedRetail: 25000, notes: '30k mi' },
  { make: 'Toyota', model: 'Aygo', year: 2019, fuel: 'Petrol', expectedRetail: 8000, notes: '20k mi' },

  // ═══ VAUXHALL (6) ═══
  { make: 'Vauxhall', model: 'Corsa', year: 2019, fuel: 'Petrol', expectedRetail: 8500, notes: '25k mi' },
  { make: 'Vauxhall', model: 'Corsa', year: 2021, fuel: 'Petrol', expectedRetail: 12000, notes: '15k mi' },
  { make: 'Vauxhall', model: 'Corsa', year: 2023, fuel: 'Petrol', expectedRetail: 14000, notes: '5k mi' },
  { make: 'Vauxhall', model: 'Astra', year: 2020, fuel: 'Petrol', expectedRetail: 11500, notes: '30k mi' },
  { make: 'Vauxhall', model: 'Mokka', year: 2022, fuel: 'Petrol', expectedRetail: 17000, notes: '15k mi' },
  { make: 'Vauxhall', model: 'Grandland', year: 2021, fuel: 'Petrol', expectedRetail: 16500, notes: '25k mi' },

  // ═══ HYUNDAI (7) ═══
  { make: 'Hyundai', model: 'i10', year: 2019, fuel: 'Petrol', expectedRetail: 7500, notes: '20k mi' },
  { make: 'Hyundai', model: 'i10', year: 2021, fuel: 'Petrol', expectedRetail: 10500, notes: '15k mi' },
  { make: 'Hyundai', model: 'i20', year: 2020, fuel: 'Petrol', expectedRetail: 10000, notes: '20k mi' },
  { make: 'Hyundai', model: 'i30', year: 2019, fuel: 'Petrol', expectedRetail: 11500, notes: '30k mi' },
  { make: 'Hyundai', model: 'Tucson', year: 2019, fuel: 'Petrol', expectedRetail: 16000, notes: '30k mi' },
  { make: 'Hyundai', model: 'Tucson', year: 2022, fuel: 'Petrol', expectedRetail: 24000, notes: '15k mi' },
  { make: 'Hyundai', model: 'Kona', year: 2020, fuel: 'Petrol', expectedRetail: 14000, notes: '25k mi' },

  // ═══ KIA (7) ═══
  { make: 'Kia', model: 'Picanto', year: 2019, fuel: 'Petrol', expectedRetail: 7500, notes: '20k mi' },
  { make: 'Kia', model: 'Picanto', year: 2022, fuel: 'Petrol', expectedRetail: 11000, notes: '10k mi' },
  { make: 'Kia', model: 'Ceed', year: 2019, fuel: 'Petrol', expectedRetail: 11500, notes: '30k mi' },
  { make: 'Kia', model: 'Ceed', year: 2022, fuel: 'Petrol', expectedRetail: 16000, notes: '15k mi' },
  { make: 'Kia', model: 'Sportage', year: 2019, fuel: 'Petrol', expectedRetail: 15000, notes: '30k mi' },
  { make: 'Kia', model: 'Sportage', year: 2022, fuel: 'Petrol', expectedRetail: 23000, notes: '15k mi' },
  { make: 'Kia', model: 'Stonic', year: 2021, fuel: 'Petrol', expectedRetail: 14500, notes: '15k mi' },

  // ═══ NISSAN (6) ═══
  { make: 'Nissan', model: 'Juke', year: 2020, fuel: 'Petrol', expectedRetail: 14000, notes: '25k mi' },
  { make: 'Nissan', model: 'Juke', year: 2022, fuel: 'Petrol', expectedRetail: 17500, notes: '15k mi' },
  { make: 'Nissan', model: 'Qashqai', year: 2019, fuel: 'Petrol', expectedRetail: 13000, notes: '30k mi' },
  { make: 'Nissan', model: 'Qashqai', year: 2022, fuel: 'Petrol', expectedRetail: 19000, notes: '15k mi' },
  { make: 'Nissan', model: 'Micra', year: 2019, fuel: 'Petrol', expectedRetail: 9000, notes: '20k mi' },
  { make: 'Nissan', model: 'Micra', year: 2021, fuel: 'Petrol', expectedRetail: 12000, notes: '10k mi' },

  // ═══ PEUGEOT (6) ═══
  { make: 'Peugeot', model: '208', year: 2020, fuel: 'Petrol', expectedRetail: 12000, notes: '20k mi' },
  { make: 'Peugeot', model: '208', year: 2023, fuel: 'Petrol', expectedRetail: 16000, notes: '10k mi' },
  { make: 'Peugeot', model: '2008', year: 2021, fuel: 'Petrol', expectedRetail: 16000, notes: '20k mi' },
  { make: 'Peugeot', model: '2008', year: 2023, fuel: 'Petrol', expectedRetail: 20000, notes: '10k mi' },
  { make: 'Peugeot', model: '3008', year: 2019, fuel: 'Petrol', expectedRetail: 13000, notes: '30k mi' },
  { make: 'Peugeot', model: '3008', year: 2022, fuel: 'Petrol', expectedRetail: 19000, notes: '15k mi' },

  // ═══ RENAULT (4) ═══
  { make: 'Renault', model: 'Clio', year: 2020, fuel: 'Petrol', expectedRetail: 10500, notes: '20k mi' },
  { make: 'Renault', model: 'Clio', year: 2023, fuel: 'Petrol', expectedRetail: 14500, notes: '10k mi' },
  { make: 'Renault', model: 'Captur', year: 2020, fuel: 'Petrol', expectedRetail: 12000, notes: '25k mi' },
  { make: 'Renault', model: 'Captur', year: 2022, fuel: 'Petrol', expectedRetail: 16000, notes: '15k mi' },

  // ═══ SEAT (5) ═══
  { make: 'Seat', model: 'Ibiza', year: 2019, fuel: 'Petrol', expectedRetail: 9500, notes: '25k mi' },
  { make: 'Seat', model: 'Ibiza', year: 2022, fuel: 'Petrol', expectedRetail: 14000, notes: '10k mi' },
  { make: 'Seat', model: 'Arona', year: 2021, fuel: 'Petrol', expectedRetail: 17000, notes: '15k mi' },
  { make: 'Seat', model: 'Ateca', year: 2020, fuel: 'Petrol', expectedRetail: 15000, notes: '25k mi' },
  { make: 'Seat', model: 'Leon', year: 2021, fuel: 'Petrol', expectedRetail: 16000, notes: '20k mi' },

  // ═══ SKODA (5) ═══
  { make: 'Skoda', model: 'Fabia', year: 2020, fuel: 'Petrol', expectedRetail: 10500, notes: '20k mi' },
  { make: 'Skoda', model: 'Octavia', year: 2021, fuel: 'Petrol', expectedRetail: 18000, notes: '20k mi' },
  { make: 'Skoda', model: 'Octavia', year: 2019, fuel: 'Diesel', expectedRetail: 13000, notes: '40k mi' },
  { make: 'Skoda', model: 'Karoq', year: 2021, fuel: 'Petrol', expectedRetail: 21000, notes: '15k mi' },
  { make: 'Skoda', model: 'Kamiq', year: 2021, fuel: 'Petrol', expectedRetail: 16000, notes: '15k mi' },

  // ═══ MINI (3) ═══
  { make: 'Mini', model: 'Hatch', year: 2019, fuel: 'Petrol', expectedRetail: 14000, notes: '25k mi' },
  { make: 'Mini', model: 'Hatch', year: 2022, fuel: 'Petrol', expectedRetail: 19000, notes: '10k mi' },
  { make: 'Mini', model: 'Countryman', year: 2020, fuel: 'Petrol', expectedRetail: 17000, notes: '25k mi' },

  // ═══ HONDA (3) ═══
  { make: 'Honda', model: 'Civic', year: 2019, fuel: 'Petrol', expectedRetail: 15000, notes: '30k mi' },
  { make: 'Honda', model: 'Jazz', year: 2020, fuel: 'Petrol', expectedRetail: 13000, notes: '15k mi' },
  { make: 'Honda', model: 'HR-V', year: 2019, fuel: 'Petrol', expectedRetail: 14000, notes: '25k mi' },

  // ═══ MAZDA (4) ═══
  { make: 'Mazda', model: 'CX-5', year: 2019, fuel: 'Petrol', expectedRetail: 17000, notes: '30k mi' },
  { make: 'Mazda', model: 'CX-5', year: 2022, fuel: 'Petrol', expectedRetail: 23000, notes: '15k mi' },
  { make: 'Mazda', model: 'CX-30', year: 2020, fuel: 'Petrol', expectedRetail: 17000, notes: '25k mi' },
  { make: 'Mazda', model: 'MX-5', year: 2019, fuel: 'Petrol', expectedRetail: 19000, notes: '20k mi' },

  // ═══ VOLVO (3) ═══
  { make: 'Volvo', model: 'XC40', year: 2019, fuel: 'Petrol', expectedRetail: 21000, notes: '30k mi' },
  { make: 'Volvo', model: 'XC40', year: 2022, fuel: 'Petrol', expectedRetail: 28000, notes: '15k mi' },
  { make: 'Volvo', model: 'XC60', year: 2019, fuel: 'Diesel', expectedRetail: 22000, notes: '40k mi' },

  // ═══ FIAT (3) ═══
  { make: 'Fiat', model: '500', year: 2018, fuel: 'Petrol', expectedRetail: 8000, notes: '20k mi' },
  { make: 'Fiat', model: '500', year: 2021, fuel: 'Petrol', expectedRetail: 10000, notes: '10k mi' },
  { make: 'Fiat', model: 'Panda', year: 2019, fuel: 'Petrol', expectedRetail: 7000, notes: '20k mi' },

  // ═══ SUZUKI (2) ═══
  { make: 'Suzuki', model: 'Swift', year: 2019, fuel: 'Petrol', expectedRetail: 9000, notes: '20k mi' },
  { make: 'Suzuki', model: 'Vitara', year: 2020, fuel: 'Petrol', expectedRetail: 13000, notes: '25k mi' },

  // ═══ CITROEN (2) ═══
  { make: 'Citroen', model: 'C3', year: 2019, fuel: 'Petrol', expectedRetail: 7500, notes: '20k mi' },
  { make: 'Citroen', model: 'C3 Aircross', year: 2021, fuel: 'Petrol', expectedRetail: 12500, notes: '15k mi' },

  // ═══ DACIA (2) ═══
  { make: 'Dacia', model: 'Duster', year: 2020, fuel: 'Petrol', expectedRetail: 10500, notes: '25k mi' },
  { make: 'Dacia', model: 'Sandero', year: 2021, fuel: 'Petrol', expectedRetail: 8000, notes: '15k mi' },

  // ═══ LAND ROVER (2) ═══
  { make: 'Land Rover', model: 'Range Rover Evoque', year: 2019, fuel: 'Petrol', expectedRetail: 24000, notes: '30k mi' },
  { make: 'Land Rover', model: 'Discovery Sport', year: 2020, fuel: 'Diesel', expectedRetail: 22000, notes: '35k mi' },
]

// ─── Run ────────────────────────────────────────────────────────────────────────

const TOLERANCE = 0.15 // ±15%

interface Result {
  vehicle: string
  expected: number
  predicted: number | null
  deviation: number | null  // % deviation
  pass: boolean
  matchQuality: string
}

function run() {
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('  ACCURACY TEST V2 — %d vehicles', TEST_VEHICLES.length)
  console.log('  Tolerance: ±%d%%', TOLERANCE * 100)
  console.log('═══════════════════════════════════════════════════════════════\n')

  const results: Result[] = []

  for (const v of TEST_VEHICLES) {
    const label = `${v.make} ${v.model} ${v.year} ${v.fuel}`
    const result = getMarketValue(v.make, v.model, v.year, v.fuel)

    if (!result) {
      results.push({
        vehicle: label,
        expected: v.expectedRetail,
        predicted: null,
        deviation: null,
        pass: false,
        matchQuality: 'NO_MATCH',
      })
      continue
    }

    const predicted = result.avgRetail
    const deviation = (predicted - v.expectedRetail) / v.expectedRetail
    const pass = Math.abs(deviation) <= TOLERANCE

    results.push({
      vehicle: label,
      expected: v.expectedRetail,
      predicted,
      deviation,
      pass,
      matchQuality: result.matchQuality,
    })
  }

  // ── Print results ─────────────────────────────────────────────────────────

  const passes = results.filter((r) => r.pass)
  const fails = results.filter((r) => !r.pass)
  const noMatch = results.filter((r) => r.predicted === null)
  const matched = results.filter((r) => r.predicted !== null)

  // Print FAILS first
  if (fails.length > 0) {
    console.log('──── FAILS (%d) ────────────────────────────────────────────────\n', fails.length)
    for (const r of fails.sort((a, b) => Math.abs(b.deviation ?? 999) - Math.abs(a.deviation ?? 999))) {
      if (r.predicted === null) {
        console.log('  ✗ %-45s  expected: £%s   NO MATCH', r.vehicle, r.expected.toLocaleString())
      } else {
        const devPct = ((r.deviation ?? 0) * 100).toFixed(1)
        const dir = (r.deviation ?? 0) > 0 ? '+' : ''
        console.log(
          '  ✗ %-45s  expected: £%-7s  predicted: £%-7s  dev: %s%s%%  [%s]',
          r.vehicle,
          r.expected.toLocaleString(),
          r.predicted.toLocaleString(),
          dir,
          devPct,
          r.matchQuality
        )
      }
    }
    console.log()
  }

  // Print PASSES summary
  console.log('──── PASSES (%d) ───────────────────────────────────────────────\n', passes.length)
  for (const r of passes) {
    const devPct = ((r.deviation ?? 0) * 100).toFixed(1)
    const dir = (r.deviation ?? 0) > 0 ? '+' : ''
    console.log(
      '  ✓ %-45s  expected: £%-7s  predicted: £%-7s  dev: %s%s%%  [%s]',
      r.vehicle,
      r.expected.toLocaleString(),
      r.predicted?.toLocaleString(),
      dir,
      devPct,
      r.matchQuality
    )
  }

  // ── Summary stats ─────────────────────────────────────────────────────────

  const deviations = matched.map((r) => r.deviation ?? 0)
  const absDeviations = deviations.map((d) => Math.abs(d))
  const meanAbsDev = absDeviations.reduce((a, b) => a + b, 0) / absDeviations.length
  const meanDev = deviations.reduce((a, b) => a + b, 0) / deviations.length
  const maxAbsDev = Math.max(...absDeviations)
  const medianAbsDev = [...absDeviations].sort((a, b) => a - b)[Math.floor(absDeviations.length / 2)]

  // Calculate by-make statistics
  const makeStats = new Map<string, { deviations: number[]; passes: number; total: number }>()
  for (const r of results) {
    const make = r.vehicle.split(' ')[0]
    if (!makeStats.has(make)) makeStats.set(make, { deviations: [], passes: 0, total: 0 })
    const stat = makeStats.get(make)!
    stat.total++
    if (r.pass) stat.passes++
    if (r.deviation !== null) stat.deviations.push(r.deviation)
  }

  console.log('\n═══════════════════════════════════════════════════════════════')
  console.log('  SUMMARY')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('  Total vehicles:     %d', results.length)
  console.log('  Matched:            %d', matched.length)
  console.log('  No match:           %d', noMatch.length)
  console.log('  Pass (±%d%%):       %d / %d  (%s%%)', TOLERANCE * 100, passes.length, results.length, ((passes.length / results.length) * 100).toFixed(1))
  console.log('  Mean absolute dev:  %s%%', (meanAbsDev * 100).toFixed(1))
  console.log('  Median absolute dev:%s%%', (medianAbsDev * 100).toFixed(1))
  console.log('  Mean deviation:     %s%s%%', meanDev > 0 ? '+' : '', (meanDev * 100).toFixed(1))
  console.log('  Max absolute dev:   %s%%', (maxAbsDev * 100).toFixed(1))

  // By-make breakdown
  console.log('\n──── BY MAKE ──────────────────────────────────────────────────')
  const sortedMakes = [...makeStats.entries()].sort(
    (a, b) => {
      const aAvg = a[1].deviations.length > 0 ? a[1].deviations.reduce((x, y) => x + Math.abs(y), 0) / a[1].deviations.length : 999
      const bAvg = b[1].deviations.length > 0 ? b[1].deviations.reduce((x, y) => x + Math.abs(y), 0) / b[1].deviations.length : 999
      return aAvg - bAvg
    }
  )
  for (const [make, stat] of sortedMakes) {
    const avgAbsDev = stat.deviations.length > 0
      ? stat.deviations.reduce((a, b) => a + Math.abs(b), 0) / stat.deviations.length
      : 0
    const avgDev = stat.deviations.length > 0
      ? stat.deviations.reduce((a, b) => a + b, 0) / stat.deviations.length
      : 0
    console.log(
      '  %-15s  %d/%d pass  avg|dev|: %s%%  avg dev: %s%s%%',
      make,
      stat.passes,
      stat.total,
      (avgAbsDev * 100).toFixed(1),
      avgDev > 0 ? '+' : '',
      (avgDev * 100).toFixed(1)
    )
  }

  // Match quality breakdown
  const qualityCounts = new Map<string, number>()
  for (const r of results) {
    const q = r.matchQuality
    qualityCounts.set(q, (qualityCounts.get(q) ?? 0) + 1)
  }
  console.log('\n──── MATCH QUALITY ────────────────────────────────────────────')
  for (const [quality, count] of qualityCounts) {
    console.log('  %-15s  %d', quality, count)
  }

  console.log('\n═══════════════════════════════════════════════════════════════\n')

  // Exit with error code if pass rate < 50%
  const passRate = passes.length / results.length
  if (passRate < 0.5) {
    console.log('⚠ Pass rate below 50%% — engine needs calibration work')
    process.exit(1)
  }
}

run()
