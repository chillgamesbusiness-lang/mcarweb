export const PRODUCTION_ENV_REQUIREMENTS = {
  NEXT_PUBLIC_SUPABASE_URL: 'Supabase public client for auth and app data reads.',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'Supabase public client for auth and app data reads.',
  SUPABASE_SERVICE_ROLE_KEY: 'Trusted server writes for leads, bookings, audits, inspections, and admin mutations.',
  OFFER_SESSION_SECRET: 'Explicit 32+ character signing secret for customer funnel offer tokens.',
  UPSTASH_REDIS_REST_URL: 'Lookup and OTP abuse-control rate limits.',
  UPSTASH_REDIS_REST_TOKEN: 'Lookup and OTP abuse-control rate limits.',
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: 'Public Turnstile widget on lookup and OTP send steps.',
  TURNSTILE_SECRET_KEY: 'Server-side Turnstile verification for lookup and OTP send.',
  TWILIO_ACCOUNT_SID: 'Twilio Verify SMS OTP for customer contact verification.',
  TWILIO_AUTH_TOKEN: 'Twilio Verify SMS OTP for customer contact verification.',
  TWILIO_VERIFY_SERVICE_SID: 'Twilio Verify SMS OTP for customer contact verification.',
  DVLA_VES_API_KEY: 'DVLA VES registration lookup in the public valuation funnel.',
} as const

export const OPTIONAL_PRODUCTION_ENV_REQUIREMENTS = {
  RESEND_API_KEY: 'Optional for V1: enables booking confirmation emails and admin new-lead alerts.',
  RESEND_FROM_ADDRESS: 'Optional for V1: sender identity for booking confirmation emails and admin new-lead alerts.',
} as const

export type ProductionEnvVar = keyof typeof PRODUCTION_ENV_REQUIREMENTS
export type OptionalProductionEnvVar = keyof typeof OPTIONAL_PRODUCTION_ENV_REQUIREMENTS

const PRODUCTION_ENV_VARS = Object.keys(PRODUCTION_ENV_REQUIREMENTS) as ProductionEnvVar[]
const OPTIONAL_PRODUCTION_ENV_VARS = Object.keys(
  OPTIONAL_PRODUCTION_ENV_REQUIREMENTS
) as OptionalProductionEnvVar[]

export function isStrictProductionEnv(): boolean {
  return process.env.VERCEL_ENV === 'production' || process.env.MCAR_REQUIRE_PROD_ENV === 'true'
}

export function isLocalLikeEnv(): boolean {
  return process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test'
}

export function getMissingProductionEnv(): ProductionEnvVar[] {
  return PRODUCTION_ENV_VARS.filter((key) => !process.env[key]?.trim())
}

export function getMissingOptionalProductionEnv(): OptionalProductionEnvVar[] {
  return OPTIONAL_PRODUCTION_ENV_VARS.filter((key) => !process.env[key]?.trim())
}

export function getProductionEnvRequirement(key: ProductionEnvVar): string {
  return PRODUCTION_ENV_REQUIREMENTS[key]
}

export function getOptionalProductionEnvRequirement(key: OptionalProductionEnvVar): string {
  return OPTIONAL_PRODUCTION_ENV_REQUIREMENTS[key]
}

export function getInvalidProductionEnv(): string[] {
  const issues: string[] = []
  const offerSessionSecret = process.env.OFFER_SESSION_SECRET?.trim()

  if (offerSessionSecret && offerSessionSecret.length < 32) {
    issues.push('OFFER_SESSION_SECRET must be at least 32 characters')
  }
  if (offerSessionSecret && looksLikePlaceholder(offerSessionSecret)) {
    issues.push('OFFER_SESSION_SECRET must not be a placeholder value')
  }

  requireHttpsUrl('NEXT_PUBLIC_SUPABASE_URL', issues)
  requireHttpsUrl('UPSTASH_REDIS_REST_URL', issues)
  requirePattern('TWILIO_ACCOUNT_SID', /^AC[a-f0-9]{32}$/i, 'must look like a Twilio Account SID', issues)
  requirePattern('TWILIO_VERIFY_SERVICE_SID', /^VA[a-f0-9]{32}$/i, 'must look like a Twilio Verify Service SID', issues)
  rejectPlaceholder('DVLA_VES_API_KEY', issues)
  rejectPlaceholder('NEXT_PUBLIC_TURNSTILE_SITE_KEY', issues)
  rejectPlaceholder('TURNSTILE_SECRET_KEY', issues)
  rejectPlaceholder('UPSTASH_REDIS_REST_TOKEN', issues)

  const resendFrom = process.env.RESEND_FROM_ADDRESS?.trim()
  if (resendFrom && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resendFrom)) {
    issues.push('RESEND_FROM_ADDRESS must be a valid email address when configured')
  }

  return issues
}

function requireHttpsUrl(name: string, issues: string[]): void {
  const value = process.env[name]?.trim()
  if (!value) return
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:') issues.push(`${name} must use https`)
  } catch {
    issues.push(`${name} must be a valid URL`)
  }
}

function requirePattern(name: string, pattern: RegExp, message: string, issues: string[]): void {
  const value = process.env[name]?.trim()
  if (value && !pattern.test(value)) issues.push(`${name} ${message}`)
}

function rejectPlaceholder(name: string, issues: string[]): void {
  const value = process.env[name]?.trim()
  if (value && looksLikePlaceholder(value)) issues.push(`${name} must not be a placeholder value`)
}

function looksLikePlaceholder(value: string): boolean {
  return /^(changeme|change-me|todo|test|dummy|example|placeholder|xxx|your[_-]?)/i.test(value)
}

export function assertProductionEnv(area = 'runtime'): void {
  if (!isStrictProductionEnv()) return

  const missing = getMissingProductionEnv()
  if (missing.length > 0) {
    throw new Error(
      `[prod-env:${area}] Missing required production env vars: ${missing.join(', ')}`
    )
  }

  const invalid = getInvalidProductionEnv()
  if (invalid.length > 0) {
    throw new Error(`[prod-env:${area}] Invalid production env vars: ${invalid.join('; ')}`)
  }

  if (process.env.OTP_BYPASS_ENABLED === 'true') {
    throw new Error('[prod-env] OTP_BYPASS_ENABLED must never be true in production')
  }
}

export function isOtpBypassAllowed(): boolean {
  return process.env.OTP_BYPASS_ENABLED === 'true' && isLocalLikeEnv() && !isStrictProductionEnv()
}

export function requireEnv(name: string, area: string): string {
  const value = process.env[name]?.trim()
  if (value) return value
  throw new Error(`[${area}] ${name} is not configured`)
}