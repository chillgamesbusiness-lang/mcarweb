/**
 * Lead Verification v2 — Input validation + OTP via SMS + rate limiting.
 *
 * Spec reference: valuationeng.md Part 5
 *
 * OTP: 6-digit code managed by Twilio Verify, 10 min expiry.
 * SMS provider: Twilio Verify (env: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID)
 *
 * Abuse guardrails:
 *  - 3 OTP sends/day per phone number (hard cap)
 *  - 10 OTP sends/day per IP (hard cap)
 *  - 60s cooldown between OTP sends per phone
 *  - Disposable/invalid UK number blocking
 *  - OTP codes are never stored — Twilio Verify manages the full code lifecycle
 *  - Generic response: never reveals whether a phone exists in the system
 */

import crypto from 'crypto'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { checkOtpRateLimit } from '@/lib/rateLimit'
import { isOtpBypassAllowed } from '@/lib/env'
import { reportError } from '@/lib/reportError'

let _supabase: SupabaseClient | null = null
function getSupabase(): SupabaseClient {
  if (_supabase) return _supabase
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase env vars not configured for OTP service')
  _supabase = createClient(url, key)
  return _supabase
}

// ── Input validation ───────────────────────────────────────────────────────────

/** UK mobile: starts 07, 11 digits total */
export function isValidUkMobile(phone: string): boolean {
  const clean = phone.replace(/[\s\-()]/g, '')
  return /^07\d{9}$/.test(clean)
}

/**
 * Block known disposable / virtual SMS number prefixes.
 * These are UK-specific prefixes commonly used by SMS relay services.
 * Also blocks premium-rate and non-geographic numbers.
 */
const BLOCKED_PREFIXES = [
  '070',   // Personal numbering / virtual (often disposable)
  '076',   // Pager numbers (not real mobiles)
  '0800',  // Freephone
  '0808',  // Freephone
  '0845',  // Non-geographic
  '0870',  // Non-geographic
  '0900',  // Premium rate
  '0901',  // Premium rate
  '0902',  // Premium rate
  '0903',  // Premium rate
  '0904',  // Premium rate
  '0905',  // Premium rate
  '0906',  // Premium rate
  '0907',  // Premium rate
  '0908',  // Premium rate
  '0909',  // Premium rate
  '0911',  // Premium rate
  '0912',  // Premium rate
]

export function isBlockedNumber(phone: string): boolean {
  const clean = phone.replace(/[\s\-()]/g, '')
  return BLOCKED_PREFIXES.some((prefix) => clean.startsWith(prefix))
}

/** UK postcode: loose format check */
export function isValidPostcode(postcode: string): boolean {
  const clean = postcode.toUpperCase().replace(/\s/g, '')
  return /^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$/.test(clean)
}

/** Email: basic format */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

/** Name: at least 2 words (first + last), min 3 chars */
export function isValidName(name: string): boolean {
  const trimmed = name.trim()
  return trimmed.length >= 3 && /\s/.test(trimmed)
}

/** Clean phone to digits only */
export function cleanPhone(phone: string): string {
  return phone.replace(/[\s\-()]/g, '')
}

// ── OTP ────────────────────────────────────────────────────────────────────────

/**
 * Send an OTP code via SMS and store session in Supabase.
 *
 * IMPORTANT: Always returns a generic success response (sessionId).
 * Never reveals whether the phone number exists in the system.
 *
 * Guardrails:
 *  - Validates UK mobile format
 *  - Blocks disposable/virtual numbers
 *  - Enforces 60s cooldown per phone
 *  - Enforces 3/day per phone, 10/day per IP
 *  - Code generation and SMS delivery via Twilio Verify (no plaintext stored)
 */
export async function sendOTP(
  phone: string,
  ip: string = 'unknown'
): Promise<{ sessionId: string }> {
  const cleanedPhone = cleanPhone(phone)

  // ── Validate format ──────────────────────────────────────────────────
  if (!isValidUkMobile(cleanedPhone)) {
    throw new Error('Invalid UK mobile number')
  }

  // ── Block disposable / non-mobile prefixes ───────────────────────────
  if (isBlockedNumber(cleanedPhone)) {
    throw new Error('Invalid UK mobile number')
  }

  // ── Rate limit bypass whitelist (explicit local/dev/test only) ───────
  const isWL = isWhitelistedPhone(cleanedPhone)

  // ── Rate limits: per-phone (3/day) + per-IP (10/day) ─────────────────
  if (!isWL) {
    const phoneLimit = await checkOtpRateLimit(`otp:phone:${cleanedPhone}`, 3, 86400)
    if (!phoneLimit.allowed) {
      throw new Error('Too many verification requests. Please try again tomorrow.')
    }

    const ipLimit = await checkOtpRateLimit(`otp:ip:${ip}`, 10, 86400)
    if (!ipLimit.allowed) {
      throw new Error('Too many verification requests. Please try again later.')
    }

    // ── 60s cooldown per phone ─────────────────────────────────────────
    const cooldown = await checkOtpRateLimit(`otp:cooldown:${cleanedPhone}`, 1, 60)
    if (!cooldown.allowed) {
      throw new Error('Please wait 60 seconds before requesting another code.')
    }
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID
  const hasTwilio = Boolean(accountSid && authToken && verifyServiceSid)

  if (!hasTwilio && !isOtpBypassAllowed()) {
    throw new Error('Verification service not configured')
  }

  // ── Generate session ID ──────────────────────────────────────────────
  const sessionId = crypto.randomUUID()

  // ── Store session (code managed by Twilio Verify — store placeholder) ─
  const { error: storeError } = await getSupabase()
    .from('otp_sessions')
    .insert({
      id: sessionId,
      phone: cleanedPhone,
      code_hash: hasTwilio ? 'twilio_verify' : 'explicit_local_bypass',
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 min
      attempts: 0,
      verified: false,
      ip_address: ip,
      created_at: new Date().toISOString(),
    })

  if (storeError) {
    await reportError(storeError, {
      severity: 'error',
      area: 'otp',
      operation: 'store_session',
      provider: 'supabase',
      metadata: { phone: cleanedPhone, ip },
    })
    throw new Error('Failed to create verification session')
  }

  // ── Send SMS via Twilio Verify ───────────────────────────────────────
  if (!hasTwilio) {
    console.warn('[otp] Explicit local bypass enabled; any 6-digit code will verify for this session')
    return { sessionId }
  }

  try {
    const verifyUrl = `https://verify.twilio.com/v2/Services/${verifyServiceSid}/Verifications`
    const body = new URLSearchParams({
      To: `+44${cleanedPhone.slice(1)}`, // Convert 07xxx to +447xxx
      Channel: 'sms',
    })

    const res = await fetch(verifyUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    })

    if (!res.ok) {
      const errBody = await res.text()
      throw new Error(`Twilio Verify send failed: ${errBody.slice(0, 250)}`)
    }
  } catch (err) {
    await reportError(err, {
      severity: 'critical',
      area: 'otp',
      operation: 'send_code',
      provider: 'twilio',
      metadata: { phone: cleanedPhone, ip },
    })
    throw new Error('Could not send verification code. Please try again.')
  }

  return { sessionId }
}

/**
 * Verify an OTP code against a Twilio Verify session.
 * Looks up the phone from our DB session, then calls Twilio Verify's
 * VerificationCheck endpoint. Falls back to accepting any code in dev
 * when Twilio credentials are not configured.
 */
export async function verifyOTP(
  sessionId: string,
  userCode: string,
  expectedPhone?: string
): Promise<boolean> {
  const { data: session, error } = await getSupabase()
    .from('otp_sessions')
    .select('*')
    .eq('id', sessionId)
    .single()

  if (error || !session) {
    throw new Error('Session expired. Please request a new code.')
  }

  if (expectedPhone && session.phone !== cleanPhone(expectedPhone)) {
    throw new Error('Verification session does not match this phone number.')
  }

  if (session.verified) {
    throw new Error('Code already used. Please request a new code.')
  }

  if (new Date() > new Date(session.expires_at)) {
    throw new Error('Code expired. Please request a new code.')
  }

  if ((session.attempts ?? 0) >= 5) {
    throw new Error('Too many incorrect attempts. Please request a new code.')
  }

  // ── Twilio Verify Check ──────────────────────────────────────────────
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID

  if (!accountSid || !authToken || !verifyServiceSid) {
    if (isOtpBypassAllowed() && /^\d{6}$/.test(userCode.trim())) {
      await getSupabase()
        .from('otp_sessions')
        .update({ verified: true })
        .eq('id', sessionId)
      return true
    }
    throw new Error('Verification service not configured')
  }

  try {
    const checkUrl = `https://verify.twilio.com/v2/Services/${verifyServiceSid}/VerificationCheck`
    const body = new URLSearchParams({
      To: `+44${session.phone.slice(1)}`, // Convert 07xxx to +447xxx
      Code: userCode.trim(),
    })

    const res = await fetch(checkUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    })

    const data = await res.json()

    if (data.status === 'approved') {
      await getSupabase()
        .from('otp_sessions')
        .update({ verified: true })
        .eq('id', sessionId)
      return true
    }

    await getSupabase()
      .from('otp_sessions')
      .update({ attempts: (session.attempts ?? 0) + 1 })
      .eq('id', sessionId)

    // Twilio error codes
    if (!res.ok) {
      const twilioCode = data?.code
      if (res.status === 404 || twilioCode === 20404) {
        throw new Error('Code expired or already used. Please request a new code.')
      }
      if (twilioCode === 60202) {
        throw new Error('Too many incorrect attempts. Please request a new code.')
      }
    }

    return false // Wrong code but still valid session
  } catch (err) {
    if (err instanceof Error && (
      err.message.includes('expired') ||
      err.message.includes('attempts') ||
      err.message.includes('already used')
    )) {
      throw err
    }
    await reportError(err, {
      severity: 'error',
      area: 'otp',
      operation: 'verify_code',
      provider: 'twilio',
      metadata: { sessionId, expectedPhone: expectedPhone ? cleanPhone(expectedPhone) : undefined },
    })
    throw new Error('Verification failed. Please try again.')
  }
}

// ── Rate limiting is now handled by checkOtpRateLimit in rateLimit.ts ──────────
// Per-phone: 3/day, per-IP: 10/day, cooldown: 60s per phone

// ── Phone whitelist (auto-verified, skip OTP) ──────────────────────────────────
// Phones listed here are treated as pre-verified — no SMS code required.
// Also supports OTP_BYPASS_PHONES env var (comma-separated).
const PHONE_WHITELIST: string[] = [
  '07968212121', // Whitelisted for testing
]

function getWhitelistedPhones(): string[] {
  const envPhones = (process.env.OTP_BYPASS_PHONES ?? '')
    .split(',')
    .map((n) => cleanPhone(n.trim()))
    .filter(Boolean)
  return [...PHONE_WHITELIST, ...envPhones]
}

export function isWhitelistedPhone(phone: string): boolean {
  if (!isOtpBypassAllowed()) return false
  const cleaned = cleanPhone(phone)
  return getWhitelistedPhones().includes(cleaned)
}

// ── Check if a phone is already verified (recent session or whitelist) ──────────

/**
 * Check if a phone number has been recently verified via OTP or is whitelisted.
 * Returns the existing verified session ID if found, or creates a pre-verified
 * session for whitelisted phones.
 *
 * "Recently" = within the last 30 days.
 */
export async function checkPhoneVerified(
  phone: string,
  ip: string = 'unknown'
): Promise<{ verified: boolean; sessionId: string | null }> {
  const cleaned = cleanPhone(phone)

  if (!isValidUkMobile(cleaned)) {
    return { verified: false, sessionId: null }
  }

  // ── Whitelisted phones: create a pre-verified session ────────────────
  if (isWhitelistedPhone(cleaned)) {
    const sessionId = crypto.randomUUID()
    await getSupabase()
      .from('otp_sessions')
      .insert({
        id: sessionId,
        phone: cleaned,
        code_hash: 'whitelisted',
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        attempts: 0,
        verified: true,
        ip_address: ip,
        created_at: new Date().toISOString(),
      })
    return { verified: true, sessionId }
  }

  // ── Check for a recently verified session in DB ──────────────────────
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { data: session } = await getSupabase()
    .from('otp_sessions')
    .select('id')
    .eq('phone', cleaned)
    .eq('verified', true)
    .gte('created_at', thirtyDaysAgo)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (session) {
    return { verified: true, sessionId: session.id }
  }

  return { verified: false, sessionId: null }
}

// ── Validate all contact fields at once ────────────────────────────────────────

export interface ContactValidation {
  valid: boolean
  errors: string[]
}

export function validateContactFields(fields: {
  name: string
  phone: string
  email: string
  postcode: string
}): ContactValidation {
  const errors: string[] = []

  if (!isValidName(fields.name)) {
    errors.push('Please enter your full name (first and last)')
  }
  if (!isValidUkMobile(fields.phone)) {
    errors.push('Please enter a valid UK mobile number (07...)')
  }
  if (!isValidEmail(fields.email)) {
    errors.push('Please enter a valid email address')
  }
  if (!isValidPostcode(fields.postcode)) {
    errors.push('Please enter a valid UK postcode')
  }

  return { valid: errors.length === 0, errors }
}
