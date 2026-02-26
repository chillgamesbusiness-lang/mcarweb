/**
 * Mileage Analyser v2.
 *
 * Full spec implementation:
 * - Rollback detection with amount tracking
 * - Suspicious pattern detection (low/high/zero-increase)
 * - Annual mileage estimation
 * - User-declared vs MOT discrepancy with direction
 * - Structural/brake/corrosion advisory classification
 * - Complete MOT analysis builder
 *
 * Spec reference: valuationeng.md Part 1C + 1D
 */

import type {
  MOTAnalysis,
  MOTTestRecord,
  MileageConsistency,
} from '@/lib/types'

// ── Date helpers ───────────────────────────────────────────────────────────────

function daysDiff(a: string, b: string): number {
  return Math.abs(
    (new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24)
  )
}

function monthsDiff(a: string, b: string): number {
  return daysDiff(a, b) / 30.44
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

// ── Mileage consistency analysis ───────────────────────────────────────────────

export interface MileageAnalysisResult {
  consistency: MileageConsistency
  annualEstimate: number
  rollbackAmount: number | null
  flags: string[]
}

export function analyseMileageHistory(
  history: { date: string; mileage: number }[],
  vehicleAge: number
): MileageAnalysisResult {
  const flags: string[] = []
  let rollbackDetected = false
  let rollbackAmount: number | null = null
  let suspicious = false

  // Need at least 2 readings for comparison
  if (history.length < 2) {
    return {
      consistency: 'consistent',
      annualEstimate:
        history.length === 1
          ? Math.round(history[0].mileage / Math.max(vehicleAge, 1))
          : 8000,
      rollbackAmount: null,
      flags:
        history.length < 2
          ? ['Insufficient MOT history for mileage verification']
          : [],
    }
  }

  for (let i = 1; i < history.length; i++) {
    const prev = history[i - 1]
    const curr = history[i]

    const between = daysDiff(prev.date, curr.date)
    const yearsBetween = between / 365.25
    const milesDiff = curr.mileage - prev.mileage

    // === ROLLBACK CHECK ===
    if (curr.mileage < prev.mileage) {
      rollbackDetected = true
      rollbackAmount = prev.mileage - curr.mileage
      flags.push(
        `Mileage rollback: ${prev.mileage.toLocaleString()} → ${curr.mileage.toLocaleString()} ` +
          `(${rollbackAmount.toLocaleString()} miles lost between ${formatDate(prev.date)} and ${formatDate(curr.date)})`
      )
      continue
    }

    if (yearsBetween < 0.1) continue // skip readings too close

    const annualRate = yearsBetween > 0 ? milesDiff / yearsBetween : 0

    // === EXCESSIVE MILEAGE ===
    if (annualRate > 25000) {
      flags.push(
        `High annual mileage: ~${Math.round(annualRate).toLocaleString()}/yr ` +
          `between ${formatDate(prev.date)} and ${formatDate(curr.date)}`
      )
      suspicious = true
    }

    // === SUSPICIOUSLY LOW ===
    if (annualRate < 1000 && yearsBetween >= 0.8) {
      flags.push(
        `Suspiciously low mileage: ~${Math.round(annualRate).toLocaleString()}/yr ` +
          `between ${formatDate(prev.date)} and ${formatDate(curr.date)} — possible clocking or long-term storage`
      )
      suspicious = true
    }

    // === EXACT SAME MILEAGE ===
    if (milesDiff === 0 && yearsBetween >= 0.8) {
      flags.push(
        `Zero mileage increase over ${Math.round(yearsBetween * 12)} months — data anomaly`
      )
      suspicious = true
    }
  }

  // Calculate annual estimate from first and last reading
  const first = history[0]
  const last = history[history.length - 1]
  const totalYears = daysDiff(first.date, last.date) / 365.25
  const annualEstimate =
    totalYears > 0
      ? Math.round((last.mileage - first.mileage) / totalYears)
      : Math.round(last.mileage / Math.max(vehicleAge, 1))

  return {
    consistency: rollbackDetected
      ? 'rollback_detected'
      : suspicious
        ? 'suspicious'
        : 'consistent',
    annualEstimate,
    rollbackAmount,
    flags,
  }
}

// ── Mileage discrepancy check (user vs MOT) ────────────────────────────────────

export function checkMileageDiscrepancy(
  userDeclared: number,
  motLatest: number,
  motDate: string
): { discrepancy: boolean; amount: number; direction: string } {
  const monthsSinceMot = monthsDiff(motDate, new Date().toISOString())
  // Estimate reasonable mileage since last MOT (~700/month average)
  const estimatedSinceMot = monthsSinceMot * 700
  const expectedCurrent = motLatest + estimatedSinceMot

  const diff = Math.abs(userDeclared - expectedCurrent)
  const direction =
    userDeclared > expectedCurrent ? 'user_higher' : 'user_lower'

  // Threshold: 5000 miles OR 20% of expected — whichever is smaller
  const threshold = Math.min(5000, expectedCurrent * 0.2)

  return {
    discrepancy: diff > threshold,
    amount: Math.round(diff),
    direction,
  }
}

// ── Build full MOT analysis from test records ──────────────────────────────────

const STRUCTURAL_KEYWORDS = [
  'corrosi',
  'rust',
  'subframe',
  'chassis',
  'structural',
  'sill',
  'mounting',
  'outrigger',
]

const BRAKE_KEYWORDS = [
  'brake',
  'braking',
  'disc',
  'pad',
  'caliper',
  'handbrake',
  'parking brake',
]

export function buildMotAnalysis(
  tests: MOTTestRecord[],
  vehicleAge: number,
  motExpiryDate?: string
): MOTAnalysis {
  // Sort newest-first
  const sorted = [...tests].sort(
    (a, b) =>
      new Date(b.completedDate).getTime() -
      new Date(a.completedDate).getTime()
  )

  // MOT months remaining
  let motMonthsRemaining = 0
  let motExpired = false
  if (motExpiryDate) {
    const expiry = new Date(motExpiryDate)
    const now = new Date()
    const diffMs = expiry.getTime() - now.getTime()
    motMonthsRemaining = Math.max(
      0,
      Math.round(diffMs / (1000 * 60 * 60 * 24 * 30.44))
    )
    motExpired = diffMs < 0
  }

  // Build mileage history (oldest-first for analysis)
  const mileageHistory = sorted
    .filter((t) => t.odometerValue > 0)
    .map((t) => ({ date: t.completedDate, mileage: t.odometerValue }))
    .reverse()

  const latestMileage =
    mileageHistory.length > 0
      ? mileageHistory[mileageHistory.length - 1].mileage
      : 0

  // Mileage analysis
  const mileageResult = analyseMileageHistory(mileageHistory, vehicleAge)

  // Recent fail count (last 3 tests)
  const last3 = sorted.slice(0, 3)
  const recentFailCount = last3.filter(
    (t) => t.testResult === 'FAILED'
  ).length

  // Total fail count
  const totalFailCount = sorted.filter(
    (t) => t.testResult === 'FAILED'
  ).length

  // Advisory count on latest test
  const advisoryCount =
    sorted.length > 0
      ? sorted[0].defects.filter((d) => d.type === 'ADVISORY').length
      : 0

  // Dangerous defects ever
  const dangerousDefects = sorted.some((t) =>
    t.defects.some((d) => d.type === 'DANGEROUS')
  )

  // Structural/corrosion advisories
  const structuralAdvisories = sorted.some((t) =>
    t.defects.some(
      (d) =>
        d.type === 'ADVISORY' &&
        STRUCTURAL_KEYWORDS.some((kw) => d.text.toLowerCase().includes(kw))
    )
  )

  // Brake advisories on latest test
  const brakeAdvisories =
    sorted.length > 0 &&
    sorted[0].defects.some(
      (d) =>
        (d.type === 'ADVISORY' || d.type === 'MINOR') &&
        BRAKE_KEYWORDS.some((kw) => d.text.toLowerCase().includes(kw))
    )

  // Risk-relevant advisories from latest test
  const riskKeywords = [
    'brake',
    'suspension',
    'steering',
    'corrosi',
    'rust',
    'oil leak',
    'exhaust',
    'tyre',
    'structural',
    'subframe',
    'worn',
    'play',
    'deteriorat',
  ]
  const riskAdvisories: string[] = []
  if (sorted.length > 0) {
    for (const defect of sorted[0].defects) {
      if (
        defect.type === 'ADVISORY' &&
        riskKeywords.some((kw) => defect.text.toLowerCase().includes(kw))
      ) {
        riskAdvisories.push(defect.text)
      }
    }
  }

  return {
    motMonthsRemaining,
    motExpired,
    latestMileage,
    mileageHistory,
    annualMileageEstimate: mileageResult.annualEstimate,
    mileageConsistency: mileageResult.consistency,
    rollbackAmount: mileageResult.rollbackAmount,
    recentFailCount,
    totalFailCount,
    advisoryCount,
    dangerousDefects,
    structuralAdvisories,
    brakeAdvisories,
    riskAdvisories,
    totalTestCount: sorted.length,
  }
}

// ── Helpers for vehicles with no MOT data ──────────────────────────────────────

export function newVehicleExemptAnalysis(
  userMileage: number,
  vehicleAge: number
): MOTAnalysis {
  return {
    motMonthsRemaining: 12,
    motExpired: false,
    latestMileage: userMileage,
    mileageHistory: [],
    annualMileageEstimate: Math.round(userMileage / Math.max(vehicleAge, 1)),
    mileageConsistency: 'consistent',
    rollbackAmount: null,
    recentFailCount: 0,
    totalFailCount: 0,
    advisoryCount: 0,
    dangerousDefects: false,
    structuralAdvisories: false,
    brakeAdvisories: false,
    riskAdvisories: [],
    totalTestCount: 0,
  }
}

export function unknownMotAnalysis(): MOTAnalysis {
  return {
    motMonthsRemaining: 0,
    motExpired: true,
    latestMileage: 0,
    mileageHistory: [],
    annualMileageEstimate: 8000,
    mileageConsistency: 'suspicious',
    rollbackAmount: null,
    recentFailCount: 0,
    totalFailCount: 0,
    advisoryCount: 0,
    dangerousDefects: false,
    structuralAdvisories: false,
    brakeAdvisories: false,
    riskAdvisories: [],
    totalTestCount: 0,
  }
}

