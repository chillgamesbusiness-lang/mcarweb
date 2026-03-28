/**
 * Accuracy Test V3 — Enhanced Valuation Engine
 *
 * Tests getEnhancedMarketValue() across four dimensions:
 *  A. Regression (121 vehicles from V2 at typical mileage — must still pass)
 *  B. High mileage (25 vehicles — tests mileage penalty)
 *  C. Low mileage (20 vehicles — tests low-mileage premium)
 *  D. Universal model (20 vehicles NOT in MARKET_DATA — tests fallback)
 *
 * Run:  cd app && npx tsx scripts/accuracyTestV3.ts
 */

import { getMarketValue } from '../lib/marketData'
import { getEnhancedMarketValue } from '../lib/advancedValuation'

interface TestVehicle {
  make: string
  model: string
  year: number
  fuel: string
  mileage?: number
  engineCC?: number
  expectedRetail: number
  notes?: string
  category: 'regression' | 'high_mileage' | 'low_mileage' | 'universal'
}

// ═════════════════════════════════════════════════════════════════════════════
// A. REGRESSION — 121 vehicles from V2 at typical mileage
//    Expected prices are median dealer retail from AutoTrader UK
// ═════════════════════════════════════════════════════════════════════════════

const REGRESSION_VEHICLES: TestVehicle[] = [
  // ═══ FORD (9) ═══
  { make: 'Ford', model: 'Fiesta', year: 2016, fuel: 'Petrol', mileage: 45000, expectedRetail: 6000, category: 'regression' },
  { make: 'Ford', model: 'Fiesta', year: 2019, fuel: 'Petrol', mileage: 35000, expectedRetail: 11500, category: 'regression' },
  { make: 'Ford', model: 'Fiesta', year: 2021, fuel: 'Petrol', mileage: 20000, expectedRetail: 13000, category: 'regression' },
  { make: 'Ford', model: 'Focus', year: 2019, fuel: 'Petrol', mileage: 40000, expectedRetail: 10000, category: 'regression' },
  { make: 'Ford', model: 'Focus', year: 2020, fuel: 'Petrol', mileage: 35000, expectedRetail: 12500, category: 'regression' },
  { make: 'Ford', model: 'Focus', year: 2022, fuel: 'Petrol', mileage: 25000, expectedRetail: 14000, category: 'regression' },
  { make: 'Ford', model: 'Puma', year: 2021, fuel: 'Petrol', mileage: 25000, expectedRetail: 15500, category: 'regression' },
  { make: 'Ford', model: 'Kuga', year: 2021, fuel: 'Petrol', mileage: 30000, expectedRetail: 17000, category: 'regression' },
  { make: 'Ford', model: 'EcoSport', year: 2019, fuel: 'Petrol', mileage: 30000, expectedRetail: 10000, category: 'regression' },

  // ═══ VOLKSWAGEN (12) ═══
  { make: 'Volkswagen', model: 'Golf', year: 2020, fuel: 'Petrol', mileage: 30000, expectedRetail: 16000, category: 'regression' },
  { make: 'Volkswagen', model: 'Golf', year: 2022, fuel: 'Petrol', mileage: 15000, expectedRetail: 22000, category: 'regression' },
  { make: 'Volkswagen', model: 'Golf', year: 2020, fuel: 'Diesel', mileage: 40000, expectedRetail: 14500, category: 'regression' },
  { make: 'Volkswagen', model: 'Golf', year: 2023, fuel: 'Petrol', mileage: 10000, expectedRetail: 24000, category: 'regression' },
  { make: 'Volkswagen', model: 'Polo', year: 2019, fuel: 'Petrol', mileage: 30000, expectedRetail: 11000, category: 'regression' },
  { make: 'Volkswagen', model: 'Polo', year: 2021, fuel: 'Petrol', mileage: 20000, expectedRetail: 14500, category: 'regression' },
  { make: 'Volkswagen', model: 'T-Roc', year: 2019, fuel: 'Petrol', mileage: 30000, expectedRetail: 16000, category: 'regression' },
  { make: 'Volkswagen', model: 'T-Roc', year: 2022, fuel: 'Petrol', mileage: 15000, expectedRetail: 22000, category: 'regression' },
  { make: 'Volkswagen', model: 'T-Cross', year: 2020, fuel: 'Petrol', mileage: 25000, expectedRetail: 15000, category: 'regression' },
  { make: 'Volkswagen', model: 'T-Cross', year: 2023, fuel: 'Petrol', mileage: 10000, expectedRetail: 19000, category: 'regression' },
  { make: 'Volkswagen', model: 'Tiguan', year: 2019, fuel: 'Diesel', mileage: 40000, expectedRetail: 17000, category: 'regression' },
  { make: 'Volkswagen', model: 'Tiguan', year: 2022, fuel: 'Diesel', mileage: 20000, expectedRetail: 24000, category: 'regression' },

  // ═══ BMW (9) ═══
  { make: 'BMW', model: '1 Series', year: 2019, fuel: 'Petrol', mileage: 35000, expectedRetail: 16000, category: 'regression' },
  { make: 'BMW', model: '1 Series', year: 2022, fuel: 'Petrol', mileage: 15000, expectedRetail: 23000, category: 'regression' },
  { make: 'BMW', model: '1 Series', year: 2020, fuel: 'Diesel', mileage: 40000, expectedRetail: 15000, category: 'regression' },
  { make: 'BMW', model: '3 Series', year: 2020, fuel: 'Petrol', mileage: 30000, expectedRetail: 21000, category: 'regression' },
  { make: 'BMW', model: '3 Series', year: 2022, fuel: 'Diesel', mileage: 20000, expectedRetail: 28000, category: 'regression' },
  { make: 'BMW', model: '2 Series', year: 2020, fuel: 'Petrol', mileage: 25000, expectedRetail: 19000, category: 'regression' },
  { make: 'BMW', model: '2 Series', year: 2023, fuel: 'Petrol', mileage: 10000, expectedRetail: 27000, category: 'regression' },
  { make: 'BMW', model: 'X1', year: 2020, fuel: 'Petrol', mileage: 30000, expectedRetail: 20000, category: 'regression' },
  { make: 'BMW', model: 'X3', year: 2019, fuel: 'Diesel', mileage: 40000, expectedRetail: 22000, category: 'regression' },

  // ═══ MERCEDES-BENZ (7) ═══
  { make: 'Mercedes-Benz', model: 'A-Class', year: 2019, fuel: 'Petrol', mileage: 30000, expectedRetail: 17000, category: 'regression' },
  { make: 'Mercedes-Benz', model: 'A-Class', year: 2022, fuel: 'Petrol', mileage: 15000, expectedRetail: 24000, category: 'regression' },
  { make: 'Mercedes-Benz', model: 'A-Class', year: 2019, fuel: 'Diesel', mileage: 35000, expectedRetail: 15500, category: 'regression' },
  { make: 'Mercedes-Benz', model: 'C-Class', year: 2020, fuel: 'Petrol', mileage: 30000, expectedRetail: 24000, category: 'regression' },
  { make: 'Mercedes-Benz', model: 'C-Class', year: 2022, fuel: 'Petrol', mileage: 15000, expectedRetail: 31000, category: 'regression' },
  { make: 'Mercedes-Benz', model: 'C-Class', year: 2020, fuel: 'Diesel', mileage: 35000, expectedRetail: 22000, category: 'regression' },
  { make: 'Mercedes-Benz', model: 'GLA', year: 2020, fuel: 'Petrol', mileage: 25000, expectedRetail: 23000, category: 'regression' },

  // ═══ AUDI (6) ═══
  { make: 'Audi', model: 'A1', year: 2019, fuel: 'Petrol', mileage: 25000, expectedRetail: 14500, category: 'regression' },
  { make: 'Audi', model: 'A1', year: 2022, fuel: 'Petrol', mileage: 10000, expectedRetail: 20000, category: 'regression' },
  { make: 'Audi', model: 'A3', year: 2019, fuel: 'Petrol', mileage: 30000, expectedRetail: 16000, category: 'regression' },
  { make: 'Audi', model: 'A3', year: 2022, fuel: 'Petrol', mileage: 15000, expectedRetail: 23000, category: 'regression' },
  { make: 'Audi', model: 'Q3', year: 2020, fuel: 'Petrol', mileage: 25000, expectedRetail: 23000, category: 'regression' },
  { make: 'Audi', model: 'Q3', year: 2022, fuel: 'Diesel', mileage: 15000, expectedRetail: 28000, category: 'regression' },

  // ═══ TOYOTA (8) ═══
  { make: 'Toyota', model: 'Yaris', year: 2019, fuel: 'Petrol', mileage: 20000, expectedRetail: 10000, category: 'regression' },
  { make: 'Toyota', model: 'Yaris', year: 2021, fuel: 'Hybrid', mileage: 15000, expectedRetail: 16500, category: 'regression' },
  { make: 'Toyota', model: 'Corolla', year: 2020, fuel: 'Hybrid', mileage: 25000, expectedRetail: 17000, category: 'regression' },
  { make: 'Toyota', model: 'Corolla', year: 2022, fuel: 'Hybrid', mileage: 15000, expectedRetail: 21000, category: 'regression' },
  { make: 'Toyota', model: 'C-HR', year: 2019, fuel: 'Hybrid', mileage: 30000, expectedRetail: 17500, category: 'regression' },
  { make: 'Toyota', model: 'C-HR', year: 2021, fuel: 'Hybrid', mileage: 20000, expectedRetail: 22000, category: 'regression' },
  { make: 'Toyota', model: 'RAV4', year: 2020, fuel: 'Hybrid', mileage: 30000, expectedRetail: 25000, category: 'regression' },
  { make: 'Toyota', model: 'Aygo', year: 2019, fuel: 'Petrol', mileage: 20000, expectedRetail: 8000, category: 'regression' },

  // ═══ VAUXHALL (6) ═══
  { make: 'Vauxhall', model: 'Corsa', year: 2019, fuel: 'Petrol', mileage: 25000, expectedRetail: 8500, category: 'regression' },
  { make: 'Vauxhall', model: 'Corsa', year: 2021, fuel: 'Petrol', mileage: 15000, expectedRetail: 12000, category: 'regression' },
  { make: 'Vauxhall', model: 'Corsa', year: 2023, fuel: 'Petrol', mileage: 5000, expectedRetail: 14000, category: 'regression' },
  { make: 'Vauxhall', model: 'Astra', year: 2020, fuel: 'Petrol', mileage: 30000, expectedRetail: 11500, category: 'regression' },
  { make: 'Vauxhall', model: 'Mokka', year: 2022, fuel: 'Petrol', mileage: 15000, expectedRetail: 17000, category: 'regression' },
  { make: 'Vauxhall', model: 'Grandland', year: 2021, fuel: 'Petrol', mileage: 25000, expectedRetail: 16500, category: 'regression' },

  // ═══ HYUNDAI (7) ═══
  { make: 'Hyundai', model: 'i10', year: 2019, fuel: 'Petrol', mileage: 20000, expectedRetail: 7500, category: 'regression' },
  { make: 'Hyundai', model: 'i10', year: 2021, fuel: 'Petrol', mileage: 15000, expectedRetail: 10500, category: 'regression' },
  { make: 'Hyundai', model: 'i20', year: 2020, fuel: 'Petrol', mileage: 20000, expectedRetail: 10000, category: 'regression' },
  { make: 'Hyundai', model: 'i30', year: 2019, fuel: 'Petrol', mileage: 30000, expectedRetail: 11500, category: 'regression' },
  { make: 'Hyundai', model: 'Tucson', year: 2019, fuel: 'Petrol', mileage: 30000, expectedRetail: 16000, category: 'regression' },
  { make: 'Hyundai', model: 'Tucson', year: 2022, fuel: 'Petrol', mileage: 15000, expectedRetail: 24000, category: 'regression' },
  { make: 'Hyundai', model: 'Kona', year: 2020, fuel: 'Petrol', mileage: 25000, expectedRetail: 14000, category: 'regression' },

  // ═══ KIA (7) ═══
  { make: 'Kia', model: 'Picanto', year: 2019, fuel: 'Petrol', mileage: 20000, expectedRetail: 7500, category: 'regression' },
  { make: 'Kia', model: 'Picanto', year: 2022, fuel: 'Petrol', mileage: 10000, expectedRetail: 11000, category: 'regression' },
  { make: 'Kia', model: 'Ceed', year: 2019, fuel: 'Petrol', mileage: 30000, expectedRetail: 11500, category: 'regression' },
  { make: 'Kia', model: 'Ceed', year: 2022, fuel: 'Petrol', mileage: 15000, expectedRetail: 16000, category: 'regression' },
  { make: 'Kia', model: 'Sportage', year: 2019, fuel: 'Petrol', mileage: 30000, expectedRetail: 15000, category: 'regression' },
  { make: 'Kia', model: 'Sportage', year: 2022, fuel: 'Petrol', mileage: 15000, expectedRetail: 23000, category: 'regression' },
  { make: 'Kia', model: 'Stonic', year: 2021, fuel: 'Petrol', mileage: 15000, expectedRetail: 14500, category: 'regression' },

  // ═══ NISSAN (6) ═══
  { make: 'Nissan', model: 'Juke', year: 2020, fuel: 'Petrol', mileage: 25000, expectedRetail: 14000, category: 'regression' },
  { make: 'Nissan', model: 'Juke', year: 2022, fuel: 'Petrol', mileage: 15000, expectedRetail: 17500, category: 'regression' },
  { make: 'Nissan', model: 'Qashqai', year: 2019, fuel: 'Petrol', mileage: 30000, expectedRetail: 13000, category: 'regression' },
  { make: 'Nissan', model: 'Qashqai', year: 2022, fuel: 'Petrol', mileage: 15000, expectedRetail: 19000, category: 'regression' },
  { make: 'Nissan', model: 'Micra', year: 2019, fuel: 'Petrol', mileage: 20000, expectedRetail: 9000, category: 'regression' },
  { make: 'Nissan', model: 'Micra', year: 2021, fuel: 'Petrol', mileage: 10000, expectedRetail: 12000, category: 'regression' },

  // ═══ PEUGEOT (6) ═══
  { make: 'Peugeot', model: '208', year: 2020, fuel: 'Petrol', mileage: 20000, expectedRetail: 12000, category: 'regression' },
  { make: 'Peugeot', model: '208', year: 2023, fuel: 'Petrol', mileage: 10000, expectedRetail: 16000, category: 'regression' },
  { make: 'Peugeot', model: '2008', year: 2021, fuel: 'Petrol', mileage: 20000, expectedRetail: 16000, category: 'regression' },
  { make: 'Peugeot', model: '2008', year: 2023, fuel: 'Petrol', mileage: 10000, expectedRetail: 20000, category: 'regression' },
  { make: 'Peugeot', model: '3008', year: 2019, fuel: 'Petrol', mileage: 30000, expectedRetail: 13000, category: 'regression' },
  { make: 'Peugeot', model: '3008', year: 2022, fuel: 'Petrol', mileage: 15000, expectedRetail: 19000, category: 'regression' },

  // ═══ RENAULT (4) ═══
  { make: 'Renault', model: 'Clio', year: 2020, fuel: 'Petrol', mileage: 20000, expectedRetail: 10500, category: 'regression' },
  { make: 'Renault', model: 'Clio', year: 2023, fuel: 'Petrol', mileage: 10000, expectedRetail: 14500, category: 'regression' },
  { make: 'Renault', model: 'Captur', year: 2020, fuel: 'Petrol', mileage: 25000, expectedRetail: 12000, category: 'regression' },
  { make: 'Renault', model: 'Captur', year: 2022, fuel: 'Petrol', mileage: 15000, expectedRetail: 16000, category: 'regression' },

  // ═══ SEAT (5) ═══
  { make: 'Seat', model: 'Ibiza', year: 2019, fuel: 'Petrol', mileage: 25000, expectedRetail: 9500, category: 'regression' },
  { make: 'Seat', model: 'Ibiza', year: 2022, fuel: 'Petrol', mileage: 10000, expectedRetail: 14000, category: 'regression' },
  { make: 'Seat', model: 'Arona', year: 2021, fuel: 'Petrol', mileage: 15000, expectedRetail: 17000, category: 'regression' },
  { make: 'Seat', model: 'Ateca', year: 2020, fuel: 'Petrol', mileage: 25000, expectedRetail: 15000, category: 'regression' },
  { make: 'Seat', model: 'Leon', year: 2021, fuel: 'Petrol', mileage: 20000, expectedRetail: 16000, category: 'regression' },

  // ═══ SKODA (5) ═══
  { make: 'Skoda', model: 'Fabia', year: 2020, fuel: 'Petrol', mileage: 20000, expectedRetail: 10500, category: 'regression' },
  { make: 'Skoda', model: 'Octavia', year: 2021, fuel: 'Petrol', mileage: 20000, expectedRetail: 18000, category: 'regression' },
  { make: 'Skoda', model: 'Octavia', year: 2019, fuel: 'Diesel', mileage: 40000, expectedRetail: 13000, category: 'regression' },
  { make: 'Skoda', model: 'Karoq', year: 2021, fuel: 'Petrol', mileage: 15000, expectedRetail: 21000, category: 'regression' },
  { make: 'Skoda', model: 'Kamiq', year: 2021, fuel: 'Petrol', mileage: 15000, expectedRetail: 16000, category: 'regression' },

  // ═══ MINI (3) ═══
  { make: 'Mini', model: 'Hatch', year: 2019, fuel: 'Petrol', mileage: 25000, expectedRetail: 14000, category: 'regression' },
  { make: 'Mini', model: 'Hatch', year: 2022, fuel: 'Petrol', mileage: 10000, expectedRetail: 19000, category: 'regression' },
  { make: 'Mini', model: 'Countryman', year: 2020, fuel: 'Petrol', mileage: 25000, expectedRetail: 17000, category: 'regression' },

  // ═══ HONDA (3) ═══
  { make: 'Honda', model: 'Civic', year: 2019, fuel: 'Petrol', mileage: 30000, expectedRetail: 15000, category: 'regression' },
  { make: 'Honda', model: 'Jazz', year: 2020, fuel: 'Petrol', mileage: 15000, expectedRetail: 13000, category: 'regression' },
  { make: 'Honda', model: 'HR-V', year: 2019, fuel: 'Petrol', mileage: 25000, expectedRetail: 14000, category: 'regression' },

  // ═══ MAZDA (4) ═══
  { make: 'Mazda', model: 'CX-5', year: 2019, fuel: 'Petrol', mileage: 30000, expectedRetail: 17000, category: 'regression' },
  { make: 'Mazda', model: 'CX-5', year: 2022, fuel: 'Petrol', mileage: 15000, expectedRetail: 23000, category: 'regression' },
  { make: 'Mazda', model: 'CX-30', year: 2020, fuel: 'Petrol', mileage: 25000, expectedRetail: 17000, category: 'regression' },
  { make: 'Mazda', model: 'MX-5', year: 2019, fuel: 'Petrol', mileage: 20000, expectedRetail: 19000, category: 'regression' },

  // ═══ VOLVO (3) ═══
  { make: 'Volvo', model: 'XC40', year: 2019, fuel: 'Petrol', mileage: 30000, expectedRetail: 21000, category: 'regression' },
  { make: 'Volvo', model: 'XC40', year: 2022, fuel: 'Petrol', mileage: 15000, expectedRetail: 28000, category: 'regression' },
  { make: 'Volvo', model: 'XC60', year: 2019, fuel: 'Diesel', mileage: 40000, expectedRetail: 22000, category: 'regression' },

  // ═══ FIAT (3) ═══
  { make: 'Fiat', model: '500', year: 2018, fuel: 'Petrol', mileage: 20000, expectedRetail: 8000, category: 'regression' },
  { make: 'Fiat', model: '500', year: 2021, fuel: 'Petrol', mileage: 10000, expectedRetail: 10000, category: 'regression' },
  { make: 'Fiat', model: 'Panda', year: 2019, fuel: 'Petrol', mileage: 20000, expectedRetail: 7000, category: 'regression' },

  // ═══ SUZUKI (2) ═══
  { make: 'Suzuki', model: 'Swift', year: 2019, fuel: 'Petrol', mileage: 20000, expectedRetail: 9000, category: 'regression' },
  { make: 'Suzuki', model: 'Vitara', year: 2020, fuel: 'Petrol', mileage: 25000, expectedRetail: 13000, category: 'regression' },

  // ═══ CITROEN (2) ═══
  { make: 'Citroen', model: 'C3', year: 2019, fuel: 'Petrol', mileage: 20000, expectedRetail: 7500, category: 'regression' },
  { make: 'Citroen', model: 'C3 Aircross', year: 2021, fuel: 'Petrol', mileage: 15000, expectedRetail: 12500, category: 'regression' },

  // ═══ DACIA (2) ═══
  { make: 'Dacia', model: 'Duster', year: 2020, fuel: 'Petrol', mileage: 25000, expectedRetail: 10500, category: 'regression' },
  { make: 'Dacia', model: 'Sandero', year: 2021, fuel: 'Petrol', mileage: 15000, expectedRetail: 8000, category: 'regression' },

  // ═══ LAND ROVER (2) ═══
  { make: 'Land Rover', model: 'Range Rover Evoque', year: 2019, fuel: 'Petrol', mileage: 30000, expectedRetail: 24000, category: 'regression' },
  { make: 'Land Rover', model: 'Discovery Sport', year: 2020, fuel: 'Diesel', mileage: 35000, expectedRetail: 22000, category: 'regression' },
]

// ═════════════════════════════════════════════════════════════════════════════
// B. HIGH MILEAGE — same cars but at significantly above-average mileage
//    Expected prices are estimated real AT medians at stated mileage
// ═════════════════════════════════════════════════════════════════════════════

const HIGH_MILEAGE_VEHICLES: TestVehicle[] = [
  // Ford Fiesta 2019, 80k mi (expected 48k) — should be 20-30% below typical
  { make: 'Ford', model: 'Fiesta', year: 2019, fuel: 'Petrol', mileage: 80000, expectedRetail: 9000, category: 'high_mileage', notes: '80k mi, typical ~48k' },
  // Ford Focus 2019, 85k mi — heavily penalised
  { make: 'Ford', model: 'Focus', year: 2019, fuel: 'Petrol', mileage: 85000, expectedRetail: 7500, category: 'high_mileage', notes: '85k mi' },
  // VW Golf 2020, 65k mi (expected 40k)
  { make: 'Volkswagen', model: 'Golf', year: 2020, fuel: 'Petrol', mileage: 65000, expectedRetail: 13500, category: 'high_mileage', notes: '65k mi' },
  // BMW 3 Series 2020, 70k mi
  { make: 'BMW', model: '3 Series', year: 2020, fuel: 'Petrol', mileage: 70000, expectedRetail: 17000, category: 'high_mileage', notes: '70k mi' },
  // Mercedes C-Class 2020, 65k mi
  { make: 'Mercedes-Benz', model: 'C-Class', year: 2020, fuel: 'Petrol', mileage: 65000, expectedRetail: 20000, category: 'high_mileage', notes: '65k mi' },
  // Toyota Yaris 2019, 60k mi
  { make: 'Toyota', model: 'Yaris', year: 2019, fuel: 'Petrol', mileage: 60000, expectedRetail: 8500, category: 'high_mileage', notes: '60k mi' },
  // Vauxhall Corsa 2019, 55k mi
  { make: 'Vauxhall', model: 'Corsa', year: 2019, fuel: 'Petrol', mileage: 55000, expectedRetail: 7500, category: 'high_mileage', notes: '55k mi' },
  // Hyundai Tucson 2019, 75k mi
  { make: 'Hyundai', model: 'Tucson', year: 2019, fuel: 'Petrol', mileage: 75000, expectedRetail: 13000, category: 'high_mileage', notes: '75k mi' },
  // Nissan Qashqai 2019, 70k mi
  { make: 'Nissan', model: 'Qashqai', year: 2019, fuel: 'Petrol', mileage: 70000, expectedRetail: 10500, category: 'high_mileage', notes: '70k mi' },
  // Audi A3 2019, 65k mi
  { make: 'Audi', model: 'A3', year: 2019, fuel: 'Petrol', mileage: 65000, expectedRetail: 13000, category: 'high_mileage', notes: '65k mi' },
  // Peugeot 208 2020, 55k mi
  { make: 'Peugeot', model: '208', year: 2020, fuel: 'Petrol', mileage: 55000, expectedRetail: 10000, category: 'high_mileage', notes: '55k mi' },
  // Kia Sportage 2019, 80k mi
  { make: 'Kia', model: 'Sportage', year: 2019, fuel: 'Petrol', mileage: 80000, expectedRetail: 12000, category: 'high_mileage', notes: '80k mi' },
  // Skoda Octavia 2021, 50k mi
  { make: 'Skoda', model: 'Octavia', year: 2021, fuel: 'Petrol', mileage: 50000, expectedRetail: 15500, category: 'high_mileage', notes: '50k mi' },
  // Mazda CX-5 2019, 70k mi
  { make: 'Mazda', model: 'CX-5', year: 2019, fuel: 'Petrol', mileage: 70000, expectedRetail: 14000, category: 'high_mileage', notes: '70k mi' },
  // Volvo XC40 2019, 65k mi
  { make: 'Volvo', model: 'XC40', year: 2019, fuel: 'Petrol', mileage: 65000, expectedRetail: 18000, category: 'high_mileage', notes: '65k mi' },
  // Honda Civic 2019, 75k mi
  { make: 'Honda', model: 'Civic', year: 2019, fuel: 'Petrol', mileage: 75000, expectedRetail: 12000, category: 'high_mileage', notes: '75k mi' },
  // Renault Clio 2020, 50k mi
  { make: 'Renault', model: 'Clio', year: 2020, fuel: 'Petrol', mileage: 50000, expectedRetail: 8500, category: 'high_mileage', notes: '50k mi' },
  // Seat Leon 2021, 45k mi
  { make: 'Seat', model: 'Leon', year: 2021, fuel: 'Petrol', mileage: 45000, expectedRetail: 13500, category: 'high_mileage', notes: '45k mi' },
  // Mini Hatch 2019, 60k mi
  { make: 'Mini', model: 'Hatch', year: 2019, fuel: 'Petrol', mileage: 60000, expectedRetail: 11500, category: 'high_mileage', notes: '60k mi' },
  // Land Rover Discovery Sport 2020, 70k mi (diesel, expected ~50k)
  { make: 'Land Rover', model: 'Discovery Sport', year: 2020, fuel: 'Diesel', mileage: 70000, expectedRetail: 18000, category: 'high_mileage', notes: '70k mi diesel' },
  // Ford Fiesta 2016, 90k mi (very high for age)
  { make: 'Ford', model: 'Fiesta', year: 2016, fuel: 'Petrol', mileage: 90000, expectedRetail: 4500, category: 'high_mileage', notes: '90k mi, very high' },
  // VW Polo 2019, 70k mi
  { make: 'Volkswagen', model: 'Polo', year: 2019, fuel: 'Petrol', mileage: 70000, expectedRetail: 8500, category: 'high_mileage', notes: '70k mi' },
  // BMW X1 2020, 65k mi
  { make: 'BMW', model: 'X1', year: 2020, fuel: 'Petrol', mileage: 65000, expectedRetail: 16500, category: 'high_mileage', notes: '65k mi' },
  // Toyota Corolla 2020 Hybrid, 55k mi
  { make: 'Toyota', model: 'Corolla', year: 2020, fuel: 'Hybrid', mileage: 55000, expectedRetail: 14500, category: 'high_mileage', notes: '55k mi hybrid' },
  // Fiat 500 2018, 50k mi
  { make: 'Fiat', model: '500', year: 2018, fuel: 'Petrol', mileage: 50000, expectedRetail: 6000, category: 'high_mileage', notes: '50k mi' },
]

// ═════════════════════════════════════════════════════════════════════════════
// C. LOW MILEAGE — well below average, testing premium adjustment
// ═════════════════════════════════════════════════════════════════════════════

const LOW_MILEAGE_VEHICLES: TestVehicle[] = [
  // Ford Fiesta 2019 with only 12k mi — nearly new condition
  { make: 'Ford', model: 'Fiesta', year: 2019, fuel: 'Petrol', mileage: 12000, expectedRetail: 12500, category: 'low_mileage', notes: '12k mi, very low' },
  // VW Golf 2020, 10k mi
  { make: 'Volkswagen', model: 'Golf', year: 2020, fuel: 'Petrol', mileage: 10000, expectedRetail: 18000, category: 'low_mileage', notes: '10k mi' },
  // BMW 1 Series 2019, 15k mi
  { make: 'BMW', model: '1 Series', year: 2019, fuel: 'Petrol', mileage: 15000, expectedRetail: 18000, category: 'low_mileage', notes: '15k mi' },
  // Toyota C-HR 2019 Hybrid, 10k mi
  { make: 'Toyota', model: 'C-HR', year: 2019, fuel: 'Hybrid', mileage: 10000, expectedRetail: 19500, category: 'low_mileage', notes: '10k mi hybrid' },
  // Vauxhall Corsa 2021, 5k mi
  { make: 'Vauxhall', model: 'Corsa', year: 2021, fuel: 'Petrol', mileage: 5000, expectedRetail: 13500, category: 'low_mileage', notes: '5k mi, nearly new' },
  // Mercedes A-Class 2019, 10k mi
  { make: 'Mercedes-Benz', model: 'A-Class', year: 2019, fuel: 'Petrol', mileage: 10000, expectedRetail: 19500, category: 'low_mileage', notes: '10k mi' },
  // Hyundai i10 2019, 8k mi
  { make: 'Hyundai', model: 'i10', year: 2019, fuel: 'Petrol', mileage: 8000, expectedRetail: 8500, category: 'low_mileage', notes: '8k mi' },
  // Audi Q3 2020, 10k mi
  { make: 'Audi', model: 'Q3', year: 2020, fuel: 'Petrol', mileage: 10000, expectedRetail: 25000, category: 'low_mileage', notes: '10k mi' },
  // Nissan Juke 2020, 8k mi
  { make: 'Nissan', model: 'Juke', year: 2020, fuel: 'Petrol', mileage: 8000, expectedRetail: 15500, category: 'low_mileage', notes: '8k mi' },
  // Mazda MX-5 2019, 8k mi
  { make: 'Mazda', model: 'MX-5', year: 2019, fuel: 'Petrol', mileage: 8000, expectedRetail: 21000, category: 'low_mileage', notes: '8k mi, low-use sports car' },
  // Ford Kuga 2021, 12k mi
  { make: 'Ford', model: 'Kuga', year: 2021, fuel: 'Petrol', mileage: 12000, expectedRetail: 19000, category: 'low_mileage', notes: '12k mi' },
  // Peugeot 3008 2022, 5k mi
  { make: 'Peugeot', model: '3008', year: 2022, fuel: 'Petrol', mileage: 5000, expectedRetail: 21000, category: 'low_mileage', notes: '5k mi' },
  // Kia Ceed 2022, 5k mi
  { make: 'Kia', model: 'Ceed', year: 2022, fuel: 'Petrol', mileage: 5000, expectedRetail: 17500, category: 'low_mileage', notes: '5k mi' },
  // Skoda Octavia 2021, 8k mi
  { make: 'Skoda', model: 'Octavia', year: 2021, fuel: 'Petrol', mileage: 8000, expectedRetail: 20000, category: 'low_mileage', notes: '8k mi' },
  // Suzuki Swift 2019, 10k mi
  { make: 'Suzuki', model: 'Swift', year: 2019, fuel: 'Petrol', mileage: 10000, expectedRetail: 10000, category: 'low_mileage', notes: '10k mi' },
  // Honda Jazz 2020, 5k mi
  { make: 'Honda', model: 'Jazz', year: 2020, fuel: 'Petrol', mileage: 5000, expectedRetail: 14500, category: 'low_mileage', notes: '5k mi' },
  // BMW 3 Series 2020, 10k mi
  { make: 'BMW', model: '3 Series', year: 2020, fuel: 'Petrol', mileage: 10000, expectedRetail: 24000, category: 'low_mileage', notes: '10k mi' },
  // VW Tiguan 2022 Diesel, 8k mi
  { make: 'Volkswagen', model: 'Tiguan', year: 2022, fuel: 'Diesel', mileage: 8000, expectedRetail: 27000, category: 'low_mileage', notes: '8k mi diesel' },
  // Dacia Duster 2020, 10k mi
  { make: 'Dacia', model: 'Duster', year: 2020, fuel: 'Petrol', mileage: 10000, expectedRetail: 11500, category: 'low_mileage', notes: '10k mi' },
  // Citroen C3 2019, 8k mi
  { make: 'Citroen', model: 'C3', year: 2019, fuel: 'Petrol', mileage: 8000, expectedRetail: 8500, category: 'low_mileage', notes: '8k mi' },
]

// ═════════════════════════════════════════════════════════════════════════════
// D. UNIVERSAL MODEL — vehicles NOT in MARKET_DATA table
//    Tests the segment-based fallback. Tolerance widened to ±25%
// ═════════════════════════════════════════════════════════════════════════════

const UNIVERSAL_VEHICLES: TestVehicle[] = [
  // Ford B-Max (discontinued supermini MPV, not in MARKET_DATA)
  { make: 'Ford', model: 'B-Max', year: 2017, fuel: 'Petrol', mileage: 40000, expectedRetail: 5500, category: 'universal', notes: 'Discontinued, not in table' },
  // Vauxhall Adam (discontinued city car)
  { make: 'Vauxhall', model: 'Adam', year: 2018, fuel: 'Petrol', mileage: 30000, expectedRetail: 6000, category: 'universal', notes: 'Discontinued city car' },
  // Volkswagen Up (city car, may not be in main table)
  { make: 'Volkswagen', model: 'Up', year: 2018, fuel: 'Petrol', mileage: 25000, expectedRetail: 6500, category: 'universal', notes: 'City car segment' },
  // BMW X2 (small SUV/coupe)
  { make: 'BMW', model: 'X2', year: 2020, fuel: 'Petrol', mileage: 25000, expectedRetail: 22000, category: 'universal', notes: 'Not in MARKET_DATA' },
  // Mercedes GLA (small SUV)
  { make: 'Mercedes-Benz', model: 'GLA', year: 2021, fuel: 'Petrol', mileage: 20000, expectedRetail: 26000, category: 'universal', notes: 'May not be in table for 2021' },
  // Tesla Model 3 2021
  { make: 'Tesla', model: 'Model 3', year: 2021, fuel: 'Electric', mileage: 25000, expectedRetail: 24000, category: 'universal', notes: 'EV, not in MARKET_DATA' },
  // MG ZS 2021 (budget EV SUV)
  { make: 'MG', model: 'ZS', year: 2021, fuel: 'Petrol', mileage: 20000, expectedRetail: 11000, category: 'universal', notes: 'Budget brand' },
  // Lexus NX 2019
  { make: 'Lexus', model: 'NX', year: 2019, fuel: 'Hybrid', mileage: 30000, expectedRetail: 25000, category: 'universal', notes: 'Premium hybrid SUV' },
  // Subaru XV 2019
  { make: 'Subaru', model: 'XV', year: 2019, fuel: 'Petrol', mileage: 30000, expectedRetail: 16000, category: 'universal', notes: 'Niche brand' },
  // Jeep Renegade 2019
  { make: 'Jeep', model: 'Renegade', year: 2019, fuel: 'Petrol', mileage: 30000, expectedRetail: 13000, category: 'universal', notes: 'Not in main table' },
  // Genesis GV70 2022 (rare in UK)
  { make: 'Genesis', model: 'GV70', year: 2022, fuel: 'Petrol', mileage: 15000, expectedRetail: 35000, category: 'universal', notes: 'Rare luxury brand' },
  // Cupra Formentor 2021
  { make: 'Cupra', model: 'Formentor', year: 2021, fuel: 'Petrol', mileage: 20000, expectedRetail: 22000, category: 'universal', notes: 'Performance SUV' },
  // Polestar 2 2022
  { make: 'Polestar', model: '2', year: 2022, fuel: 'Electric', mileage: 15000, expectedRetail: 28000, category: 'universal', notes: 'EV, niche brand' },
  // Isuzu D-Max 2020
  { make: 'Isuzu', model: 'D-Max', year: 2020, fuel: 'Diesel', mileage: 35000, expectedRetail: 22000, category: 'universal', notes: 'Pickup, holds value' },
  // Mitsubishi Outlander 2019 PHEV
  { make: 'Mitsubishi', model: 'Outlander', year: 2019, fuel: 'Hybrid', mileage: 35000, expectedRetail: 18000, category: 'universal', notes: 'PHEV large SUV' },
  // Smart ForTwo 2018
  { make: 'Smart', model: 'ForTwo', year: 2018, fuel: 'Petrol', mileage: 15000, expectedRetail: 5500, category: 'universal', notes: 'Ultra-compact city car' },
  // Alfa Romeo Stelvio 2019
  { make: 'Alfa Romeo', model: 'Stelvio', year: 2019, fuel: 'Petrol', mileage: 30000, expectedRetail: 20000, category: 'universal', notes: 'Italian premium SUV' },
  // DS 3 Crossback 2020
  { make: 'DS', model: '3 Crossback', year: 2020, fuel: 'Petrol', mileage: 20000, expectedRetail: 14000, category: 'universal', notes: 'Premium French' },
  // Toyota Hilux 2019 (pickup)
  { make: 'Toyota', model: 'Hilux', year: 2019, fuel: 'Diesel', mileage: 40000, expectedRetail: 24000, category: 'universal', notes: 'Pickup, strong retention' },
  // BYD Dolphin 2023 (new entrant)
  { make: 'BYD', model: 'Dolphin', year: 2023, fuel: 'Electric', mileage: 5000, expectedRetail: 22000, category: 'universal', notes: 'Chinese EV, very new' },
]

// ═════════════════════════════════════════════════════════════════════════════
// Test runner
// ═════════════════════════════════════════════════════════════════════════════

const ALL_VEHICLES = [
  ...REGRESSION_VEHICLES,
  ...HIGH_MILEAGE_VEHICLES,
  ...LOW_MILEAGE_VEHICLES,
  ...UNIVERSAL_VEHICLES,
]

const TOLERANCE: Record<string, number> = {
  regression: 0.15,
  high_mileage: 0.20,
  low_mileage: 0.20,
  universal: 0.25,
}

interface Result {
  vehicle: string
  category: string
  expected: number
  predictedV2: number | null   // raw getMarketValue
  predictedV4: number | null   // enhanced getEnhancedMarketValue
  deviationV2: number | null
  deviationV4: number | null
  passV2: boolean
  passV4: boolean
  methodology: string
  mileage: number | undefined
  tolerance: number
}

function run() {
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('  ACCURACY TEST V3 — ENHANCED VALUATION ENGINE')
  console.log('  %d vehicles across 4 categories', ALL_VEHICLES.length)
  console.log('═══════════════════════════════════════════════════════════════\n')

  const results: Result[] = []

  for (const v of ALL_VEHICLES) {
    const label = `${v.make} ${v.model} ${v.year} ${v.fuel}${v.mileage ? ' @' + Math.round(v.mileage / 1000) + 'k' : ''}`
    const tol = TOLERANCE[v.category]

    // V2 baseline: raw getMarketValue (no mileage)
    const v2Result = getMarketValue(v.make, v.model, v.year, v.fuel)
    const predictedV2 = v2Result?.avgRetail ?? null
    const deviationV2 = predictedV2 !== null ? (predictedV2 - v.expectedRetail) / v.expectedRetail : null
    const passV2 = deviationV2 !== null ? Math.abs(deviationV2) <= tol : false

    // V4 enhanced: with mileage + engine size
    const v4Result = getEnhancedMarketValue(v.make, v.model, v.year, v.fuel, {
      mileage: v.mileage,
      engineCC: v.engineCC,
    })
    const predictedV4 = v4Result?.retailValue ?? null
    const deviationV4 = predictedV4 !== null ? (predictedV4 - v.expectedRetail) / v.expectedRetail : null
    const passV4 = deviationV4 !== null ? Math.abs(deviationV4) <= tol : false

    results.push({
      vehicle: label,
      category: v.category,
      expected: v.expectedRetail,
      predictedV2,
      predictedV4,
      deviationV2,
      deviationV4,
      passV2,
      passV4,
      methodology: v4Result?.methodology ?? 'none',
      mileage: v.mileage,
      tolerance: tol,
    })
  }

  // ── Print by category ─────────────────────────────────────────────────────

  const categories = ['regression', 'high_mileage', 'low_mileage', 'universal'] as const

  for (const cat of categories) {
    const catResults = results.filter(r => r.category === cat)
    const catLabel = cat.toUpperCase().replace('_', ' ')
    const catTol = TOLERANCE[cat]

    console.log('\n══════════════════════════════════════════════════════════════')
    console.log('  %s (%d vehicles) — Tolerance: ±%d%%', catLabel, catResults.length, catTol * 100)
    console.log('══════════════════════════════════════════════════════════════\n')

    // Print fails first
    const fails = catResults.filter(r => !r.passV4)
    if (fails.length > 0) {
      console.log('  ── FAILS (%d) ──', fails.length)
      for (const r of fails.sort((a, b) => Math.abs(b.deviationV4 ?? 999) - Math.abs(a.deviationV4 ?? 999))) {
        if (r.predictedV4 === null) {
          console.log('    ✗ %-50s expected: £%-7s  V4: NO MATCH  [%s]',
            r.vehicle, r.expected.toLocaleString(), r.methodology)
        } else {
          const devPct = ((r.deviationV4 ?? 0) * 100).toFixed(1)
          const dir = (r.deviationV4 ?? 0) > 0 ? '+' : ''
          console.log('    ✗ %-50s expected: £%-7s  V4: £%-7s  dev: %s%s%%  [%s]',
            r.vehicle, r.expected.toLocaleString(), r.predictedV4.toLocaleString(), dir, devPct, r.methodology)
        }
      }
      console.log()
    }

    // Print passes
    const passes = catResults.filter(r => r.passV4)
    console.log('  ── PASSES (%d/%d) ──', passes.length, catResults.length)
    for (const r of passes) {
      const devV4 = ((r.deviationV4 ?? 0) * 100).toFixed(1)
      const dirV4 = (r.deviationV4 ?? 0) > 0 ? '+' : ''
      const devV2 = r.deviationV2 !== null ? ((r.deviationV2 * 100).toFixed(1)) : 'N/A'
      const dirV2 = (r.deviationV2 ?? 0) > 0 ? '+' : ''
      console.log('    ✓ %-50s £%-7s → V2: %s%s%%  V4: %s%s%%  [%s]',
        r.vehicle, r.expected.toLocaleString(),
        dirV2, devV2, dirV4, devV4, r.methodology)
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // COMPARISON TABLE: V2 (raw) vs V4 (enhanced)
  // ══════════════════════════════════════════════════════════════════════════

  console.log('\n\n═══════════════════════════════════════════════════════════════')
  console.log('  COMPARISON TABLE — V2 (raw) vs V4 (enhanced)')
  console.log('═══════════════════════════════════════════════════════════════\n')

  for (const cat of categories) {
    const catResults = results.filter(r => r.category === cat)
    const catLabel = cat.toUpperCase().replace('_', ' ')
    const tol = TOLERANCE[cat]

    const v2matched = catResults.filter(r => r.predictedV2 !== null)
    const v4matched = catResults.filter(r => r.predictedV4 !== null)
    const v2passes = catResults.filter(r => r.passV2)
    const v4passes = catResults.filter(r => r.passV4)

    const v2absDevs = v2matched.map(r => Math.abs(r.deviationV2!))
    const v4absDevs = v4matched.map(r => Math.abs(r.deviationV4!))
    const v2devs = v2matched.map(r => r.deviationV2!)
    const v4devs = v4matched.map(r => r.deviationV4!)

    const v2meanAbs = v2absDevs.length > 0 ? v2absDevs.reduce((a, b) => a + b, 0) / v2absDevs.length : 0
    const v4meanAbs = v4absDevs.length > 0 ? v4absDevs.reduce((a, b) => a + b, 0) / v4absDevs.length : 0
    const v2meanDev = v2devs.length > 0 ? v2devs.reduce((a, b) => a + b, 0) / v2devs.length : 0
    const v4meanDev = v4devs.length > 0 ? v4devs.reduce((a, b) => a + b, 0) / v4devs.length : 0
    const v2maxAbs = v2absDevs.length > 0 ? Math.max(...v2absDevs) : 0
    const v4maxAbs = v4absDevs.length > 0 ? Math.max(...v4absDevs) : 0

    console.log('  ┌───────────────────────────────────────────────────┐')
    console.log('  │ %s (±%d%% tolerance)', catLabel.padEnd(38), tol * 100)
    console.log('  ├───────────────────┬──────────────┬────────────────┤')
    console.log('  │ Metric            │ V2 (raw)     │ V4 (enhanced)  │')
    console.log('  ├───────────────────┼──────────────┼────────────────┤')
    console.log('  │ Matched           │ %s │ %s │',
      `${v2matched.length}/${catResults.length}`.padEnd(12),
      `${v4matched.length}/${catResults.length}`.padEnd(14))
    console.log('  │ Pass rate         │ %s │ %s │',
      `${v2passes.length}/${catResults.length} (${((v2passes.length / catResults.length) * 100).toFixed(0)}%)`.padEnd(12),
      `${v4passes.length}/${catResults.length} (${((v4passes.length / catResults.length) * 100).toFixed(0)}%)`.padEnd(14))
    console.log('  │ Mean |deviation|  │ %s │ %s │',
      `${(v2meanAbs * 100).toFixed(1)}%`.padEnd(12),
      `${(v4meanAbs * 100).toFixed(1)}%`.padEnd(14))
    console.log('  │ Mean deviation    │ %s │ %s │',
      `${v2meanDev > 0 ? '+' : ''}${(v2meanDev * 100).toFixed(1)}%`.padEnd(12),
      `${v4meanDev > 0 ? '+' : ''}${(v4meanDev * 100).toFixed(1)}%`.padEnd(14))
    console.log('  │ Max |deviation|   │ %s │ %s │',
      `${(v2maxAbs * 100).toFixed(1)}%`.padEnd(12),
      `${(v4maxAbs * 100).toFixed(1)}%`.padEnd(14))
    console.log('  └───────────────────┴──────────────┴────────────────┘')
    console.log()
  }

  // ── Overall summary ───────────────────────────────────────────────────────

  const allV2matched = results.filter(r => r.predictedV2 !== null)
  const allV4matched = results.filter(r => r.predictedV4 !== null)
  const allV2passes = results.filter(r => r.passV2)
  const allV4passes = results.filter(r => r.passV4)
  const allV2absDevs = allV2matched.map(r => Math.abs(r.deviationV2!))
  const allV4absDevs = allV4matched.map(r => Math.abs(r.deviationV4!))
  const allV2devs = allV2matched.map(r => r.deviationV2!)
  const allV4devs = allV4matched.map(r => r.deviationV4!)

  console.log('  ┌───────────────────────────────────────────────────┐')
  console.log('  │ OVERALL (%d vehicles)                             │', results.length)
  console.log('  ├───────────────────┬──────────────┬────────────────┤')
  console.log('  │ Metric            │ V2 (raw)     │ V4 (enhanced)  │')
  console.log('  ├───────────────────┼──────────────┼────────────────┤')
  console.log('  │ Coverage          │ %s │ %s │',
    `${allV2matched.length}/${results.length}`.padEnd(12),
    `${allV4matched.length}/${results.length}`.padEnd(14))
  console.log('  │ Overall pass      │ %s │ %s │',
    `${allV2passes.length}/${results.length} (${((allV2passes.length / results.length) * 100).toFixed(0)}%)`.padEnd(12),
    `${allV4passes.length}/${results.length} (${((allV4passes.length / results.length) * 100).toFixed(0)}%)`.padEnd(14))
  console.log('  │ Mean |deviation|  │ %s │ %s │',
    allV2absDevs.length > 0 ? `${(allV2absDevs.reduce((a, b) => a + b, 0) / allV2absDevs.length * 100).toFixed(1)}%`.padEnd(12) : 'N/A'.padEnd(12),
    allV4absDevs.length > 0 ? `${(allV4absDevs.reduce((a, b) => a + b, 0) / allV4absDevs.length * 100).toFixed(1)}%`.padEnd(14) : 'N/A'.padEnd(14))
  console.log('  │ Mean deviation    │ %s │ %s │',
    allV2devs.length > 0 ? `${allV2devs.reduce((a, b) => a + b, 0) / allV2devs.length > 0 ? '+' : ''}${(allV2devs.reduce((a, b) => a + b, 0) / allV2devs.length * 100).toFixed(1)}%`.padEnd(12) : 'N/A'.padEnd(12),
    allV4devs.length > 0 ? `${allV4devs.reduce((a, b) => a + b, 0) / allV4devs.length > 0 ? '+' : ''}${(allV4devs.reduce((a, b) => a + b, 0) / allV4devs.length * 100).toFixed(1)}%`.padEnd(12) : 'N/A'.padEnd(14))
  console.log('  │ Methodology split │              │ MD:%d  MF:%d  UM:%d │',
    allV4matched.filter(r => r.methodology === 'market_data').length,
    allV4matched.filter(r => r.methodology === 'market_data_fuzzy').length,
    allV4matched.filter(r => r.methodology === 'universal_model').length)
  console.log('  └───────────────────┴──────────────┴────────────────┘')

  // ── Feature impact summary ─────────────────────────────────────────────────

  console.log('\n──── FEATURE IMPACT ANALYSIS ────────────────────────────────────')
  console.log()

  // How many vehicles V4 can value but V2 cannot
  const v4only = results.filter(r => r.predictedV2 === null && r.predictedV4 !== null)
  console.log('  New coverage (V4 values, V2 null): %d vehicles', v4only.length)
  for (const r of v4only) {
    const devPct = r.deviationV4 !== null ? `${(r.deviationV4 * 100).toFixed(1)}%` : 'N/A'
    console.log('    + %-50s → £%s (dev: %s) [%s]',
      r.vehicle, r.predictedV4?.toLocaleString(), devPct, r.methodology)
  }

  // Mileage impact: compare V2 vs V4 for high/low mileage categories
  console.log()
  const mileageResults = results.filter(r => r.category === 'high_mileage' || r.category === 'low_mileage')
  const mileageV2passes = mileageResults.filter(r => r.passV2)
  const mileageV4passes = mileageResults.filter(r => r.passV4)
  console.log('  Mileage adjustment impact (%d vehicles):', mileageResults.length)
  console.log('    V2 pass rate: %d/%d (%s%%)',
    mileageV2passes.length, mileageResults.length,
    ((mileageV2passes.length / mileageResults.length) * 100).toFixed(0))
  console.log('    V4 pass rate: %d/%d (%s%%)',
    mileageV4passes.length, mileageResults.length,
    ((mileageV4passes.length / mileageResults.length) * 100).toFixed(0))

  console.log('\n═══════════════════════════════════════════════════════════════')
  console.log('  TEST COMPLETE')
  console.log('═══════════════════════════════════════════════════════════════')
}

run()
