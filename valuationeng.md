# Session 5 — Production Valuation Engine v2 (Business-Grade)

## Your Goal

Build a complete reg-to-valuation pipeline that:
- Resolves vehicle data instantly from a reg plate
- Calculates a fair, margin-protected provisional range
- Captures verified leads (not tyre-kickers)
- Gives admin full risk visibility
- Accumulates transaction data to self-calibrate over time

**Not** maximise offer. Maximise safety + lead quality + calibration feedback.

---

## Core Principles

1. Auction reality pricing, not retail.
2. Always include a liquidity buffer.
3. Penalise uncertainty — never reward missing data.
4. Reward clean, predictable stock.
5. Wider spread for risky vehicles, tighter for clean ones.
6. Resolve real data — never trust user input alone.
7. Gate the valuation behind verified contact details.
8. Every completed transaction feeds back into calibration.
9. Fail safe — if anything is uncertain, widen the range or defer to manual review.
10. No single multiplier should be able to produce a dangerous quote alone — they stack multiplicatively for a reason.

---

## Architecture Overview

```
User enters reg
    → DVLA VES API (resolve vehicle identity)
    → MOT History API (resolve MOT + mileage history)
    → Mileage Analyser (consistency + rollback detection)
    → User confirms details + enters condition + contact info
    → OTP verification (SMS)
    → Pricing Engine calculates offer (12-step pipeline)
    → User sees valuation range
    → Admin sees full risk breakdown + confidence score
    → Transaction outcome feeds back into calibration store
```

### Files to Create

```
lib/dvlaService.ts          — DVLA VES API integration
lib/motService.ts           — MOT History API integration
lib/mileageAnalyser.ts      — Mileage consistency checker + rollback detection
lib/marketData.ts           — Market value lookup table + fuzzy matching
lib/pricingEngine.ts        — Core 12-step valuation logic
lib/regionPricing.ts        — Postcode-to-region adjustments
lib/leadVerification.ts     — OTP via SMS + rate limiting
lib/confidenceScorer.ts     — Admin-only confidence + risk flag engine
lib/calibrationStore.ts     — Transaction feedback loop for engine tuning
lib/types.ts                — All shared interfaces + enums
```

---

## Part 0 — Shared Types (`types.ts`)

Centralise every interface. No inline types scattered across files.

```typescript
// === Enums ===

export type FuelType = 'petrol' | 'diesel' | 'hybrid' | 'electric';

export type Condition = 'excellent' | 'good' | 'fair' | 'poor';

export type MileageConsistency = 'consistent' | 'suspicious' | 'rollback_detected';

export type RiskTier = 'low' | 'medium' | 'high' | 'manual_only';

export type LeadStatus =
  | 'new'
  | 'contacted'
  | 'inspected'
  | 'offered'
  | 'purchased'
  | 'rejected'
  | 'no_response'
  | 'expired';

export type QuoteMode = 'auto' | 'manual_review' | 'blocked';

// === MOT Analysis ===

export interface MOTDefect {
  type: 'DANGEROUS' | 'MAJOR' | 'MINOR' | 'ADVISORY';
  text: string;
}

export interface MOTTestRecord {
  completedDate: string;
  testResult: 'PASSED' | 'FAILED';
  odometerValue: number;
  odometerUnit: 'mi' | 'km';
  motTestNumber: string;
  expiryDate: string | null;
  defects: MOTDefect[];
}

export interface MOTAnalysis {
  motMonthsRemaining: number;
  motExpired: boolean;
  latestMileage: number;
  mileageHistory: { date: string; mileage: number }[];
  annualMileageEstimate: number;
  mileageConsistency: MileageConsistency;
  rollbackAmount: number | null;         // if rollback detected, how many miles
  recentFailCount: number;               // failures in last 3 tests
  totalFailCount: number;                // all-time failures
  advisoryCount: number;                 // advisories on latest test
  dangerousDefects: boolean;             // any dangerous items ever
  structuralAdvisories: boolean;         // corrosion, subframe, chassis
  brakeAdvisories: boolean;              // brake-specific warnings
  riskAdvisories: string[];              // human-readable risk list
  totalTestCount: number;                // how many MOTs on record
}

// === Vehicle Profile ===

export interface VehicleProfile {
  reg: string;
  make: string;
  model: string;
  year: number;
  fuel: FuelType;
  engineCC: number;
  colour: string;
  co2: number;
  euroStatus: string;
  ulezCompliant: boolean;
  taxStatus: string;
  spidered: boolean;                     // true = SORN
  dateOfLastV5C: string | null;          // keeper change indicator
  motAnalysis: MOTAnalysis;
  resolvedMileage: number;               // from MOT, not user
  userDeclaredMileage: number;           // what user entered
  mileageDiscrepancy: boolean;           // user vs MOT mismatch > 5000
  mileageDiscrepancyAmount: number;      // absolute difference
  dataCompleteness: number;              // 0-100, how much we resolved
}

// === Market Data ===

export interface MarketEntry {
  make: string;
  model: string;
  yearRange: [number, number];
  fuel: string;
  avgRetail: number;
  volatility: 'stable' | 'moderate' | 'volatile';  // v2: market movement indicator
  lastUpdated: string;
}

// === Valuation Result ===

export interface MultiplierBreakdown {
  tradeBase: number;
  ageMultiplier: number;
  mileageMultiplier: number;
  motMultiplier: number;
  fuelMultiplier: number;
  conditionMultiplier: number;
  regionMultiplier: number;
  ulezMultiplier: number;
  mileageConsistencyMultiplier: number;
  liquidityBuffer: number;
  volatilityMultiplier: number;          // v2: market stability factor
  keeperMultiplier: number;              // v2: frequent keeper changes
}

export interface ValuationResult {
  min: number;
  max: number;
  midpoint: number;
  adjustedValue: number;                 // pre-spread value
  confidenceScore: number;               // 0–100
  riskFlags: string[];
  riskTier: RiskTier;
  marketValueUsed: number;
  marketDataMatched: boolean;
  allMultipliers: MultiplierBreakdown;
  quoteMode: QuoteMode;
  spreadApplied: number;
  calculatedAt: string;
  expiresAt: string;                     // valuation valid for 7 days
}

// === Lead ===

export interface LeadSubmission {
  vehicleProfile: VehicleProfile;
  condition: Condition;
  visibleDamage: boolean;
  damageDescription: string | null;
  name: string;
  phone: string;
  email: string;
  postcode: string;
  otpVerified: boolean;
  ipAddress: string;
  userAgent: string;
  submittedAt: string;
}

export interface Lead {
  id: string;
  submission: LeadSubmission;
  valuation: ValuationResult;
  status: LeadStatus;
  adminNotes: string;
  adminOverrideMin: number | null;
  adminOverrideMax: number | null;
  actualPurchasePrice: number | null;
  actualResalePrice: number | null;       // v2: track the full cycle
  reconCost: number | null;               // v2: what prep actually cost
  daysToSale: number | null;              // v2: liquidity reality check
  createdAt: string;
  updatedAt: string;
}

// === Calibration ===

export interface CalibrationRecord {
  leadId: string;
  make: string;
  model: string;
  year: number;
  fuel: FuelType;
  condition: Condition;
  engineMidpoint: number;
  actualPurchasePrice: number;
  actualResalePrice: number | null;
  reconCost: number | null;
  daysToSale: number | null;
  deviation: number;                      // midpoint - actualPurchase
  deviationPct: number;                   // as percentage
  region: string;
  createdAt: string;
}
```

---

## Part 1 — Vehicle Resolution Layer

### 1A: DVLA VES Integration (`dvlaService.ts`)

**Endpoint:** `https://driver-vehicle-licensing.api.gov.uk/vehicle-information/v1/vehicles`

**Method:** POST

**Headers:**
```
x-api-key: {DVLA_API_KEY}
Content-Type: application/json
```

**Request body:**
```json
{ "registrationNumber": "AB12CDE" }
```

**Input sanitisation (before sending):**
```typescript
function sanitiseReg(input: string): string {
  return input
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')   // strip spaces, dashes, special chars
    .trim();
}

// Validate format: UK plates are 2-7 alphanumeric characters
function isValidRegFormat(reg: string): boolean {
  return /^[A-Z0-9]{2,7}$/.test(reg);
}
```

**Returns (key fields we use):**
- `make` — e.g. "FORD"
- `model` — e.g. "FIESTA" (note: DVLA often gives base model only, no trim)
- `yearOfManufacture` — e.g. 2018
- `fuelType` — PETROL / DIESEL / ELECTRICITY / HYBRID ELECTRIC
- `engineCapacity` — in cc, e.g. 998
- `colour` — e.g. "BLUE"
- `co2Emissions` — g/km
- `euroStatus` — e.g. "Euro 6" (critical for ULEZ check)
- `taxStatus` — "Taxed" / "SORN" / "Not Taxed"
- `dateOfLastV5CIssued` — hints at keeper changes
- `motStatus` — "Valid" or "Not valid"
- `motExpiryDate` — ISO date

**Error handling:**
```
400 = bad request (malformed reg)      → "Please check the registration and try again"
404 = vehicle not found                → "We couldn't find that registration"
403 = API key invalid                  → log alert, show generic error
429 = rate limited                     → queue + retry after 1s
500 = DVLA service down               → "Service temporarily unavailable, please try again"
Timeout (>5s)                          → retry once, then show service error
```

**Rate limit compliance:** Max 1 request per second. Implement a simple queue:
```typescript
let lastDvlaCall = 0;

async function throttledDvlaCall(reg: string) {
  const now = Date.now();
  const elapsed = now - lastDvlaCall;
  if (elapsed < 1000) {
    await sleep(1000 - elapsed);
  }
  lastDvlaCall = Date.now();
  return makeDvlaRequest(reg);
}
```

**Fuel type normalisation:**
```typescript
function normaliseFuel(dvlaFuel: string): FuelType {
  const map: Record<string, FuelType> = {
    'PETROL': 'petrol',
    'DIESEL': 'diesel',
    'ELECTRICITY': 'electric',
    'HYBRID ELECTRIC': 'hybrid',
    'ELECTRIC DIESEL': 'hybrid',
    'GAS BI-FUEL': 'petrol',       // treat as petrol for pricing
    'GAS/PETROL': 'petrol',
    'STEAM': 'petrol',             // classic vehicles, rare
  };
  return map[dvlaFuel.toUpperCase()] ?? 'petrol'; // safe default
}
```

**ULEZ Compliance Logic:**
```typescript
function checkUlezCompliance(fuel: FuelType, euroStatus: string): boolean {
  const euroNum = parseEuroStatus(euroStatus); // extract numeric, e.g. "Euro 6" → 6

  if (euroNum === null) return false; // unknown = assume non-compliant

  if (fuel === 'electric') return true;                // always compliant
  if (fuel === 'hybrid') return true;                  // generally compliant
  if (fuel === 'petrol' && euroNum >= 4) return true;
  if (fuel === 'diesel' && euroNum >= 6) return true;
  return false;
}

function parseEuroStatus(status: string): number | null {
  if (!status) return null;
  const match = status.match(/(\d+)/);
  return match ? parseInt(match[1]) : null;
}
```

---

### 1B: MOT History Integration (`motService.ts`)

**Endpoint:** `https://beta.check-mot.service.gov.uk/trade/vehicles/mot-tests?registration={reg}`

**Method:** GET

**Headers:**
```
x-api-key: {MOT_API_KEY}
Accept: application/json+v6
```

**Returns:** Array of vehicles, each containing `motTests[]`, each test containing:
- `completedDate` — ISO date
- `testResult` — "PASSED" / "FAILED"
- `odometerValue` — string (parse to number)
- `odometerUnit` — "mi" / "km"
- `motTestNumber`
- `expiryDate` — ISO date or null if failed
- `rfrAndComments[]` — each with `type` ("DANGEROUS" / "MAJOR" / "MINOR" / "ADVISORY"), `text`

**Odometer unit handling:**
```typescript
function normaliseMileage(value: number, unit: string): number {
  if (unit === 'km') return Math.round(value * 0.621371);
  return value;  // already miles
}
```

**Error handling:**
```
404 = no MOT history found             → vehicle may be <3 years old or imported
       → if year > (currentYear - 3): set motAnalysis to "new_vehicle_exempt"
       → else: flag "No MOT history — possible import or data gap"
403 = API key issue                     → log alert
429 = rate limited                      → retry with backoff
```

**Parsing notes:**
- `odometerValue` comes as a string — always `parseInt()` with fallback
- Some very old tests may have `odometerValue: "0"` — ignore these readings
- Tests come newest-first from the API — sort by `completedDate` ascending for analysis

---

### 1C: Mileage Analyser (`mileageAnalyser.ts`)

This is the most security-critical analysis module. Mileage fraud is rampant and a rollback detection is a showstopper.

**Input:** Sorted array of `{ date: string; mileage: number }[]` (oldest first)

**Consistency checks (applied sequentially to each consecutive pair):**

```typescript
interface MileageAnalysisResult {
  consistency: MileageConsistency;
  annualEstimate: number;
  rollbackAmount: number | null;
  flags: string[];
}

function analyseMileageHistory(
  history: { date: string; mileage: number }[],
  vehicleAge: number
): MileageAnalysisResult {
  const flags: string[] = [];
  let rollbackDetected = false;
  let rollbackAmount: number | null = null;
  let suspicious = false;

  // Need at least 2 readings for comparison
  if (history.length < 2) {
    return {
      consistency: 'consistent',  // can't detect issues with 1 reading
      annualEstimate: history.length === 1
        ? Math.round(history[0].mileage / Math.max(vehicleAge, 1))
        : 8000,  // UK average fallback
      rollbackAmount: null,
      flags: history.length < 2
        ? ['Insufficient MOT history for mileage verification']
        : [],
    };
  }

  for (let i = 1; i < history.length; i++) {
    const prev = history[i - 1];
    const curr = history[i];

    const daysBetween = daysDiff(prev.date, curr.date);
    const yearsBetween = daysBetween / 365.25;
    const milesDiff = curr.mileage - prev.mileage;
    const annualRate = yearsBetween > 0 ? milesDiff / yearsBetween : 0;

    // === ROLLBACK CHECK ===
    if (curr.mileage < prev.mileage) {
      rollbackDetected = true;
      rollbackAmount = prev.mileage - curr.mileage;
      flags.push(
        `Mileage rollback: ${prev.mileage.toLocaleString()} → ${curr.mileage.toLocaleString()} ` +
        `(${rollbackAmount.toLocaleString()} miles lost between ${formatDate(prev.date)} and ${formatDate(curr.date)})`
      );
      continue; // don't apply other checks to this pair
    }

    // === EXCESSIVE MILEAGE ===
    if (annualRate > 25000) {
      flags.push(
        `High annual mileage: ~${Math.round(annualRate).toLocaleString()}/yr ` +
        `between ${formatDate(prev.date)} and ${formatDate(curr.date)}`
      );
      suspicious = true;
    }

    // === SUSPICIOUSLY LOW ===
    if (annualRate < 1000 && yearsBetween >= 0.8) {
      flags.push(
        `Suspiciously low mileage: ~${Math.round(annualRate).toLocaleString()}/yr ` +
        `between ${formatDate(prev.date)} and ${formatDate(curr.date)} — possible clocking or long-term storage`
      );
      suspicious = true;
    }

    // === EXACT SAME MILEAGE ===
    if (milesDiff === 0 && yearsBetween >= 0.8) {
      flags.push(
        `Zero mileage increase over ${Math.round(yearsBetween * 12)} months — data anomaly`
      );
      suspicious = true;
    }
  }

  // Calculate annual estimate from first and last reading
  const first = history[0];
  const last = history[history.length - 1];
  const totalYears = daysDiff(first.date, last.date) / 365.25;
  const annualEstimate = totalYears > 0
    ? Math.round((last.mileage - first.mileage) / totalYears)
    : Math.round(last.mileage / Math.max(vehicleAge, 1));

  return {
    consistency: rollbackDetected ? 'rollback_detected' : suspicious ? 'suspicious' : 'consistent',
    annualEstimate,
    rollbackAmount,
    flags,
  };
}
```

**Mileage discrepancy check (user-declared vs MOT):**
```typescript
function checkMileageDiscrepancy(
  userDeclared: number,
  motLatest: number,
  motDate: string
): { discrepancy: boolean; amount: number; direction: string } {
  const monthsSinceMot = monthsDiff(motDate, new Date().toISOString());
  // Estimate reasonable mileage since last MOT (assume ~700/month average)
  const estimatedSinceMot = monthsSinceMot * 700;
  const expectedCurrent = motLatest + estimatedSinceMot;

  const diff = Math.abs(userDeclared - expectedCurrent);
  const direction = userDeclared > expectedCurrent ? 'user_higher' : 'user_lower';

  // Threshold: 5000 miles OR 20% of expected — whichever is smaller
  const threshold = Math.min(5000, expectedCurrent * 0.20);

  return {
    discrepancy: diff > threshold,
    amount: diff,
    direction,
  };
}
```

**Why the direction matters:**
- `user_higher` = user says more miles than MOT suggests → probably honest, slight penalty
- `user_lower` = user says fewer miles than MOT shows → either wrong or car barely moved → bigger uncertainty penalty

---

### 1D: Combined Vehicle Profile Builder

After both API calls + mileage analysis, assemble:

```typescript
async function buildVehicleProfile(
  reg: string,
  userDeclaredMileage: number
): Promise<{ profile: VehicleProfile; errors: string[] }> {
  const errors: string[] = [];

  // 1. Resolve DVLA data
  const dvla = await fetchDvlaData(reg);
  if (!dvla) return { profile: null, errors: ['Vehicle not found'] };

  // 2. Resolve MOT history
  const mot = await fetchMotHistory(reg);
  const vehicleAge = new Date().getFullYear() - dvla.yearOfManufacture;

  // 3. Build MOT analysis
  let motAnalysis: MOTAnalysis;
  if (!mot || mot.length === 0) {
    if (vehicleAge <= 3) {
      // New vehicle exempt from MOT
      motAnalysis = newVehicleExemptAnalysis(userDeclaredMileage, vehicleAge);
    } else {
      errors.push('No MOT history found for vehicle over 3 years old');
      motAnalysis = unknownMotAnalysis();
    }
  } else {
    motAnalysis = buildMotAnalysis(mot, vehicleAge);
  }

  // 4. Check mileage discrepancy
  const resolvedMileage = motAnalysis.latestMileage || userDeclaredMileage;
  const discrepancy = motAnalysis.latestMileage > 0
    ? checkMileageDiscrepancy(
        userDeclaredMileage,
        motAnalysis.latestMileage,
        motAnalysis.mileageHistory[motAnalysis.mileageHistory.length - 1]?.date ?? ''
      )
    : { discrepancy: false, amount: 0, direction: 'unknown' };

  // 5. Calculate data completeness
  let completeness = 0;
  if (dvla.make) completeness += 15;
  if (dvla.yearOfManufacture) completeness += 15;
  if (dvla.fuelType) completeness += 10;
  if (dvla.euroStatus) completeness += 10;
  if (motAnalysis.totalTestCount >= 2) completeness += 20;
  if (motAnalysis.mileageConsistency === 'consistent') completeness += 15;
  if (!discrepancy.discrepancy) completeness += 15;

  // 6. Assemble
  const fuel = normaliseFuel(dvla.fuelType);

  return {
    profile: {
      reg: reg.toUpperCase(),
      make: dvla.make,
      model: dvla.model,
      year: dvla.yearOfManufacture,
      fuel,
      engineCC: dvla.engineCapacity ?? 0,
      colour: dvla.colour ?? 'Unknown',
      co2: dvla.co2Emissions ?? 0,
      euroStatus: dvla.euroStatus ?? '',
      ulezCompliant: checkUlezCompliance(fuel, dvla.euroStatus ?? ''),
      taxStatus: dvla.taxStatus ?? 'Unknown',
      spidered: dvla.taxStatus === 'SORN',
      dateOfLastV5C: dvla.dateOfLastV5CIssued ?? null,
      motAnalysis,
      resolvedMileage,
      userDeclaredMileage,
      mileageDiscrepancy: discrepancy.discrepancy,
      mileageDiscrepancyAmount: discrepancy.amount,
      dataCompleteness: Math.min(100, completeness),
    },
    errors,
  };
}
```

---

## Part 2 — Market Value Anchor (`marketData.ts`)

Source of truth for retail pricing. Curated lookup table — evolves with real transaction data via calibration feedback.

### Structure

```typescript
interface MarketEntry {
  make: string;
  model: string;
  yearRange: [number, number];     // inclusive
  fuel: string;
  avgRetail: number;               // average retail price in £
  volatility: 'stable' | 'moderate' | 'volatile';
  lastUpdated: string;
}
```

**Volatility indicator (v2 addition):**
- `stable` — prices move <5% per quarter (e.g. Toyota Yaris, Ford Fiesta)
- `moderate` — 5–12% quarterly swing (e.g. German premium, newer EVs)
- `volatile` — >12% quarterly swing (e.g. older EVs, Land Rovers, niche models)

Volatile vehicles get a wider spread. This is insurance against being caught by a market dip between quote and resale.

### UK Market Value Lookup Table

**Methodology:** Prices represent average retail values for standard spec, average mileage-for-age vehicles in good condition. Cross-referenced from AutoTrader, dealer listing aggregates, and auction results. Update monthly minimum.

```typescript
const MARKET_DATA: MarketEntry[] = [
  // ========================
  // === FORD ===
  // ========================
  { make: "FORD", model: "FIESTA", yearRange: [2019, 2023], fuel: "PETROL", avgRetail: 12500, volatility: "stable", lastUpdated: "2026-02" },
  { make: "FORD", model: "FIESTA", yearRange: [2015, 2018], fuel: "PETROL", avgRetail: 7800, volatility: "stable", lastUpdated: "2026-02" },
  { make: "FORD", model: "FIESTA", yearRange: [2011, 2014], fuel: "PETROL", avgRetail: 4200, volatility: "stable", lastUpdated: "2026-02" },
  { make: "FORD", model: "FIESTA", yearRange: [2015, 2018], fuel: "DIESEL", avgRetail: 7200, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "FORD", model: "FOCUS", yearRange: [2019, 2024], fuel: "PETROL", avgRetail: 15500, volatility: "stable", lastUpdated: "2026-02" },
  { make: "FORD", model: "FOCUS", yearRange: [2015, 2018], fuel: "PETROL", avgRetail: 9200, volatility: "stable", lastUpdated: "2026-02" },
  { make: "FORD", model: "FOCUS", yearRange: [2015, 2018], fuel: "DIESEL", avgRetail: 8500, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "FORD", model: "FOCUS", yearRange: [2011, 2014], fuel: "PETROL", avgRetail: 5500, volatility: "stable", lastUpdated: "2026-02" },
  { make: "FORD", model: "FOCUS", yearRange: [2011, 2014], fuel: "DIESEL", avgRetail: 4800, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "FORD", model: "PUMA", yearRange: [2020, 2024], fuel: "PETROL", avgRetail: 18000, volatility: "stable", lastUpdated: "2026-02" },
  { make: "FORD", model: "PUMA", yearRange: [2020, 2024], fuel: "HYBRID", avgRetail: 19500, volatility: "stable", lastUpdated: "2026-02" },
  { make: "FORD", model: "KUGA", yearRange: [2020, 2024], fuel: "PETROL", avgRetail: 20000, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "FORD", model: "KUGA", yearRange: [2020, 2024], fuel: "HYBRID", avgRetail: 22000, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "FORD", model: "KUGA", yearRange: [2015, 2019], fuel: "DIESEL", avgRetail: 11500, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "FORD", model: "ECOSPORT", yearRange: [2018, 2024], fuel: "PETROL", avgRetail: 12000, volatility: "stable", lastUpdated: "2026-02" },
  { make: "FORD", model: "MUSTANG MACH-E", yearRange: [2021, 2024], fuel: "ELECTRIC", avgRetail: 32000, volatility: "volatile", lastUpdated: "2026-02" },

  // ========================
  // === VAUXHALL ===
  // ========================
  { make: "VAUXHALL", model: "CORSA", yearRange: [2020, 2024], fuel: "PETROL", avgRetail: 13000, volatility: "stable", lastUpdated: "2026-02" },
  { make: "VAUXHALL", model: "CORSA", yearRange: [2020, 2024], fuel: "ELECTRIC", avgRetail: 18000, volatility: "volatile", lastUpdated: "2026-02" },
  { make: "VAUXHALL", model: "CORSA", yearRange: [2015, 2019], fuel: "PETROL", avgRetail: 6500, volatility: "stable", lastUpdated: "2026-02" },
  { make: "VAUXHALL", model: "CORSA", yearRange: [2011, 2014], fuel: "PETROL", avgRetail: 3800, volatility: "stable", lastUpdated: "2026-02" },
  { make: "VAUXHALL", model: "ASTRA", yearRange: [2022, 2024], fuel: "PETROL", avgRetail: 19000, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "VAUXHALL", model: "ASTRA", yearRange: [2019, 2021], fuel: "PETROL", avgRetail: 14000, volatility: "stable", lastUpdated: "2026-02" },
  { make: "VAUXHALL", model: "ASTRA", yearRange: [2015, 2018], fuel: "PETROL", avgRetail: 8500, volatility: "stable", lastUpdated: "2026-02" },
  { make: "VAUXHALL", model: "ASTRA", yearRange: [2015, 2018], fuel: "DIESEL", avgRetail: 7800, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "VAUXHALL", model: "MOKKA", yearRange: [2021, 2024], fuel: "PETROL", avgRetail: 19000, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "VAUXHALL", model: "MOKKA", yearRange: [2021, 2024], fuel: "ELECTRIC", avgRetail: 22000, volatility: "volatile", lastUpdated: "2026-02" },
  { make: "VAUXHALL", model: "CROSSLAND", yearRange: [2017, 2024], fuel: "PETROL", avgRetail: 13500, volatility: "stable", lastUpdated: "2026-02" },
  { make: "VAUXHALL", model: "GRANDLAND", yearRange: [2018, 2024], fuel: "PETROL", avgRetail: 17000, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "VAUXHALL", model: "GRANDLAND", yearRange: [2018, 2024], fuel: "HYBRID", avgRetail: 21000, volatility: "moderate", lastUpdated: "2026-02" },

  // ========================
  // === VOLKSWAGEN ===
  // ========================
  { make: "VOLKSWAGEN", model: "GOLF", yearRange: [2020, 2024], fuel: "PETROL", avgRetail: 20000, volatility: "stable", lastUpdated: "2026-02" },
  { make: "VOLKSWAGEN", model: "GOLF", yearRange: [2020, 2024], fuel: "DIESEL", avgRetail: 19000, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "VOLKSWAGEN", model: "GOLF", yearRange: [2015, 2019], fuel: "PETROL", avgRetail: 12500, volatility: "stable", lastUpdated: "2026-02" },
  { make: "VOLKSWAGEN", model: "GOLF", yearRange: [2015, 2019], fuel: "DIESEL", avgRetail: 11500, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "VOLKSWAGEN", model: "GOLF", yearRange: [2011, 2014], fuel: "PETROL", avgRetail: 7000, volatility: "stable", lastUpdated: "2026-02" },
  { make: "VOLKSWAGEN", model: "POLO", yearRange: [2018, 2024], fuel: "PETROL", avgRetail: 14000, volatility: "stable", lastUpdated: "2026-02" },
  { make: "VOLKSWAGEN", model: "POLO", yearRange: [2014, 2017], fuel: "PETROL", avgRetail: 7500, volatility: "stable", lastUpdated: "2026-02" },
  { make: "VOLKSWAGEN", model: "TIGUAN", yearRange: [2020, 2024], fuel: "PETROL", avgRetail: 25000, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "VOLKSWAGEN", model: "TIGUAN", yearRange: [2020, 2024], fuel: "DIESEL", avgRetail: 24000, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "VOLKSWAGEN", model: "TIGUAN", yearRange: [2016, 2019], fuel: "DIESEL", avgRetail: 15000, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "VOLKSWAGEN", model: "T-ROC", yearRange: [2018, 2024], fuel: "PETROL", avgRetail: 19500, volatility: "stable", lastUpdated: "2026-02" },
  { make: "VOLKSWAGEN", model: "T-ROC", yearRange: [2018, 2024], fuel: "DIESEL", avgRetail: 18500, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "VOLKSWAGEN", model: "T-CROSS", yearRange: [2019, 2024], fuel: "PETROL", avgRetail: 17000, volatility: "stable", lastUpdated: "2026-02" },
  { make: "VOLKSWAGEN", model: "ID.3", yearRange: [2020, 2024], fuel: "ELECTRIC", avgRetail: 22000, volatility: "volatile", lastUpdated: "2026-02" },
  { make: "VOLKSWAGEN", model: "ID.4", yearRange: [2021, 2024], fuel: "ELECTRIC", avgRetail: 28000, volatility: "volatile", lastUpdated: "2026-02" },
  { make: "VOLKSWAGEN", model: "UP", yearRange: [2012, 2024], fuel: "PETROL", avgRetail: 6500, volatility: "stable", lastUpdated: "2026-02" },

  // ========================
  // === BMW ===
  // ========================
  { make: "BMW", model: "1 SERIES", yearRange: [2019, 2024], fuel: "PETROL", avgRetail: 22000, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "BMW", model: "1 SERIES", yearRange: [2019, 2024], fuel: "DIESEL", avgRetail: 20000, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "BMW", model: "1 SERIES", yearRange: [2015, 2018], fuel: "PETROL", avgRetail: 12000, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "BMW", model: "1 SERIES", yearRange: [2015, 2018], fuel: "DIESEL", avgRetail: 10500, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "BMW", model: "1 SERIES", yearRange: [2011, 2014], fuel: "DIESEL", avgRetail: 7000, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "BMW", model: "2 SERIES", yearRange: [2019, 2024], fuel: "PETROL", avgRetail: 24000, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "BMW", model: "3 SERIES", yearRange: [2019, 2024], fuel: "PETROL", avgRetail: 27000, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "BMW", model: "3 SERIES", yearRange: [2019, 2024], fuel: "DIESEL", avgRetail: 25000, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "BMW", model: "3 SERIES", yearRange: [2015, 2018], fuel: "DIESEL", avgRetail: 15000, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "BMW", model: "3 SERIES", yearRange: [2015, 2018], fuel: "PETROL", avgRetail: 16000, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "BMW", model: "3 SERIES", yearRange: [2012, 2014], fuel: "DIESEL", avgRetail: 9500, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "BMW", model: "X1", yearRange: [2019, 2024], fuel: "PETROL", avgRetail: 25000, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "BMW", model: "X1", yearRange: [2019, 2024], fuel: "DIESEL", avgRetail: 23000, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "BMW", model: "X1", yearRange: [2015, 2018], fuel: "DIESEL", avgRetail: 14000, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "BMW", model: "X3", yearRange: [2018, 2024], fuel: "DIESEL", avgRetail: 28000, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "BMW", model: "X3", yearRange: [2018, 2024], fuel: "PETROL", avgRetail: 29000, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "BMW", model: "X5", yearRange: [2019, 2024], fuel: "DIESEL", avgRetail: 38000, volatility: "volatile", lastUpdated: "2026-02" },
  { make: "BMW", model: "I3", yearRange: [2017, 2022], fuel: "ELECTRIC", avgRetail: 14000, volatility: "volatile", lastUpdated: "2026-02" },
  { make: "BMW", model: "IX3", yearRange: [2021, 2024], fuel: "ELECTRIC", avgRetail: 32000, volatility: "volatile", lastUpdated: "2026-02" },

  // ========================
  // === MERCEDES-BENZ ===
  // ========================
  { make: "MERCEDES-BENZ", model: "A-CLASS", yearRange: [2018, 2024], fuel: "PETROL", avgRetail: 22000, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "MERCEDES-BENZ", model: "A-CLASS", yearRange: [2018, 2024], fuel: "DIESEL", avgRetail: 20000, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "MERCEDES-BENZ", model: "A-CLASS", yearRange: [2013, 2017], fuel: "PETROL", avgRetail: 11000, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "MERCEDES-BENZ", model: "A-CLASS", yearRange: [2013, 2017], fuel: "DIESEL", avgRetail: 9500, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "MERCEDES-BENZ", model: "B-CLASS", yearRange: [2018, 2024], fuel: "PETROL", avgRetail: 19000, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "MERCEDES-BENZ", model: "C-CLASS", yearRange: [2019, 2024], fuel: "PETROL", avgRetail: 29000, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "MERCEDES-BENZ", model: "C-CLASS", yearRange: [2019, 2024], fuel: "DIESEL", avgRetail: 27000, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "MERCEDES-BENZ", model: "C-CLASS", yearRange: [2014, 2018], fuel: "DIESEL", avgRetail: 15500, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "MERCEDES-BENZ", model: "C-CLASS", yearRange: [2014, 2018], fuel: "PETROL", avgRetail: 16500, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "MERCEDES-BENZ", model: "E-CLASS", yearRange: [2017, 2024], fuel: "DIESEL", avgRetail: 24000, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "MERCEDES-BENZ", model: "GLA", yearRange: [2020, 2024], fuel: "PETROL", avgRetail: 28000, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "MERCEDES-BENZ", model: "GLA", yearRange: [2020, 2024], fuel: "DIESEL", avgRetail: 26000, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "MERCEDES-BENZ", model: "GLC", yearRange: [2019, 2024], fuel: "DIESEL", avgRetail: 32000, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "MERCEDES-BENZ", model: "EQA", yearRange: [2021, 2024], fuel: "ELECTRIC", avgRetail: 30000, volatility: "volatile", lastUpdated: "2026-02" },

  // ========================
  // === AUDI ===
  // ========================
  { make: "AUDI", model: "A1", yearRange: [2018, 2024], fuel: "PETROL", avgRetail: 18000, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "AUDI", model: "A1", yearRange: [2014, 2017], fuel: "PETROL", avgRetail: 10000, volatility: "stable", lastUpdated: "2026-02" },
  { make: "AUDI", model: "A3", yearRange: [2020, 2024], fuel: "PETROL", avgRetail: 23000, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "AUDI", model: "A3", yearRange: [2020, 2024], fuel: "DIESEL", avgRetail: 21000, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "AUDI", model: "A3", yearRange: [2016, 2019], fuel: "PETROL", avgRetail: 14000, volatility: "stable", lastUpdated: "2026-02" },
  { make: "AUDI", model: "A3", yearRange: [2016, 2019], fuel: "DIESEL", avgRetail: 12500, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "AUDI", model: "A3", yearRange: [2013, 2015], fuel: "DIESEL", avgRetail: 8500, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "AUDI", model: "A4", yearRange: [2019, 2024], fuel: "DIESEL", avgRetail: 25000, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "AUDI", model: "A4", yearRange: [2019, 2024], fuel: "PETROL", avgRetail: 26000, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "AUDI", model: "A4", yearRange: [2015, 2018], fuel: "DIESEL", avgRetail: 14000, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "AUDI", model: "Q2", yearRange: [2017, 2024], fuel: "PETROL", avgRetail: 20000, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "AUDI", model: "Q3", yearRange: [2019, 2024], fuel: "PETROL", avgRetail: 27000, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "AUDI", model: "Q3", yearRange: [2019, 2024], fuel: "DIESEL", avgRetail: 25500, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "AUDI", model: "Q5", yearRange: [2018, 2024], fuel: "DIESEL", avgRetail: 30000, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "AUDI", model: "Q7", yearRange: [2020, 2024], fuel: "DIESEL", avgRetail: 40000, volatility: "volatile", lastUpdated: "2026-02" },
  { make: "AUDI", model: "E-TRON", yearRange: [2019, 2024], fuel: "ELECTRIC", avgRetail: 32000, volatility: "volatile", lastUpdated: "2026-02" },

  // ========================
  // === TOYOTA ===
  // ========================
  { make: "TOYOTA", model: "YARIS", yearRange: [2020, 2024], fuel: "HYBRID", avgRetail: 17000, volatility: "stable", lastUpdated: "2026-02" },
  { make: "TOYOTA", model: "YARIS", yearRange: [2020, 2024], fuel: "PETROL", avgRetail: 14000, volatility: "stable", lastUpdated: "2026-02" },
  { make: "TOYOTA", model: "YARIS", yearRange: [2014, 2019], fuel: "PETROL", avgRetail: 7500, volatility: "stable", lastUpdated: "2026-02" },
  { make: "TOYOTA", model: "YARIS", yearRange: [2014, 2019], fuel: "HYBRID", avgRetail: 9000, volatility: "stable", lastUpdated: "2026-02" },
  { make: "TOYOTA", model: "YARIS CROSS", yearRange: [2021, 2024], fuel: "HYBRID", avgRetail: 22000, volatility: "stable", lastUpdated: "2026-02" },
  { make: "TOYOTA", model: "COROLLA", yearRange: [2019, 2024], fuel: "HYBRID", avgRetail: 21000, volatility: "stable", lastUpdated: "2026-02" },
  { make: "TOYOTA", model: "COROLLA", yearRange: [2019, 2024], fuel: "PETROL", avgRetail: 18000, volatility: "stable", lastUpdated: "2026-02" },
  { make: "TOYOTA", model: "RAV4", yearRange: [2019, 2024], fuel: "HYBRID", avgRetail: 30000, volatility: "stable", lastUpdated: "2026-02" },
  { make: "TOYOTA", model: "RAV4", yearRange: [2015, 2018], fuel: "DIESEL", avgRetail: 16000, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "TOYOTA", model: "C-HR", yearRange: [2017, 2024], fuel: "HYBRID", avgRetail: 19000, volatility: "stable", lastUpdated: "2026-02" },
  { make: "TOYOTA", model: "C-HR", yearRange: [2017, 2024], fuel: "PETROL", avgRetail: 16000, volatility: "stable", lastUpdated: "2026-02" },
  { make: "TOYOTA", model: "AYGO", yearRange: [2014, 2022], fuel: "PETROL", avgRetail: 7000, volatility: "stable", lastUpdated: "2026-02" },
  { make: "TOYOTA", model: "AYGO X", yearRange: [2022, 2024], fuel: "PETROL", avgRetail: 14000, volatility: "stable", lastUpdated: "2026-02" },
  { make: "TOYOTA", model: "HILUX", yearRange: [2016, 2024], fuel: "DIESEL", avgRetail: 24000, volatility: "moderate", lastUpdated: "2026-02" },

  // ========================
  // === NISSAN ===
  // ========================
  { make: "NISSAN", model: "QASHQAI", yearRange: [2021, 2024], fuel: "PETROL", avgRetail: 22000, volatility: "stable", lastUpdated: "2026-02" },
  { make: "NISSAN", model: "QASHQAI", yearRange: [2021, 2024], fuel: "HYBRID", avgRetail: 24000, volatility: "stable", lastUpdated: "2026-02" },
  { make: "NISSAN", model: "QASHQAI", yearRange: [2017, 2020], fuel: "PETROL", avgRetail: 13000, volatility: "stable", lastUpdated: "2026-02" },
  { make: "NISSAN", model: "QASHQAI", yearRange: [2017, 2020], fuel: "DIESEL", avgRetail: 12000, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "NISSAN", model: "QASHQAI", yearRange: [2014, 2016], fuel: "DIESEL", avgRetail: 8500, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "NISSAN", model: "JUKE", yearRange: [2019, 2024], fuel: "PETROL", avgRetail: 16000, volatility: "stable", lastUpdated: "2026-02" },
  { make: "NISSAN", model: "JUKE", yearRange: [2019, 2024], fuel: "HYBRID", avgRetail: 18000, volatility: "stable", lastUpdated: "2026-02" },
  { make: "NISSAN", model: "JUKE", yearRange: [2014, 2018], fuel: "PETROL", avgRetail: 7500, volatility: "stable", lastUpdated: "2026-02" },
  { make: "NISSAN", model: "LEAF", yearRange: [2018, 2024], fuel: "ELECTRIC", avgRetail: 16000, volatility: "volatile", lastUpdated: "2026-02" },
  { make: "NISSAN", model: "LEAF", yearRange: [2013, 2017], fuel: "ELECTRIC", avgRetail: 7000, volatility: "volatile", lastUpdated: "2026-02" },
  { make: "NISSAN", model: "MICRA", yearRange: [2017, 2024], fuel: "PETROL", avgRetail: 10000, volatility: "stable", lastUpdated: "2026-02" },
  { make: "NISSAN", model: "X-TRAIL", yearRange: [2017, 2024], fuel: "PETROL", avgRetail: 18000, volatility: "moderate", lastUpdated: "2026-02" },

  // ========================
  // === HYUNDAI ===
  // ========================
  { make: "HYUNDAI", model: "TUCSON", yearRange: [2021, 2024], fuel: "HYBRID", avgRetail: 26000, volatility: "stable", lastUpdated: "2026-02" },
  { make: "HYUNDAI", model: "TUCSON", yearRange: [2021, 2024], fuel: "PETROL", avgRetail: 23000, volatility: "stable", lastUpdated: "2026-02" },
  { make: "HYUNDAI", model: "TUCSON", yearRange: [2015, 2020], fuel: "PETROL", avgRetail: 12000, volatility: "stable", lastUpdated: "2026-02" },
  { make: "HYUNDAI", model: "TUCSON", yearRange: [2015, 2020], fuel: "DIESEL", avgRetail: 11000, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "HYUNDAI", model: "I10", yearRange: [2020, 2024], fuel: "PETROL", avgRetail: 11000, volatility: "stable", lastUpdated: "2026-02" },
  { make: "HYUNDAI", model: "I10", yearRange: [2014, 2019], fuel: "PETROL", avgRetail: 5500, volatility: "stable", lastUpdated: "2026-02" },
  { make: "HYUNDAI", model: "I20", yearRange: [2020, 2024], fuel: "PETROL", avgRetail: 14000, volatility: "stable", lastUpdated: "2026-02" },
  { make: "HYUNDAI", model: "I20", yearRange: [2015, 2019], fuel: "PETROL", avgRetail: 7000, volatility: "stable", lastUpdated: "2026-02" },
  { make: "HYUNDAI", model: "I30", yearRange: [2017, 2024], fuel: "PETROL", avgRetail: 14500, volatility: "stable", lastUpdated: "2026-02" },
  { make: "HYUNDAI", model: "KONA", yearRange: [2018, 2024], fuel: "ELECTRIC", avgRetail: 22000, volatility: "volatile", lastUpdated: "2026-02" },
  { make: "HYUNDAI", model: "KONA", yearRange: [2018, 2024], fuel: "PETROL", avgRetail: 15000, volatility: "stable", lastUpdated: "2026-02" },
  { make: "HYUNDAI", model: "KONA", yearRange: [2018, 2024], fuel: "HYBRID", avgRetail: 19000, volatility: "stable", lastUpdated: "2026-02" },
  { make: "HYUNDAI", model: "IONIQ 5", yearRange: [2021, 2024], fuel: "ELECTRIC", avgRetail: 30000, volatility: "volatile", lastUpdated: "2026-02" },
  { make: "HYUNDAI", model: "IONIQ", yearRange: [2017, 2022], fuel: "HYBRID", avgRetail: 14000, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "HYUNDAI", model: "SANTA FE", yearRange: [2019, 2024], fuel: "DIESEL", avgRetail: 25000, volatility: "moderate", lastUpdated: "2026-02" },

  // ========================
  // === KIA ===
  // ========================
  { make: "KIA", model: "SPORTAGE", yearRange: [2022, 2024], fuel: "HYBRID", avgRetail: 28000, volatility: "stable", lastUpdated: "2026-02" },
  { make: "KIA", model: "SPORTAGE", yearRange: [2022, 2024], fuel: "PETROL", avgRetail: 25000, volatility: "stable", lastUpdated: "2026-02" },
  { make: "KIA", model: "SPORTAGE", yearRange: [2016, 2021], fuel: "DIESEL", avgRetail: 13000, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "KIA", model: "SPORTAGE", yearRange: [2016, 2021], fuel: "PETROL", avgRetail: 12000, volatility: "stable", lastUpdated: "2026-02" },
  { make: "KIA", model: "CEED", yearRange: [2018, 2024], fuel: "PETROL", avgRetail: 15000, volatility: "stable", lastUpdated: "2026-02" },
  { make: "KIA", model: "CEED", yearRange: [2018, 2024], fuel: "DIESEL", avgRetail: 13500, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "KIA", model: "NIRO", yearRange: [2019, 2024], fuel: "HYBRID", avgRetail: 20000, volatility: "stable", lastUpdated: "2026-02" },
  { make: "KIA", model: "NIRO", yearRange: [2019, 2024], fuel: "ELECTRIC", avgRetail: 24000, volatility: "volatile", lastUpdated: "2026-02" },
  { make: "KIA", model: "PICANTO", yearRange: [2017, 2024], fuel: "PETROL", avgRetail: 9500, volatility: "stable", lastUpdated: "2026-02" },
  { make: "KIA", model: "PICANTO", yearRange: [2011, 2016], fuel: "PETROL", avgRetail: 4500, volatility: "stable", lastUpdated: "2026-02" },
  { make: "KIA", model: "STONIC", yearRange: [2017, 2024], fuel: "PETROL", avgRetail: 14000, volatility: "stable", lastUpdated: "2026-02" },
  { make: "KIA", model: "EV6", yearRange: [2022, 2024], fuel: "ELECTRIC", avgRetail: 33000, volatility: "volatile", lastUpdated: "2026-02" },
  { make: "KIA", model: "XCEED", yearRange: [2019, 2024], fuel: "PETROL", avgRetail: 17000, volatility: "stable", lastUpdated: "2026-02" },

  // ========================
  // === MINI ===
  // ========================
  { make: "MINI", model: "HATCH", yearRange: [2018, 2024], fuel: "PETROL", avgRetail: 16500, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "MINI", model: "HATCH", yearRange: [2014, 2017], fuel: "PETROL", avgRetail: 9500, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "MINI", model: "HATCH", yearRange: [2014, 2017], fuel: "DIESEL", avgRetail: 8000, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "MINI", model: "COUNTRYMAN", yearRange: [2017, 2024], fuel: "PETROL", avgRetail: 19000, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "MINI", model: "COUNTRYMAN", yearRange: [2017, 2024], fuel: "HYBRID", avgRetail: 21000, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "MINI", model: "COUNTRYMAN", yearRange: [2017, 2024], fuel: "DIESEL", avgRetail: 16500, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "MINI", model: "CLUBMAN", yearRange: [2016, 2024], fuel: "PETROL", avgRetail: 17000, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "MINI", model: "ELECTRIC", yearRange: [2020, 2024], fuel: "ELECTRIC", avgRetail: 18000, volatility: "volatile", lastUpdated: "2026-02" },

  // ========================
  // === PEUGEOT ===
  // ========================
  { make: "PEUGEOT", model: "208", yearRange: [2020, 2024], fuel: "PETROL", avgRetail: 15000, volatility: "stable", lastUpdated: "2026-02" },
  { make: "PEUGEOT", model: "208", yearRange: [2020, 2024], fuel: "ELECTRIC", avgRetail: 19000, volatility: "volatile", lastUpdated: "2026-02" },
  { make: "PEUGEOT", model: "208", yearRange: [2015, 2019], fuel: "PETROL", avgRetail: 6500, volatility: "stable", lastUpdated: "2026-02" },
  { make: "PEUGEOT", model: "2008", yearRange: [2020, 2024], fuel: "PETROL", avgRetail: 18500, volatility: "stable", lastUpdated: "2026-02" },
  { make: "PEUGEOT", model: "2008", yearRange: [2020, 2024], fuel: "ELECTRIC", avgRetail: 22000, volatility: "volatile", lastUpdated: "2026-02" },
  { make: "PEUGEOT", model: "2008", yearRange: [2013, 2019], fuel: "PETROL", avgRetail: 7500, volatility: "stable", lastUpdated: "2026-02" },
  { make: "PEUGEOT", model: "3008", yearRange: [2017, 2024], fuel: "DIESEL", avgRetail: 17000, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "PEUGEOT", model: "3008", yearRange: [2017, 2024], fuel: "PETROL", avgRetail: 16000, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "PEUGEOT", model: "3008", yearRange: [2017, 2024], fuel: "HYBRID", avgRetail: 22000, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "PEUGEOT", model: "308", yearRange: [2021, 2024], fuel: "PETROL", avgRetail: 19000, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "PEUGEOT", model: "308", yearRange: [2014, 2020], fuel: "PETROL", avgRetail: 8000, volatility: "stable", lastUpdated: "2026-02" },
  { make: "PEUGEOT", model: "5008", yearRange: [2017, 2024], fuel: "DIESEL", avgRetail: 18000, volatility: "moderate", lastUpdated: "2026-02" },

  // ========================
  // === RENAULT ===
  // ========================
  { make: "RENAULT", model: "CLIO", yearRange: [2019, 2024], fuel: "PETROL", avgRetail: 13000, volatility: "stable", lastUpdated: "2026-02" },
  { make: "RENAULT", model: "CLIO", yearRange: [2013, 2018], fuel: "PETROL", avgRetail: 5500, volatility: "stable", lastUpdated: "2026-02" },
  { make: "RENAULT", model: "CAPTUR", yearRange: [2020, 2024], fuel: "PETROL", avgRetail: 17000, volatility: "stable", lastUpdated: "2026-02" },
  { make: "RENAULT", model: "CAPTUR", yearRange: [2013, 2019], fuel: "PETROL", avgRetail: 8000, volatility: "stable", lastUpdated: "2026-02" },
  { make: "RENAULT", model: "KADJAR", yearRange: [2015, 2022], fuel: "PETROL", avgRetail: 12000, volatility: "stable", lastUpdated: "2026-02" },
  { make: "RENAULT", model: "KADJAR", yearRange: [2015, 2022], fuel: "DIESEL", avgRetail: 11000, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "RENAULT", model: "ZOE", yearRange: [2019, 2024], fuel: "ELECTRIC", avgRetail: 14000, volatility: "volatile", lastUpdated: "2026-02" },
  { make: "RENAULT", model: "MEGANE E-TECH", yearRange: [2022, 2024], fuel: "ELECTRIC", avgRetail: 25000, volatility: "volatile", lastUpdated: "2026-02" },
  { make: "RENAULT", model: "ARKANA", yearRange: [2022, 2024], fuel: "HYBRID", avgRetail: 22000, volatility: "moderate", lastUpdated: "2026-02" },

  // ========================
  // === SKODA ===
  // ========================
  { make: "SKODA", model: "OCTAVIA", yearRange: [2020, 2024], fuel: "PETROL", avgRetail: 20000, volatility: "stable", lastUpdated: "2026-02" },
  { make: "SKODA", model: "OCTAVIA", yearRange: [2020, 2024], fuel: "DIESEL", avgRetail: 19000, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "SKODA", model: "OCTAVIA", yearRange: [2015, 2019], fuel: "DIESEL", avgRetail: 11000, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "SKODA", model: "OCTAVIA", yearRange: [2015, 2019], fuel: "PETROL", avgRetail: 10000, volatility: "stable", lastUpdated: "2026-02" },
  { make: "SKODA", model: "FABIA", yearRange: [2021, 2024], fuel: "PETROL", avgRetail: 15000, volatility: "stable", lastUpdated: "2026-02" },
  { make: "SKODA", model: "FABIA", yearRange: [2015, 2020], fuel: "PETROL", avgRetail: 7500, volatility: "stable", lastUpdated: "2026-02" },
  { make: "SKODA", model: "KAROQ", yearRange: [2018, 2024], fuel: "PETROL", avgRetail: 20000, volatility: "stable", lastUpdated: "2026-02" },
  { make: "SKODA", model: "KAROQ", yearRange: [2018, 2024], fuel: "DIESEL", avgRetail: 19000, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "SKODA", model: "KODIAQ", yearRange: [2017, 2024], fuel: "DIESEL", avgRetail: 22000, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "SKODA", model: "KAMIQ", yearRange: [2019, 2024], fuel: "PETROL", avgRetail: 17000, volatility: "stable", lastUpdated: "2026-02" },
  { make: "SKODA", model: "SCALA", yearRange: [2019, 2024], fuel: "PETROL", avgRetail: 15000, volatility: "stable", lastUpdated: "2026-02" },
  { make: "SKODA", model: "ENYAQ", yearRange: [2021, 2024], fuel: "ELECTRIC", avgRetail: 28000, volatility: "volatile", lastUpdated: "2026-02" },

  // ========================
  // === SEAT / CUPRA ===
  // ========================
  { make: "SEAT", model: "LEON", yearRange: [2020, 2024], fuel: "PETROL", avgRetail: 18000, volatility: "stable", lastUpdated: "2026-02" },
  { make: "SEAT", model: "LEON", yearRange: [2013, 2019], fuel: "PETROL", avgRetail: 9000, volatility: "stable", lastUpdated: "2026-02" },
  { make: "SEAT", model: "IBIZA", yearRange: [2017, 2024], fuel: "PETROL", avgRetail: 12000, volatility: "stable", lastUpdated: "2026-02" },
  { make: "SEAT", model: "IBIZA", yearRange: [2012, 2016], fuel: "PETROL", avgRetail: 5000, volatility: "stable", lastUpdated: "2026-02" },
  { make: "SEAT", model: "ARONA", yearRange: [2018, 2024], fuel: "PETROL", avgRetail: 16000, volatility: "stable", lastUpdated: "2026-02" },
  { make: "SEAT", model: "ATECA", yearRange: [2016, 2024], fuel: "PETROL", avgRetail: 17000, volatility: "stable", lastUpdated: "2026-02" },
  { make: "SEAT", model: "ATECA", yearRange: [2016, 2024], fuel: "DIESEL", avgRetail: 16000, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "CUPRA", model: "FORMENTOR", yearRange: [2021, 2024], fuel: "PETROL", avgRetail: 25000, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "CUPRA", model: "BORN", yearRange: [2022, 2024], fuel: "ELECTRIC", avgRetail: 24000, volatility: "volatile", lastUpdated: "2026-02" },
  { make: "CUPRA", model: "LEON", yearRange: [2021, 2024], fuel: "PETROL", avgRetail: 24000, volatility: "moderate", lastUpdated: "2026-02" },

  // ========================
  // === HONDA ===
  // ========================
  { make: "HONDA", model: "CIVIC", yearRange: [2022, 2024], fuel: "HYBRID", avgRetail: 25000, volatility: "stable", lastUpdated: "2026-02" },
  { make: "HONDA", model: "CIVIC", yearRange: [2017, 2021], fuel: "PETROL", avgRetail: 16000, volatility: "stable", lastUpdated: "2026-02" },
  { make: "HONDA", model: "CIVIC", yearRange: [2017, 2021], fuel: "DIESEL", avgRetail: 14000, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "HONDA", model: "JAZZ", yearRange: [2020, 2024], fuel: "HYBRID", avgRetail: 17000, volatility: "stable", lastUpdated: "2026-02" },
  { make: "HONDA", model: "JAZZ", yearRange: [2014, 2019], fuel: "PETROL", avgRetail: 9000, volatility: "stable", lastUpdated: "2026-02" },
  { make: "HONDA", model: "HR-V", yearRange: [2021, 2024], fuel: "HYBRID", avgRetail: 23000, volatility: "stable", lastUpdated: "2026-02" },
  { make: "HONDA", model: "HR-V", yearRange: [2015, 2020], fuel: "PETROL", avgRetail: 13000, volatility: "stable", lastUpdated: "2026-02" },
  { make: "HONDA", model: "CR-V", yearRange: [2018, 2024], fuel: "HYBRID", avgRetail: 27000, volatility: "stable", lastUpdated: "2026-02" },
  { make: "HONDA", model: "CR-V", yearRange: [2012, 2017], fuel: "DIESEL", avgRetail: 11000, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "HONDA", model: "E", yearRange: [2020, 2024], fuel: "ELECTRIC", avgRetail: 20000, volatility: "volatile", lastUpdated: "2026-02" },

  // ========================
  // === MAZDA ===
  // ========================
  { make: "MAZDA", model: "CX-5", yearRange: [2017, 2024], fuel: "PETROL", avgRetail: 21000, volatility: "stable", lastUpdated: "2026-02" },
  { make: "MAZDA", model: "CX-5", yearRange: [2017, 2024], fuel: "DIESEL", avgRetail: 20000, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "MAZDA", model: "CX-30", yearRange: [2020, 2024], fuel: "PETROL", avgRetail: 20000, volatility: "stable", lastUpdated: "2026-02" },
  { make: "MAZDA", model: "3", yearRange: [2019, 2024], fuel: "PETROL", avgRetail: 19000, volatility: "stable", lastUpdated: "2026-02" },
  { make: "MAZDA", model: "2", yearRange: [2015, 2024], fuel: "PETROL", avgRetail: 10000, volatility: "stable", lastUpdated: "2026-02" },
  { make: "MAZDA", model: "MX-5", yearRange: [2016, 2024], fuel: "PETROL", avgRetail: 21000, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "MAZDA", model: "CX-3", yearRange: [2015, 2024], fuel: "PETROL", avgRetail: 14000, volatility: "stable", lastUpdated: "2026-02" },

  // ========================
  // === LAND ROVER ===
  // ========================
  { make: "LAND ROVER", model: "RANGE ROVER EVOQUE", yearRange: [2019, 2024], fuel: "DIESEL", avgRetail: 32000, volatility: "volatile", lastUpdated: "2026-02" },
  { make: "LAND ROVER", model: "RANGE ROVER EVOQUE", yearRange: [2019, 2024], fuel: "PETROL", avgRetail: 33000, volatility: "volatile", lastUpdated: "2026-02" },
  { make: "LAND ROVER", model: "RANGE ROVER EVOQUE", yearRange: [2015, 2018], fuel: "DIESEL", avgRetail: 18000, volatility: "volatile", lastUpdated: "2026-02" },
  { make: "LAND ROVER", model: "DISCOVERY SPORT", yearRange: [2019, 2024], fuel: "DIESEL", avgRetail: 28000, volatility: "volatile", lastUpdated: "2026-02" },
  { make: "LAND ROVER", model: "DISCOVERY SPORT", yearRange: [2015, 2018], fuel: "DIESEL", avgRetail: 17000, volatility: "volatile", lastUpdated: "2026-02" },
  { make: "LAND ROVER", model: "RANGE ROVER SPORT", yearRange: [2018, 2024], fuel: "DIESEL", avgRetail: 45000, volatility: "volatile", lastUpdated: "2026-02" },
  { make: "LAND ROVER", model: "DEFENDER", yearRange: [2020, 2024], fuel: "DIESEL", avgRetail: 48000, volatility: "volatile", lastUpdated: "2026-02" },

  // ========================
  // === VOLVO ===
  // ========================
  { make: "VOLVO", model: "XC40", yearRange: [2018, 2024], fuel: "PETROL", avgRetail: 26000, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "VOLVO", model: "XC40", yearRange: [2018, 2024], fuel: "HYBRID", avgRetail: 28000, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "VOLVO", model: "XC40", yearRange: [2018, 2024], fuel: "ELECTRIC", avgRetail: 27000, volatility: "volatile", lastUpdated: "2026-02" },
  { make: "VOLVO", model: "XC60", yearRange: [2018, 2024], fuel: "DIESEL", avgRetail: 30000, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "VOLVO", model: "XC60", yearRange: [2018, 2024], fuel: "HYBRID", avgRetail: 33000, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "VOLVO", model: "XC90", yearRange: [2016, 2024], fuel: "DIESEL", avgRetail: 30000, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "VOLVO", model: "XC90", yearRange: [2016, 2024], fuel: "HYBRID", avgRetail: 35000, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "VOLVO", model: "V40", yearRange: [2013, 2019], fuel: "PETROL", avgRetail: 10000, volatility: "stable", lastUpdated: "2026-02" },
  { make: "VOLVO", model: "V40", yearRange: [2013, 2019], fuel: "DIESEL", avgRetail: 9000, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "VOLVO", model: "V60", yearRange: [2019, 2024], fuel: "DIESEL", avgRetail: 25000, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "VOLVO", model: "V60", yearRange: [2019, 2024], fuel: "HYBRID", avgRetail: 28000, volatility: "moderate", lastUpdated: "2026-02" },

  // ========================
  // === TESLA ===
  // ========================
  { make: "TESLA", model: "MODEL 3", yearRange: [2019, 2024], fuel: "ELECTRIC", avgRetail: 28000, volatility: "volatile", lastUpdated: "2026-02" },
  { make: "TESLA", model: "MODEL Y", yearRange: [2022, 2024], fuel: "ELECTRIC", avgRetail: 35000, volatility: "volatile", lastUpdated: "2026-02" },
  { make: "TESLA", model: "MODEL S", yearRange: [2016, 2024], fuel: "ELECTRIC", avgRetail: 38000, volatility: "volatile", lastUpdated: "2026-02" },
  { make: "TESLA", model: "MODEL X", yearRange: [2016, 2024], fuel: "ELECTRIC", avgRetail: 42000, volatility: "volatile", lastUpdated: "2026-02" },

  // ========================
  // === CITROEN ===
  // ========================
  { make: "CITROEN", model: "C3", yearRange: [2017, 2024], fuel: "PETROL", avgRetail: 11000, volatility: "stable", lastUpdated: "2026-02" },
  { make: "CITROEN", model: "C3 AIRCROSS", yearRange: [2017, 2024], fuel: "PETROL", avgRetail: 14000, volatility: "stable", lastUpdated: "2026-02" },
  { make: "CITROEN", model: "C3 AIRCROSS", yearRange: [2017, 2024], fuel: "DIESEL", avgRetail: 12500, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "CITROEN", model: "C4", yearRange: [2021, 2024], fuel: "PETROL", avgRetail: 17000, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "CITROEN", model: "C4", yearRange: [2021, 2024], fuel: "ELECTRIC", avgRetail: 19000, volatility: "volatile", lastUpdated: "2026-02" },
  { make: "CITROEN", model: "C5 AIRCROSS", yearRange: [2019, 2024], fuel: "DIESEL", avgRetail: 16000, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "CITROEN", model: "C5 AIRCROSS", yearRange: [2019, 2024], fuel: "HYBRID", avgRetail: 20000, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "CITROEN", model: "BERLINGO", yearRange: [2018, 2024], fuel: "DIESEL", avgRetail: 16000, volatility: "stable", lastUpdated: "2026-02" },

  // ========================
  // === FIAT ===
  // ========================
  { make: "FIAT", model: "500", yearRange: [2016, 2024], fuel: "PETROL", avgRetail: 10000, volatility: "stable", lastUpdated: "2026-02" },
  { make: "FIAT", model: "500", yearRange: [2010, 2015], fuel: "PETROL", avgRetail: 5000, volatility: "stable", lastUpdated: "2026-02" },
  { make: "FIAT", model: "500", yearRange: [2021, 2024], fuel: "ELECTRIC", avgRetail: 18000, volatility: "volatile", lastUpdated: "2026-02" },
  { make: "FIAT", model: "500X", yearRange: [2015, 2024], fuel: "PETROL", avgRetail: 12000, volatility: "stable", lastUpdated: "2026-02" },
  { make: "FIAT", model: "PANDA", yearRange: [2012, 2024], fuel: "PETROL", avgRetail: 6500, volatility: "stable", lastUpdated: "2026-02" },
  { make: "FIAT", model: "TIPO", yearRange: [2016, 2024], fuel: "PETROL", avgRetail: 9000, volatility: "stable", lastUpdated: "2026-02" },

  // ========================
  // === SUZUKI ===
  // ========================
  { make: "SUZUKI", model: "SWIFT", yearRange: [2017, 2024], fuel: "PETROL", avgRetail: 11500, volatility: "stable", lastUpdated: "2026-02" },
  { make: "SUZUKI", model: "SWIFT", yearRange: [2017, 2024], fuel: "HYBRID", avgRetail: 13000, volatility: "stable", lastUpdated: "2026-02" },
  { make: "SUZUKI", model: "VITARA", yearRange: [2015, 2024], fuel: "PETROL", avgRetail: 14500, volatility: "stable", lastUpdated: "2026-02" },
  { make: "SUZUKI", model: "VITARA", yearRange: [2015, 2024], fuel: "HYBRID", avgRetail: 16000, volatility: "stable", lastUpdated: "2026-02" },
  { make: "SUZUKI", model: "S-CROSS", yearRange: [2016, 2024], fuel: "PETROL", avgRetail: 14000, volatility: "stable", lastUpdated: "2026-02" },
  { make: "SUZUKI", model: "S-CROSS", yearRange: [2016, 2024], fuel: "HYBRID", avgRetail: 17000, volatility: "stable", lastUpdated: "2026-02" },
  { make: "SUZUKI", model: "IGNIS", yearRange: [2017, 2024], fuel: "HYBRID", avgRetail: 11000, volatility: "stable", lastUpdated: "2026-02" },
  { make: "SUZUKI", model: "JIMNY", yearRange: [2019, 2024], fuel: "PETROL", avgRetail: 22000, volatility: "moderate", lastUpdated: "2026-02" },

  // ========================
  // === DACIA ===
  // ========================
  { make: "DACIA", model: "SANDERO", yearRange: [2021, 2024], fuel: "PETROL", avgRetail: 11000, volatility: "stable", lastUpdated: "2026-02" },
  { make: "DACIA", model: "SANDERO", yearRange: [2013, 2020], fuel: "PETROL", avgRetail: 5000, volatility: "stable", lastUpdated: "2026-02" },
  { make: "DACIA", model: "DUSTER", yearRange: [2018, 2024], fuel: "PETROL", avgRetail: 14000, volatility: "stable", lastUpdated: "2026-02" },
  { make: "DACIA", model: "DUSTER", yearRange: [2018, 2024], fuel: "DIESEL", avgRetail: 13000, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "DACIA", model: "DUSTER", yearRange: [2013, 2017], fuel: "DIESEL", avgRetail: 6500, volatility: "stable", lastUpdated: "2026-02" },
  { make: "DACIA", model: "JOGGER", yearRange: [2022, 2024], fuel: "PETROL", avgRetail: 15000, volatility: "stable", lastUpdated: "2026-02" },
  { make: "DACIA", model: "JOGGER", yearRange: [2022, 2024], fuel: "HYBRID", avgRetail: 17000, volatility: "stable", lastUpdated: "2026-02" },
  { make: "DACIA", model: "SPRING", yearRange: [2022, 2024], fuel: "ELECTRIC", avgRetail: 12000, volatility: "volatile", lastUpdated: "2026-02" },

  // ========================
  // === MG ===
  // ========================
  { make: "MG", model: "ZS", yearRange: [2018, 2024], fuel: "PETROL", avgRetail: 12000, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "MG", model: "ZS", yearRange: [2020, 2024], fuel: "ELECTRIC", avgRetail: 17000, volatility: "volatile", lastUpdated: "2026-02" },
  { make: "MG", model: "HS", yearRange: [2019, 2024], fuel: "PETROL", avgRetail: 15000, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "MG", model: "HS", yearRange: [2019, 2024], fuel: "HYBRID", avgRetail: 19000, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "MG", model: "5", yearRange: [2020, 2024], fuel: "ELECTRIC", avgRetail: 16000, volatility: "volatile", lastUpdated: "2026-02" },
  { make: "MG", model: "4", yearRange: [2023, 2024], fuel: "ELECTRIC", avgRetail: 22000, volatility: "volatile", lastUpdated: "2026-02" },

  // ========================
  // === JAGUAR ===
  // ========================
  { make: "JAGUAR", model: "E-PACE", yearRange: [2018, 2024], fuel: "DIESEL", avgRetail: 24000, volatility: "volatile", lastUpdated: "2026-02" },
  { make: "JAGUAR", model: "F-PACE", yearRange: [2016, 2024], fuel: "DIESEL", avgRetail: 26000, volatility: "volatile", lastUpdated: "2026-02" },
  { make: "JAGUAR", model: "XE", yearRange: [2015, 2024], fuel: "DIESEL", avgRetail: 18000, volatility: "volatile", lastUpdated: "2026-02" },
  { make: "JAGUAR", model: "XF", yearRange: [2016, 2024], fuel: "DIESEL", avgRetail: 20000, volatility: "volatile", lastUpdated: "2026-02" },
  { make: "JAGUAR", model: "I-PACE", yearRange: [2018, 2024], fuel: "ELECTRIC", avgRetail: 30000, volatility: "volatile", lastUpdated: "2026-02" },

  // ========================
  // === FORD (Commercial crossover) ===
  // ========================
  { make: "FORD", model: "TOURNEO CONNECT", yearRange: [2018, 2024], fuel: "DIESEL", avgRetail: 16000, volatility: "stable", lastUpdated: "2026-02" },
  { make: "FORD", model: "GALAXY", yearRange: [2015, 2024], fuel: "DIESEL", avgRetail: 15000, volatility: "moderate", lastUpdated: "2026-02" },
  { make: "FORD", model: "S-MAX", yearRange: [2015, 2024], fuel: "DIESEL", avgRetail: 14000, volatility: "moderate", lastUpdated: "2026-02" },

  // ========================
  // === PORSCHE (catch — manual only) ===
  // ========================
  // Deliberately NOT included. Porsche, Bentley, Rolls-Royce, Ferrari, Lamborghini,
  // Maserati, Aston Martin, McLaren, etc. must route to manual review.
  // The lookup returning null for these is a feature, not a bug.
];
```

**Entry count: ~210+ entries** covering the UK's top-selling makes with fuel variants and broader year ranges.

### Lookup Logic

```typescript
function getMarketValue(
  make: string,
  model: string,
  year: number,
  fuel: string
): { avgRetail: number; volatility: 'stable' | 'moderate' | 'volatile' } | null {

  const normMake = make.toUpperCase().trim();
  const normModel = model.toUpperCase().trim();
  const normFuel = fuel.toUpperCase().trim();

  // 1. Exact match (make + model + year + fuel)
  const exact = MARKET_DATA.find(e =>
    e.make === normMake &&
    e.model === normModel &&
    year >= e.yearRange[0] &&
    year <= e.yearRange[1] &&
    e.fuel === normFuel
  );
  if (exact) return { avgRetail: exact.avgRetail, volatility: exact.volatility };

  // 2. Fuzzy: match make + model + year, any fuel
  const fuelFuzzy = MARKET_DATA.find(e =>
    e.make === normMake &&
    e.model === normModel &&
    year >= e.yearRange[0] &&
    year <= e.yearRange[1]
  );
  if (fuelFuzzy) return { avgRetail: fuelFuzzy.avgRetail, volatility: fuelFuzzy.volatility };

  // 3. Fuzzy: match make + model, closest year range
  const modelMatches = MARKET_DATA.filter(e =>
    e.make === normMake && e.model === normModel
  );
  if (modelMatches.length > 0) {
    // Find the entry with the closest year range
    const closest = modelMatches.reduce((best, entry) => {
      const bestDist = Math.min(Math.abs(year - best.yearRange[0]), Math.abs(year - best.yearRange[1]));
      const entryDist = Math.min(Math.abs(year - entry.yearRange[0]), Math.abs(year - entry.yearRange[1]));
      return entryDist < bestDist ? entry : best;
    });
    // Only use if within 3 years of the range boundary
    const dist = year < closest.yearRange[0]
      ? closest.yearRange[0] - year
      : year > closest.yearRange[1]
        ? year - closest.yearRange[1]
        : 0;
    if (dist <= 3) {
      return { avgRetail: closest.avgRetail, volatility: closest.volatility };
    }
  }

  // 4. No match → manual review
  return null;
}
```

**When lookup returns null:**
- Don't show user a valuation.
- Show: "We'd love to make you an offer — one of our team will call you within 2 hours."
- Still capture lead details.
- Admin manually prices from their knowledge.
- Set `quoteMode = 'manual_review'`.

This is a feature. It forces human review on uncommon vehicles, prestige marques, classics, imports, and anything else that would produce an embarrassing automated quote.

---

## Part 3 — Pricing Engine (`pricingEngine.ts`)

### Main Function

```typescript
function calculateOffer(input: {
  vehicleProfile: VehicleProfile;
  condition: Condition;
  postcode: string;
}): ValuationResult
```

### Step-by-Step Calculation (12 Steps)

#### Step 1: Base Market Anchor

```
marketResult = getMarketValue(make, model, year, fuel)

if null → quoteMode = 'manual_review', return early with placeholder result
         (still generate risk flags and confidence for admin)

estimatedRetail = marketResult.avgRetail
volatility = marketResult.volatility

tradeBase = estimatedRetail × 0.80
```

The 0.80 factor accounts for: auction fees (~3-5%), transport (~£150-300), prep/reconditioning (~£200-800), listing costs, and your margin. This is the wholesale-to-retail gap.

#### Step 2: Age Depreciation Curve (Non-linear, Steeper Early)

```
vehicleAge = currentYear - yearOfManufacture

Depreciation rates by age band:
  0–3 years:   12% per year beyond year range midpoint
  4–7 years:    8% per year
  8–12 years:   6% per year
  12+ years:    0% (floor reached)
```

Implementation:
```typescript
function getAgeMultiplier(vehicleAge: number, yearRangeMidpoint: number): number {
  const currentYear = new Date().getFullYear();
  const ageFromMidpoint = currentYear - yearRangeMidpoint;

  // Only depreciate if current year is beyond the range midpoint
  if (ageFromMidpoint <= 0) return 1.00;

  let totalDepreciation = 0;

  for (let y = 1; y <= ageFromMidpoint; y++) {
    const effectiveAge = vehicleAge - (ageFromMidpoint - y);
    if (effectiveAge <= 3) totalDepreciation += 0.12;
    else if (effectiveAge <= 7) totalDepreciation += 0.08;
    else if (effectiveAge <= 12) totalDepreciation += 0.06;
    // 12+ = no additional depreciation
  }

  return Math.max(0.40, 1 - totalDepreciation);
}
```

Floor at 0.40 — don't depreciate below 40% of trade base. Older cars flatten in value. That's realistic and prevents absurdly low quotes on decent older cars.

#### Step 3: Mileage Risk Curve (Non-linear)

Use the RESOLVED mileage from MOT history (not user declared). Always.

```
Expected mileage = vehicleAge × 8000 (UK average annual)
mileageDelta = actualMileage - expectedMileage

Bands:
  delta < -20000 (low mileage):  +3% bonus     → multiplier 1.03
  delta -20000 to 0:             neutral        → multiplier 1.00
  delta 0 to +10000:             -3%            → multiplier 0.97
  delta +10000 to +20000:        -6%            → multiplier 0.94
  delta +20000 to +40000:        -12%           → multiplier 0.88
  delta +40000 to +60000:        -18%           → multiplier 0.82
  delta > +60000:                -25% (cap)     → multiplier 0.75
```

Progressive penalty, not flat. A car with 120k at 5 years old is much worse than 120k at 12 years old — the delta approach handles this naturally.

#### Step 4: MOT Risk Adjustment

From MOT analysis — compound the applicable penalties:

```
motMultiplier = 1.00

// Months remaining
if motMonthsRemaining >= 10:          motMultiplier += 0.02  (bonus)
else if motMonthsRemaining >= 4:      // neutral
else if motMonthsRemaining >= 1:      motMultiplier -= 0.03
else if motExpired:                   motMultiplier -= 0.07

// Recent failure history
if recentFailCount >= 2:              motMultiplier -= 0.03

// Advisory burden
if advisoryCount >= 8:                motMultiplier -= 0.03
else if advisoryCount >= 5:           motMultiplier -= 0.02

// Dangerous defect history (ever)
if dangerousDefects:                  motMultiplier -= 0.03

// Structural concerns (corrosion, subframe, chassis advisories)
if structuralAdvisories:              motMultiplier -= 0.04

// Brake advisories
if brakeAdvisories:                   motMultiplier -= 0.02

// Floor: MOT multiplier can't go below 0.80
motMultiplier = Math.max(0.80, motMultiplier)
```

#### Step 5: Fuel & Market Risk

```
Petrol:                           1.00 (neutral — baseline)
Diesel (≤5yr):                    0.97 (-3%)
Diesel (>5yr):                    0.94 (-6%, ULEZ + demand decline stacking)
Hybrid:                           1.03 (+3%, growing demand)
Electric (≤4yr):                  1.03 (+3%, strong used EV demand)
Electric (5–6yr):                 0.98 (-2%, battery warranty concerns start)
Electric (>6yr):                  0.90 (-10%, battery degradation uncertainty)
```

Electric vehicles older than 6 years take a harder hit in v2. Battery replacement costs (£5k–15k) create genuine buyer hesitation. The market reflects this.

#### Step 6: ULEZ Penalty

```
if !ulezCompliant:
  ulezMultiplier = 0.95     (-5%)
  add flag: "Non-ULEZ compliant — reduced urban demand"
else:
  ulezMultiplier = 1.00
```

This stacks with diesel penalty. A non-ULEZ diesel gets hit twice. That's intentional — they are demonstrably harder to sell in urban areas.

#### Step 7: Condition Multiplier

```
Excellent → 1.00      (no prep needed, ready for forecourt)
Good      → 0.97      (minor valeting, £100-200)
Fair      → 0.92      (bodywork/interior work, £300-800)
Poor      → 0.85      (significant reconditioning, £1000-2000+)
```

"Fair" and "Poor" eat margin directly. Price them in upfront.

#### Step 8: Regional Adjustment (`regionPricing.ts`)

Postcode prefix → region mapping:

```typescript
function getRegionMultiplier(postcode: string, fuel: FuelType, ulezCompliant: boolean): {
  multiplier: number;
  region: string;
  flags: string[];
} {
  const prefix = extractPostcodePrefix(postcode);
  const flags: string[] = [];

  // London
  if (['E','EC','N','NW','SE','SW','W','WC'].includes(prefix)) {
    if (fuel === 'diesel' && !ulezCompliant) {
      flags.push('Diesel non-ULEZ in London — severe demand penalty');
      return { multiplier: 0.93, region: 'London', flags };  // -7% (extra penalty)
    }
    if (fuel === 'diesel') {
      flags.push('Diesel in London — ULEZ-compliant but demand still soft');
      return { multiplier: 0.98, region: 'London', flags };
    }
    return { multiplier: 1.03, region: 'London', flags };  // +3%
  }

  // South East
  if (['RH','TN','GU','BN','ME','CT','DA','SS','CM','CO','BR','CR','KT','SM','SL','HP','AL','EN','HA','UB','TW'].includes(prefix)) {
    return { multiplier: 1.02, region: 'South East', flags };
  }

  // South West
  if (['BS','BA','GL','SN','SP','BH','DT','EX','PL','TQ','TA','TR'].includes(prefix)) {
    return { multiplier: 1.00, region: 'South West', flags };
  }

  // Midlands
  if (['B','CV','WS','WV','DY','DE','NG','LE','NN','MK','LU','ST','TF'].includes(prefix)) {
    return { multiplier: 1.00, region: 'Midlands', flags };
  }

  // North West
  if (['M','L','WA','WN','BL','OL','SK','CW','CH','PR','BB','FY','LA','CA'].includes(prefix)) {
    return { multiplier: 0.97, region: 'North West', flags };
  }

  // North East + Yorkshire
  if (['LS','BD','HG','YO','HU','DN','S','HD','WF','NE','SR','DH','DL','TS','HX'].includes(prefix)) {
    return { multiplier: 0.97, region: 'North East / Yorkshire', flags };
  }

  // Scotland
  if (['G','EH','AB','DD','KY','FK','PA','ML','KA','DG','IV','PH','HS','ZE','TD'].includes(prefix)) {
    return { multiplier: 0.96, region: 'Scotland', flags };
  }

  // Wales
  if (['CF','SA','NP','LL','SY','LD','HR'].includes(prefix)) {
    return { multiplier: 0.97, region: 'Wales', flags };
  }

  // Northern Ireland
  if (['BT'].includes(prefix)) {
    flags.push('Northern Ireland — transport logistics apply');
    return { multiplier: 0.94, region: 'Northern Ireland', flags };
  }

  // Rural / unmatched
  flags.push('Limited local demand — transport cost may apply');
  return { multiplier: 0.98, region: 'Other', flags };
}

function extractPostcodePrefix(postcode: string): string {
  // Extract alphabetic prefix: "SW1A 1AA" → "SW", "B1 1AA" → "B"
  const clean = postcode.toUpperCase().replace(/\s/g, '');
  const match = clean.match(/^([A-Z]{1,2})/);
  return match ? match[1] : '';
}
```

#### Step 9: Mileage Consistency Penalty

```
if mileageConsistency === 'rollback_detected':
  mileageConsistencyMultiplier = 0.85       (-15%)
  add flag: "⚠️ MILEAGE ROLLBACK DETECTED — manual review required"
  quoteMode = 'manual_review'

else if mileageConsistency === 'suspicious':
  mileageConsistencyMultiplier = 0.95       (-5%)
  add flag: "Mileage pattern irregular — verify at inspection"

else:
  mileageConsistencyMultiplier = 1.00

// Separate: user declaration mismatch
if mileageDiscrepancy:
  mileageConsistencyMultiplier *= 0.97      (additional -3%)
  add flag: "User-declared mileage doesn't match MOT records (Δ{discrepancyAmount} miles)"
```

#### Step 10: Volatility Adjustment (v2 NEW)

```
if volatility === 'stable':     volatilityMultiplier = 1.00
if volatility === 'moderate':   volatilityMultiplier = 0.98  (-2%)
if volatility === 'volatile':   volatilityMultiplier = 0.95  (-5%)
```

Volatile markets mean you might buy at today's price and sell into next month's dip. The buffer here is separate from the liquidity buffer — it's specifically about market movement risk.

#### Step 11: Keeper History Check (v2 NEW)

```typescript
function getKeeperMultiplier(dateOfLastV5C: string | null, vehicleAge: number): number {
  if (!dateOfLastV5C) return 1.00; // no data, neutral

  // If V5C was very recently issued (within 6 months) on an older car,
  // it might indicate a recent keeper change — flag for admin
  const monthsSinceV5C = monthsDiff(dateOfLastV5C, new Date().toISOString());

  if (vehicleAge > 3 && monthsSinceV5C < 6) {
    // Recent keeper change on non-new vehicle — possible trade sale flip
    return 0.98; // -2% caution
  }

  return 1.00;
}
```

#### Step 12: Liquidity Buffer

```
liquidityBuffer = 0.07   (7%)
```

Applied last. Protects against: market drops between quote and resale, auction underperformance, hidden faults discovered at inspection, and reconditioning overruns.

#### Step 13: Final Calculation

```
adjustedValue = tradeBase
  × ageMultiplier
  × mileageMultiplier
  × motMultiplier
  × fuelMultiplier
  × conditionMultiplier
  × regionMultiplier
  × ulezMultiplier
  × mileageConsistencyMultiplier
  × volatilityMultiplier
  × keeperMultiplier
  × (1 - liquidityBuffer)
```

Round to nearest £50:
```typescript
adjustedValue = Math.round(adjustedValue / 50) * 50;
```

#### Step 14: Dynamic Spread Strategy

Calculate risk score from accumulated flags:

```typescript
function calculateSpread(
  adjustedValue: number,
  riskFlags: string[],
  confidenceScore: number,
  volatility: 'stable' | 'moderate' | 'volatile'
): { spread: number; riskTier: RiskTier } {

  const flagCount = riskFlags.length;
  const hasRollback = riskFlags.some(f => f.includes('ROLLBACK'));
  const hasStructural = riskFlags.some(f => f.includes('structural') || f.includes('corrosion'));

  // Showstopper flags → manual only, max spread
  if (hasRollback) {
    return { spread: 0, riskTier: 'manual_only' };
  }

  // Base spread by flag count
  let spread: number;
  let tier: RiskTier;

  if (flagCount <= 1) {
    spread = 250;
    tier = 'low';
  } else if (flagCount <= 3) {
    spread = 400;
    tier = 'medium';
  } else if (flagCount <= 5) {
    spread = 650;
    tier = 'high';
  } else {
    spread = 900;
    tier = 'high';
  }

  // Widen for volatile markets
  if (volatility === 'volatile') spread = Math.round(spread * 1.3);
  else if (volatility === 'moderate') spread = Math.round(spread * 1.1);

  // Widen for structural concerns
  if (hasStructural) spread = Math.round(spread * 1.2);

  // Widen for low confidence
  if (confidenceScore < 50) spread = Math.round(spread * 1.3);

  // Scale spread with value — £250 spread on a £3000 car is different to £250 on a £30000 car
  // Minimum spread = 4% of adjusted value
  const minSpread = Math.round(adjustedValue * 0.04);
  spread = Math.max(spread, minSpread);

  // Cap spread at 15% of adjusted value
  const maxSpread = Math.round(adjustedValue * 0.15);
  spread = Math.min(spread, maxSpread);

  // Round to nearest £25
  spread = Math.round(spread / 25) * 25;

  return { spread, riskTier: tier };
}
```

```
min = adjustedValue - spread
max = adjustedValue + spread

// Floor: never show below £200
min = Math.max(200, min)

// Sanity: min must be < max
if (min >= max) max = min + 100;
```

Uncertainty widens range instead of increasing offer. That's sophisticated and safe.

---

## Part 4 — Confidence Score (`confidenceScorer.ts`)

Admin-only score, 0–100. Cumulative deductions from a perfect 100:

```typescript
function calculateConfidence(profile: VehicleProfile, condition: Condition): {
  score: number;
  deductions: { reason: string; amount: number }[];
} {
  let score = 100;
  const deductions: { reason: string; amount: number }[] = [];

  function deduct(reason: string, amount: number) {
    deductions.push({ reason, amount });
    score -= amount;
  }

  const vehicleAge = new Date().getFullYear() - profile.year;
  const mileage = profile.resolvedMileage;

  // === Age ===
  if (vehicleAge > 12) deduct('Vehicle over 12 years old', 15);
  else if (vehicleAge > 10) deduct('Vehicle over 10 years old', 10);
  else if (vehicleAge > 7) deduct('Vehicle over 7 years old', 5);

  // === Mileage ===
  if (mileage > 120000) deduct('Mileage over 120k', 15);
  else if (mileage > 100000) deduct('Mileage over 100k', 10);
  else if (mileage > 80000) deduct('Mileage over 80k', 5);

  // === Mileage integrity ===
  if (profile.motAnalysis.mileageConsistency === 'rollback_detected') {
    deduct('Mileage rollback detected', 30);
  } else if (profile.motAnalysis.mileageConsistency === 'suspicious') {
    deduct('Suspicious mileage pattern', 10);
  }
  if (profile.mileageDiscrepancy) {
    deduct('User-declared mileage vs MOT mismatch', 10);
  }

  // === MOT ===
  if (profile.motAnalysis.motExpired) deduct('MOT expired', 15);
  else if (profile.motAnalysis.motMonthsRemaining < 3) deduct('MOT expiring within 3 months', 5);

  if (profile.motAnalysis.recentFailCount >= 3) deduct('3+ recent MOT failures', 15);
  else if (profile.motAnalysis.recentFailCount >= 2) deduct('2 recent MOT failures', 10);

  if (profile.motAnalysis.advisoryCount >= 8) deduct('8+ advisories on latest MOT', 10);
  else if (profile.motAnalysis.advisoryCount >= 5) deduct('5+ advisories on latest MOT', 5);

  if (profile.motAnalysis.dangerousDefects) deduct('Dangerous defect in history', 10);
  if (profile.motAnalysis.structuralAdvisories) deduct('Structural/corrosion advisories', 10);

  // === Fuel ===
  if (profile.fuel === 'diesel') deduct('Diesel — market softness', 5);
  if (profile.fuel === 'electric' && vehicleAge > 6) deduct('Older electric — battery uncertainty', 15);
  else if (profile.fuel === 'electric' && vehicleAge > 4) deduct('Electric 5-6yr — battery warranty concerns', 5);

  // === Condition ===
  if (condition === 'poor') deduct('Condition: poor', 15);
  else if (condition === 'fair') deduct('Condition: fair', 5);

  // === ULEZ ===
  if (!profile.ulezCompliant) deduct('Non-ULEZ compliant', 5);

  // === SORN ===
  if (profile.spidered) deduct('SORN registered', 10);

  // === Data completeness ===
  if (profile.dataCompleteness < 60) deduct('Low data completeness', 15);
  else if (profile.dataCompleteness < 80) deduct('Moderate data gaps', 5);

  // === MOT history depth ===
  if (profile.motAnalysis.totalTestCount < 2 && vehicleAge > 4) {
    deduct('Limited MOT history for vehicle age', 10);
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    deductions,
  };
}
```

### Risk Flag Generation

Flags are generated throughout the pipeline and collected into the `riskFlags` array. Examples:

```
"High mileage for age (+42,000 over expected)"
"MOT expiring within 3 months (expires 2026-05-14)"
"Diesel — market softness"
"Older electric — battery degradation uncertainty"
"⚠️ MILEAGE ROLLBACK DETECTED — manual review required"
"User-declared mileage doesn't match MOT records (Δ8,200 miles)"
"Non-ULEZ compliant — reduced urban demand"
"SORN registered — not currently roadworthy/legal"
"Multiple recent MOT failures (2 of last 3)"
"Dangerous defect in MOT history"
"Structural/corrosion advisories present"
"No market data — manual quote required"
"Volatile market segment — wider spread applied"
"Recent keeper change on older vehicle"
"Diesel non-ULEZ in London — severe demand penalty"
"Northern Ireland — transport logistics apply"
"Brake system advisories on latest MOT"
```

Admin sees: confidence score + all deductions + all flags + all multiplier values. User sees: range only.

---

## Part 5 — Lead Capture & Verification (`leadVerification.ts`)

### The Conversion Gate

The valuation is the reward. Contact details are the price of admission.

**User flow:**
1. User enters reg → sees "2018 Ford Fiesta 1.0 EcoBoost — Petrol, Blue" (instant trust)
2. User confirms details, enters mileage, selects condition, notes damage
3. User enters: full name, phone number, email, postcode
4. OTP sent to phone via SMS
5. User enters OTP code
6. Valuation revealed

### Input Validation

```typescript
// UK mobile: starts 07, 11 digits total
function isValidUkMobile(phone: string): boolean {
  const clean = phone.replace(/[\s\-\(\)]/g, '');
  return /^07\d{9}$/.test(clean);
}

// UK postcode: loose format check
function isValidPostcode(postcode: string): boolean {
  const clean = postcode.toUpperCase().replace(/\s/g, '');
  return /^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$/.test(clean);
}

// Email: basic format
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Name: at least 2 words, no obvious junk
function isValidName(name: string): boolean {
  const trimmed = name.trim();
  return trimmed.length >= 3 && /\s/.test(trimmed);  // has at least one space
}
```

### OTP Verification

Use Twilio or MessageBird. ~2p per SMS.

```typescript
interface OTPSession {
  phone: string;
  code: string;           // 6-digit
  expiresAt: Date;        // 10 minutes
  attempts: number;       // max 3 before regeneration
  verified: boolean;
}

function generateOTP(): string {
  // Cryptographically random 6-digit code
  return crypto.randomInt(100000, 999999).toString();
}

async function sendOTP(phone: string): Promise<{ sessionId: string }> {
  // Rate check first
  if (await isPhoneRateLimited(phone)) {
    throw new Error('Too many verification attempts. Please try again later.');
  }

  const code = generateOTP();
  const session: OTPSession = {
    phone,
    code,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),  // 10 min
    attempts: 0,
    verified: false,
  };

  // Store in Redis/KV with TTL
  const sessionId = crypto.randomUUID();
  await store.set(`otp:${sessionId}`, session, { ttl: 600 });

  // Send SMS
  await smsProvider.send(phone, `Your valuation code is: ${code}. Valid for 10 minutes.`);

  return { sessionId };
}

async function verifyOTP(sessionId: string, userCode: string): Promise<boolean> {
  const session = await store.get<OTPSession>(`otp:${sessionId}`);
  if (!session) throw new Error('Session expired. Please request a new code.');
  if (session.verified) return true;
  if (new Date() > new Date(session.expiresAt)) throw new Error('Code expired.');
  if (session.attempts >= 3) throw new Error('Too many attempts. Request a new code.');

  session.attempts++;

  if (session.code === userCode) {
    session.verified = true;
    await store.set(`otp:${sessionId}`, session);
    return true;
  }

  await store.set(`otp:${sessionId}`, session);
  return false;
}
```

### Rate Limiting

```
Per IP:        max 5 valuations per hour     → prevents scripted bulk queries
Per phone:     max 3 valuations per day       → prevents phone reuse
Per IP + day:  max 15 valuations per day      → aggregate daily cap
OTP sends:     max 5 per phone per hour       → prevents SMS abuse
```

This prevents people reverse-engineering your pricing model by running hundreds of queries.

```typescript
interface RateLimitConfig {
  key: string;           // e.g. "ip:192.168.1.1" or "phone:07123456789"
  maxRequests: number;
  windowSeconds: number;
}

const RATE_LIMITS: RateLimitConfig[] = [
  { key: 'ip:{ip}:hourly', maxRequests: 5, windowSeconds: 3600 },
  { key: 'phone:{phone}:daily', maxRequests: 3, windowSeconds: 86400 },
  { key: 'ip:{ip}:daily', maxRequests: 15, windowSeconds: 86400 },
  { key: 'otp:{phone}:hourly', maxRequests: 5, windowSeconds: 3600 },
];
```

### Lead Storage

```typescript
// See Lead interface in types.ts

// Status transitions (valid paths only):
// new → contacted → inspected → offered → purchased
// new → contacted → inspected → offered → rejected
// new → contacted → no_response
// new → contacted → rejected
// new → expired (auto: after 30 days with no status change)
```

The `actualPurchasePrice`, `actualResalePrice`, `reconCost`, and `daysToSale` fields are critical for calibration. After 20–30 deals, compare engine predictions vs reality.

---

## Part 6 — Calibration Store (`calibrationStore.ts`)

This is the flywheel. Every completed transaction makes the engine smarter.

### Recording a Transaction

```typescript
async function recordTransaction(lead: Lead): Promise<void> {
  if (!lead.actualPurchasePrice) return;  // can't calibrate without purchase price

  const record: CalibrationRecord = {
    leadId: lead.id,
    make: lead.submission.vehicleProfile.make,
    model: lead.submission.vehicleProfile.model,
    year: lead.submission.vehicleProfile.year,
    fuel: lead.submission.vehicleProfile.fuel,
    condition: lead.submission.condition,
    engineMidpoint: lead.valuation.midpoint,
    actualPurchasePrice: lead.actualPurchasePrice,
    actualResalePrice: lead.actualResalePrice ?? null,
    reconCost: lead.reconCost ?? null,
    daysToSale: lead.daysToSale ?? null,
    deviation: lead.valuation.midpoint - lead.actualPurchasePrice,
    deviationPct: ((lead.valuation.midpoint - lead.actualPurchasePrice) / lead.actualPurchasePrice) * 100,
    region: getRegionFromPostcode(lead.submission.postcode),
    createdAt: new Date().toISOString(),
  };

  await db.calibrationRecords.insert(record);
}
```

### Calibration Analytics Queries

```typescript
// Average deviation (positive = engine was conservative = good)
async function getAverageDeviation(): Promise<{ avg: number; pct: number; count: number }>;

// Deviation by make/model (identify systematically wrong pricing)
async function getDeviationByMakeModel(): Promise<{ make: string; model: string; avgDev: number; count: number }[]>;

// Deviation by condition (is "fair" penalty too harsh?)
async function getDeviationByCondition(): Promise<{ condition: string; avgDev: number; count: number }[]>;

// Deviation by region (are regional multipliers accurate?)
async function getDeviationByRegion(): Promise<{ region: string; avgDev: number; count: number }[]>;

// Full P&L per transaction (if resale + recon data is available)
async function getMarginAnalysis(): Promise<{
  avgMargin: number;
  avgReconCost: number;
  avgDaysToSale: number;
  profitableRate: number;  // % of deals that made money
}>;

// Conversion funnel
async function getConversionFunnel(): Promise<{
  regEntries: number;
  otpVerified: number;
  contacted: number;
  inspected: number;
  purchased: number;
  conversionRate: number;
  costPerLead: number;
}>;
```

After sufficient data (30+ transactions), you can start identifying:
- Which multipliers are too conservative or too generous
- Which makes/models are systematically mispriced
- Whether regional adjustments match reality
- Whether condition penalties are calibrated correctly
- Average recon costs by condition grade
- Average days-to-sale (liquidity reality check)

This is how CAP/Glass/book values started. Models evolve from real trade data. Your lookup table is v1 — your transaction log becomes v2.

---

## Part 7 — Admin Dashboard Additions

Beyond what's already planned, admin needs:

### Lead Pipeline View

```
New (14) → Contacted (8) → Inspected (3) → Offered (2) → Purchased (1) → Rejected (4) → Expired (6)
```

Kanban or table with filters by: status, make/model, risk tier, date range, region.

### Per-Lead Detail View

Shows:
- Full vehicle profile
- All MOT history + mileage chart
- All risk flags (colour-coded by severity)
- Confidence score + deduction breakdown
- All multiplier values (admin transparency)
- Quote range shown to user
- Admin override controls (lock min/max, flag for manual call, block)
- Status progression timeline
- Post-deal fields: actual purchase price, resale price, recon cost, days to sale

### Calibration Dashboard

```
Engine Performance (last 30 days):
  Transactions completed: 24
  Avg engine midpoint: £8,340
  Avg actual purchase: £8,020
  Avg deviation: +£320 (engine slightly conservative — good)
  Avg margin after resale: £1,180
  Avg recon cost: £340
  Avg days to sale: 18

Conversion Funnel:
  Reg entries: 412
  OTP verified: 140 (34%)
  Contacted: 98 (70% of verified)
  Inspected: 42 (43% of contacted)
  Purchased: 24 (57% of inspected)
  Cost per lead (SMS): £2.80
  Cost per acquisition: £16.30

Systematic Flags:
  ⚠ Ford Fiesta 2015-2018: engine avg +£480 vs purchase (consider reducing avgRetail)
  ⚠ Scottish region multiplier: actual purchase avg -6% vs engine (consider -5% instead of -4%)
  ✓ Condition "fair" penalty well-calibrated (avg deviation +£80)
  ✓ Mileage curve tracking accurately
```

### Risk Override Controls

Admin can:
- Override any valuation before it's revealed (lock specific min/max)
- Flag a lead for manual call instead of automated quote
- Block specific makes/models from auto-quoting entirely
- Add makes/models to a "premium review" list (e.g. Porsche, Land Rover Defender)
- Adjust market data entries directly (with audit trail)
- Toggle `quoteMode` for any active lead

### Alerting

Admin gets immediate alerts for:
- Mileage rollback detected (highest priority)
- SORN vehicle valued
- Vehicle over £30k (high-value review)
- Confidence score below 40
- 3+ risk flags on any single vehicle
- Unusual volume from a single IP (bot detection)

---

## Part 8 — User Journey (Full Flow)

### Page 1: Landing

```
[Big input field: "Enter your registration"]
[Button: "Get instant valuation"]
[Small text: "Free, no obligation. Takes 60 seconds."]
```

Clean. One action. No distractions. No navigation clutter.

### Page 2: Vehicle Confirmed

```
"We found your vehicle:"

┌────────────────────────────────────────┐
│  2018 Ford Fiesta 1.0 EcoBoost        │
│  Petrol | Blue | 998cc                 │
│  MOT valid until March 2027            │
│  Euro 6 | ULEZ Compliant ✓            │
└────────────────────────────────────────┘

Is this correct? [Yes, continue] [No, different vehicle]

Approximate mileage: [________] (pre-filled from MOT if recent)

Condition:
  ○ Excellent — Like new, no visible wear
  ○ Good — Minor wear, good overall
  ○ Fair — Some cosmetic issues, mechanical sound
  ○ Poor — Significant wear or known issues

Any visible damage? ○ No  ○ Yes → [describe: ________]

[Button: "Continue"]
```

The instant data resolution is the trust moment. They typed 7 characters and you know everything about their car.

### Page 3: Contact Details

```
Full name:     [________________]
Phone number:  [________________] (UK mobile)
Email:         [________________]
Postcode:      [________________]

[Checkbox] I agree to be contacted about this valuation

[Button: "Get my valuation"]
```

### Page 4: OTP Verification

```
"We've sent a 6-digit code to 07*** ***456"

[______] (6-digit input, auto-advance on complete)

[Link: "Resend code"]
[Link: "Wrong number? Go back"]

Code expires in 9:42
```

### Page 5: Valuation Reveal

```
"Your provisional valuation"

        £3,200 — £3,700

"This is a provisional estimate based on the information provided.
 Final offer subject to vehicle inspection."

[Primary button: "Book free collection & inspection"]
[Secondary button: "Call us to discuss: 0800 XXX XXXX"]

[Small print:]
"Valuation valid for 7 days. Based on the vehicle details confirmed above.
 Subject to inspection confirming condition, mileage, and no undisclosed issues."
```

Never show a single number. Always a range. The range is honest and protects you.

**For manual review vehicles:**
```
"We'd love to make you an offer"

One of our specialists will call you within 2 hours to
discuss your [2019 Land Rover Defender]. We handle
specialist vehicles personally to ensure the best valuation.

[Button: "Call us now: 0800 XXX XXXX"]

Expect a call from us between [time window].
```

---

## Session 5 Deliverables

By end of session, built and working:

- [ ] `types.ts` — All shared interfaces, enums, and types (centralised)
- [ ] `dvlaService.ts` — DVLA VES API integration with error handling, rate limiting, input sanitisation
- [ ] `motService.ts` — MOT History API with full test parsing and odometer normalisation
- [ ] `mileageAnalyser.ts` — Consistency checking, rollback detection, discrepancy analysis
- [ ] `marketData.ts` — 210+ entry lookup table with volatility indicators and fuzzy matching
- [ ] `pricingEngine.ts` — Full 14-step conservative calculation pipeline
- [ ] `regionPricing.ts` — Postcode-to-region adjustment with fuel-specific London handling
- [ ] `confidenceScorer.ts` — Admin-only confidence scoring with itemised deductions
- [ ] `leadVerification.ts` — OTP via SMS + multi-layer rate limiting + input validation
- [ ] `calibrationStore.ts` — Transaction recording + analytics queries for engine tuning
- [ ] Dynamic spread calculation with volatility and value scaling
- [ ] Risk flag generation (15+ distinct flag types)
- [ ] Lead storage with pipeline status tracking + post-deal fields
- [ ] Full user journey (5 pages/steps with manual review variant)
- [ ] Admin pipeline view, calibration dashboard, risk override controls, alerting

**No scraping. No shady APIs. No fake AI. Fully controlled. Business-grade.**

---

## Post-Session: Calibration Plan

### Phase 1: Data Collection (transactions 1–30)

Record every deal outcome. Don't change multipliers yet. Just observe.

### Phase 2: First Calibration (after 30 transactions)

1. Compare `valuation.midpoint` vs `actualPurchasePrice` — are you systematically high or low?
2. Compare `actualPurchasePrice` vs `resalePrice - reconCost` — are you making money?
3. Check deviation by make/model — are some consistently mispriced?
4. Check deviation by region — are regional multipliers right?
5. Check deviation by condition — are penalties appropriate?
6. Adjust the most egregious outliers first.

### Phase 3: Ongoing Calibration (every 50 transactions)

1. Update market data table prices monthly from real listings.
2. Adjust multipliers where calibration data shows systematic error.
3. Add new make/model entries as you encounter and price them.
4. Review volatile vs stable classification quarterly.
5. Track `daysToSale` to validate liquidity buffer — if selling fast, buffer might be too high.

### Phase 4: Model Evolution

At 200+ transactions:
- Build make/model-specific depreciation curves from your own data.
- Replace generic mileage bands with observed price sensitivity.
- Introduce seasonal adjustments (convertibles in spring, 4x4s in winter).
- Consider per-model trade base percentages instead of flat 80%.

That's how CAP/Glass started. Models evolve from real trade data. Your lookup table is v1 — your transaction log becomes v2 — your model becomes v3.