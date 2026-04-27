const PRODUCTION_ENV_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'OFFER_SESSION_SECRET',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'NEXT_PUBLIC_TURNSTILE_SITE_KEY',
  'TURNSTILE_SECRET_KEY',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_VERIFY_SERVICE_SID',
  'DVLA_VES_API_KEY',
  // RESEND_API_KEY and RESEND_FROM_ADDRESS are intentionally excluded from the
  // hard assert: email.ts already degrades gracefully when they are absent.
] as const

export type ProductionEnvVar = (typeof PRODUCTION_ENV_VARS)[number]

export function isStrictProductionEnv(): boolean {
  return process.env.VERCEL_ENV === 'production' || process.env.MCAR_REQUIRE_PROD_ENV === 'true'
}

export function isLocalLikeEnv(): boolean {
  return process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test'
}

export function getMissingProductionEnv(): ProductionEnvVar[] {
  return PRODUCTION_ENV_VARS.filter((key) => !process.env[key]?.trim())
}

export function assertProductionEnv(area = 'runtime'): void {
  if (!isStrictProductionEnv()) return

  const missing = getMissingProductionEnv()
  if (missing.length > 0) {
    throw new Error(
      `[prod-env:${area}] Missing required production env vars: ${missing.join(', ')}`
    )
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