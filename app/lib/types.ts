// ═══════════════════════════════════════════════════════════════════════════════
// Shared Types — Valuation Engine v2 + CRM/Admin
// ═══════════════════════════════════════════════════════════════════════════════

// ── Admin / CRM enums ──────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'inspector'

export type FinanceStatus = 'not_checked' | 'clear' | 'finance_found'

export type AppointmentType = 'in_person' | 'video'

export type AppointmentStatus = 'booked' | 'completed' | 'cancelled' | 'no_show'

// ── Valuation Engine v2 enums ──────────────────────────────────────────────────

export type FuelType = 'petrol' | 'diesel' | 'hybrid' | 'electric'

export type Condition = 'excellent' | 'good' | 'fair' | 'poor'

export type MileageConsistency = 'consistent' | 'suspicious' | 'rollback_detected'

export type RiskTier = 'low' | 'medium' | 'high' | 'manual_only'

export type QuoteMode = 'auto' | 'manual_review' | 'blocked'

export type LeadStatus =
  | 'new'
  | 'contacted'
  | 'appointment_booked'
  | 'inspected'
  | 'offer_approved'
  | 'offered'
  | 'purchased'
  | 'rejected'
  | 'no_response'
  | 'expired'
  | 'won'
  | 'lost'

/**
 * Valid status transitions map.
 * Each key maps to the set of statuses it can transition TO.
 * Any transition not in this map is considered invalid and will be logged.
 */
export const VALID_STATUS_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  new:               ['contacted', 'appointment_booked', 'no_response', 'expired', 'rejected'],
  contacted:         ['appointment_booked', 'no_response', 'expired', 'rejected'],
  appointment_booked:['inspected', 'no_response', 'expired', 'rejected'],
  inspected:         ['offer_approved', 'rejected', 'no_response'],
  offer_approved:    ['offered', 'rejected'],
  offered:           ['purchased', 'won', 'rejected', 'lost'],
  purchased:         ['won', 'lost'],
  rejected:          ['new'],               // Allow re-opening a rejected lead
  no_response:       ['contacted', 'expired'],
  expired:           ['new'],               // Allow re-quoting an expired lead
  won:               [],                    // Terminal state
  lost:              ['new'],               // Allow re-opening
}

/**
 * Check whether a status transition is valid.
 * Returns true if allowed, false if not.
 */
export function isValidStatusTransition(from: LeadStatus, to: LeadStatus): boolean {
  if (from === to) return true // No-op is always valid
  const allowed = VALID_STATUS_TRANSITIONS[from]
  return allowed ? allowed.includes(to) : false
}

// ── MOT Analysis ──────────────────────────────────────────────────────────────

export interface MOTDefect {
  type: 'DANGEROUS' | 'MAJOR' | 'MINOR' | 'ADVISORY'
  text: string
}

export interface MOTTestRecord {
  completedDate: string
  testResult: 'PASSED' | 'FAILED'
  odometerValue: number
  odometerUnit: 'mi' | 'km'
  motTestNumber: string
  expiryDate: string | null
  defects: MOTDefect[]
}

export interface MOTAnalysis {
  motMonthsRemaining: number
  motExpired: boolean
  latestMileage: number | null
  mileageHistory: { date: string; mileage: number }[]
  annualMileageEstimate: number
  mileageConsistency: MileageConsistency
  rollbackAmount: number | null
  recentFailCount: number
  totalFailCount: number
  advisoryCount: number
  dangerousDefects: boolean
  structuralAdvisories: boolean
  structuralAdvisoryCount: number
  brakeAdvisories: boolean
  riskAdvisories: string[]
  totalTestCount: number
}

// ── Vehicle Profile ───────────────────────────────────────────────────────────

export interface VehicleProfile {
  reg: string
  make: string
  model: string
  year: number
  fuel: FuelType
  engineCC: number
  colour: string
  co2: number
  euroStatus: string
  ulezCompliant: boolean
  taxStatus: string
  sornRegistered: boolean
  dateOfLastV5C: string | null
  motAnalysis: MOTAnalysis
  resolvedMileage: number
  userDeclaredMileage: number
  mileageDiscrepancy: boolean
  mileageDiscrepancyAmount: number
  dataCompleteness: number
}

// ── Market Data ───────────────────────────────────────────────────────────────

export interface MarketEntry {
  make: string
  model: string
  yearRange: [number, number]
  fuel: string
  avgRetail: number
  volatility: 'stable' | 'moderate' | 'volatile'
  lastUpdated: string
}

export type Volatility = 'stable' | 'moderate' | 'volatile'

export type MarketMatchQuality = 'exact' | 'fuel_fuzzy' | 'year_fuzzy' | 'partial' | 'none'

// ── Quote Explanation ──────────────────────────────────────────────────────────

/** Customer-safe explanation bullets — neutral language, no "fraud" wording */
export interface QuoteExplanation {
  bullets: string[]            // 3–5 customer-facing lines
  summary: string              // one-line summary, e.g. "Your offer is based on…"
}

/** Admin-facing deep explanation — severity, rule, recon breakdown */
export interface AdminExplanationItem {
  rule: string                 // e.g. 'MOT_EXPIRED', 'EV_BATTERY_8PLUS'
  severity: 'info' | 'warning' | 'critical'
  description: string          // human-readable
  impact: string               // e.g. '-7%', 'blocked', '£2,170 recon'
}

/** Profit simulation (admin-only) */
export type ProfitRiskBand = 'green' | 'amber' | 'red'

export interface ProfitSimulation {
  /** @deprecated Use ProfitSimulationV4 when available */
  estimatedRetail: number
  sellCostPct: number          // default 5% (auction/prep/transport)
  reconEstimate: number
  expectedProfitMin: number
  expectedProfitMid: number
  expectedProfitMax: number
  profitRiskBand: ProfitRiskBand
  guardrailTriggered: boolean  // true if profit < threshold → manual_review
  guardrailReason: string | null
}

// ── Profit Simulation V4 (Resale Evidence Engine) ─────────────────────────────

export type ConfidenceLevelV4 = 'high' | 'medium' | 'low'

export interface ResaleEstimate {
  low: number
  mid: number
  high: number
}

export interface ProfitEstimate {
  low: number
  mid: number
  high: number
}

export interface EvidencePayload {
  compsSummary: string
  variance: string
  similarityThreshold: number
  compCount: number
  providers: string[]
}

export interface AdjustmentDriver {
  factor: string
  impact: string
  direction: 'positive' | 'negative' | 'neutral'
}

export interface SellCostBreakdownV4 {
  platformFeePct: number
  valetingGBP: number
  warrantyAllowanceGBP: number
  adminGBP: number
  totalPct: number
  totalGBP: number
  breakdown: string[]
}

export interface TimeToSellResultV4 {
  expectedDaysMin: number
  expectedDaysMid: number
  expectedDaysMax: number
  timeRiskDiscountPct: number
  explanation: string
  signals: string[]
}

export interface CostsAndTimePayload {
  sellCostBreakdown: SellCostBreakdownV4
  timeToSell: TimeToSellResultV4
}

export interface CompListingV4 {
  source: string
  title: string
  price: number
  year: number
  mileage: number | null
  fuel: string | null
  engineCC: number | null
  transmission: string | null
  bodyType: string | null
  colour: string | null
  listingAgeDays: number | null
  location: string | null
  url: string | null
}

export interface ProfitSimulationV4 {
  // Compact view
  resale: ResaleEstimate
  profit: ProfitEstimate
  marginPctMid: number
  confidence: ConfidenceLevelV4
  confidenceScore: number
  compactNote: string
  // Detail payloads
  evidence: EvidencePayload
  adjustmentDrivers: AdjustmentDriver[]
  costsAndTime: CostsAndTimePayload
  topComps: CompListingV4[]
  // Guardrails
  guardrailTriggered: boolean
  guardrailReason: string | null
  // Shadow mode delta
  v3ProfitMidDelta: number | null
}

// ── Valuation Result ──────────────────────────────────────────────────────────

export interface MultiplierBreakdown {
  tradeBase: number
  ageMultiplier: number
  mileageMultiplier: number
  motMultiplier: number
  fuelMultiplier: number
  conditionMultiplier: number
  regionMultiplier: number
  ulezMultiplier: number
  mileageConsistencyMultiplier: number
  volatilityMultiplier: number
  keeperMultiplier: number
  sornMultiplier: number
  reconMultiplier: number
  reconEstimate: number
  marketConfidenceMultiplier: number
  inputTrustMultiplier: number
  segmentMultiplier: number
  liquidityBuffer: number
  // Debug fields: visible in admin breakdown
  combinedAdjustment: number
  rawValue: number
}

export interface ValuationResult {
  min: number
  max: number
  midpoint: number
  adjustedValue: number
  confidenceScore: number
  confidenceDeductions: { reason: string; amount: number }[]
  riskFlags: string[]
  riskTier: RiskTier
  marketValueUsed: number
  marketDataMatched: boolean
  allMultipliers: MultiplierBreakdown
  quoteMode: QuoteMode
  matchQuality: MarketMatchQuality
  regionUsed: string
  spreadApplied: number
  calculatedAt: string
  expiresAt: string
  // Explanation payloads
  customerExplanation: QuoteExplanation
  adminExplanation: AdminExplanationItem[]
  profitSimulation: ProfitSimulation
  /** V4 profit simulation — async enrichment, null until enriched */
  profitSimulationV4?: ProfitSimulationV4 | null
}

// ── Lead Submission ───────────────────────────────────────────────────────────

export interface LeadSubmission {
  vehicleProfile: VehicleProfile
  condition: Condition
  visibleDamage: boolean
  damageDescription: string | null
  name: string
  phone: string
  email: string
  postcode: string
  otpVerified: boolean
  ipAddress: string
  userAgent: string
  submittedAt: string
}

// ── Calibration ───────────────────────────────────────────────────────────────

export interface CalibrationRecord {
  leadId: string
  make: string
  model: string
  year: number
  fuel: FuelType
  condition: Condition
  engineMidpoint: number
  actualPurchasePrice: number
  actualResalePrice: number | null
  reconCost: number | null
  daysToSale: number | null
  deviation: number
  deviationPct: number
  region: string
  createdAt: string
}

// ── Admin / CRM Interfaces ────────────────────────────────────────────────────

export interface UserProfile {
  id: string
  name: string
  email: string
  role: UserRole
  is_active: boolean
  created_at: string
  last_login_at: string | null
}

export interface Lead {
  id: string
  created_at: string
  seller_name: string
  seller_phone: string
  seller_email: string
  seller_postcode: string
  reg: string
  make: string | null
  model: string | null
  year: number | null
  fuel: string | null
  transmission: string | null
  colour: string | null
  mileage: number
  condition: Condition
  estimated_min: number | null
  estimated_max: number | null
  status: LeadStatus
  finance_status: FinanceStatus
  assigned_inspector_id: string | null
  source: string | null
  consent_marketing: boolean
  consent_data_processing: boolean
  pending_photo_urls: string[] | null
  outcome: 'won' | 'lost' | null
  reason_if_lost: string | null
  final_offer: number | null
  outcome_at: string | null
  actual_purchase_price: number | null
  actual_resale_price: number | null
  recon_cost: number | null
  days_to_sale: number | null
}

export interface Appointment {
  id: string
  lead_id: string
  type: AppointmentType
  start_at: string
  end_at: string
  status: AppointmentStatus
  location_or_link: string | null
  created_at: string
}

export interface Inspection {
  id: string
  lead_id: string
  inspector_id: string
  checklist_json: Record<string, unknown>
  photo_urls: string[]
  recommended_offer: number | null
  notes: string | null
  submitted_at: string | null
}

export interface Note {
  id: string
  lead_id: string
  author_user_id: string
  body: string
  created_at: string
}

export interface AuditLogEntry {
  id: string
  lead_id: string
  action:
    | 'status_change'
    | 'finance_change'
    | 'assignment_change'
    | 'note_added'
    | 'inspection_submitted'
    | 'photos_uploaded'
    | 'outcome_recorded'
    | 'valuation_snapshot'
    | 'calibration_recorded'
  actor_user_id: string
  old_value: Record<string, unknown> | null
  new_value: Record<string, unknown> | null
  created_at: string
}

export interface ValuationSnapshot {
  id: string
  lead_id: string
  created_at: string
  input_vehicle: Record<string, unknown>
  input_condition: string
  input_postcode: string
  result_min: number
  result_max: number
  result_midpoint: number
  confidence_score: number
  risk_tier: RiskTier
  risk_flags: string[]
  auto_quote: boolean
  market_value_used: number
  all_multipliers: Record<string, number>
  region_used: string
  engine_version: string
}
