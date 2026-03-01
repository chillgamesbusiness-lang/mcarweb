/**
 * Input Hardening — Sanitize & validate all user-controllable engine inputs.
 *
 * Every field that flows into calculateValuation() must pass through here.
 * Defense-in-depth: even if upstream checks exist, this module is the last gate.
 */

// ── Constants ──────────────────────────────────────────────────────────────────

/** Absolute mileage bounds — anything outside is rejected or clamped. */
export const MILEAGE_MIN = 0
export const MILEAGE_MAX = 500_000 // 500k miles — beyond this is data error

/** Condition must be one of these exact values. */
export const VALID_CONDITIONS = ['excellent', 'good', 'fair', 'poor'] as const
export type ValidCondition = (typeof VALID_CONDITIONS)[number]

/** UK postcode regex (loose — covers all valid formats). */
const UK_POSTCODE_REGEX = /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i

/** UUID v4 regex for ID validation */
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/** Max risk flags carried in token/snapshot */
export const MAX_RISK_FLAGS = 15

/** Max customer explanation bullets */
export const MAX_EXPLANATION_BULLETS = 10

/** Max admin explanation items */
export const MAX_ADMIN_EXPLANATION_ITEMS = 30

// ── Validators ─────────────────────────────────────────────────────────────────

export function validateMileage(value: unknown): { valid: true; mileage: number } | { valid: false; error: string } {
  if (value === null || value === undefined) {
    return { valid: false, error: 'Mileage is required' }
  }
  const n = typeof value === 'string' ? parseInt(value, 10) : Number(value)
  if (isNaN(n) || !isFinite(n)) {
    return { valid: false, error: 'Mileage must be a number' }
  }
  if (n < MILEAGE_MIN) {
    return { valid: false, error: `Mileage cannot be negative` }
  }
  if (n > MILEAGE_MAX) {
    return { valid: false, error: `Mileage exceeds maximum (${MILEAGE_MAX.toLocaleString()})` }
  }
  return { valid: true, mileage: Math.round(n) }
}

export function validateCondition(value: unknown): { valid: true; condition: ValidCondition } | { valid: false; error: string } {
  if (!value || typeof value !== 'string') {
    return { valid: false, error: 'Condition is required' }
  }
  const lower = value.toLowerCase().trim()
  if (!VALID_CONDITIONS.includes(lower as ValidCondition)) {
    return { valid: false, error: `Condition must be one of: ${VALID_CONDITIONS.join(', ')}` }
  }
  return { valid: true, condition: lower as ValidCondition }
}

export function validatePostcode(value: unknown): { valid: true; postcode: string } | { valid: false; error: string } {
  if (!value || typeof value !== 'string') {
    return { valid: false, error: 'Postcode is required' }
  }
  const clean = value.trim().toUpperCase().replace(/\s+/g, ' ')
  // Strip all spaces for regex check, then re-format
  const compact = clean.replace(/\s/g, '')
  if (!UK_POSTCODE_REGEX.test(compact)) {
    return { valid: false, error: 'Invalid UK postcode format' }
  }
  // Normalize: outward + space + inward
  const formatted = compact.length > 3
    ? compact.slice(0, -3) + ' ' + compact.slice(-3)
    : compact
  return { valid: true, postcode: formatted }
}

export function validateUuid(value: unknown): { valid: true; uuid: string } | { valid: false; error: string } {
  if (!value || typeof value !== 'string') {
    return { valid: false, error: 'UUID is required' }
  }
  const trimmed = value.trim()
  if (!UUID_V4_REGEX.test(trimmed)) {
    return { valid: false, error: 'Invalid UUID format' }
  }
  return { valid: true, uuid: trimmed.toLowerCase() }
}

// ── Sanitizers ─────────────────────────────────────────────────────────────────

/** Clamp mileage to safe bounds (for engine internal use, not user-facing). */
export function clampMileage(n: number): number {
  return Math.max(MILEAGE_MIN, Math.min(MILEAGE_MAX, Math.round(n)))
}

/** Cap risk flags array length. */
export function capRiskFlags(flags: string[]): string[] {
  return flags.slice(0, MAX_RISK_FLAGS)
}

/** Cap explanation bullets. */
export function capBullets(bullets: string[]): string[] {
  return bullets.slice(0, MAX_EXPLANATION_BULLETS)
}

/** Sanitize free-text input: trim, collapse whitespace, cap length. */
export function sanitizeText(value: string, maxLength: number = 500): string {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, maxLength)
}

/** Validate year is within reasonable vehicle age range. */
export function validateYear(value: unknown): { valid: true; year: number } | { valid: false; error: string } {
  const n = typeof value === 'string' ? parseInt(value, 10) : Number(value)
  const currentYear = new Date().getFullYear()
  if (isNaN(n) || n < 1900 || n > currentYear + 1) {
    return { valid: false, error: `Year must be between 1900 and ${currentYear + 1}` }
  }
  return { valid: true, year: n }
}

/** Validate numeric field with min/max bounds. */
export function validateBoundedInt(
  value: unknown,
  fieldName: string,
  min: number,
  max: number
): { valid: true; value: number } | { valid: false; error: string } {
  if (value === null || value === undefined || value === '') {
    return { valid: false, error: `${fieldName} is required` }
  }
  const n = typeof value === 'string' ? parseInt(value, 10) : Number(value)
  if (isNaN(n) || !isFinite(n)) {
    return { valid: false, error: `${fieldName} must be a number` }
  }
  if (n < min || n > max) {
    return { valid: false, error: `${fieldName} must be between ${min} and ${max}` }
  }
  return { valid: true, value: Math.round(n) }
}
