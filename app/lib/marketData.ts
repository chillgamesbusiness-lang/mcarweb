/**
 * UK vehicle market value lookup table v3.
 *
 * 500+ entries with volatility indicators.
 * Curated average retail prices for the top UK makes/models.
 * Includes stable/moderate/volatile classification per spec.
 * Cross-referenced against DfT VEH0120 registration data (Q4 2024)
 * and public asking-price aggregators (March 2026 snapshot).
 *
 * When no match → quoteMode = 'manual_review'.
 * Prestige marques deliberately excluded (Porsche, Bentley, Rolls-Royce,
 * Ferrari, Lamborghini, Maserati, Aston Martin, McLaren, Lotus).
 *
 * Spec reference: valuationeng.md Part 2
 */

import type { MarketEntry, Volatility, FuelType, MarketMatchQuality } from '@/lib/types'

// ── Market Data (579 entries, 44 makes) ────────────────────────────────────────

const MARKET_DATA: MarketEntry[] = [
  // === FORD ===
  { make: 'FORD', model: 'FIESTA', yearRange: [2021, 2023], fuel: 'PETROL', avgRetail: 14200, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'FORD', model: 'FIESTA', yearRange: [2019, 2020], fuel: 'PETROL', avgRetail: 11000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'FORD', model: 'FIESTA', yearRange: [2015, 2018], fuel: 'PETROL', avgRetail: 6500, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'FORD', model: 'FIESTA', yearRange: [2011, 2014], fuel: 'PETROL', avgRetail: 4200, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'FORD', model: 'FIESTA', yearRange: [2015, 2018], fuel: 'DIESEL', avgRetail: 7200, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'FORD', model: 'FOCUS', yearRange: [2022, 2024], fuel: 'PETROL', avgRetail: 17000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'FORD', model: 'FOCUS', yearRange: [2019, 2021], fuel: 'PETROL', avgRetail: 12500, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'FORD', model: 'FOCUS', yearRange: [2015, 2018], fuel: 'PETROL', avgRetail: 9200, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'FORD', model: 'FOCUS', yearRange: [2015, 2018], fuel: 'DIESEL', avgRetail: 8500, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'FORD', model: 'FOCUS', yearRange: [2011, 2014], fuel: 'PETROL', avgRetail: 5500, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'FORD', model: 'FOCUS', yearRange: [2011, 2014], fuel: 'DIESEL', avgRetail: 4800, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'FORD', model: 'PUMA', yearRange: [2020, 2024], fuel: 'PETROL', avgRetail: 18000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'FORD', model: 'PUMA', yearRange: [2020, 2024], fuel: 'HYBRID', avgRetail: 19500, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'FORD', model: 'KUGA', yearRange: [2020, 2024], fuel: 'PETROL', avgRetail: 20000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'FORD', model: 'KUGA', yearRange: [2020, 2024], fuel: 'HYBRID', avgRetail: 22000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'FORD', model: 'KUGA', yearRange: [2015, 2019], fuel: 'DIESEL', avgRetail: 11500, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'FORD', model: 'ECOSPORT', yearRange: [2018, 2024], fuel: 'PETROL', avgRetail: 12000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'FORD', model: 'MUSTANG MACH-E', yearRange: [2021, 2024], fuel: 'ELECTRIC', avgRetail: 32000, volatility: 'volatile', lastUpdated: '2026-02' },
  { make: 'FORD', model: 'TOURNEO CONNECT', yearRange: [2018, 2024], fuel: 'DIESEL', avgRetail: 16000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'FORD', model: 'GALAXY', yearRange: [2015, 2024], fuel: 'DIESEL', avgRetail: 15000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'FORD', model: 'S-MAX', yearRange: [2015, 2024], fuel: 'DIESEL', avgRetail: 14000, volatility: 'moderate', lastUpdated: '2026-02' },

  // === VAUXHALL ===
  { make: 'VAUXHALL', model: 'CORSA', yearRange: [2020, 2024], fuel: 'PETROL', avgRetail: 13000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'VAUXHALL', model: 'CORSA', yearRange: [2020, 2024], fuel: 'ELECTRIC', avgRetail: 18000, volatility: 'volatile', lastUpdated: '2026-02' },
  { make: 'VAUXHALL', model: 'CORSA', yearRange: [2015, 2019], fuel: 'PETROL', avgRetail: 6500, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'VAUXHALL', model: 'CORSA', yearRange: [2011, 2014], fuel: 'PETROL', avgRetail: 3800, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'VAUXHALL', model: 'ASTRA', yearRange: [2022, 2024], fuel: 'PETROL', avgRetail: 19000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'VAUXHALL', model: 'ASTRA', yearRange: [2019, 2021], fuel: 'PETROL', avgRetail: 11500, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'VAUXHALL', model: 'ASTRA', yearRange: [2015, 2018], fuel: 'PETROL', avgRetail: 8500, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'VAUXHALL', model: 'ASTRA', yearRange: [2015, 2018], fuel: 'DIESEL', avgRetail: 7800, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'VAUXHALL', model: 'MOKKA', yearRange: [2021, 2024], fuel: 'PETROL', avgRetail: 19000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'VAUXHALL', model: 'MOKKA', yearRange: [2021, 2024], fuel: 'ELECTRIC', avgRetail: 22000, volatility: 'volatile', lastUpdated: '2026-02' },
  { make: 'VAUXHALL', model: 'CROSSLAND', yearRange: [2017, 2024], fuel: 'PETROL', avgRetail: 13500, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'VAUXHALL', model: 'GRANDLAND', yearRange: [2018, 2024], fuel: 'PETROL', avgRetail: 17000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'VAUXHALL', model: 'GRANDLAND', yearRange: [2018, 2024], fuel: 'HYBRID', avgRetail: 21000, volatility: 'moderate', lastUpdated: '2026-02' },

  // === VOLKSWAGEN ===
  { make: 'VOLKSWAGEN', model: 'GOLF', yearRange: [2022, 2024], fuel: 'PETROL', avgRetail: 22000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'VOLKSWAGEN', model: 'GOLF', yearRange: [2020, 2021], fuel: 'PETROL', avgRetail: 15000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'VOLKSWAGEN', model: 'GOLF', yearRange: [2022, 2024], fuel: 'DIESEL', avgRetail: 21000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'VOLKSWAGEN', model: 'GOLF', yearRange: [2020, 2021], fuel: 'DIESEL', avgRetail: 14500, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'VOLKSWAGEN', model: 'GOLF', yearRange: [2015, 2019], fuel: 'PETROL', avgRetail: 12500, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'VOLKSWAGEN', model: 'GOLF', yearRange: [2015, 2019], fuel: 'DIESEL', avgRetail: 11500, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'VOLKSWAGEN', model: 'GOLF', yearRange: [2011, 2014], fuel: 'PETROL', avgRetail: 7000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'VOLKSWAGEN', model: 'POLO', yearRange: [2021, 2024], fuel: 'PETROL', avgRetail: 15500, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'VOLKSWAGEN', model: 'POLO', yearRange: [2018, 2020], fuel: 'PETROL', avgRetail: 11000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'VOLKSWAGEN', model: 'POLO', yearRange: [2014, 2017], fuel: 'PETROL', avgRetail: 7500, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'VOLKSWAGEN', model: 'TIGUAN', yearRange: [2020, 2024], fuel: 'PETROL', avgRetail: 25000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'VOLKSWAGEN', model: 'TIGUAN', yearRange: [2020, 2024], fuel: 'DIESEL', avgRetail: 24000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'VOLKSWAGEN', model: 'TIGUAN', yearRange: [2016, 2019], fuel: 'DIESEL', avgRetail: 15000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'VOLKSWAGEN', model: 'T-ROC', yearRange: [2021, 2024], fuel: 'PETROL', avgRetail: 21500, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'VOLKSWAGEN', model: 'T-ROC', yearRange: [2018, 2020], fuel: 'PETROL', avgRetail: 16000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'VOLKSWAGEN', model: 'T-ROC', yearRange: [2021, 2024], fuel: 'DIESEL', avgRetail: 20500, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'VOLKSWAGEN', model: 'T-ROC', yearRange: [2018, 2020], fuel: 'DIESEL', avgRetail: 15000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'VOLKSWAGEN', model: 'T-CROSS', yearRange: [2022, 2024], fuel: 'PETROL', avgRetail: 18500, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'VOLKSWAGEN', model: 'T-CROSS', yearRange: [2019, 2021], fuel: 'PETROL', avgRetail: 14500, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'VOLKSWAGEN', model: 'ID.3', yearRange: [2020, 2024], fuel: 'ELECTRIC', avgRetail: 22000, volatility: 'volatile', lastUpdated: '2026-02' },
  { make: 'VOLKSWAGEN', model: 'ID.4', yearRange: [2021, 2024], fuel: 'ELECTRIC', avgRetail: 28000, volatility: 'volatile', lastUpdated: '2026-02' },
  { make: 'VOLKSWAGEN', model: 'UP', yearRange: [2012, 2024], fuel: 'PETROL', avgRetail: 6500, volatility: 'stable', lastUpdated: '2026-02' },

  // === BMW ===
  { make: 'BMW', model: '1 SERIES', yearRange: [2022, 2024], fuel: 'PETROL', avgRetail: 24000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'BMW', model: '1 SERIES', yearRange: [2019, 2021], fuel: 'PETROL', avgRetail: 16500, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'BMW', model: '1 SERIES', yearRange: [2022, 2024], fuel: 'DIESEL', avgRetail: 22000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'BMW', model: '1 SERIES', yearRange: [2019, 2021], fuel: 'DIESEL', avgRetail: 15000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'BMW', model: '1 SERIES', yearRange: [2015, 2018], fuel: 'PETROL', avgRetail: 12000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'BMW', model: '1 SERIES', yearRange: [2015, 2018], fuel: 'DIESEL', avgRetail: 10500, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'BMW', model: '1 SERIES', yearRange: [2011, 2014], fuel: 'DIESEL', avgRetail: 7000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'BMW', model: '2 SERIES', yearRange: [2022, 2024], fuel: 'PETROL', avgRetail: 27000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'BMW', model: '2 SERIES', yearRange: [2019, 2021], fuel: 'PETROL', avgRetail: 19000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'BMW', model: '3 SERIES', yearRange: [2022, 2024], fuel: 'PETROL', avgRetail: 30000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'BMW', model: '3 SERIES', yearRange: [2019, 2021], fuel: 'PETROL', avgRetail: 20000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'BMW', model: '3 SERIES', yearRange: [2022, 2024], fuel: 'DIESEL', avgRetail: 28000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'BMW', model: '3 SERIES', yearRange: [2019, 2021], fuel: 'DIESEL', avgRetail: 19000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'BMW', model: '3 SERIES', yearRange: [2015, 2018], fuel: 'DIESEL', avgRetail: 15000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'BMW', model: '3 SERIES', yearRange: [2015, 2018], fuel: 'PETROL', avgRetail: 16000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'BMW', model: '3 SERIES', yearRange: [2012, 2014], fuel: 'DIESEL', avgRetail: 9500, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'BMW', model: 'X1', yearRange: [2022, 2024], fuel: 'PETROL', avgRetail: 28000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'BMW', model: 'X1', yearRange: [2019, 2021], fuel: 'PETROL', avgRetail: 20000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'BMW', model: 'X1', yearRange: [2022, 2024], fuel: 'DIESEL', avgRetail: 26000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'BMW', model: 'X1', yearRange: [2019, 2021], fuel: 'DIESEL', avgRetail: 18500, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'BMW', model: 'X1', yearRange: [2015, 2018], fuel: 'DIESEL', avgRetail: 14000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'BMW', model: 'X3', yearRange: [2021, 2024], fuel: 'DIESEL', avgRetail: 30000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'BMW', model: 'X3', yearRange: [2018, 2020], fuel: 'DIESEL', avgRetail: 22000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'BMW', model: 'X3', yearRange: [2021, 2024], fuel: 'PETROL', avgRetail: 31000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'BMW', model: 'X3', yearRange: [2018, 2020], fuel: 'PETROL', avgRetail: 23000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'BMW', model: 'X5', yearRange: [2019, 2024], fuel: 'DIESEL', avgRetail: 38000, volatility: 'volatile', lastUpdated: '2026-02' },
  { make: 'BMW', model: 'I3', yearRange: [2017, 2022], fuel: 'ELECTRIC', avgRetail: 14000, volatility: 'volatile', lastUpdated: '2026-02' },
  { make: 'BMW', model: 'IX3', yearRange: [2021, 2024], fuel: 'ELECTRIC', avgRetail: 32000, volatility: 'volatile', lastUpdated: '2026-02' },

  // === MERCEDES-BENZ ===
  { make: 'MERCEDES-BENZ', model: 'A-CLASS', yearRange: [2021, 2024], fuel: 'PETROL', avgRetail: 24000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'MERCEDES-BENZ', model: 'A-CLASS', yearRange: [2018, 2020], fuel: 'PETROL', avgRetail: 17000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'MERCEDES-BENZ', model: 'A-CLASS', yearRange: [2021, 2024], fuel: 'DIESEL', avgRetail: 22000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'MERCEDES-BENZ', model: 'A-CLASS', yearRange: [2018, 2020], fuel: 'DIESEL', avgRetail: 15500, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'MERCEDES-BENZ', model: 'A-CLASS', yearRange: [2013, 2017], fuel: 'PETROL', avgRetail: 11000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'MERCEDES-BENZ', model: 'A-CLASS', yearRange: [2013, 2017], fuel: 'DIESEL', avgRetail: 9500, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'MERCEDES-BENZ', model: 'B-CLASS', yearRange: [2018, 2024], fuel: 'PETROL', avgRetail: 19000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'MERCEDES-BENZ', model: 'C-CLASS', yearRange: [2022, 2024], fuel: 'PETROL', avgRetail: 32000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'MERCEDES-BENZ', model: 'C-CLASS', yearRange: [2019, 2021], fuel: 'PETROL', avgRetail: 24000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'MERCEDES-BENZ', model: 'C-CLASS', yearRange: [2022, 2024], fuel: 'DIESEL', avgRetail: 30000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'MERCEDES-BENZ', model: 'C-CLASS', yearRange: [2019, 2021], fuel: 'DIESEL', avgRetail: 22000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'MERCEDES-BENZ', model: 'C-CLASS', yearRange: [2014, 2018], fuel: 'DIESEL', avgRetail: 15500, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'MERCEDES-BENZ', model: 'C-CLASS', yearRange: [2014, 2018], fuel: 'PETROL', avgRetail: 16500, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'MERCEDES-BENZ', model: 'E-CLASS', yearRange: [2017, 2024], fuel: 'DIESEL', avgRetail: 24000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'MERCEDES-BENZ', model: 'GLA', yearRange: [2020, 2024], fuel: 'PETROL', avgRetail: 28000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'MERCEDES-BENZ', model: 'GLA', yearRange: [2020, 2024], fuel: 'DIESEL', avgRetail: 26000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'MERCEDES-BENZ', model: 'GLC', yearRange: [2019, 2024], fuel: 'DIESEL', avgRetail: 32000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'MERCEDES-BENZ', model: 'EQA', yearRange: [2021, 2024], fuel: 'ELECTRIC', avgRetail: 30000, volatility: 'volatile', lastUpdated: '2026-02' },

  // === AUDI ===
  { make: 'AUDI', model: 'A1', yearRange: [2021, 2024], fuel: 'PETROL', avgRetail: 19500, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'AUDI', model: 'A1', yearRange: [2018, 2020], fuel: 'PETROL', avgRetail: 14500, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'AUDI', model: 'A1', yearRange: [2014, 2017], fuel: 'PETROL', avgRetail: 10000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'AUDI', model: 'A3', yearRange: [2020, 2024], fuel: 'PETROL', avgRetail: 23000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'AUDI', model: 'A3', yearRange: [2020, 2024], fuel: 'DIESEL', avgRetail: 21000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'AUDI', model: 'A3', yearRange: [2016, 2019], fuel: 'PETROL', avgRetail: 14000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'AUDI', model: 'A3', yearRange: [2016, 2019], fuel: 'DIESEL', avgRetail: 12500, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'AUDI', model: 'A3', yearRange: [2013, 2015], fuel: 'DIESEL', avgRetail: 8500, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'AUDI', model: 'A4', yearRange: [2019, 2024], fuel: 'DIESEL', avgRetail: 25000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'AUDI', model: 'A4', yearRange: [2019, 2024], fuel: 'PETROL', avgRetail: 26000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'AUDI', model: 'A4', yearRange: [2015, 2018], fuel: 'DIESEL', avgRetail: 14000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'AUDI', model: 'A5', yearRange: [2017, 2024], fuel: 'PETROL', avgRetail: 24000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'AUDI', model: 'A5', yearRange: [2017, 2024], fuel: 'DIESEL', avgRetail: 22000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'AUDI', model: 'A5', yearRange: [2012, 2016], fuel: 'DIESEL', avgRetail: 10000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'AUDI', model: 'Q2', yearRange: [2017, 2024], fuel: 'PETROL', avgRetail: 20000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'AUDI', model: 'Q3', yearRange: [2019, 2024], fuel: 'PETROL', avgRetail: 27000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'AUDI', model: 'Q3', yearRange: [2019, 2024], fuel: 'DIESEL', avgRetail: 25500, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'AUDI', model: 'Q5', yearRange: [2018, 2024], fuel: 'DIESEL', avgRetail: 30000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'AUDI', model: 'Q7', yearRange: [2020, 2024], fuel: 'DIESEL', avgRetail: 40000, volatility: 'volatile', lastUpdated: '2026-02' },
  { make: 'AUDI', model: 'E-TRON', yearRange: [2019, 2024], fuel: 'ELECTRIC', avgRetail: 32000, volatility: 'volatile', lastUpdated: '2026-02' },

  // === TOYOTA ===
  { make: 'TOYOTA', model: 'YARIS', yearRange: [2020, 2024], fuel: 'HYBRID', avgRetail: 17000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'TOYOTA', model: 'YARIS', yearRange: [2020, 2024], fuel: 'PETROL', avgRetail: 14000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'TOYOTA', model: 'YARIS', yearRange: [2014, 2019], fuel: 'PETROL', avgRetail: 7500, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'TOYOTA', model: 'YARIS', yearRange: [2014, 2019], fuel: 'HYBRID', avgRetail: 9000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'TOYOTA', model: 'YARIS CROSS', yearRange: [2021, 2024], fuel: 'HYBRID', avgRetail: 22000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'TOYOTA', model: 'COROLLA', yearRange: [2019, 2024], fuel: 'HYBRID', avgRetail: 21000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'TOYOTA', model: 'COROLLA', yearRange: [2019, 2024], fuel: 'PETROL', avgRetail: 18000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'TOYOTA', model: 'RAV4', yearRange: [2019, 2024], fuel: 'HYBRID', avgRetail: 30000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'TOYOTA', model: 'RAV4', yearRange: [2015, 2018], fuel: 'DIESEL', avgRetail: 16000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'TOYOTA', model: 'C-HR', yearRange: [2017, 2024], fuel: 'HYBRID', avgRetail: 19000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'TOYOTA', model: 'C-HR', yearRange: [2017, 2024], fuel: 'PETROL', avgRetail: 16000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'TOYOTA', model: 'AYGO', yearRange: [2014, 2022], fuel: 'PETROL', avgRetail: 7000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'TOYOTA', model: 'AYGO X', yearRange: [2022, 2024], fuel: 'PETROL', avgRetail: 14000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'TOYOTA', model: 'HILUX', yearRange: [2016, 2024], fuel: 'DIESEL', avgRetail: 24000, volatility: 'moderate', lastUpdated: '2026-02' },

  // === NISSAN ===
  { make: 'NISSAN', model: 'QASHQAI', yearRange: [2021, 2024], fuel: 'PETROL', avgRetail: 22000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'NISSAN', model: 'QASHQAI', yearRange: [2021, 2024], fuel: 'HYBRID', avgRetail: 24000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'NISSAN', model: 'QASHQAI', yearRange: [2017, 2020], fuel: 'PETROL', avgRetail: 13000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'NISSAN', model: 'QASHQAI', yearRange: [2017, 2020], fuel: 'DIESEL', avgRetail: 12000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'NISSAN', model: 'QASHQAI', yearRange: [2014, 2016], fuel: 'DIESEL', avgRetail: 8500, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'NISSAN', model: 'JUKE', yearRange: [2022, 2024], fuel: 'PETROL', avgRetail: 18000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'NISSAN', model: 'JUKE', yearRange: [2019, 2021], fuel: 'PETROL', avgRetail: 13500, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'NISSAN', model: 'JUKE', yearRange: [2022, 2024], fuel: 'HYBRID', avgRetail: 20000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'NISSAN', model: 'JUKE', yearRange: [2019, 2021], fuel: 'HYBRID', avgRetail: 15500, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'NISSAN', model: 'JUKE', yearRange: [2014, 2018], fuel: 'PETROL', avgRetail: 7500, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'NISSAN', model: 'LEAF', yearRange: [2018, 2024], fuel: 'ELECTRIC', avgRetail: 16000, volatility: 'volatile', lastUpdated: '2026-02' },
  { make: 'NISSAN', model: 'LEAF', yearRange: [2013, 2017], fuel: 'ELECTRIC', avgRetail: 7000, volatility: 'volatile', lastUpdated: '2026-02' },
  { make: 'NISSAN', model: 'MICRA', yearRange: [2017, 2024], fuel: 'PETROL', avgRetail: 10000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'NISSAN', model: 'X-TRAIL', yearRange: [2017, 2024], fuel: 'PETROL', avgRetail: 18000, volatility: 'moderate', lastUpdated: '2026-02' },

  // === HYUNDAI ===
  { make: 'HYUNDAI', model: 'TUCSON', yearRange: [2021, 2024], fuel: 'HYBRID', avgRetail: 26000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'HYUNDAI', model: 'TUCSON', yearRange: [2021, 2024], fuel: 'PETROL', avgRetail: 23000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'HYUNDAI', model: 'TUCSON', yearRange: [2015, 2020], fuel: 'PETROL', avgRetail: 12000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'HYUNDAI', model: 'TUCSON', yearRange: [2015, 2020], fuel: 'DIESEL', avgRetail: 11000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'HYUNDAI', model: 'I10', yearRange: [2020, 2024], fuel: 'PETROL', avgRetail: 11000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'HYUNDAI', model: 'I10', yearRange: [2014, 2019], fuel: 'PETROL', avgRetail: 5500, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'HYUNDAI', model: 'I20', yearRange: [2020, 2022], fuel: 'PETROL', avgRetail: 10500, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'HYUNDAI', model: 'I20', yearRange: [2023, 2024], fuel: 'PETROL', avgRetail: 16000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'HYUNDAI', model: 'I20', yearRange: [2015, 2019], fuel: 'PETROL', avgRetail: 7000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'HYUNDAI', model: 'I30', yearRange: [2017, 2020], fuel: 'PETROL', avgRetail: 11500, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'HYUNDAI', model: 'I30', yearRange: [2021, 2024], fuel: 'PETROL', avgRetail: 17500, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'HYUNDAI', model: 'KONA', yearRange: [2018, 2024], fuel: 'ELECTRIC', avgRetail: 22000, volatility: 'volatile', lastUpdated: '2026-02' },
  { make: 'HYUNDAI', model: 'KONA', yearRange: [2018, 2024], fuel: 'PETROL', avgRetail: 15000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'HYUNDAI', model: 'KONA', yearRange: [2018, 2024], fuel: 'HYBRID', avgRetail: 19000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'HYUNDAI', model: 'IONIQ 5', yearRange: [2021, 2024], fuel: 'ELECTRIC', avgRetail: 30000, volatility: 'volatile', lastUpdated: '2026-02' },
  { make: 'HYUNDAI', model: 'IONIQ', yearRange: [2017, 2022], fuel: 'HYBRID', avgRetail: 14000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'HYUNDAI', model: 'SANTA FE', yearRange: [2019, 2024], fuel: 'DIESEL', avgRetail: 25000, volatility: 'moderate', lastUpdated: '2026-02' },

  // === KIA ===
  { make: 'KIA', model: 'SPORTAGE', yearRange: [2022, 2024], fuel: 'HYBRID', avgRetail: 28000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'KIA', model: 'SPORTAGE', yearRange: [2022, 2024], fuel: 'PETROL', avgRetail: 25000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'KIA', model: 'SPORTAGE', yearRange: [2016, 2021], fuel: 'DIESEL', avgRetail: 13000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'KIA', model: 'SPORTAGE', yearRange: [2019, 2021], fuel: 'PETROL', avgRetail: 17000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'KIA', model: 'SPORTAGE', yearRange: [2016, 2018], fuel: 'PETROL', avgRetail: 10000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'KIA', model: 'CEED', yearRange: [2021, 2024], fuel: 'PETROL', avgRetail: 16500, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'KIA', model: 'CEED', yearRange: [2018, 2020], fuel: 'PETROL', avgRetail: 12000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'KIA', model: 'CEED', yearRange: [2021, 2024], fuel: 'DIESEL', avgRetail: 15000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'KIA', model: 'CEED', yearRange: [2018, 2020], fuel: 'DIESEL', avgRetail: 11000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'KIA', model: 'NIRO', yearRange: [2019, 2024], fuel: 'HYBRID', avgRetail: 20000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'KIA', model: 'NIRO', yearRange: [2019, 2024], fuel: 'ELECTRIC', avgRetail: 24000, volatility: 'volatile', lastUpdated: '2026-02' },
  { make: 'KIA', model: 'PICANTO', yearRange: [2021, 2024], fuel: 'PETROL', avgRetail: 11000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'KIA', model: 'PICANTO', yearRange: [2017, 2020], fuel: 'PETROL', avgRetail: 7500, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'KIA', model: 'PICANTO', yearRange: [2011, 2016], fuel: 'PETROL', avgRetail: 4500, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'KIA', model: 'STONIC', yearRange: [2021, 2024], fuel: 'PETROL', avgRetail: 15500, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'KIA', model: 'STONIC', yearRange: [2017, 2020], fuel: 'PETROL', avgRetail: 11000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'KIA', model: 'EV6', yearRange: [2022, 2024], fuel: 'ELECTRIC', avgRetail: 33000, volatility: 'volatile', lastUpdated: '2026-02' },
  { make: 'KIA', model: 'XCEED', yearRange: [2019, 2024], fuel: 'PETROL', avgRetail: 17000, volatility: 'stable', lastUpdated: '2026-02' },

  // === MINI ===
  { make: 'MINI', model: 'HATCH', yearRange: [2018, 2024], fuel: 'PETROL', avgRetail: 16500, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'MINI', model: 'HATCH', yearRange: [2014, 2017], fuel: 'PETROL', avgRetail: 9500, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'MINI', model: 'HATCH', yearRange: [2014, 2017], fuel: 'DIESEL', avgRetail: 8000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'MINI', model: 'COUNTRYMAN', yearRange: [2017, 2024], fuel: 'PETROL', avgRetail: 19000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'MINI', model: 'COUNTRYMAN', yearRange: [2017, 2024], fuel: 'HYBRID', avgRetail: 21000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'MINI', model: 'COUNTRYMAN', yearRange: [2017, 2024], fuel: 'DIESEL', avgRetail: 16500, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'MINI', model: 'CLUBMAN', yearRange: [2016, 2024], fuel: 'PETROL', avgRetail: 17000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'MINI', model: 'ELECTRIC', yearRange: [2020, 2024], fuel: 'ELECTRIC', avgRetail: 18000, volatility: 'volatile', lastUpdated: '2026-02' },

  // === PEUGEOT ===
  { make: 'PEUGEOT', model: '208', yearRange: [2022, 2024], fuel: 'PETROL', avgRetail: 16000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'PEUGEOT', model: '208', yearRange: [2020, 2021], fuel: 'PETROL', avgRetail: 12000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'PEUGEOT', model: '208', yearRange: [2020, 2024], fuel: 'ELECTRIC', avgRetail: 19000, volatility: 'volatile', lastUpdated: '2026-02' },
  { make: 'PEUGEOT', model: '208', yearRange: [2015, 2019], fuel: 'PETROL', avgRetail: 6500, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'PEUGEOT', model: '2008', yearRange: [2022, 2024], fuel: 'PETROL', avgRetail: 20000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'PEUGEOT', model: '2008', yearRange: [2020, 2021], fuel: 'PETROL', avgRetail: 15000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'PEUGEOT', model: '2008', yearRange: [2020, 2024], fuel: 'ELECTRIC', avgRetail: 22000, volatility: 'volatile', lastUpdated: '2026-02' },
  { make: 'PEUGEOT', model: '2008', yearRange: [2013, 2019], fuel: 'PETROL', avgRetail: 7500, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'PEUGEOT', model: '3008', yearRange: [2017, 2024], fuel: 'DIESEL', avgRetail: 17000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'PEUGEOT', model: '3008', yearRange: [2017, 2024], fuel: 'PETROL', avgRetail: 16000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'PEUGEOT', model: '3008', yearRange: [2017, 2024], fuel: 'HYBRID', avgRetail: 22000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'PEUGEOT', model: '308', yearRange: [2021, 2024], fuel: 'PETROL', avgRetail: 19000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'PEUGEOT', model: '308', yearRange: [2014, 2020], fuel: 'PETROL', avgRetail: 8000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'PEUGEOT', model: '5008', yearRange: [2017, 2024], fuel: 'DIESEL', avgRetail: 18000, volatility: 'moderate', lastUpdated: '2026-02' },

  // === RENAULT ===
  { make: 'RENAULT', model: 'CLIO', yearRange: [2022, 2024], fuel: 'PETROL', avgRetail: 14500, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'RENAULT', model: 'CLIO', yearRange: [2019, 2021], fuel: 'PETROL', avgRetail: 10500, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'RENAULT', model: 'CLIO', yearRange: [2013, 2018], fuel: 'PETROL', avgRetail: 5500, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'RENAULT', model: 'CAPTUR', yearRange: [2022, 2024], fuel: 'PETROL', avgRetail: 18000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'RENAULT', model: 'CAPTUR', yearRange: [2020, 2021], fuel: 'PETROL', avgRetail: 13000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'RENAULT', model: 'CAPTUR', yearRange: [2013, 2019], fuel: 'PETROL', avgRetail: 8000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'RENAULT', model: 'KADJAR', yearRange: [2015, 2022], fuel: 'PETROL', avgRetail: 12000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'RENAULT', model: 'KADJAR', yearRange: [2015, 2022], fuel: 'DIESEL', avgRetail: 11000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'RENAULT', model: 'ZOE', yearRange: [2019, 2024], fuel: 'ELECTRIC', avgRetail: 14000, volatility: 'volatile', lastUpdated: '2026-02' },
  { make: 'RENAULT', model: 'MEGANE E-TECH', yearRange: [2022, 2024], fuel: 'ELECTRIC', avgRetail: 25000, volatility: 'volatile', lastUpdated: '2026-02' },
  { make: 'RENAULT', model: 'ARKANA', yearRange: [2022, 2024], fuel: 'HYBRID', avgRetail: 22000, volatility: 'moderate', lastUpdated: '2026-02' },

  // === SKODA ===
  { make: 'SKODA', model: 'OCTAVIA', yearRange: [2020, 2024], fuel: 'PETROL', avgRetail: 20000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'SKODA', model: 'OCTAVIA', yearRange: [2020, 2024], fuel: 'DIESEL', avgRetail: 19000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'SKODA', model: 'OCTAVIA', yearRange: [2015, 2019], fuel: 'DIESEL', avgRetail: 11000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'SKODA', model: 'OCTAVIA', yearRange: [2015, 2019], fuel: 'PETROL', avgRetail: 10000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'SKODA', model: 'FABIA', yearRange: [2021, 2024], fuel: 'PETROL', avgRetail: 15000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'SKODA', model: 'FABIA', yearRange: [2015, 2020], fuel: 'PETROL', avgRetail: 7500, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'SKODA', model: 'KAROQ', yearRange: [2021, 2024], fuel: 'PETROL', avgRetail: 21500, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'SKODA', model: 'KAROQ', yearRange: [2018, 2020], fuel: 'PETROL', avgRetail: 16500, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'SKODA', model: 'KAROQ', yearRange: [2021, 2024], fuel: 'DIESEL', avgRetail: 20500, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'SKODA', model: 'KAROQ', yearRange: [2018, 2020], fuel: 'DIESEL', avgRetail: 15500, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'SKODA', model: 'KODIAQ', yearRange: [2017, 2024], fuel: 'DIESEL', avgRetail: 22000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'SKODA', model: 'KAMIQ', yearRange: [2019, 2024], fuel: 'PETROL', avgRetail: 17000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'SKODA', model: 'SCALA', yearRange: [2019, 2024], fuel: 'PETROL', avgRetail: 15000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'SKODA', model: 'ENYAQ', yearRange: [2021, 2024], fuel: 'ELECTRIC', avgRetail: 28000, volatility: 'volatile', lastUpdated: '2026-02' },

  // === SEAT / CUPRA ===
  { make: 'SEAT', model: 'LEON', yearRange: [2020, 2024], fuel: 'PETROL', avgRetail: 18000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'SEAT', model: 'LEON', yearRange: [2013, 2019], fuel: 'PETROL', avgRetail: 9000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'SEAT', model: 'IBIZA', yearRange: [2021, 2024], fuel: 'PETROL', avgRetail: 14000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'SEAT', model: 'IBIZA', yearRange: [2017, 2020], fuel: 'PETROL', avgRetail: 9500, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'SEAT', model: 'IBIZA', yearRange: [2012, 2016], fuel: 'PETROL', avgRetail: 5000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'SEAT', model: 'ARONA', yearRange: [2021, 2024], fuel: 'PETROL', avgRetail: 17500, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'SEAT', model: 'ARONA', yearRange: [2018, 2020], fuel: 'PETROL', avgRetail: 13000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'SEAT', model: 'ATECA', yearRange: [2020, 2024], fuel: 'PETROL', avgRetail: 18500, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'SEAT', model: 'ATECA', yearRange: [2016, 2019], fuel: 'PETROL', avgRetail: 13000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'SEAT', model: 'ATECA', yearRange: [2020, 2024], fuel: 'DIESEL', avgRetail: 17500, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'SEAT', model: 'ATECA', yearRange: [2016, 2019], fuel: 'DIESEL', avgRetail: 12000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'CUPRA', model: 'FORMENTOR', yearRange: [2021, 2024], fuel: 'PETROL', avgRetail: 25000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'CUPRA', model: 'BORN', yearRange: [2022, 2024], fuel: 'ELECTRIC', avgRetail: 24000, volatility: 'volatile', lastUpdated: '2026-02' },
  { make: 'CUPRA', model: 'LEON', yearRange: [2021, 2024], fuel: 'PETROL', avgRetail: 24000, volatility: 'moderate', lastUpdated: '2026-02' },

  // === HONDA ===
  { make: 'HONDA', model: 'CIVIC', yearRange: [2022, 2024], fuel: 'HYBRID', avgRetail: 25000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'HONDA', model: 'CIVIC', yearRange: [2017, 2021], fuel: 'PETROL', avgRetail: 16000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'HONDA', model: 'CIVIC', yearRange: [2017, 2021], fuel: 'DIESEL', avgRetail: 14000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'HONDA', model: 'JAZZ', yearRange: [2020, 2024], fuel: 'HYBRID', avgRetail: 17000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'HONDA', model: 'JAZZ', yearRange: [2014, 2019], fuel: 'PETROL', avgRetail: 9000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'HONDA', model: 'HR-V', yearRange: [2021, 2024], fuel: 'HYBRID', avgRetail: 23000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'HONDA', model: 'HR-V', yearRange: [2015, 2020], fuel: 'PETROL', avgRetail: 13000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'HONDA', model: 'CR-V', yearRange: [2018, 2024], fuel: 'HYBRID', avgRetail: 27000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'HONDA', model: 'CR-V', yearRange: [2012, 2017], fuel: 'DIESEL', avgRetail: 11000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'HONDA', model: 'E', yearRange: [2020, 2024], fuel: 'ELECTRIC', avgRetail: 20000, volatility: 'volatile', lastUpdated: '2026-02' },

  // === MAZDA ===
  { make: 'MAZDA', model: 'CX-5', yearRange: [2017, 2024], fuel: 'PETROL', avgRetail: 21000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'MAZDA', model: 'CX-5', yearRange: [2017, 2024], fuel: 'DIESEL', avgRetail: 20000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'MAZDA', model: 'CX-30', yearRange: [2020, 2024], fuel: 'PETROL', avgRetail: 20000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'MAZDA', model: '3', yearRange: [2019, 2024], fuel: 'PETROL', avgRetail: 19000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'MAZDA', model: '2', yearRange: [2015, 2024], fuel: 'PETROL', avgRetail: 10000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'MAZDA', model: 'MX-5', yearRange: [2016, 2024], fuel: 'PETROL', avgRetail: 21000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'MAZDA', model: 'CX-3', yearRange: [2015, 2024], fuel: 'PETROL', avgRetail: 14000, volatility: 'stable', lastUpdated: '2026-02' },

  // === LAND ROVER ===
  { make: 'LAND ROVER', model: 'RANGE ROVER EVOQUE', yearRange: [2019, 2024], fuel: 'DIESEL', avgRetail: 32000, volatility: 'volatile', lastUpdated: '2026-02' },
  { make: 'LAND ROVER', model: 'RANGE ROVER EVOQUE', yearRange: [2019, 2024], fuel: 'PETROL', avgRetail: 33000, volatility: 'volatile', lastUpdated: '2026-02' },
  { make: 'LAND ROVER', model: 'RANGE ROVER EVOQUE', yearRange: [2015, 2018], fuel: 'DIESEL', avgRetail: 18000, volatility: 'volatile', lastUpdated: '2026-02' },
  { make: 'LAND ROVER', model: 'DISCOVERY SPORT', yearRange: [2019, 2024], fuel: 'DIESEL', avgRetail: 28000, volatility: 'volatile', lastUpdated: '2026-02' },
  { make: 'LAND ROVER', model: 'DISCOVERY SPORT', yearRange: [2015, 2018], fuel: 'DIESEL', avgRetail: 17000, volatility: 'volatile', lastUpdated: '2026-02' },
  { make: 'LAND ROVER', model: 'RANGE ROVER SPORT', yearRange: [2018, 2024], fuel: 'DIESEL', avgRetail: 45000, volatility: 'volatile', lastUpdated: '2026-02' },
  { make: 'LAND ROVER', model: 'DEFENDER', yearRange: [2020, 2024], fuel: 'DIESEL', avgRetail: 48000, volatility: 'volatile', lastUpdated: '2026-02' },

  // === VOLVO ===
  { make: 'VOLVO', model: 'XC40', yearRange: [2018, 2024], fuel: 'PETROL', avgRetail: 26000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'VOLVO', model: 'XC40', yearRange: [2018, 2024], fuel: 'HYBRID', avgRetail: 28000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'VOLVO', model: 'XC40', yearRange: [2018, 2024], fuel: 'ELECTRIC', avgRetail: 27000, volatility: 'volatile', lastUpdated: '2026-02' },
  { make: 'VOLVO', model: 'XC60', yearRange: [2018, 2020], fuel: 'DIESEL', avgRetail: 23000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'VOLVO', model: 'XC60', yearRange: [2021, 2024], fuel: 'DIESEL', avgRetail: 35000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'VOLVO', model: 'XC60', yearRange: [2018, 2020], fuel: 'HYBRID', avgRetail: 27000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'VOLVO', model: 'XC60', yearRange: [2021, 2024], fuel: 'HYBRID', avgRetail: 37000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'VOLVO', model: 'XC90', yearRange: [2016, 2024], fuel: 'DIESEL', avgRetail: 30000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'VOLVO', model: 'XC90', yearRange: [2016, 2024], fuel: 'HYBRID', avgRetail: 35000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'VOLVO', model: 'V40', yearRange: [2013, 2019], fuel: 'PETROL', avgRetail: 10000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'VOLVO', model: 'V40', yearRange: [2013, 2019], fuel: 'DIESEL', avgRetail: 9000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'VOLVO', model: 'V60', yearRange: [2019, 2024], fuel: 'DIESEL', avgRetail: 25000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'VOLVO', model: 'V60', yearRange: [2019, 2024], fuel: 'HYBRID', avgRetail: 28000, volatility: 'moderate', lastUpdated: '2026-02' },

  // === TESLA ===
  { make: 'TESLA', model: 'MODEL 3', yearRange: [2019, 2024], fuel: 'ELECTRIC', avgRetail: 28000, volatility: 'volatile', lastUpdated: '2026-02' },
  { make: 'TESLA', model: 'MODEL Y', yearRange: [2022, 2024], fuel: 'ELECTRIC', avgRetail: 35000, volatility: 'volatile', lastUpdated: '2026-02' },
  { make: 'TESLA', model: 'MODEL S', yearRange: [2016, 2024], fuel: 'ELECTRIC', avgRetail: 38000, volatility: 'volatile', lastUpdated: '2026-02' },
  { make: 'TESLA', model: 'MODEL X', yearRange: [2016, 2024], fuel: 'ELECTRIC', avgRetail: 42000, volatility: 'volatile', lastUpdated: '2026-02' },

  // === CITROEN ===
  { make: 'CITROEN', model: 'C3', yearRange: [2021, 2024], fuel: 'PETROL', avgRetail: 12500, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'CITROEN', model: 'C3', yearRange: [2017, 2020], fuel: 'PETROL', avgRetail: 7500, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'CITROEN', model: 'C3 AIRCROSS', yearRange: [2021, 2024], fuel: 'PETROL', avgRetail: 14500, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'CITROEN', model: 'C3 AIRCROSS', yearRange: [2017, 2020], fuel: 'PETROL', avgRetail: 10000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'CITROEN', model: 'C3 AIRCROSS', yearRange: [2021, 2024], fuel: 'DIESEL', avgRetail: 13000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'CITROEN', model: 'C3 AIRCROSS', yearRange: [2017, 2020], fuel: 'DIESEL', avgRetail: 9000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'CITROEN', model: 'C4', yearRange: [2021, 2024], fuel: 'PETROL', avgRetail: 17000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'CITROEN', model: 'C4', yearRange: [2021, 2024], fuel: 'ELECTRIC', avgRetail: 19000, volatility: 'volatile', lastUpdated: '2026-02' },
  { make: 'CITROEN', model: 'C5 AIRCROSS', yearRange: [2019, 2024], fuel: 'DIESEL', avgRetail: 16000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'CITROEN', model: 'C5 AIRCROSS', yearRange: [2019, 2024], fuel: 'HYBRID', avgRetail: 20000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'CITROEN', model: 'BERLINGO', yearRange: [2018, 2024], fuel: 'DIESEL', avgRetail: 16000, volatility: 'stable', lastUpdated: '2026-02' },

  // === FIAT ===
  { make: 'FIAT', model: '500', yearRange: [2016, 2019], fuel: 'PETROL', avgRetail: 8000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'FIAT', model: '500', yearRange: [2020, 2024], fuel: 'PETROL', avgRetail: 11500, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'FIAT', model: '500', yearRange: [2010, 2015], fuel: 'PETROL', avgRetail: 5000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'FIAT', model: '500', yearRange: [2021, 2024], fuel: 'ELECTRIC', avgRetail: 18000, volatility: 'volatile', lastUpdated: '2026-02' },
  { make: 'FIAT', model: '500X', yearRange: [2015, 2024], fuel: 'PETROL', avgRetail: 12000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'FIAT', model: 'PANDA', yearRange: [2012, 2024], fuel: 'PETROL', avgRetail: 6500, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'FIAT', model: 'TIPO', yearRange: [2016, 2024], fuel: 'PETROL', avgRetail: 9000, volatility: 'stable', lastUpdated: '2026-02' },

  // === SUZUKI ===
  { make: 'SUZUKI', model: 'SWIFT', yearRange: [2017, 2020], fuel: 'PETROL', avgRetail: 9000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'SUZUKI', model: 'SWIFT', yearRange: [2021, 2024], fuel: 'PETROL', avgRetail: 14000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'SUZUKI', model: 'SWIFT', yearRange: [2020, 2024], fuel: 'HYBRID', avgRetail: 13000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'SUZUKI', model: 'VITARA', yearRange: [2015, 2019], fuel: 'PETROL', avgRetail: 10500, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'SUZUKI', model: 'VITARA', yearRange: [2020, 2024], fuel: 'PETROL', avgRetail: 16500, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'SUZUKI', model: 'VITARA', yearRange: [2015, 2019], fuel: 'HYBRID', avgRetail: 12000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'SUZUKI', model: 'VITARA', yearRange: [2020, 2024], fuel: 'HYBRID', avgRetail: 18000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'SUZUKI', model: 'S-CROSS', yearRange: [2016, 2024], fuel: 'PETROL', avgRetail: 14000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'SUZUKI', model: 'S-CROSS', yearRange: [2016, 2024], fuel: 'HYBRID', avgRetail: 17000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'SUZUKI', model: 'IGNIS', yearRange: [2017, 2024], fuel: 'HYBRID', avgRetail: 11000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'SUZUKI', model: 'JIMNY', yearRange: [2019, 2024], fuel: 'PETROL', avgRetail: 22000, volatility: 'moderate', lastUpdated: '2026-02' },

  // === DACIA ===
  { make: 'DACIA', model: 'SANDERO', yearRange: [2021, 2024], fuel: 'PETROL', avgRetail: 9000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'DACIA', model: 'SANDERO', yearRange: [2013, 2020], fuel: 'PETROL', avgRetail: 5000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'DACIA', model: 'DUSTER', yearRange: [2021, 2024], fuel: 'PETROL', avgRetail: 14500, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'DACIA', model: 'DUSTER', yearRange: [2018, 2020], fuel: 'PETROL', avgRetail: 10000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'DACIA', model: 'DUSTER', yearRange: [2021, 2024], fuel: 'DIESEL', avgRetail: 13500, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'DACIA', model: 'DUSTER', yearRange: [2018, 2020], fuel: 'DIESEL', avgRetail: 9500, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'DACIA', model: 'DUSTER', yearRange: [2013, 2017], fuel: 'DIESEL', avgRetail: 6500, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'DACIA', model: 'JOGGER', yearRange: [2022, 2024], fuel: 'PETROL', avgRetail: 15000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'DACIA', model: 'JOGGER', yearRange: [2022, 2024], fuel: 'HYBRID', avgRetail: 17000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'DACIA', model: 'SPRING', yearRange: [2022, 2024], fuel: 'ELECTRIC', avgRetail: 12000, volatility: 'volatile', lastUpdated: '2026-02' },

  // === MG ===
  { make: 'MG', model: 'ZS', yearRange: [2018, 2024], fuel: 'PETROL', avgRetail: 12000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'MG', model: 'ZS', yearRange: [2020, 2024], fuel: 'ELECTRIC', avgRetail: 17000, volatility: 'volatile', lastUpdated: '2026-02' },
  { make: 'MG', model: 'HS', yearRange: [2019, 2024], fuel: 'PETROL', avgRetail: 15000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'MG', model: 'HS', yearRange: [2019, 2024], fuel: 'HYBRID', avgRetail: 19000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'MG', model: '5', yearRange: [2020, 2024], fuel: 'ELECTRIC', avgRetail: 16000, volatility: 'volatile', lastUpdated: '2026-02' },
  { make: 'MG', model: '4', yearRange: [2023, 2024], fuel: 'ELECTRIC', avgRetail: 22000, volatility: 'volatile', lastUpdated: '2026-02' },

  // === JAGUAR ===
  { make: 'JAGUAR', model: 'E-PACE', yearRange: [2018, 2024], fuel: 'DIESEL', avgRetail: 24000, volatility: 'volatile', lastUpdated: '2026-02' },
  { make: 'JAGUAR', model: 'F-PACE', yearRange: [2016, 2024], fuel: 'DIESEL', avgRetail: 26000, volatility: 'volatile', lastUpdated: '2026-02' },
  { make: 'JAGUAR', model: 'XE', yearRange: [2015, 2024], fuel: 'DIESEL', avgRetail: 18000, volatility: 'volatile', lastUpdated: '2026-02' },
  { make: 'JAGUAR', model: 'XF', yearRange: [2016, 2024], fuel: 'DIESEL', avgRetail: 20000, volatility: 'volatile', lastUpdated: '2026-02' },
  { make: 'JAGUAR', model: 'I-PACE', yearRange: [2018, 2024], fuel: 'ELECTRIC', avgRetail: 30000, volatility: 'volatile', lastUpdated: '2026-02' },
  { make: 'JAGUAR', model: 'XE', yearRange: [2015, 2024], fuel: 'PETROL', avgRetail: 19000, volatility: 'volatile', lastUpdated: '2026-03' },
  { make: 'JAGUAR', model: 'XF', yearRange: [2016, 2024], fuel: 'PETROL', avgRetail: 21000, volatility: 'volatile', lastUpdated: '2026-03' },

  // ═══════════════════════════════════════════════════════════════════════════
  // v3 additions — March 2026 (VEH0120 + public asking-price cross-reference)
  // ═══════════════════════════════════════════════════════════════════════════

  // === FORD (additional models) ===
  { make: 'FORD', model: 'MONDEO', yearRange: [2015, 2022], fuel: 'DIESEL', avgRetail: 11000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'FORD', model: 'MONDEO', yearRange: [2015, 2022], fuel: 'PETROL', avgRetail: 10000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'FORD', model: 'MONDEO', yearRange: [2015, 2022], fuel: 'HYBRID', avgRetail: 12500, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'FORD', model: 'MONDEO', yearRange: [2011, 2014], fuel: 'DIESEL', avgRetail: 5000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'FORD', model: 'KA', yearRange: [2016, 2019], fuel: 'PETROL', avgRetail: 5500, volatility: 'stable', lastUpdated: '2026-03' },
  { make: 'FORD', model: 'KA', yearRange: [2009, 2015], fuel: 'PETROL', avgRetail: 2800, volatility: 'stable', lastUpdated: '2026-03' },
  { make: 'FORD', model: 'KA+', yearRange: [2016, 2021], fuel: 'PETROL', avgRetail: 6500, volatility: 'stable', lastUpdated: '2026-03' },
  { make: 'FORD', model: 'C-MAX', yearRange: [2015, 2019], fuel: 'DIESEL', avgRetail: 7500, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'FORD', model: 'C-MAX', yearRange: [2015, 2019], fuel: 'PETROL', avgRetail: 6500, volatility: 'stable', lastUpdated: '2026-03' },
  { make: 'FORD', model: 'C-MAX', yearRange: [2011, 2014], fuel: 'DIESEL', avgRetail: 4000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'FORD', model: 'B-MAX', yearRange: [2012, 2018], fuel: 'PETROL', avgRetail: 5500, volatility: 'stable', lastUpdated: '2026-03' },
  { make: 'FORD', model: 'GRAND C-MAX', yearRange: [2015, 2019], fuel: 'DIESEL', avgRetail: 8000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'FORD', model: 'EXPLORER', yearRange: [2024, 2026], fuel: 'ELECTRIC', avgRetail: 40000, volatility: 'volatile', lastUpdated: '2026-03' },
  { make: 'FORD', model: 'TOURNEO CUSTOM', yearRange: [2024, 2026], fuel: 'DIESEL', avgRetail: 38000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'FORD', model: 'TRANSIT CUSTOM', yearRange: [2018, 2024], fuel: 'DIESEL', avgRetail: 20000, volatility: 'moderate', lastUpdated: '2026-03' },

  // === VAUXHALL (additional models) ===
  { make: 'VAUXHALL', model: 'INSIGNIA', yearRange: [2017, 2022], fuel: 'DIESEL', avgRetail: 11000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'VAUXHALL', model: 'INSIGNIA', yearRange: [2017, 2022], fuel: 'PETROL', avgRetail: 10000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'VAUXHALL', model: 'INSIGNIA', yearRange: [2013, 2016], fuel: 'DIESEL', avgRetail: 5000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'VAUXHALL', model: 'ZAFIRA', yearRange: [2014, 2019], fuel: 'PETROL', avgRetail: 5500, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'VAUXHALL', model: 'ZAFIRA', yearRange: [2014, 2019], fuel: 'DIESEL', avgRetail: 5000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'VAUXHALL', model: 'ZAFIRA TOURER', yearRange: [2012, 2019], fuel: 'DIESEL', avgRetail: 6000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'VAUXHALL', model: 'MERIVA', yearRange: [2014, 2017], fuel: 'PETROL', avgRetail: 4500, volatility: 'stable', lastUpdated: '2026-03' },
  { make: 'VAUXHALL', model: 'ADAM', yearRange: [2013, 2019], fuel: 'PETROL', avgRetail: 5500, volatility: 'stable', lastUpdated: '2026-03' },
  { make: 'VAUXHALL', model: 'VIVA', yearRange: [2015, 2019], fuel: 'PETROL', avgRetail: 4500, volatility: 'stable', lastUpdated: '2026-03' },
  { make: 'VAUXHALL', model: 'COMBO LIFE', yearRange: [2018, 2024], fuel: 'DIESEL', avgRetail: 14000, volatility: 'stable', lastUpdated: '2026-03' },

  // === VOLKSWAGEN (additional models) ===
  { make: 'VOLKSWAGEN', model: 'PASSAT', yearRange: [2015, 2023], fuel: 'DIESEL', avgRetail: 14000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'VOLKSWAGEN', model: 'PASSAT', yearRange: [2015, 2023], fuel: 'PETROL', avgRetail: 13000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'VOLKSWAGEN', model: 'PASSAT', yearRange: [2011, 2014], fuel: 'DIESEL', avgRetail: 6500, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'VOLKSWAGEN', model: 'TOURAN', yearRange: [2015, 2024], fuel: 'DIESEL', avgRetail: 14000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'VOLKSWAGEN', model: 'TOURAN', yearRange: [2015, 2024], fuel: 'PETROL', avgRetail: 13000, volatility: 'stable', lastUpdated: '2026-03' },
  { make: 'VOLKSWAGEN', model: 'TOURAN', yearRange: [2010, 2014], fuel: 'DIESEL', avgRetail: 5500, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'VOLKSWAGEN', model: 'SHARAN', yearRange: [2015, 2022], fuel: 'DIESEL', avgRetail: 14000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'VOLKSWAGEN', model: 'ARTEON', yearRange: [2017, 2024], fuel: 'PETROL', avgRetail: 22000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'VOLKSWAGEN', model: 'ARTEON', yearRange: [2017, 2024], fuel: 'DIESEL', avgRetail: 21000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'VOLKSWAGEN', model: 'TAIGO', yearRange: [2022, 2024], fuel: 'PETROL', avgRetail: 18000, volatility: 'stable', lastUpdated: '2026-03' },
  { make: 'VOLKSWAGEN', model: 'ID.5', yearRange: [2022, 2024], fuel: 'ELECTRIC', avgRetail: 32000, volatility: 'volatile', lastUpdated: '2026-03' },
  { make: 'VOLKSWAGEN', model: 'ID. BUZZ', yearRange: [2023, 2024], fuel: 'ELECTRIC', avgRetail: 48000, volatility: 'volatile', lastUpdated: '2026-03' },
  { make: 'VOLKSWAGEN', model: 'SCIROCCO', yearRange: [2009, 2017], fuel: 'PETROL', avgRetail: 9000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'VOLKSWAGEN', model: 'SCIROCCO', yearRange: [2009, 2017], fuel: 'DIESEL', avgRetail: 8000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'VOLKSWAGEN', model: 'CADDY', yearRange: [2016, 2024], fuel: 'DIESEL', avgRetail: 15000, volatility: 'stable', lastUpdated: '2026-03' },
  { make: 'VOLKSWAGEN', model: 'CADDY MAXI', yearRange: [2016, 2024], fuel: 'DIESEL', avgRetail: 16000, volatility: 'stable', lastUpdated: '2026-03' },
  { make: 'VOLKSWAGEN', model: 'TRANSPORTER', yearRange: [2016, 2024], fuel: 'DIESEL', avgRetail: 22000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'VOLKSWAGEN', model: 'CARAVELLE', yearRange: [2016, 2024], fuel: 'DIESEL', avgRetail: 28000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'VOLKSWAGEN', model: 'TOUAREG', yearRange: [2018, 2024], fuel: 'DIESEL', avgRetail: 32000, volatility: 'moderate', lastUpdated: '2026-03' },

  // === BMW (additional models) ===
  { make: 'BMW', model: '4 SERIES', yearRange: [2020, 2024], fuel: 'PETROL', avgRetail: 32000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'BMW', model: '4 SERIES', yearRange: [2020, 2024], fuel: 'DIESEL', avgRetail: 29000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'BMW', model: '4 SERIES', yearRange: [2014, 2019], fuel: 'DIESEL', avgRetail: 14000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'BMW', model: '4 SERIES', yearRange: [2014, 2019], fuel: 'PETROL', avgRetail: 16000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'BMW', model: '5 SERIES', yearRange: [2017, 2024], fuel: 'DIESEL', avgRetail: 24000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'BMW', model: '5 SERIES', yearRange: [2017, 2024], fuel: 'PETROL', avgRetail: 26000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'BMW', model: '5 SERIES', yearRange: [2017, 2024], fuel: 'HYBRID', avgRetail: 28000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'BMW', model: '5 SERIES', yearRange: [2013, 2016], fuel: 'DIESEL', avgRetail: 12000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'BMW', model: 'X2', yearRange: [2018, 2024], fuel: 'PETROL', avgRetail: 23000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'BMW', model: 'X2', yearRange: [2018, 2024], fuel: 'DIESEL', avgRetail: 21000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'BMW', model: 'X4', yearRange: [2018, 2024], fuel: 'DIESEL', avgRetail: 30000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'BMW', model: 'X4', yearRange: [2018, 2024], fuel: 'PETROL', avgRetail: 31000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'BMW', model: 'IX', yearRange: [2022, 2024], fuel: 'ELECTRIC', avgRetail: 48000, volatility: 'volatile', lastUpdated: '2026-03' },
  { make: 'BMW', model: 'I4', yearRange: [2022, 2024], fuel: 'ELECTRIC', avgRetail: 36000, volatility: 'volatile', lastUpdated: '2026-03' },
  { make: 'BMW', model: 'I5', yearRange: [2024, 2026], fuel: 'ELECTRIC', avgRetail: 50000, volatility: 'volatile', lastUpdated: '2026-03' },

  // === MERCEDES-BENZ (additional models) ===
  { make: 'MERCEDES-BENZ', model: 'CLA', yearRange: [2019, 2024], fuel: 'PETROL', avgRetail: 25000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'MERCEDES-BENZ', model: 'CLA', yearRange: [2019, 2024], fuel: 'DIESEL', avgRetail: 23000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'MERCEDES-BENZ', model: 'CLA', yearRange: [2013, 2018], fuel: 'PETROL', avgRetail: 12000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'MERCEDES-BENZ', model: 'GLB', yearRange: [2020, 2024], fuel: 'PETROL', avgRetail: 27000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'MERCEDES-BENZ', model: 'GLB', yearRange: [2020, 2024], fuel: 'DIESEL', avgRetail: 26000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'MERCEDES-BENZ', model: 'GLE', yearRange: [2019, 2024], fuel: 'DIESEL', avgRetail: 40000, volatility: 'volatile', lastUpdated: '2026-03' },
  { make: 'MERCEDES-BENZ', model: 'GLE', yearRange: [2019, 2024], fuel: 'HYBRID', avgRetail: 45000, volatility: 'volatile', lastUpdated: '2026-03' },
  { make: 'MERCEDES-BENZ', model: 'EQB', yearRange: [2022, 2024], fuel: 'ELECTRIC', avgRetail: 32000, volatility: 'volatile', lastUpdated: '2026-03' },
  { make: 'MERCEDES-BENZ', model: 'EQC', yearRange: [2019, 2024], fuel: 'ELECTRIC', avgRetail: 28000, volatility: 'volatile', lastUpdated: '2026-03' },
  { make: 'MERCEDES-BENZ', model: 'E-CLASS', yearRange: [2017, 2024], fuel: 'PETROL', avgRetail: 26000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'MERCEDES-BENZ', model: 'E-CLASS', yearRange: [2017, 2024], fuel: 'HYBRID', avgRetail: 30000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'MERCEDES-BENZ', model: 'E-CLASS', yearRange: [2013, 2016], fuel: 'DIESEL', avgRetail: 12000, volatility: 'moderate', lastUpdated: '2026-03' },

  // === AUDI (additional models) ===
  { make: 'AUDI', model: 'A6', yearRange: [2019, 2024], fuel: 'DIESEL', avgRetail: 28000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'AUDI', model: 'A6', yearRange: [2019, 2024], fuel: 'PETROL', avgRetail: 30000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'AUDI', model: 'A6', yearRange: [2015, 2018], fuel: 'DIESEL', avgRetail: 14000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'AUDI', model: 'TT', yearRange: [2015, 2024], fuel: 'PETROL', avgRetail: 22000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'AUDI', model: 'TT', yearRange: [2010, 2014], fuel: 'PETROL', avgRetail: 11000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'AUDI', model: 'Q4 E-TRON', yearRange: [2022, 2024], fuel: 'ELECTRIC', avgRetail: 30000, volatility: 'volatile', lastUpdated: '2026-03' },
  { make: 'AUDI', model: 'Q8', yearRange: [2019, 2024], fuel: 'DIESEL', avgRetail: 45000, volatility: 'volatile', lastUpdated: '2026-03' },
  { make: 'AUDI', model: 'A8', yearRange: [2018, 2024], fuel: 'DIESEL', avgRetail: 35000, volatility: 'volatile', lastUpdated: '2026-03' },

  // === TOYOTA (additional models) ===
  { make: 'TOYOTA', model: 'AURIS', yearRange: [2013, 2019], fuel: 'HYBRID', avgRetail: 10000, volatility: 'stable', lastUpdated: '2026-03' },
  { make: 'TOYOTA', model: 'AURIS', yearRange: [2013, 2019], fuel: 'PETROL', avgRetail: 7500, volatility: 'stable', lastUpdated: '2026-03' },
  { make: 'TOYOTA', model: 'AURIS', yearRange: [2013, 2019], fuel: 'DIESEL', avgRetail: 7000, volatility: 'stable', lastUpdated: '2026-03' },
  { make: 'TOYOTA', model: 'PRIUS', yearRange: [2016, 2024], fuel: 'HYBRID', avgRetail: 16000, volatility: 'stable', lastUpdated: '2026-03' },
  { make: 'TOYOTA', model: 'PRIUS', yearRange: [2012, 2015], fuel: 'HYBRID', avgRetail: 8000, volatility: 'stable', lastUpdated: '2026-03' },
  { make: 'TOYOTA', model: 'VERSO', yearRange: [2013, 2018], fuel: 'DIESEL', avgRetail: 7000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'TOYOTA', model: 'VERSO', yearRange: [2013, 2018], fuel: 'PETROL', avgRetail: 6500, volatility: 'stable', lastUpdated: '2026-03' },
  { make: 'TOYOTA', model: 'BZ4X', yearRange: [2023, 2024], fuel: 'ELECTRIC', avgRetail: 30000, volatility: 'volatile', lastUpdated: '2026-03' },
  { make: 'TOYOTA', model: 'LAND CRUISER', yearRange: [2010, 2024], fuel: 'DIESEL', avgRetail: 28000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'TOYOTA', model: 'GR86', yearRange: [2022, 2024], fuel: 'PETROL', avgRetail: 26000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'TOYOTA', model: 'AVENSIS', yearRange: [2012, 2018], fuel: 'DIESEL', avgRetail: 7000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'TOYOTA', model: 'AVENSIS', yearRange: [2012, 2018], fuel: 'PETROL', avgRetail: 6000, volatility: 'moderate', lastUpdated: '2026-03' },

  // === NISSAN (additional models) ===
  { make: 'NISSAN', model: 'NOTE', yearRange: [2013, 2017], fuel: 'PETROL', avgRetail: 5500, volatility: 'stable', lastUpdated: '2026-03' },
  { make: 'NISSAN', model: 'NOTE', yearRange: [2013, 2017], fuel: 'DIESEL', avgRetail: 5000, volatility: 'stable', lastUpdated: '2026-03' },
  { make: 'NISSAN', model: 'ARIYA', yearRange: [2022, 2024], fuel: 'ELECTRIC', avgRetail: 30000, volatility: 'volatile', lastUpdated: '2026-03' },
  { make: 'NISSAN', model: 'MICRA', yearRange: [2011, 2016], fuel: 'PETROL', avgRetail: 4500, volatility: 'stable', lastUpdated: '2026-03' },
  { make: 'NISSAN', model: 'PULSAR', yearRange: [2014, 2019], fuel: 'PETROL', avgRetail: 7000, volatility: 'stable', lastUpdated: '2026-03' },
  { make: 'NISSAN', model: 'PULSAR', yearRange: [2014, 2019], fuel: 'DIESEL', avgRetail: 6500, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'NISSAN', model: 'X-TRAIL', yearRange: [2017, 2024], fuel: 'DIESEL', avgRetail: 16000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'NISSAN', model: 'X-TRAIL', yearRange: [2014, 2016], fuel: 'DIESEL', avgRetail: 9000, volatility: 'moderate', lastUpdated: '2026-03' },

  // === HYUNDAI (additional models) ===
  { make: 'HYUNDAI', model: 'IX35', yearRange: [2010, 2015], fuel: 'DIESEL', avgRetail: 6000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'HYUNDAI', model: 'IX35', yearRange: [2010, 2015], fuel: 'PETROL', avgRetail: 5500, volatility: 'stable', lastUpdated: '2026-03' },
  { make: 'HYUNDAI', model: 'I30', yearRange: [2017, 2024], fuel: 'DIESEL', avgRetail: 13000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'HYUNDAI', model: 'I30', yearRange: [2012, 2016], fuel: 'PETROL', avgRetail: 6000, volatility: 'stable', lastUpdated: '2026-03' },
  { make: 'HYUNDAI', model: 'BAYON', yearRange: [2021, 2024], fuel: 'HYBRID', avgRetail: 15000, volatility: 'stable', lastUpdated: '2026-03' },
  { make: 'HYUNDAI', model: 'BAYON', yearRange: [2021, 2024], fuel: 'PETROL', avgRetail: 14000, volatility: 'stable', lastUpdated: '2026-03' },
  { make: 'HYUNDAI', model: 'SANTA FE', yearRange: [2019, 2024], fuel: 'HYBRID', avgRetail: 28000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'HYUNDAI', model: 'SANTA FE', yearRange: [2013, 2018], fuel: 'DIESEL', avgRetail: 11000, volatility: 'moderate', lastUpdated: '2026-03' },

  // === KIA (additional models) ===
  { make: 'KIA', model: 'RIO', yearRange: [2017, 2024], fuel: 'PETROL', avgRetail: 10000, volatility: 'stable', lastUpdated: '2026-03' },
  { make: 'KIA', model: 'RIO', yearRange: [2011, 2016], fuel: 'PETROL', avgRetail: 4500, volatility: 'stable', lastUpdated: '2026-03' },
  { make: 'KIA', model: 'SORENTO', yearRange: [2015, 2024], fuel: 'DIESEL', avgRetail: 18000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'KIA', model: 'SORENTO', yearRange: [2015, 2024], fuel: 'HYBRID', avgRetail: 28000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'KIA', model: 'PRO CEED', yearRange: [2019, 2024], fuel: 'PETROL', avgRetail: 17000, volatility: 'stable', lastUpdated: '2026-03' },
  { make: 'KIA', model: 'PRO CEED', yearRange: [2019, 2024], fuel: 'DIESEL', avgRetail: 15500, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'KIA', model: 'EV9', yearRange: [2024, 2026], fuel: 'ELECTRIC', avgRetail: 55000, volatility: 'volatile', lastUpdated: '2026-03' },
  { make: 'KIA', model: 'VENGA', yearRange: [2010, 2019], fuel: 'PETROL', avgRetail: 5000, volatility: 'stable', lastUpdated: '2026-03' },
  { make: 'KIA', model: 'OPTIMA', yearRange: [2016, 2020], fuel: 'DIESEL', avgRetail: 10000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'KIA', model: 'CARENS', yearRange: [2013, 2019], fuel: 'DIESEL', avgRetail: 7500, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'KIA', model: 'SOUL', yearRange: [2014, 2019], fuel: 'PETROL', avgRetail: 8000, volatility: 'stable', lastUpdated: '2026-03' },

  // === MINI (additional models/variants) ===
  { make: 'MINI', model: 'COOPER', yearRange: [2018, 2024], fuel: 'PETROL', avgRetail: 17000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'MINI', model: 'COOPER', yearRange: [2014, 2017], fuel: 'PETROL', avgRetail: 9500, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'MINI', model: 'COOPER', yearRange: [2014, 2017], fuel: 'DIESEL', avgRetail: 8000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'MINI', model: 'ONE', yearRange: [2018, 2024], fuel: 'PETROL', avgRetail: 14000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'MINI', model: 'ONE', yearRange: [2014, 2017], fuel: 'PETROL', avgRetail: 7500, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'MINI', model: 'COOPER SE', yearRange: [2020, 2024], fuel: 'ELECTRIC', avgRetail: 18000, volatility: 'volatile', lastUpdated: '2026-03' },
  { make: 'MINI', model: 'JOHN COOPER WORKS', yearRange: [2015, 2024], fuel: 'PETROL', avgRetail: 22000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'MINI', model: 'PACEMAN', yearRange: [2013, 2016], fuel: 'PETROL', avgRetail: 8000, volatility: 'moderate', lastUpdated: '2026-03' },

  // === PEUGEOT (additional models) ===
  { make: 'PEUGEOT', model: '108', yearRange: [2014, 2021], fuel: 'PETROL', avgRetail: 6000, volatility: 'stable', lastUpdated: '2026-03' },
  { make: 'PEUGEOT', model: '508', yearRange: [2019, 2024], fuel: 'DIESEL', avgRetail: 18000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'PEUGEOT', model: '508', yearRange: [2019, 2024], fuel: 'HYBRID', avgRetail: 22000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'PEUGEOT', model: '508', yearRange: [2011, 2018], fuel: 'DIESEL', avgRetail: 7000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'PEUGEOT', model: '408', yearRange: [2023, 2024], fuel: 'PETROL', avgRetail: 28000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'PEUGEOT', model: '408', yearRange: [2023, 2024], fuel: 'HYBRID', avgRetail: 32000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'PEUGEOT', model: 'RIFTER', yearRange: [2019, 2024], fuel: 'DIESEL', avgRetail: 15000, volatility: 'stable', lastUpdated: '2026-03' },
  { make: 'PEUGEOT', model: 'PARTNER', yearRange: [2018, 2024], fuel: 'DIESEL', avgRetail: 13000, volatility: 'stable', lastUpdated: '2026-03' },
  { make: 'PEUGEOT', model: '5008', yearRange: [2017, 2024], fuel: 'PETROL', avgRetail: 16000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'PEUGEOT', model: '5008', yearRange: [2017, 2024], fuel: 'HYBRID', avgRetail: 24000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'PEUGEOT', model: '3008', yearRange: [2017, 2024], fuel: 'ELECTRIC', avgRetail: 24000, volatility: 'volatile', lastUpdated: '2026-03' },
  { make: 'PEUGEOT', model: '308', yearRange: [2014, 2020], fuel: 'DIESEL', avgRetail: 7500, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'PEUGEOT', model: '308', yearRange: [2021, 2024], fuel: 'DIESEL', avgRetail: 18000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'PEUGEOT', model: '308', yearRange: [2021, 2024], fuel: 'HYBRID', avgRetail: 23000, volatility: 'moderate', lastUpdated: '2026-03' },

  // === RENAULT (additional models) ===
  { make: 'RENAULT', model: 'MEGANE', yearRange: [2016, 2022], fuel: 'PETROL', avgRetail: 9000, volatility: 'stable', lastUpdated: '2026-03' },
  { make: 'RENAULT', model: 'MEGANE', yearRange: [2016, 2022], fuel: 'DIESEL', avgRetail: 8000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'RENAULT', model: 'SCENIC', yearRange: [2016, 2022], fuel: 'DIESEL', avgRetail: 10000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'RENAULT', model: 'SCENIC', yearRange: [2016, 2022], fuel: 'PETROL', avgRetail: 9000, volatility: 'stable', lastUpdated: '2026-03' },
  { make: 'RENAULT', model: 'TWINGO', yearRange: [2014, 2019], fuel: 'PETROL', avgRetail: 5000, volatility: 'stable', lastUpdated: '2026-03' },
  { make: 'RENAULT', model: 'KANGOO', yearRange: [2013, 2024], fuel: 'DIESEL', avgRetail: 8000, volatility: 'stable', lastUpdated: '2026-03' },
  { make: 'RENAULT', model: 'AUSTRAL', yearRange: [2023, 2024], fuel: 'HYBRID', avgRetail: 28000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'RENAULT', model: 'CLIO', yearRange: [2019, 2024], fuel: 'HYBRID', avgRetail: 15000, volatility: 'stable', lastUpdated: '2026-03' },
  { make: 'RENAULT', model: 'CAPTUR', yearRange: [2020, 2024], fuel: 'HYBRID', avgRetail: 19000, volatility: 'stable', lastUpdated: '2026-03' },

  // === SKODA (additional models) ===
  { make: 'SKODA', model: 'SUPERB', yearRange: [2019, 2024], fuel: 'DIESEL', avgRetail: 20000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'SKODA', model: 'SUPERB', yearRange: [2019, 2024], fuel: 'PETROL', avgRetail: 19000, volatility: 'stable', lastUpdated: '2026-03' },
  { make: 'SKODA', model: 'SUPERB', yearRange: [2015, 2018], fuel: 'DIESEL', avgRetail: 11000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'SKODA', model: 'YETI', yearRange: [2013, 2017], fuel: 'DIESEL', avgRetail: 8000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'SKODA', model: 'YETI', yearRange: [2013, 2017], fuel: 'PETROL', avgRetail: 7000, volatility: 'stable', lastUpdated: '2026-03' },
  { make: 'SKODA', model: 'CITIGO', yearRange: [2012, 2020], fuel: 'PETROL', avgRetail: 5000, volatility: 'stable', lastUpdated: '2026-03' },
  { make: 'SKODA', model: 'RAPID', yearRange: [2013, 2019], fuel: 'PETROL', avgRetail: 6000, volatility: 'stable', lastUpdated: '2026-03' },
  { make: 'SKODA', model: 'KODIAQ', yearRange: [2017, 2024], fuel: 'PETROL', avgRetail: 21000, volatility: 'stable', lastUpdated: '2026-03' },

  // === SEAT (additional models) ===
  { make: 'SEAT', model: 'ALHAMBRA', yearRange: [2010, 2020], fuel: 'DIESEL', avgRetail: 12000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'SEAT', model: 'TARRACO', yearRange: [2019, 2024], fuel: 'PETROL', avgRetail: 20000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'SEAT', model: 'TARRACO', yearRange: [2019, 2024], fuel: 'DIESEL', avgRetail: 19000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'SEAT', model: 'MII', yearRange: [2012, 2020], fuel: 'PETROL', avgRetail: 4500, volatility: 'stable', lastUpdated: '2026-03' },
  { make: 'SEAT', model: 'LEON', yearRange: [2020, 2024], fuel: 'DIESEL', avgRetail: 17000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'SEAT', model: 'LEON', yearRange: [2020, 2024], fuel: 'HYBRID', avgRetail: 21000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'SEAT', model: 'IBIZA', yearRange: [2021, 2024], fuel: 'DIESEL', avgRetail: 12000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'SEAT', model: 'IBIZA', yearRange: [2017, 2020], fuel: 'DIESEL', avgRetail: 8000, volatility: 'moderate', lastUpdated: '2026-03' },

  // === CUPRA (additional models) ===
  { make: 'CUPRA', model: 'ATECA', yearRange: [2019, 2024], fuel: 'PETROL', avgRetail: 25000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'CUPRA', model: 'FORMENTOR', yearRange: [2021, 2024], fuel: 'HYBRID', avgRetail: 28000, volatility: 'moderate', lastUpdated: '2026-03' },

  // === HONDA (additional models) ===
  { make: 'HONDA', model: 'CR-V', yearRange: [2018, 2024], fuel: 'PETROL', avgRetail: 24000, volatility: 'stable', lastUpdated: '2026-03' },
  { make: 'HONDA', model: 'ZR-V', yearRange: [2023, 2024], fuel: 'HYBRID', avgRetail: 30000, volatility: 'stable', lastUpdated: '2026-03' },
  { make: 'HONDA', model: 'ACCORD', yearRange: [2008, 2015], fuel: 'DIESEL', avgRetail: 4500, volatility: 'moderate', lastUpdated: '2026-03' },

  // === MAZDA (additional models) ===
  { make: 'MAZDA', model: '6', yearRange: [2018, 2024], fuel: 'PETROL', avgRetail: 17000, volatility: 'stable', lastUpdated: '2026-03' },
  { make: 'MAZDA', model: '6', yearRange: [2018, 2024], fuel: 'DIESEL', avgRetail: 16000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'MAZDA', model: '6', yearRange: [2013, 2017], fuel: 'DIESEL', avgRetail: 8000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'MAZDA', model: 'CX-60', yearRange: [2022, 2024], fuel: 'HYBRID', avgRetail: 35000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'MAZDA', model: 'MX-30', yearRange: [2021, 2024], fuel: 'ELECTRIC', avgRetail: 18000, volatility: 'volatile', lastUpdated: '2026-03' },
  { make: 'MAZDA', model: 'CX-5', yearRange: [2012, 2016], fuel: 'DIESEL', avgRetail: 10000, volatility: 'moderate', lastUpdated: '2026-03' },

  // === LAND ROVER (additional models) ===
  { make: 'LAND ROVER', model: 'DISCOVERY', yearRange: [2017, 2024], fuel: 'DIESEL', avgRetail: 32000, volatility: 'volatile', lastUpdated: '2026-03' },
  { make: 'LAND ROVER', model: 'DISCOVERY', yearRange: [2013, 2016], fuel: 'DIESEL', avgRetail: 16000, volatility: 'volatile', lastUpdated: '2026-03' },
  { make: 'LAND ROVER', model: 'RANGE ROVER VELAR', yearRange: [2017, 2024], fuel: 'DIESEL', avgRetail: 35000, volatility: 'volatile', lastUpdated: '2026-03' },
  { make: 'LAND ROVER', model: 'RANGE ROVER VELAR', yearRange: [2017, 2024], fuel: 'PETROL', avgRetail: 36000, volatility: 'volatile', lastUpdated: '2026-03' },
  { make: 'LAND ROVER', model: 'FREELANDER', yearRange: [2006, 2014], fuel: 'DIESEL', avgRetail: 5500, volatility: 'volatile', lastUpdated: '2026-03' },
  { make: 'LAND ROVER', model: 'DEFENDER', yearRange: [2020, 2024], fuel: 'PETROL', avgRetail: 50000, volatility: 'volatile', lastUpdated: '2026-03' },
  { make: 'LAND ROVER', model: 'RANGE ROVER SPORT', yearRange: [2014, 2017], fuel: 'DIESEL', avgRetail: 22000, volatility: 'volatile', lastUpdated: '2026-03' },
  { make: 'LAND ROVER', model: 'RANGE ROVER EVOQUE', yearRange: [2011, 2014], fuel: 'DIESEL', avgRetail: 10000, volatility: 'volatile', lastUpdated: '2026-03' },
  { make: 'LAND ROVER', model: 'DISCOVERY SPORT', yearRange: [2019, 2024], fuel: 'PETROL', avgRetail: 29000, volatility: 'volatile', lastUpdated: '2026-03' },

  // === VOLVO (additional models) ===
  { make: 'VOLVO', model: 'V60', yearRange: [2019, 2024], fuel: 'PETROL', avgRetail: 24000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'VOLVO', model: 'V70', yearRange: [2008, 2016], fuel: 'DIESEL', avgRetail: 7000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'VOLVO', model: 'S60', yearRange: [2019, 2024], fuel: 'HYBRID', avgRetail: 28000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'VOLVO', model: 'S60', yearRange: [2019, 2024], fuel: 'PETROL', avgRetail: 24000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'VOLVO', model: 'S60', yearRange: [2014, 2018], fuel: 'DIESEL', avgRetail: 10000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'VOLVO', model: 'V90', yearRange: [2017, 2024], fuel: 'DIESEL', avgRetail: 22000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'VOLVO', model: 'V90', yearRange: [2017, 2024], fuel: 'HYBRID', avgRetail: 28000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'VOLVO', model: 'S90', yearRange: [2017, 2024], fuel: 'DIESEL', avgRetail: 20000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'VOLVO', model: 'C40', yearRange: [2022, 2024], fuel: 'ELECTRIC', avgRetail: 30000, volatility: 'volatile', lastUpdated: '2026-03' },
  { make: 'VOLVO', model: 'EX30', yearRange: [2024, 2026], fuel: 'ELECTRIC', avgRetail: 32000, volatility: 'volatile', lastUpdated: '2026-03' },
  { make: 'VOLVO', model: 'EX40', yearRange: [2024, 2026], fuel: 'ELECTRIC', avgRetail: 34000, volatility: 'volatile', lastUpdated: '2026-03' },

  // === CITROEN (additional models) ===
  { make: 'CITROEN', model: 'C1', yearRange: [2014, 2022], fuel: 'PETROL', avgRetail: 5500, volatility: 'stable', lastUpdated: '2026-03' },
  { make: 'CITROEN', model: 'C1', yearRange: [2005, 2013], fuel: 'PETROL', avgRetail: 2500, volatility: 'stable', lastUpdated: '2026-03' },
  { make: 'CITROEN', model: 'C3', yearRange: [2010, 2016], fuel: 'PETROL', avgRetail: 4500, volatility: 'stable', lastUpdated: '2026-03' },
  { make: 'CITROEN', model: 'C4', yearRange: [2011, 2020], fuel: 'DIESEL', avgRetail: 6000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'CITROEN', model: 'C5 AIRCROSS', yearRange: [2019, 2024], fuel: 'PETROL', avgRetail: 15000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'CITROEN', model: 'SPACETOURER', yearRange: [2017, 2024], fuel: 'DIESEL', avgRetail: 18000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'CITROEN', model: 'BERLINGO', yearRange: [2018, 2024], fuel: 'PETROL', avgRetail: 14000, volatility: 'stable', lastUpdated: '2026-03' },

  // === FIAT (additional models) ===
  { make: 'FIAT', model: '500L', yearRange: [2013, 2021], fuel: 'PETROL', avgRetail: 6500, volatility: 'stable', lastUpdated: '2026-03' },
  { make: 'FIAT', model: '500L', yearRange: [2013, 2021], fuel: 'DIESEL', avgRetail: 6000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'FIAT', model: 'PUNTO', yearRange: [2012, 2018], fuel: 'PETROL', avgRetail: 3500, volatility: 'stable', lastUpdated: '2026-03' },
  { make: 'FIAT', model: 'DOBLO', yearRange: [2015, 2022], fuel: 'DIESEL', avgRetail: 8000, volatility: 'stable', lastUpdated: '2026-03' },
  { make: 'FIAT', model: '600', yearRange: [2024, 2026], fuel: 'HYBRID', avgRetail: 22000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'FIAT', model: '600', yearRange: [2024, 2026], fuel: 'ELECTRIC', avgRetail: 26000, volatility: 'volatile', lastUpdated: '2026-03' },

  // === SUZUKI (additional models) ===
  { make: 'SUZUKI', model: 'SX4', yearRange: [2014, 2024], fuel: 'PETROL', avgRetail: 11000, volatility: 'stable', lastUpdated: '2026-03' },
  { make: 'SUZUKI', model: 'CELERIO', yearRange: [2015, 2022], fuel: 'PETROL', avgRetail: 5500, volatility: 'stable', lastUpdated: '2026-03' },
  { make: 'SUZUKI', model: 'BALENO', yearRange: [2016, 2020], fuel: 'PETROL', avgRetail: 7500, volatility: 'stable', lastUpdated: '2026-03' },
  { make: 'SUZUKI', model: 'SWACE', yearRange: [2021, 2024], fuel: 'HYBRID', avgRetail: 18000, volatility: 'stable', lastUpdated: '2026-03' },
  { make: 'SUZUKI', model: 'ACROSS', yearRange: [2021, 2024], fuel: 'HYBRID', avgRetail: 28000, volatility: 'moderate', lastUpdated: '2026-03' },

  // === DACIA (additional models) ===
  { make: 'DACIA', model: 'LOGAN', yearRange: [2013, 2021], fuel: 'PETROL', avgRetail: 4000, volatility: 'stable', lastUpdated: '2026-03' },
  { make: 'DACIA', model: 'SANDERO STEPWAY', yearRange: [2017, 2024], fuel: 'PETROL', avgRetail: 10000, volatility: 'stable', lastUpdated: '2026-03' },

  // === MG (additional models) ===
  { make: 'MG', model: '3', yearRange: [2018, 2024], fuel: 'PETROL', avgRetail: 8000, volatility: 'stable', lastUpdated: '2026-03' },
  { make: 'MG', model: 'ZS', yearRange: [2018, 2024], fuel: 'HYBRID', avgRetail: 15000, volatility: 'moderate', lastUpdated: '2026-03' },

  // ═══════════════════════════════════════════════════════════════════════════
  // v3 — NEW MAKES (mainstream, valueable fleets per DfT VEH0120)
  // ═══════════════════════════════════════════════════════════════════════════

  // === LEXUS ===
  { make: 'LEXUS', model: 'CT', yearRange: [2011, 2021], fuel: 'HYBRID', avgRetail: 12000, volatility: 'stable', lastUpdated: '2026-03' },
  { make: 'LEXUS', model: 'IS', yearRange: [2017, 2024], fuel: 'HYBRID', avgRetail: 22000, volatility: 'stable', lastUpdated: '2026-03' },
  { make: 'LEXUS', model: 'IS', yearRange: [2013, 2016], fuel: 'HYBRID', avgRetail: 13000, volatility: 'stable', lastUpdated: '2026-03' },
  { make: 'LEXUS', model: 'NX', yearRange: [2022, 2024], fuel: 'HYBRID', avgRetail: 35000, volatility: 'stable', lastUpdated: '2026-03' },
  { make: 'LEXUS', model: 'NX', yearRange: [2015, 2021], fuel: 'HYBRID', avgRetail: 20000, volatility: 'stable', lastUpdated: '2026-03' },
  { make: 'LEXUS', model: 'RX', yearRange: [2016, 2024], fuel: 'HYBRID', avgRetail: 30000, volatility: 'stable', lastUpdated: '2026-03' },
  { make: 'LEXUS', model: 'UX', yearRange: [2019, 2024], fuel: 'HYBRID', avgRetail: 24000, volatility: 'stable', lastUpdated: '2026-03' },
  { make: 'LEXUS', model: 'UX', yearRange: [2019, 2024], fuel: 'ELECTRIC', avgRetail: 26000, volatility: 'volatile', lastUpdated: '2026-03' },
  { make: 'LEXUS', model: 'ES', yearRange: [2019, 2024], fuel: 'HYBRID', avgRetail: 28000, volatility: 'stable', lastUpdated: '2026-03' },
  { make: 'LEXUS', model: 'LBX', yearRange: [2024, 2026], fuel: 'HYBRID', avgRetail: 28000, volatility: 'stable', lastUpdated: '2026-03' },

  // === MITSUBISHI ===
  { make: 'MITSUBISHI', model: 'OUTLANDER', yearRange: [2014, 2022], fuel: 'HYBRID', avgRetail: 15000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'MITSUBISHI', model: 'OUTLANDER', yearRange: [2014, 2022], fuel: 'DIESEL', avgRetail: 11000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'MITSUBISHI', model: 'ASX', yearRange: [2010, 2023], fuel: 'PETROL', avgRetail: 10000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'MITSUBISHI', model: 'ECLIPSE CROSS', yearRange: [2018, 2024], fuel: 'PETROL', avgRetail: 16000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'MITSUBISHI', model: 'ECLIPSE CROSS', yearRange: [2018, 2024], fuel: 'HYBRID', avgRetail: 20000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'MITSUBISHI', model: 'MIRAGE', yearRange: [2013, 2021], fuel: 'PETROL', avgRetail: 5500, volatility: 'stable', lastUpdated: '2026-03' },
  { make: 'MITSUBISHI', model: 'L200', yearRange: [2015, 2024], fuel: 'DIESEL', avgRetail: 18000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'MITSUBISHI', model: 'SHOGUN', yearRange: [2007, 2021], fuel: 'DIESEL', avgRetail: 14000, volatility: 'moderate', lastUpdated: '2026-03' },

  // === JEEP ===
  { make: 'JEEP', model: 'RENEGADE', yearRange: [2015, 2024], fuel: 'PETROL', avgRetail: 14000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'JEEP', model: 'RENEGADE', yearRange: [2015, 2024], fuel: 'DIESEL', avgRetail: 13000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'JEEP', model: 'COMPASS', yearRange: [2018, 2024], fuel: 'PETROL', avgRetail: 16000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'JEEP', model: 'COMPASS', yearRange: [2018, 2024], fuel: 'DIESEL', avgRetail: 15000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'JEEP', model: 'AVENGER', yearRange: [2023, 2024], fuel: 'PETROL', avgRetail: 22000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'JEEP', model: 'AVENGER', yearRange: [2023, 2024], fuel: 'ELECTRIC', avgRetail: 28000, volatility: 'volatile', lastUpdated: '2026-03' },
  { make: 'JEEP', model: 'WRANGLER', yearRange: [2018, 2024], fuel: 'PETROL', avgRetail: 35000, volatility: 'moderate', lastUpdated: '2026-03' },

  // === ALFA ROMEO ===
  { make: 'ALFA ROMEO', model: 'GIULIETTA', yearRange: [2014, 2021], fuel: 'PETROL', avgRetail: 8000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'ALFA ROMEO', model: 'GIULIETTA', yearRange: [2014, 2021], fuel: 'DIESEL', avgRetail: 7500, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'ALFA ROMEO', model: 'GIULIA', yearRange: [2016, 2024], fuel: 'PETROL', avgRetail: 22000, volatility: 'volatile', lastUpdated: '2026-03' },
  { make: 'ALFA ROMEO', model: 'GIULIA', yearRange: [2016, 2024], fuel: 'DIESEL', avgRetail: 19000, volatility: 'volatile', lastUpdated: '2026-03' },
  { make: 'ALFA ROMEO', model: 'STELVIO', yearRange: [2017, 2024], fuel: 'PETROL', avgRetail: 25000, volatility: 'volatile', lastUpdated: '2026-03' },
  { make: 'ALFA ROMEO', model: 'STELVIO', yearRange: [2017, 2024], fuel: 'DIESEL', avgRetail: 23000, volatility: 'volatile', lastUpdated: '2026-03' },
  { make: 'ALFA ROMEO', model: 'MITO', yearRange: [2009, 2018], fuel: 'PETROL', avgRetail: 4500, volatility: 'moderate', lastUpdated: '2026-03' },

  // === DS ===
  { make: 'DS', model: 'DS3', yearRange: [2015, 2019], fuel: 'PETROL', avgRetail: 7000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'DS', model: 'DS3', yearRange: [2015, 2019], fuel: 'DIESEL', avgRetail: 6500, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'DS', model: 'DS3 CROSSBACK', yearRange: [2019, 2024], fuel: 'PETROL', avgRetail: 16000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'DS', model: 'DS3 CROSSBACK', yearRange: [2019, 2024], fuel: 'ELECTRIC', avgRetail: 18000, volatility: 'volatile', lastUpdated: '2026-03' },
  { make: 'DS', model: 'DS4', yearRange: [2021, 2024], fuel: 'DIESEL', avgRetail: 22000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'DS', model: 'DS4', yearRange: [2021, 2024], fuel: 'HYBRID', avgRetail: 26000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'DS', model: 'DS7', yearRange: [2018, 2024], fuel: 'DIESEL', avgRetail: 20000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'DS', model: 'DS7', yearRange: [2018, 2024], fuel: 'HYBRID', avgRetail: 24000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'DS', model: 'DS7', yearRange: [2018, 2024], fuel: 'PETROL', avgRetail: 18000, volatility: 'moderate', lastUpdated: '2026-03' },

  // === SMART ===
  { make: 'SMART', model: 'FORTWO', yearRange: [2015, 2024], fuel: 'PETROL', avgRetail: 6000, volatility: 'stable', lastUpdated: '2026-03' },
  { make: 'SMART', model: 'FORTWO', yearRange: [2015, 2024], fuel: 'ELECTRIC', avgRetail: 9000, volatility: 'volatile', lastUpdated: '2026-03' },
  { make: 'SMART', model: 'FORTWO', yearRange: [2007, 2014], fuel: 'PETROL', avgRetail: 2500, volatility: 'stable', lastUpdated: '2026-03' },
  { make: 'SMART', model: 'FORFOUR', yearRange: [2015, 2019], fuel: 'PETROL', avgRetail: 5500, volatility: 'stable', lastUpdated: '2026-03' },

  // === POLESTAR ===
  { make: 'POLESTAR', model: '2', yearRange: [2021, 2024], fuel: 'ELECTRIC', avgRetail: 28000, volatility: 'volatile', lastUpdated: '2026-03' },
  { make: 'POLESTAR', model: '4', yearRange: [2024, 2026], fuel: 'ELECTRIC', avgRetail: 52000, volatility: 'volatile', lastUpdated: '2026-03' },

  // === SUBARU ===
  { make: 'SUBARU', model: 'FORESTER', yearRange: [2013, 2024], fuel: 'PETROL', avgRetail: 14000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'SUBARU', model: 'OUTBACK', yearRange: [2015, 2024], fuel: 'PETROL', avgRetail: 18000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'SUBARU', model: 'XV', yearRange: [2012, 2024], fuel: 'PETROL', avgRetail: 13000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'SUBARU', model: 'XV', yearRange: [2012, 2024], fuel: 'HYBRID', avgRetail: 18000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'SUBARU', model: 'IMPREZA', yearRange: [2017, 2024], fuel: 'PETROL', avgRetail: 16000, volatility: 'moderate', lastUpdated: '2026-03' },

  // === SSANGYONG ===
  { make: 'SSANGYONG', model: 'KORANDO', yearRange: [2014, 2024], fuel: 'DIESEL', avgRetail: 10000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'SSANGYONG', model: 'KORANDO', yearRange: [2014, 2024], fuel: 'PETROL', avgRetail: 11000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'SSANGYONG', model: 'TIVOLI', yearRange: [2015, 2024], fuel: 'PETROL', avgRetail: 11000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'SSANGYONG', model: 'REXTON', yearRange: [2017, 2024], fuel: 'DIESEL', avgRetail: 18000, volatility: 'moderate', lastUpdated: '2026-03' },

  // === BYD ===
  { make: 'BYD', model: 'ATTO 3', yearRange: [2023, 2024], fuel: 'ELECTRIC', avgRetail: 28000, volatility: 'volatile', lastUpdated: '2026-03' },
  { make: 'BYD', model: 'SEAL', yearRange: [2024, 2026], fuel: 'ELECTRIC', avgRetail: 35000, volatility: 'volatile', lastUpdated: '2026-03' },
  { make: 'BYD', model: 'DOLPHIN', yearRange: [2024, 2026], fuel: 'ELECTRIC', avgRetail: 24000, volatility: 'volatile', lastUpdated: '2026-03' },

  // === OMODA ===
  { make: 'OMODA', model: '5', yearRange: [2024, 2026], fuel: 'PETROL', avgRetail: 18000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'OMODA', model: 'E5', yearRange: [2024, 2026], fuel: 'ELECTRIC', avgRetail: 28000, volatility: 'volatile', lastUpdated: '2026-03' },

  // === ABARTH ===
  { make: 'ABARTH', model: '595', yearRange: [2012, 2024], fuel: 'PETROL', avgRetail: 13000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'ABARTH', model: '500', yearRange: [2009, 2015], fuel: 'PETROL', avgRetail: 8000, volatility: 'moderate', lastUpdated: '2026-03' },

  // === INFINITI ===
  { make: 'INFINITI', model: 'Q30', yearRange: [2016, 2020], fuel: 'DIESEL', avgRetail: 10000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'INFINITI', model: 'Q30', yearRange: [2016, 2020], fuel: 'PETROL', avgRetail: 9000, volatility: 'moderate', lastUpdated: '2026-03' },

  // === CHEVROLET (older declining fleet — limited coverage) ===
  { make: 'CHEVROLET', model: 'SPARK', yearRange: [2010, 2015], fuel: 'PETROL', avgRetail: 2500, volatility: 'stable', lastUpdated: '2026-03' },
  { make: 'CHEVROLET', model: 'AVEO', yearRange: [2012, 2015], fuel: 'PETROL', avgRetail: 2800, volatility: 'stable', lastUpdated: '2026-03' },
  { make: 'CHEVROLET', model: 'CRUZE', yearRange: [2012, 2016], fuel: 'PETROL', avgRetail: 3500, volatility: 'stable', lastUpdated: '2026-03' },
  { make: 'CHEVROLET', model: 'CAPTIVA', yearRange: [2011, 2018], fuel: 'DIESEL', avgRetail: 5000, volatility: 'moderate', lastUpdated: '2026-03' },

  // === CHRYSLER ===
  { make: 'CHRYSLER', model: 'YPSILON', yearRange: [2011, 2017], fuel: 'PETROL', avgRetail: 3000, volatility: 'stable', lastUpdated: '2026-03' },

  // === DAIHATSU ===
  { make: 'DAIHATSU', model: 'SIRION', yearRange: [2005, 2013], fuel: 'PETROL', avgRetail: 2000, volatility: 'stable', lastUpdated: '2026-03' },

  // === JAECOO ===
  { make: 'JAECOO', model: '7', yearRange: [2024, 2026], fuel: 'HYBRID', avgRetail: 28000, volatility: 'moderate', lastUpdated: '2026-03' },
  { make: 'JAECOO', model: '7', yearRange: [2024, 2026], fuel: 'PETROL', avgRetail: 24000, volatility: 'moderate', lastUpdated: '2026-03' },

  // ═══════════════════════════════════════════════════════════════════════════
  // PRESTIGE / LUXURY — deliberately NOT included.
  // Porsche, Bentley, Rolls-Royce, Ferrari, Lamborghini, Maserati,
  // Aston Martin, McLaren, Lotus must route to manual review.
  // The lookup returning null for these is a feature, not a bug.
  // ═══════════════════════════════════════════════════════════════════════════
]

// ── Fuel normalisation (for lookup keys) ───────────────────────────────────────

export function normaliseFuelForLookup(fuel: string): string {
  const f = fuel.toUpperCase().trim()
  if (f.includes('ELECTRIC') && !f.includes('HYBRID')) return 'ELECTRIC'
  if (f.includes('HYBRID')) return 'HYBRID'
  if (f.includes('DIESEL')) return 'DIESEL'
  return 'PETROL'
}

// ── Make + Model normalisation ─────────────────────────────────────────────────
// Different data sources (DVLA VES, MOT API, DfT VEH0120) use slightly
// different naming conventions. This canonicalises them to match our table.

function normaliseMakeForLookup(make: string): string {
  const m = make.toUpperCase().trim()
  if (m === 'MERCEDES' || m === 'MERC') return 'MERCEDES-BENZ'
  if (m === 'VW') return 'VOLKSWAGEN'
  if (m === 'LAND-ROVER') return 'LAND ROVER'
  if (m === 'ALFA-ROMEO') return 'ALFA ROMEO'
  return m
}

function normaliseModelForLookup(model: string): string {
  let m = model.toUpperCase().trim()
  // Mercedes: "A CLASS" → "A-CLASS", "GLA CLASS" → "GLA", etc.
  m = m.replace(/\s+CLASS$/, '-CLASS')
  // Strip common trim suffixes for partial match reliability
  // e.g. "SPORTAGE GT-LINE" → handled by partial match, no strip needed
  return m
}

// ── Lookup logic (4-tier: exact → fuel-fuzzy → closest-year → null) ────────────

export function getMarketValue(
  make: string,
  model: string,
  year: number,
  fuel: string
): { avgRetail: number; volatility: Volatility; matchQuality: MarketMatchQuality } | null {
  const normMake = normaliseMakeForLookup(make)
  const normModel = normaliseModelForLookup(model)
  const normFuel = normaliseFuelForLookup(fuel)

  // Year-position interpolation: scale avgRetail based on where the
  // vehicle year falls within the matched year-range band.
  // Swing scales with range width (~9% per year of range) to reflect
  // real depreciation curves.  Capped at ±25% for very wide ranges.
  function interpolateRetail(entry: MarketEntry): number {
    const rangeWidth = entry.yearRange[1] - entry.yearRange[0]
    if (rangeWidth === 0) return entry.avgRetail // single-year range
    const position = (year - entry.yearRange[0]) / rangeWidth // 0 to 1
    const swingFactor = Math.min(rangeWidth * 0.09, 0.50)
    const factor = 1 + (position - 0.5) * swingFactor
    return Math.round(entry.avgRetail * factor)
  }

  // 1. Exact match (make + model + year + fuel)
  const exact = MARKET_DATA.find(
    (e) =>
      e.make === normMake &&
      e.model === normModel &&
      year >= e.yearRange[0] &&
      year <= e.yearRange[1] &&
      e.fuel === normFuel
  )
  if (exact) return { avgRetail: interpolateRetail(exact), volatility: exact.volatility, matchQuality: 'exact' }

  // 2. Fuzzy: match make + model + year, any fuel
  const fuelFuzzy = MARKET_DATA.find(
    (e) =>
      e.make === normMake &&
      e.model === normModel &&
      year >= e.yearRange[0] &&
      year <= e.yearRange[1]
  )
  if (fuelFuzzy)
    return { avgRetail: interpolateRetail(fuelFuzzy), volatility: fuelFuzzy.volatility, matchQuality: 'fuel_fuzzy' }

  // 3. Fuzzy: match make + model, closest year range (within 3 years)
  const modelMatches = MARKET_DATA.filter(
    (e) => e.make === normMake && e.model === normModel
  )
  if (modelMatches.length > 0) {
    const closest = modelMatches.reduce((best, entry) => {
      const bestDist = Math.min(
        Math.abs(year - best.yearRange[0]),
        Math.abs(year - best.yearRange[1])
      )
      const entryDist = Math.min(
        Math.abs(year - entry.yearRange[0]),
        Math.abs(year - entry.yearRange[1])
      )
      return entryDist < bestDist ? entry : best
    })
    const dist =
      year < closest.yearRange[0]
        ? closest.yearRange[0] - year
        : year > closest.yearRange[1]
          ? year - closest.yearRange[1]
          : 0
    if (dist <= 3) {
      return { avgRetail: closest.avgRetail, volatility: closest.volatility, matchQuality: 'year_fuzzy' }
    }
  }

  // 4. Partial model match (e.g. DVLA says "GALAXY ZETEC" but table has "GALAXY")
  const partial = MARKET_DATA.find(
    (e) =>
      e.make === normMake &&
      (normModel.startsWith(e.model) || e.model.startsWith(normModel)) &&
      year >= e.yearRange[0] &&
      year <= e.yearRange[1]
  )
  if (partial)
    return { avgRetail: partial.avgRetail, volatility: partial.volatility, matchQuality: 'partial' }

  // 5. No match → manual review
  return null
}

