/**
 * Confidence Scorer v2 — Admin-only scoring with itemised deductions.
 *
 * Starts at 100, deducts based on risk factors.
 * Returns score + full deduction breakdown for admin transparency.
 *
 * Spec reference: valuationeng.md Part 4
 */

import type { VehicleProfile, Condition } from '@/lib/types'

const CURRENT_YEAR = 2026

export interface ConfidenceResult {
  score: number
  deductions: { reason: string; amount: number }[]
}

export function calculateConfidence(
  profile: VehicleProfile,
  condition: Condition
): ConfidenceResult {
  let score = 100
  const deductions: { reason: string; amount: number }[] = []

  function deduct(reason: string, amount: number) {
    deductions.push({ reason, amount })
    score -= amount
  }

  const vehicleAge = CURRENT_YEAR - profile.year
  const mileage = profile.resolvedMileage

  // === Age ===
  if (vehicleAge > 12) deduct('Vehicle over 12 years old', 15)
  else if (vehicleAge > 10) deduct('Vehicle over 10 years old', 10)
  else if (vehicleAge > 7) deduct('Vehicle over 7 years old', 5)

  // === Mileage ===
  if (mileage > 120000) deduct('Mileage over 120k', 15)
  else if (mileage > 100000) deduct('Mileage over 100k', 10)
  else if (mileage > 80000) deduct('Mileage over 80k', 5)

  // === Mileage integrity ===
  if (profile.motAnalysis.mileageConsistency === 'rollback_detected') {
    deduct('Mileage rollback detected', 30)
  } else if (profile.motAnalysis.mileageConsistency === 'suspicious') {
    deduct('Suspicious mileage pattern', 10)
  }
  if (profile.mileageDiscrepancy) {
    deduct('User-declared mileage vs MOT mismatch', 10)
  }

  // === MOT ===
  if (profile.motAnalysis.motExpired) deduct('MOT expired', 15)
  else if (profile.motAnalysis.motMonthsRemaining < 3)
    deduct('MOT expiring within 3 months', 5)

  if (profile.motAnalysis.recentFailCount >= 3) deduct('3+ recent MOT failures', 15)
  else if (profile.motAnalysis.recentFailCount >= 2)
    deduct('2 recent MOT failures', 10)

  if (profile.motAnalysis.advisoryCount >= 8)
    deduct('8+ advisories on latest MOT', 10)
  else if (profile.motAnalysis.advisoryCount >= 5)
    deduct('5+ advisories on latest MOT', 5)

  if (profile.motAnalysis.dangerousDefects) deduct('Dangerous defect in history', 10)
  if (profile.motAnalysis.structuralAdvisories)
    deduct('Structural/corrosion advisories', 10)

  // === Fuel ===
  if (profile.fuel === 'diesel') deduct('Diesel — market softness', 5)
  if (profile.fuel === 'electric' && vehicleAge > 6)
    deduct('Older electric — battery uncertainty', 15)
  else if (profile.fuel === 'electric' && vehicleAge > 4)
    deduct('Electric 5-6yr — battery warranty concerns', 5)

  // === Condition ===
  if (condition === 'poor') deduct('Condition: poor', 15)
  else if (condition === 'fair') deduct('Condition: fair', 5)

  // === ULEZ ===
  if (!profile.ulezCompliant) deduct('Non-ULEZ compliant', 5)

  // === SORN ===
  if (profile.sornRegistered) deduct('SORN registered', 10)

  // === Data completeness ===
  if (profile.dataCompleteness < 60) deduct('Low data completeness', 15)
  else if (profile.dataCompleteness < 80) deduct('Moderate data gaps', 5)

  // === MOT history depth ===
  if (profile.motAnalysis.totalTestCount < 2 && vehicleAge > 4) {
    deduct('Limited MOT history for vehicle age', 10)
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    deductions,
  }
}
