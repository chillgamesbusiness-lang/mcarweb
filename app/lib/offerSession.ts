/**
 * Signed offer-session tokens using HMAC-SHA256.
 *
 * Token format: <base64url(payload JSON)>.<base64url(signature)>
 *
 * Token versions:
 *   /offer          → v1: reg + vehicle
 *   /offer/details  → v1: + mileage + condition
 */

import { createHmac, timingSafeEqual } from 'crypto'

// ── Types ──────────────────────────────────────────────────────────────────────

export interface VehicleInfo {
  make: string
  model: string
  year: number
  fuel: string
  transmission: string
  colour?: string
  engineCapacity?: number
  co2Emissions?: number
  taxStatus?: string
  taxDueDate?: string
  motStatus?: string
  motExpiryDate?: string
  euroStatus?: string
  dateOfLastV5C?: string
}

/** Compact MOT summary carried inside the token */
export interface MOTSummary {
  monthsRemaining: number
  motExpired: boolean
  latestMileage: number | null
  latestTestDate: string | null
  annualMileageEstimate: number
  mileageConsistency: 'consistent' | 'suspicious' | 'rollback_detected'
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

/** Pricing result carried in the token so downstream pages can use it */
export interface ValuationSummary {
  min: number
  max: number
  midpoint: number
  adjustedValue: number
  confidenceScore: number
  riskTier: 'low' | 'medium' | 'high' | 'manual_only'
  riskFlags: string[]
  quoteMode: 'auto' | 'manual_review' | 'blocked'
  marketValueUsed: number
  spreadApplied: number
  customerBullets: string[]   // customer-safe explanation
  customerSummary: string
}

export interface OfferTokenPayload {
  v: number
  iat: number
  exp: number
  reg: string
  vehicle: VehicleInfo
  motSummary?: MOTSummary
  mileage?: number
  condition?: 'excellent' | 'good' | 'fair' | 'poor'
  postcode?: string
  valuation?: ValuationSummary
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function getSecret(): string {
  const secret = process.env.OFFER_SESSION_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('OFFER_SESSION_SECRET must be at least 32 characters')
  }
  return secret
}

function base64url(buf: Buffer): string {
  return buf.toString('base64url')
}

function fromBase64url(str: string): Buffer {
  return Buffer.from(str, 'base64url')
}

function sign(payloadB64: string): string {
  const hmac = createHmac('sha256', getSecret())
  hmac.update(payloadB64)
  return base64url(hmac.digest())
}

// ── Public API ─────────────────────────────────────────────────────────────────

const TOKEN_TTL_MS = 30 * 60 * 1000 // 30 minutes

/**
 * Create a signed offer-session token.
 */
export function createOfferToken(
  data: Omit<OfferTokenPayload, 'v' | 'iat' | 'exp'>
): string {
  const now = Date.now()
  const payload: OfferTokenPayload = {
    v: 1,
    iat: now,
    exp: now + TOKEN_TTL_MS,
    ...data,
  }
  const serialised = JSON.stringify(payload)
  if (serialised.length > 4096) {
    throw new Error('Token payload exceeds maximum size (4KB)')
  }
  const payloadB64 = base64url(Buffer.from(serialised, 'utf-8'))
  const sig = sign(payloadB64)
  return `${payloadB64}.${sig}`
}

/**
 * Verify a token's signature and expiry.
 * Returns the decoded payload on success, or null on failure.
 */
export function verifyOfferToken(token: string): OfferTokenPayload | null {
  if (!token || typeof token !== 'string') return null

  const parts = token.split('.')
  if (parts.length !== 2) return null

  const [payloadB64, sig] = parts

  // Verify signature (constant-time comparison to prevent timing attacks)
  const expectedSig = sign(payloadB64)
  try {
    const sigBuf = Buffer.from(sig, 'base64url')
    const expectedBuf = Buffer.from(expectedSig, 'base64url')
    if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) return null
  } catch {
    return null
  }

  // Decode payload
  try {
    const json = fromBase64url(payloadB64).toString('utf-8')
    const payload = JSON.parse(json) as OfferTokenPayload

    // Check version
    if (payload.v !== 1) return null

    // Check expiry
    if (Date.now() > payload.exp) return null

    return payload
  } catch {
    return null
  }
}
