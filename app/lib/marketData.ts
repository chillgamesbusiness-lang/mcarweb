/**
 * UK vehicle market value lookup table v2.
 *
 * 210+ entries with volatility indicators.
 * Curated average retail prices for the top UK makes/models.
 * Includes stable/moderate/volatile classification per spec.
 *
 * When no match → quoteMode = 'manual_review'.
 * Prestige marques deliberately excluded (Porsche, Bentley, etc.)
 *
 * Spec reference: valuationeng.md Part 2
 */

import type { MarketEntry, Volatility, FuelType } from '@/lib/types'

// ── Market Data (210+ entries) ─────────────────────────────────────────────────

const MARKET_DATA: MarketEntry[] = [
  // === FORD ===
  { make: 'FORD', model: 'FIESTA', yearRange: [2019, 2023], fuel: 'PETROL', avgRetail: 12500, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'FORD', model: 'FIESTA', yearRange: [2015, 2018], fuel: 'PETROL', avgRetail: 7800, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'FORD', model: 'FIESTA', yearRange: [2011, 2014], fuel: 'PETROL', avgRetail: 4200, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'FORD', model: 'FIESTA', yearRange: [2015, 2018], fuel: 'DIESEL', avgRetail: 7200, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'FORD', model: 'FOCUS', yearRange: [2019, 2024], fuel: 'PETROL', avgRetail: 15500, volatility: 'stable', lastUpdated: '2026-02' },
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
  { make: 'VAUXHALL', model: 'ASTRA', yearRange: [2019, 2021], fuel: 'PETROL', avgRetail: 14000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'VAUXHALL', model: 'ASTRA', yearRange: [2015, 2018], fuel: 'PETROL', avgRetail: 8500, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'VAUXHALL', model: 'ASTRA', yearRange: [2015, 2018], fuel: 'DIESEL', avgRetail: 7800, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'VAUXHALL', model: 'MOKKA', yearRange: [2021, 2024], fuel: 'PETROL', avgRetail: 19000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'VAUXHALL', model: 'MOKKA', yearRange: [2021, 2024], fuel: 'ELECTRIC', avgRetail: 22000, volatility: 'volatile', lastUpdated: '2026-02' },
  { make: 'VAUXHALL', model: 'CROSSLAND', yearRange: [2017, 2024], fuel: 'PETROL', avgRetail: 13500, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'VAUXHALL', model: 'GRANDLAND', yearRange: [2018, 2024], fuel: 'PETROL', avgRetail: 17000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'VAUXHALL', model: 'GRANDLAND', yearRange: [2018, 2024], fuel: 'HYBRID', avgRetail: 21000, volatility: 'moderate', lastUpdated: '2026-02' },

  // === VOLKSWAGEN ===
  { make: 'VOLKSWAGEN', model: 'GOLF', yearRange: [2020, 2024], fuel: 'PETROL', avgRetail: 20000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'VOLKSWAGEN', model: 'GOLF', yearRange: [2020, 2024], fuel: 'DIESEL', avgRetail: 19000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'VOLKSWAGEN', model: 'GOLF', yearRange: [2015, 2019], fuel: 'PETROL', avgRetail: 12500, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'VOLKSWAGEN', model: 'GOLF', yearRange: [2015, 2019], fuel: 'DIESEL', avgRetail: 11500, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'VOLKSWAGEN', model: 'GOLF', yearRange: [2011, 2014], fuel: 'PETROL', avgRetail: 7000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'VOLKSWAGEN', model: 'POLO', yearRange: [2018, 2024], fuel: 'PETROL', avgRetail: 14000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'VOLKSWAGEN', model: 'POLO', yearRange: [2014, 2017], fuel: 'PETROL', avgRetail: 7500, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'VOLKSWAGEN', model: 'TIGUAN', yearRange: [2020, 2024], fuel: 'PETROL', avgRetail: 25000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'VOLKSWAGEN', model: 'TIGUAN', yearRange: [2020, 2024], fuel: 'DIESEL', avgRetail: 24000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'VOLKSWAGEN', model: 'TIGUAN', yearRange: [2016, 2019], fuel: 'DIESEL', avgRetail: 15000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'VOLKSWAGEN', model: 'T-ROC', yearRange: [2018, 2024], fuel: 'PETROL', avgRetail: 19500, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'VOLKSWAGEN', model: 'T-ROC', yearRange: [2018, 2024], fuel: 'DIESEL', avgRetail: 18500, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'VOLKSWAGEN', model: 'T-CROSS', yearRange: [2019, 2024], fuel: 'PETROL', avgRetail: 17000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'VOLKSWAGEN', model: 'ID.3', yearRange: [2020, 2024], fuel: 'ELECTRIC', avgRetail: 22000, volatility: 'volatile', lastUpdated: '2026-02' },
  { make: 'VOLKSWAGEN', model: 'ID.4', yearRange: [2021, 2024], fuel: 'ELECTRIC', avgRetail: 28000, volatility: 'volatile', lastUpdated: '2026-02' },
  { make: 'VOLKSWAGEN', model: 'UP', yearRange: [2012, 2024], fuel: 'PETROL', avgRetail: 6500, volatility: 'stable', lastUpdated: '2026-02' },

  // === BMW ===
  { make: 'BMW', model: '1 SERIES', yearRange: [2019, 2024], fuel: 'PETROL', avgRetail: 22000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'BMW', model: '1 SERIES', yearRange: [2019, 2024], fuel: 'DIESEL', avgRetail: 20000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'BMW', model: '1 SERIES', yearRange: [2015, 2018], fuel: 'PETROL', avgRetail: 12000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'BMW', model: '1 SERIES', yearRange: [2015, 2018], fuel: 'DIESEL', avgRetail: 10500, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'BMW', model: '1 SERIES', yearRange: [2011, 2014], fuel: 'DIESEL', avgRetail: 7000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'BMW', model: '2 SERIES', yearRange: [2019, 2024], fuel: 'PETROL', avgRetail: 24000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'BMW', model: '3 SERIES', yearRange: [2019, 2024], fuel: 'PETROL', avgRetail: 27000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'BMW', model: '3 SERIES', yearRange: [2019, 2024], fuel: 'DIESEL', avgRetail: 25000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'BMW', model: '3 SERIES', yearRange: [2015, 2018], fuel: 'DIESEL', avgRetail: 15000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'BMW', model: '3 SERIES', yearRange: [2015, 2018], fuel: 'PETROL', avgRetail: 16000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'BMW', model: '3 SERIES', yearRange: [2012, 2014], fuel: 'DIESEL', avgRetail: 9500, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'BMW', model: 'X1', yearRange: [2019, 2024], fuel: 'PETROL', avgRetail: 25000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'BMW', model: 'X1', yearRange: [2019, 2024], fuel: 'DIESEL', avgRetail: 23000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'BMW', model: 'X1', yearRange: [2015, 2018], fuel: 'DIESEL', avgRetail: 14000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'BMW', model: 'X3', yearRange: [2018, 2024], fuel: 'DIESEL', avgRetail: 28000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'BMW', model: 'X3', yearRange: [2018, 2024], fuel: 'PETROL', avgRetail: 29000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'BMW', model: 'X5', yearRange: [2019, 2024], fuel: 'DIESEL', avgRetail: 38000, volatility: 'volatile', lastUpdated: '2026-02' },
  { make: 'BMW', model: 'I3', yearRange: [2017, 2022], fuel: 'ELECTRIC', avgRetail: 14000, volatility: 'volatile', lastUpdated: '2026-02' },
  { make: 'BMW', model: 'IX3', yearRange: [2021, 2024], fuel: 'ELECTRIC', avgRetail: 32000, volatility: 'volatile', lastUpdated: '2026-02' },

  // === MERCEDES-BENZ ===
  { make: 'MERCEDES-BENZ', model: 'A-CLASS', yearRange: [2018, 2024], fuel: 'PETROL', avgRetail: 22000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'MERCEDES-BENZ', model: 'A-CLASS', yearRange: [2018, 2024], fuel: 'DIESEL', avgRetail: 20000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'MERCEDES-BENZ', model: 'A-CLASS', yearRange: [2013, 2017], fuel: 'PETROL', avgRetail: 11000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'MERCEDES-BENZ', model: 'A-CLASS', yearRange: [2013, 2017], fuel: 'DIESEL', avgRetail: 9500, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'MERCEDES-BENZ', model: 'B-CLASS', yearRange: [2018, 2024], fuel: 'PETROL', avgRetail: 19000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'MERCEDES-BENZ', model: 'C-CLASS', yearRange: [2019, 2024], fuel: 'PETROL', avgRetail: 29000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'MERCEDES-BENZ', model: 'C-CLASS', yearRange: [2019, 2024], fuel: 'DIESEL', avgRetail: 27000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'MERCEDES-BENZ', model: 'C-CLASS', yearRange: [2014, 2018], fuel: 'DIESEL', avgRetail: 15500, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'MERCEDES-BENZ', model: 'C-CLASS', yearRange: [2014, 2018], fuel: 'PETROL', avgRetail: 16500, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'MERCEDES-BENZ', model: 'E-CLASS', yearRange: [2017, 2024], fuel: 'DIESEL', avgRetail: 24000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'MERCEDES-BENZ', model: 'GLA', yearRange: [2020, 2024], fuel: 'PETROL', avgRetail: 28000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'MERCEDES-BENZ', model: 'GLA', yearRange: [2020, 2024], fuel: 'DIESEL', avgRetail: 26000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'MERCEDES-BENZ', model: 'GLC', yearRange: [2019, 2024], fuel: 'DIESEL', avgRetail: 32000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'MERCEDES-BENZ', model: 'EQA', yearRange: [2021, 2024], fuel: 'ELECTRIC', avgRetail: 30000, volatility: 'volatile', lastUpdated: '2026-02' },

  // === AUDI ===
  { make: 'AUDI', model: 'A1', yearRange: [2018, 2024], fuel: 'PETROL', avgRetail: 18000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'AUDI', model: 'A1', yearRange: [2014, 2017], fuel: 'PETROL', avgRetail: 10000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'AUDI', model: 'A3', yearRange: [2020, 2024], fuel: 'PETROL', avgRetail: 23000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'AUDI', model: 'A3', yearRange: [2020, 2024], fuel: 'DIESEL', avgRetail: 21000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'AUDI', model: 'A3', yearRange: [2016, 2019], fuel: 'PETROL', avgRetail: 14000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'AUDI', model: 'A3', yearRange: [2016, 2019], fuel: 'DIESEL', avgRetail: 12500, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'AUDI', model: 'A3', yearRange: [2013, 2015], fuel: 'DIESEL', avgRetail: 8500, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'AUDI', model: 'A4', yearRange: [2019, 2024], fuel: 'DIESEL', avgRetail: 25000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'AUDI', model: 'A4', yearRange: [2019, 2024], fuel: 'PETROL', avgRetail: 26000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'AUDI', model: 'A4', yearRange: [2015, 2018], fuel: 'DIESEL', avgRetail: 14000, volatility: 'moderate', lastUpdated: '2026-02' },
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
  { make: 'NISSAN', model: 'JUKE', yearRange: [2019, 2024], fuel: 'PETROL', avgRetail: 16000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'NISSAN', model: 'JUKE', yearRange: [2019, 2024], fuel: 'HYBRID', avgRetail: 18000, volatility: 'stable', lastUpdated: '2026-02' },
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
  { make: 'HYUNDAI', model: 'I20', yearRange: [2020, 2024], fuel: 'PETROL', avgRetail: 14000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'HYUNDAI', model: 'I20', yearRange: [2015, 2019], fuel: 'PETROL', avgRetail: 7000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'HYUNDAI', model: 'I30', yearRange: [2017, 2024], fuel: 'PETROL', avgRetail: 14500, volatility: 'stable', lastUpdated: '2026-02' },
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
  { make: 'KIA', model: 'SPORTAGE', yearRange: [2016, 2021], fuel: 'PETROL', avgRetail: 12000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'KIA', model: 'CEED', yearRange: [2018, 2024], fuel: 'PETROL', avgRetail: 15000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'KIA', model: 'CEED', yearRange: [2018, 2024], fuel: 'DIESEL', avgRetail: 13500, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'KIA', model: 'NIRO', yearRange: [2019, 2024], fuel: 'HYBRID', avgRetail: 20000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'KIA', model: 'NIRO', yearRange: [2019, 2024], fuel: 'ELECTRIC', avgRetail: 24000, volatility: 'volatile', lastUpdated: '2026-02' },
  { make: 'KIA', model: 'PICANTO', yearRange: [2017, 2024], fuel: 'PETROL', avgRetail: 9500, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'KIA', model: 'PICANTO', yearRange: [2011, 2016], fuel: 'PETROL', avgRetail: 4500, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'KIA', model: 'STONIC', yearRange: [2017, 2024], fuel: 'PETROL', avgRetail: 14000, volatility: 'stable', lastUpdated: '2026-02' },
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
  { make: 'PEUGEOT', model: '208', yearRange: [2020, 2024], fuel: 'PETROL', avgRetail: 15000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'PEUGEOT', model: '208', yearRange: [2020, 2024], fuel: 'ELECTRIC', avgRetail: 19000, volatility: 'volatile', lastUpdated: '2026-02' },
  { make: 'PEUGEOT', model: '208', yearRange: [2015, 2019], fuel: 'PETROL', avgRetail: 6500, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'PEUGEOT', model: '2008', yearRange: [2020, 2024], fuel: 'PETROL', avgRetail: 18500, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'PEUGEOT', model: '2008', yearRange: [2020, 2024], fuel: 'ELECTRIC', avgRetail: 22000, volatility: 'volatile', lastUpdated: '2026-02' },
  { make: 'PEUGEOT', model: '2008', yearRange: [2013, 2019], fuel: 'PETROL', avgRetail: 7500, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'PEUGEOT', model: '3008', yearRange: [2017, 2024], fuel: 'DIESEL', avgRetail: 17000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'PEUGEOT', model: '3008', yearRange: [2017, 2024], fuel: 'PETROL', avgRetail: 16000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'PEUGEOT', model: '3008', yearRange: [2017, 2024], fuel: 'HYBRID', avgRetail: 22000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'PEUGEOT', model: '308', yearRange: [2021, 2024], fuel: 'PETROL', avgRetail: 19000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'PEUGEOT', model: '308', yearRange: [2014, 2020], fuel: 'PETROL', avgRetail: 8000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'PEUGEOT', model: '5008', yearRange: [2017, 2024], fuel: 'DIESEL', avgRetail: 18000, volatility: 'moderate', lastUpdated: '2026-02' },

  // === RENAULT ===
  { make: 'RENAULT', model: 'CLIO', yearRange: [2019, 2024], fuel: 'PETROL', avgRetail: 13000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'RENAULT', model: 'CLIO', yearRange: [2013, 2018], fuel: 'PETROL', avgRetail: 5500, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'RENAULT', model: 'CAPTUR', yearRange: [2020, 2024], fuel: 'PETROL', avgRetail: 17000, volatility: 'stable', lastUpdated: '2026-02' },
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
  { make: 'SKODA', model: 'KAROQ', yearRange: [2018, 2024], fuel: 'PETROL', avgRetail: 20000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'SKODA', model: 'KAROQ', yearRange: [2018, 2024], fuel: 'DIESEL', avgRetail: 19000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'SKODA', model: 'KODIAQ', yearRange: [2017, 2024], fuel: 'DIESEL', avgRetail: 22000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'SKODA', model: 'KAMIQ', yearRange: [2019, 2024], fuel: 'PETROL', avgRetail: 17000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'SKODA', model: 'SCALA', yearRange: [2019, 2024], fuel: 'PETROL', avgRetail: 15000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'SKODA', model: 'ENYAQ', yearRange: [2021, 2024], fuel: 'ELECTRIC', avgRetail: 28000, volatility: 'volatile', lastUpdated: '2026-02' },

  // === SEAT / CUPRA ===
  { make: 'SEAT', model: 'LEON', yearRange: [2020, 2024], fuel: 'PETROL', avgRetail: 18000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'SEAT', model: 'LEON', yearRange: [2013, 2019], fuel: 'PETROL', avgRetail: 9000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'SEAT', model: 'IBIZA', yearRange: [2017, 2024], fuel: 'PETROL', avgRetail: 12000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'SEAT', model: 'IBIZA', yearRange: [2012, 2016], fuel: 'PETROL', avgRetail: 5000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'SEAT', model: 'ARONA', yearRange: [2018, 2024], fuel: 'PETROL', avgRetail: 16000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'SEAT', model: 'ATECA', yearRange: [2016, 2024], fuel: 'PETROL', avgRetail: 17000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'SEAT', model: 'ATECA', yearRange: [2016, 2024], fuel: 'DIESEL', avgRetail: 16000, volatility: 'moderate', lastUpdated: '2026-02' },
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
  { make: 'VOLVO', model: 'XC60', yearRange: [2018, 2024], fuel: 'DIESEL', avgRetail: 30000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'VOLVO', model: 'XC60', yearRange: [2018, 2024], fuel: 'HYBRID', avgRetail: 33000, volatility: 'moderate', lastUpdated: '2026-02' },
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
  { make: 'CITROEN', model: 'C3', yearRange: [2017, 2024], fuel: 'PETROL', avgRetail: 11000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'CITROEN', model: 'C3 AIRCROSS', yearRange: [2017, 2024], fuel: 'PETROL', avgRetail: 14000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'CITROEN', model: 'C3 AIRCROSS', yearRange: [2017, 2024], fuel: 'DIESEL', avgRetail: 12500, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'CITROEN', model: 'C4', yearRange: [2021, 2024], fuel: 'PETROL', avgRetail: 17000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'CITROEN', model: 'C4', yearRange: [2021, 2024], fuel: 'ELECTRIC', avgRetail: 19000, volatility: 'volatile', lastUpdated: '2026-02' },
  { make: 'CITROEN', model: 'C5 AIRCROSS', yearRange: [2019, 2024], fuel: 'DIESEL', avgRetail: 16000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'CITROEN', model: 'C5 AIRCROSS', yearRange: [2019, 2024], fuel: 'HYBRID', avgRetail: 20000, volatility: 'moderate', lastUpdated: '2026-02' },
  { make: 'CITROEN', model: 'BERLINGO', yearRange: [2018, 2024], fuel: 'DIESEL', avgRetail: 16000, volatility: 'stable', lastUpdated: '2026-02' },

  // === FIAT ===
  { make: 'FIAT', model: '500', yearRange: [2016, 2024], fuel: 'PETROL', avgRetail: 10000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'FIAT', model: '500', yearRange: [2010, 2015], fuel: 'PETROL', avgRetail: 5000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'FIAT', model: '500', yearRange: [2021, 2024], fuel: 'ELECTRIC', avgRetail: 18000, volatility: 'volatile', lastUpdated: '2026-02' },
  { make: 'FIAT', model: '500X', yearRange: [2015, 2024], fuel: 'PETROL', avgRetail: 12000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'FIAT', model: 'PANDA', yearRange: [2012, 2024], fuel: 'PETROL', avgRetail: 6500, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'FIAT', model: 'TIPO', yearRange: [2016, 2024], fuel: 'PETROL', avgRetail: 9000, volatility: 'stable', lastUpdated: '2026-02' },

  // === SUZUKI ===
  { make: 'SUZUKI', model: 'SWIFT', yearRange: [2017, 2024], fuel: 'PETROL', avgRetail: 11500, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'SUZUKI', model: 'SWIFT', yearRange: [2017, 2024], fuel: 'HYBRID', avgRetail: 13000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'SUZUKI', model: 'VITARA', yearRange: [2015, 2024], fuel: 'PETROL', avgRetail: 14500, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'SUZUKI', model: 'VITARA', yearRange: [2015, 2024], fuel: 'HYBRID', avgRetail: 16000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'SUZUKI', model: 'S-CROSS', yearRange: [2016, 2024], fuel: 'PETROL', avgRetail: 14000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'SUZUKI', model: 'S-CROSS', yearRange: [2016, 2024], fuel: 'HYBRID', avgRetail: 17000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'SUZUKI', model: 'IGNIS', yearRange: [2017, 2024], fuel: 'HYBRID', avgRetail: 11000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'SUZUKI', model: 'JIMNY', yearRange: [2019, 2024], fuel: 'PETROL', avgRetail: 22000, volatility: 'moderate', lastUpdated: '2026-02' },

  // === DACIA ===
  { make: 'DACIA', model: 'SANDERO', yearRange: [2021, 2024], fuel: 'PETROL', avgRetail: 11000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'DACIA', model: 'SANDERO', yearRange: [2013, 2020], fuel: 'PETROL', avgRetail: 5000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'DACIA', model: 'DUSTER', yearRange: [2018, 2024], fuel: 'PETROL', avgRetail: 14000, volatility: 'stable', lastUpdated: '2026-02' },
  { make: 'DACIA', model: 'DUSTER', yearRange: [2018, 2024], fuel: 'DIESEL', avgRetail: 13000, volatility: 'moderate', lastUpdated: '2026-02' },
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
]

// ── Fuel normalisation (for lookup keys) ───────────────────────────────────────

export function normaliseFuelForLookup(fuel: string): string {
  const f = fuel.toUpperCase().trim()
  if (f.includes('ELECTRIC') && !f.includes('HYBRID')) return 'ELECTRIC'
  if (f.includes('HYBRID')) return 'HYBRID'
  if (f.includes('DIESEL')) return 'DIESEL'
  return 'PETROL'
}

// ── Lookup logic (4-tier: exact → fuel-fuzzy → closest-year → null) ────────────

export function getMarketValue(
  make: string,
  model: string,
  year: number,
  fuel: string
): { avgRetail: number; volatility: Volatility } | null {
  const normMake = make.toUpperCase().trim()
  const normModel = model.toUpperCase().trim()
  const normFuel = normaliseFuelForLookup(fuel)

  // 1. Exact match (make + model + year + fuel)
  const exact = MARKET_DATA.find(
    (e) =>
      e.make === normMake &&
      e.model === normModel &&
      year >= e.yearRange[0] &&
      year <= e.yearRange[1] &&
      e.fuel === normFuel
  )
  if (exact) return { avgRetail: exact.avgRetail, volatility: exact.volatility }

  // 2. Fuzzy: match make + model + year, any fuel
  const fuelFuzzy = MARKET_DATA.find(
    (e) =>
      e.make === normMake &&
      e.model === normModel &&
      year >= e.yearRange[0] &&
      year <= e.yearRange[1]
  )
  if (fuelFuzzy)
    return { avgRetail: fuelFuzzy.avgRetail, volatility: fuelFuzzy.volatility }

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
      return { avgRetail: closest.avgRetail, volatility: closest.volatility }
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
    return { avgRetail: partial.avgRetail, volatility: partial.volatility }

  // 5. No match → manual review
  return null
}

